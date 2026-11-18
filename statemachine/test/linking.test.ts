import { afterEach, beforeAll, describe, expect, test } from 'vitest';
import { clearDocuments } from 'langium/test';
import { DocumentIssueSeverity, DocumentIssueSource } from 'langium-tools/base';
import { createStatemachineParser } from './support.js';

let parser: ReturnType<typeof createStatemachineParser>;

beforeAll(() => {
    parser = createStatemachineParser();
});

afterEach(async () => {
    await clearDocuments(parser.services.shared);
});

describe('Linking', () => {
    test('links a transition to its event and state', async () => {
        const document = await parser.parse(`
            statemachine Door
            events
                open
            initialState Closed
            state Closed
                open => Open
            end
            state Open
            end
        `);

        expect(document).toHaveNoErrors();
        const transition = document.parseResult.value.states[0].transitions[0];
        expect(transition.event.ref?.name).toBe('open');
        expect(transition.state.ref?.name).toBe('Open');
    });

    test('reports an unknown state at the marker', async () => {
        const parsed = await parser.parseMarked(`
            statemachine Door
            events
                open
            initialState Closed
            state Closed
                open => <<{|Missing|}>>
            end
        `);

        expect(parsed).toHaveDocumentIssues([
            {
                source: DocumentIssueSource.VALIDATION,
                severity: DocumentIssueSeverity.ERROR,
                message: /Could not resolve reference to State named 'Missing'/,
                markerId: 0,
            },
        ]);
    });
});
