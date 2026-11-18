/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import * as path from 'node:path';
import { type Generated, expandToNode as toNode, joinToNode as join, toString } from 'langium/generate';
import type { GeneratorManager } from 'langium-tools/generator';
import { GeneratedContentManager } from 'langium-tools/generator';
import { JavaImportManager, packageToPath } from 'langium-tools/lang/java';
import type { State, Statemachine } from '../language-server/generated/ast.js';
import { extractDestinationAndName } from './cli-util.js';

// For precise white space handling in generation template
// we suggest you to enable the display of white space characters in your editor.
// In VS Code execute the 'Toggle Render Whitespace' command, for example.

const JAVA_PACKAGE = 'com.example';

/**
 * Record the C++ program and the Java event enum for one machine.
 *
 * This function does not touch the disk. The caller decides the directory
 * and when to write. `GeneratedContentManager` skips a write when the bytes
 * are already there, so a second run keeps the file's modification time.
 * Creating the same path twice with different text throws. That is the check
 * you want before a workspace generator overwrites a file from another model.
 *
 * The file name comes from the document inside the workspace
 * (`getDocumentLocalPath`), not from a path string passed beside the AST.
 * Several documents can share one manager and be written together.
 */
export async function generate(model: Statemachine, output: GeneratorManager): Promise<void> {
    emit(model, output, fileBaseName(output.getDocumentLocalPath()));
}

/**
 * One-shot wrapper for a caller that has a file path and no workspace.
 * The CLI uses {@link generate} instead, because it already has the document.
 */
export async function generateCpp(statemachine: Statemachine, filePath: string, destination: string | undefined): Promise<string> {
    const data = extractDestinationAndName(filePath, destination);
    const collector = new GeneratedContentManager();
    emit(statemachine, collector.generatorManagerFor(statemachine), data.name);
    await collector.writeToDisk(data.destination);
    return path.join(data.destination, `${data.name}.cpp`);
}

function fileBaseName(localName: string | undefined): string {
    const sourceName = localName ?? 'statemachine.statemachine';
    return path.basename(sourceName, path.extname(sourceName)).replace(/[.-]/g, '');
}

function emit(model: Statemachine, output: GeneratorManager, baseName: string): void {
    const ctx = <GeneratorContext>{
        statemachine: model,
        fileName: `${baseName}.cpp`,
        destination: '',
    };
    output.createFile(`${baseName}.cpp`, toString(generateCppContent(ctx)));
    output.createFile(javaEventsPath(model), javaEvents(model));
}

/**
 * Events as a Java enum in `com.example`.
 *
 * `imp('java.util.function.Consumer')` returns `Consumer` and records the import.
 * Call it while building the body, then `generateImports()`. A second class
 * with the same simple name stays fully qualified. A class in the current
 * package is not imported.
 *
 * `generateJavaFile` is the one-call form of this. It assembles the file with
 * generator nodes from the Langium install inside langium-tools. This project
 * has its own Langium, so those nodes would print as `[object Object]`.
 * The import manager is plain data, so the showcase calls it directly.
 *
 * A machine with no events cannot be an enum (Java requires a constant),
 * so that case is a class with a private constructor.
 */
function javaEvents(model: Statemachine): string {
    const className = `${model.name}Events`;
    const imports = new JavaImportManager(JAVA_PACKAGE);
    const body = model.events.length === 0
        ? toNode`
            public final class ${className} {
                private ${className}() {}
            }
        `
        : toNode`
            public enum ${className} {
                ${model.events.map(event => event.name).join(',\n    ')};

                public void dispatch(${imports.useClass('java.util.function.Consumer')}<${className}> listener) {
                    listener.accept(this);
                }
            }
        `;
    const importBlock = imports.generateImports();
    const header = importBlock.length > 0
        ? `package ${JAVA_PACKAGE};\n\n${importBlock}\n\n`
        : `package ${JAVA_PACKAGE};\n\n`;
    const text = header + toString(body);
    return text.endsWith('\n') ? text : `${text}\n`;
}

