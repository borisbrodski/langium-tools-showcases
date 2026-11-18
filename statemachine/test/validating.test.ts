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

describe('Validating', () => {
    test('accepts the traffic-light names', async () => {
        const parsed = await parser.parseMarked(`
            statemachine TrafficLight
            events
                next
            initialState Red
            state Red
                next => Green
            end
            state Green
            end
        `);

        expect(parsed).toHaveNoIssues();
    });

    test('treats a lowercase state name as a warning, not an error', async () => {
        const parsed = await parser.parseMarked(`
            statemachine Door
            events
                open
            initialState Closed
            state <<{|closed|}>>
                open => Closed
            end
            state Closed
            end
        `);

        // toHaveNoErrors ignores warnings. toHaveNoIssues does not.
        // A generator can still run when the only problem is a style warning.
        expect(parsed).toHaveNoErrors();
        expect(() => expect(parsed).toHaveNoIssues()).toThrow(/State name should start with a capital letter/);

        expect(parsed).toHaveDocumentIssues([
            {
                source: DocumentIssueSource.VALIDATION,
                severity: DocumentIssueSeverity.WARNING,
                message: 'State name should start with a capital letter.',
                markerId: 0,
            },
        ]);
    });

    test('reports both copies of a duplicated name', async () => {
        const parsed = await parser.parseMarked(`
            statemachine Door
            events
                <<{|open|}>>
                <<{|open|}>>
            initialState Closed
            state Closed
            end
        `);

        // toHaveDocumentIssues fails when an issue is missing and when an extra issue is present.
        // Forgetting one of the two `open` markers fails the test.
        expect(parsed).toHaveDocumentIssues([
            {
                source: DocumentIssueSource.VALIDATION,
                severity: DocumentIssueSeverity.ERROR,
                message: 'Duplicate identifier name: open',
                markerId: 0,
            },
            {
                source: DocumentIssueSource.VALIDATION,
                severity: DocumentIssueSeverity.ERROR,
                message: 'Duplicate identifier name: open',
                markerId: 1,
            },
        ]);
    });
});
