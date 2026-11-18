import { afterEach, beforeAll, describe, expect, test } from 'vitest';
import { clearDocuments } from 'langium/test';
import { adjusted } from 'langium-tools/base';
import { DocumentIssueSource } from 'langium-tools/base';
import { createStatemachineParser } from './support.js';

let parser: ReturnType<typeof createStatemachineParser>;

beforeAll(() => {
    parser = createStatemachineParser();
});

afterEach(async () => {
    await clearDocuments(parser.services.shared);
});

describe('Parsing', () => {
    test('reads events, commands, and the initial state', async () => {
        const document = await parser.parse(`
            statemachine Door
            events
                open
            commands
                beep
            initialState Closed
            state Closed
                actions { beep }
                open => Open
            end
            state Open
            end
        `);

        expect(document).toHaveNoErrors();

        const model = document.parseResult.value;
        expect(adjusted`
            Machine: ${model.name}
            Events:
              ${model.events.map(event => event.name).join('\n')}
            Commands:
              ${model.commands.map(command => command.name).join('\n')}
            Closed actions:
              ${model.states[0].actions.map(action => action.$refText).join('\n')}
        `).toBe(adjusted`
            Machine: Door
            Events:
              open
            Commands:
              beep
            Closed actions:
              beep
        `);
    });

    test('reports a syntax error as a parser issue', async () => {
        const document = await parser.parse(`
            statemachine
        `);

        expect(document).toContainIssue({
            source: DocumentIssueSource.PARSER,
            message: /Expecting/,
        });
    });

    test('reports an unexpected character as a lexer issue', async () => {
        const document = await parser.parse(`
            statemachine Door @
        `);

        expect(document).toContainIssue({
            source: DocumentIssueSource.LEXER,
            message: /unexpected character/i,
        });
    });
});
