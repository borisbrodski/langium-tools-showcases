import { EmptyFileSystem } from 'langium';
import { parseHelper } from 'langium/test';
import { parseWithMarks } from 'langium-tools/testing';
import { createStatemachineServices } from '../src/language-server/statemachine-module.js';
import type { Statemachine } from '../src/language-server/generated/ast.js';

/**
 * One parser for a test file.
 * Importing `langium-tools/testing` registers the document matchers on vitest's `expect`.
 */
export function createStatemachineParser() {
    const services = createStatemachineServices(EmptyFileSystem);
    const parse = parseHelper<Statemachine>(services.statemachine);
    return {
        services,
        /** Parse only. Leave validation off when the test is about syntax. */
        parse,
        /** Strip `<<{|` … `|}>>`, parse, and validate. The markers are the expected ranges. */
        parseMarked: (text: string) => parseWithMarks(parse, text),
    };
}
