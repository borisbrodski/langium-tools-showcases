/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import type { ExecException } from 'child_process';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, test } from 'vitest';
import { exec } from 'child_process';

const here = path.dirname(fileURLToPath(import.meta.url));

describe('Test the statemachine CLI', () => {
    const source = path.join(here, '../example/trafficlight.statemachine');
    const destination = fs.mkdtempSync(path.join(os.tmpdir(), 'statemachine-'));

    test('Generator command returns code 0 and creates the C++ program and the Java enum', async () => {
        const result = await cli(['generate', source, '-d', destination]);
        expect(result.code).toBe(0);
        expect(fs.existsSync(path.join(destination, 'trafficlight.cpp'))).toBe(true);
        expect(fs.existsSync(path.join(destination, 'com/example/TrafficLightEvents.java'))).toBe(true);
    });

    afterAll(() => {
        fs.rmSync(destination, { recursive: true, force: true });
    });
});

interface CliResult {
    code: number,
    error: ExecException | null,
    stdout: string,
    stderr: string
}

async function cli(args: string[]): Promise<CliResult> {
    return new Promise(resolve => {
        exec(`node "${path.join(here, '../bin/cli.js')}" "${args.join('" "')}"`, (error, stdout, stderr) => {
            resolve({
                code: error && error.code ? error.code : 0,
                error,
                stdout,
                stderr
            });
        });
    });
}
