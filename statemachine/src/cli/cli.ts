/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import chalk from 'chalk';
import { Command } from 'commander';
import { NodeFileSystem } from 'langium/node';
import type { Statemachine } from '../language-server/generated/ast.js';
import { StatemachineModelLanguageMetaData } from '../language-server/generated/module.js';
import { createStatemachineServices } from '../language-server/statemachine-module.js';
import { extractDestinationAndName, extractDocument } from './cli-util.js';
import { generate } from './generator.js';
import { GeneratedContentManager } from 'langium-tools/generator';
import { URI } from 'langium';
import * as url from 'node:url';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

export const generateAction = async (fileName: string, opts: GenerateOptions): Promise<void> => {
    const services = createStatemachineServices(NodeFileSystem).statemachine;
    const document = await extractDocument(fileName, StatemachineModelLanguageMetaData.fileExtensions, services);
    const statemachine = document.parseResult.value as Statemachine;
    const data = extractDestinationAndName(fileName, opts.destination);
    // The workspace is the file's directory, so getDocumentLocalPath() is the file name
    // and not a file:// URI. One manager is enough for every document in that directory.
    const collector = new GeneratedContentManager([URI.file(path.dirname(path.resolve(fileName)))]);
    await generate(statemachine, collector.generatorManagerFor(statemachine));
    await collector.writeToDisk(data.destination);
    console.log(chalk.green(`${collector.getGeneratedContent().size} files generated into ${data.destination}`));
};

export type GenerateOptions = {
    destination?: string;
}

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

const packagePath = path.resolve(__dirname, '..', '..', 'package.json');
const packageContent = await fs.readFile(packagePath, 'utf-8');

const program = new Command();

program.version(JSON.parse(packageContent).version);

program
    .command('generate')
    .argument('<file>', `possible file extensions: ${StatemachineModelLanguageMetaData.fileExtensions.join(', ')}`)
    .option('-d, --destination <dir>', 'destination directory of generating')
    .description('generates a C++ CLI to walk over states')
    .action(generateAction);

program.parse(process.argv);
