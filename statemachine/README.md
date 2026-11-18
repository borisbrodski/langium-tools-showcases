# State machine

The official [Langium statemachine example](https://github.com/eclipse-langium/langium/tree/main/examples/statemachine), extended with [langium-tools](https://langium-tools.openbrod.org). The grammar is unchanged. A document is still a machine, its events and commands, an initial state, and states with transitions:

```
statemachine TrafficLight

events
    switchCapacity
    next

initialState PowerOff

state PowerOff
    switchCapacity => RedLight
end
```

The C++ program the official example generates is still produced. langium-tools changes how issues are reported, how files are collected, and how that output is tested. A Java enum of the events is a second file from the same AST, so the import manager has a real type to import.

`git diff upstream -- statemachine` is the whole extension. `upstream` is the official example with no langium-tools changes.

## Run

From a checkout that sits next to a built `langium-tools` (see the repository README):

```sh
npm install
npm test                  # build, then verify generator snapshots
npm run test:generate     # rewrite test/generator/*/generated
node ./bin/cli.js generate example/trafficlight.statemachine -d generated
```

`npm test` sets `GENERATOR_TEST=verify`. The generator runs in memory and the bytes are compared with `generated/` and `generated-metadata.json`. `npm run test:generate` sets `GENERATOR_TEST=generate`, deletes `generated/` when a sibling `dsls/` directory exists, and writes the snapshots. Vitest labels both runs `(generating)`. That label is a display bug in langium-tools. Verify does not write the snapshots.

The CLI prints one issue summary. Errors stop the run. A warning, such as a lowercase state name, is printed and the files are still written.

Compile the C++ program the way the official example does:

```sh
g++ generated/trafficlight.cpp -o trafficlight
./trafficlight
```

Type an event name (`next`, `switchCapacity`) and press enter.

## What changed, and why

### One issue list

`getDocumentIssueSummary` in `src/cli/cli-util.ts` replaces the loop that kept only diagnostics of severity 1. Lexer errors, parser errors, and validation errors are one count. A syntax error used to depend on Langium also copying it into `document.diagnostics`. The summary reads the lexer and parser results directly.

Warnings are not errors. `toHaveNoErrors` in the tests ignores them. `toHaveNoIssues` does not. The lowercase-state test is the pair: generation can continue, and the test can still require the warning to be present.

### Markers instead of ranges

`parseWithMarks` strips `<<{|` … `|}>>` and remembers where they were. `toHaveDocumentIssues` matches each expectation to one real issue, including the marker, and fails if an issue is left over. The old style was a string such as `[1:19..1:26]`. A new validation rule shifted that range and the test still passed if you used `stringContaining`. The duplicate-name test lists both `open` markers. Drop one and the test fails.

`toContainIssue` is the looser form. The syntax tests use it with a regex, because the wording comes from Chevrotain and the interesting part is the source: `LEXER` or `PARSER`.

### The generator does not write files

`generate` in `src/cli/generator.ts` only calls `createFile`. The CLI builds a `GeneratedContentManager` for the file's directory, runs every document, then `writeToDisk`. Identical bytes are not rewritten, so the modification time stays. The same relative path with different text throws before anything is written. That is the collision check a workspace generator needs when two models would emit `TrafficLight.cpp`.

The C++ text is still the official `expandToNode` templates. Only the destination changed: a string in the manager, not `fs.writeFileSync` inside the template function.

Both files use the default target, so the snapshot is `generated/` plus `generated-metadata.json`. Pass named targets to `langiumGeneratorSuite` when the C++ and the Java must go to different directories. Each target then gets `generated/<name>/` and `<name>-metadata.json`. This language does not need that split.

### Java imports

`TrafficLightEvents.java` is the event list as an enum. The method takes a `Consumer` from `java.util.function`. `JavaImportManager.useClass` returns `Consumer` and records `import java.util.function.Consumer`. A second class with the same simple name stays fully qualified. A class in `com.example` is not imported. Build the body first, then call `generateImports()`, because the import list is whatever the body actually used.

`generateJavaFile` is that sequence in one call. It stitches the file with generator nodes from the Langium copy inside langium-tools. This package depends on Langium itself, so those nodes are a different class and print as `[object Object]`. The import manager is plain data. The comment on `javaEvents` records the constraint.

A machine with no events cannot be a Java enum. `idle` generates a class with a private constructor instead. The snapshot is the test.

### Names

`toFirstUpper` is not used. State and machine names in this grammar are already the type names. Event names stay in source order, so `arraySortBy` is not used either. Sorting would change the enum and the C++ dispatch table. `adjusted` is used in the parsing test so the expected tree is a template and inserted lines keep the placeholder's indent.

## Tests

- `test/parsing.test.ts` — events, commands, and actions; one parser issue; one lexer issue.
- `test/linking.test.ts` — a transition resolves. An unknown state is an error on that marker.
- `test/validating.test.ts` — capital names are clean. A lowercase name is a warning. Both copies of a duplicated name must be listed.
- `test/generator/` — `traffic-light` and `idle`. The suite adds one Vitest test per directory. It does not call `test()` itself.
- `test/statemachine-cli.test.ts` — the built CLI writes `trafficlight.cpp` and `com/example/TrafficLightEvents.java`.

Documents from earlier tests stay in the shared index and can satisfy a reference in the next test. Each test file calls `clearDocuments` afterwards.

## VS Code

The extension from the official example is still here (`src/extension.ts`, `esbuild.mjs`). `npm run build` compiles the language server and bundles the extension. Launch it with a VS Code run configuration that points at this directory, the same way the Langium repository launches "Run Statemachine Extension".

## Left unused

- `arraySortBy`. Source order is the enum order and the C++ order. Nulls sorting last does not come up.
- `adjustedUnix`. Snapshots and this machine use `\n`.
- `toFirstLower` and `toFirstUpper`. The grammar's names are already the identifiers the output needs.
- Named generator targets. One output directory holds the `.cpp` and the `.java`.
- `using`. The tests do not need that scope.
