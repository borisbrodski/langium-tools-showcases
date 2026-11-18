import { describe } from 'vitest';
import { langiumGeneratorSuite } from 'langium-tools/testing';
import { generate } from '../../src/cli/generator.js';
import { createStatemachineServices } from '../../src/language-server/statemachine-module.js';
import type { Statemachine } from '../../src/language-server/generated/ast.js';

/**
 * One test per directory next to this file.
 *
 * `npm test` compares the in-memory files with `generated/` and `generated-metadata.json`.
 * `npm run test:generate` writes those snapshots. The C++ text used to live in the test
 * source. A snapshot directory stays readable when the generator grows a second file.
 */
describe('Generator', () => {
    langiumGeneratorSuite(__dirname, {
        createServices: createStatemachineServices,
        generateForModel: async (_services, model, output) => {
            await generate(model as Statemachine, output);
        },
    });
});