function javaEventsPath(model: Statemachine): string {
    return `${String(packageToPath(JAVA_PACKAGE))}/${model.name}Events.java`;
}

interface GeneratorContext {
    statemachine: Statemachine;
    fileName: string;
    destination: string;
}

function joinWithExtraNL<T>(content: T[], toString: (e: T) => Generated): Generated {
    return join(content, toString, { appendNewLineIfNotEmpty: true });
}

export function generateCppContent(ctx: GeneratorContext): Generated {
    return toNode`
        #include <iostream>
        #include <map>
        #include <string>

        class ${ctx.statemachine.name};

        ${generateStateClass(ctx)}


        ${generateStatemachineClass(ctx)}

        ${joinWithExtraNL(ctx.statemachine.states, state => generateStateDeclaration(ctx, state))}
        ${joinWithExtraNL(ctx.statemachine.states, state => generateStateDefinition(ctx, state))}

        typedef void (${ctx.statemachine.name}::*Event)();

        ${generateMain(ctx)}

    `;
}

function generateStateClass(ctx: GeneratorContext): Generated {
    return toNode`
        class State {
        protected:
            ${ctx.statemachine.name} *statemachine;

        public:
            virtual ~State() {}

            void set_context(${ctx.statemachine.name} *statemachine) {
                this->statemachine = statemachine;
            }

            virtual std::string get_name() {
                return "Unknown";
            }
        ${joinWithExtraNL(ctx.statemachine.events, event => toNode`
            
                virtual void ${event.name}() {
                    std::cout << "Impossible event for the current state." << std::endl;
                }
        `)}
        };
    `;
}

function generateStatemachineClass(ctx: GeneratorContext): Generated {
    return toNode`
        class ${ctx.statemachine.name} {
        private:
            State* state = nullptr;

        public:
            ${ctx.statemachine.name}(State* initial_state) {
                initial_state->set_context(this);
                state = initial_state;
                std::cout << "[" << state->get_name() << "]" << std::endl;
            }

            ~${ctx.statemachine.name}() {
                if (state != nullptr) {
                    delete state;
                }
            }

            void transition_to(State *new_state) {
                std::cout << state->get_name() << " ===> " << new_state->get_name() << std::endl;
                if (state != nullptr) {
                    delete state;
                }
                new_state->set_context(this);
                state = new_state;
            }
        ${joinWithExtraNL(ctx.statemachine.events, event => toNode`
            
                void ${event.name}() {
                    state->${event.name}();
                }
        `)}
        };
    `;
}

function generateStateDeclaration(ctx: GeneratorContext, state: State): Generated {
    return toNode`

        class ${state.name} : public State {
        public:
            std::string get_name() override { return "${state.name}"; }
            ${joinWithExtraNL(state.transitions, transition => `void ${transition.event.$refText}() override;`)}
        };
    `;
}

function generateStateDefinition(ctx: GeneratorContext, state: State): Generated {
    return toNode`

        // ${state.name}
        ${join(state.transitions, transition => toNode`
            void ${state.name}::${transition.event.$refText}() {
                statemachine->transition_to(new ${transition.state.$refText});
            }


        `)}
    `;
}

function generateMain(ctx: GeneratorContext): Generated {
    return toNode`
        int main() {
            ${ctx.statemachine.name} *statemachine = new ${ctx.statemachine.name}(new ${ctx.statemachine.init.$refText});

            static std::map<std::string, Event> event_by_name;
            ${joinWithExtraNL(ctx.statemachine.events, event => `event_by_name["${event.name}"] = &${ctx.statemachine.name}::${event.name};`)}

            for (std::string input; std::getline(std::cin, input);) {
                std::map<std::string, Event>::const_iterator event_by_name_it = event_by_name.find(input);
                if (event_by_name_it == event_by_name.end()) {
                    std::cout << "There is no event <" << input << "> in the ${ctx.statemachine.name} statemachine." << std::endl;
                    continue;
                }
                Event event_invoker = event_by_name_it->second;
                (statemachine->*event_invoker)();
            }

            delete statemachine;
            return 0;
        }
    `;
}
