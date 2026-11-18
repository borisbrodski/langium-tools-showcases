/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import * as fs from 'node:fs';
import * as path from 'node:path';
import chalk from 'chalk';
import type { AstNode, LangiumDocument, LangiumCoreServices } from 'langium';
import { URI } from 'langium';
import { getDocumentIssueSummary } from 'langium-tools/base';

export async function extractDocument(fileName: string, extensions: readonly string[], services: LangiumCoreServices): Promise<LangiumDocument> {
    if (!extensions.includes(path.extname(fileName))) {
        console.error(chalk.yellow(`Please, choose a file with one of these extensions: ${extensions}.`));
        process.exit(1);
    }

    if (!fs.existsSync(fileName)) {
        console.error(chalk.red(`File ${fileName} doesn't exist.`));
        process.exit(1);
    }

    const document = await services.shared.workspace.LangiumDocuments.getOrCreateDocument(URI.file(path.resolve(fileName)));
    await services.shared.workspace.DocumentBuilder.build([document], { validation: true });

    // One summary for lexer, parser, and validation. The old loop only looked at
    // diagnostics with severity 1, so a syntax error could be missed and a warning
    // was invisible. Errors stop the generator. Warnings are printed and generation continues,
    // which is what you want for a style check such as "state names should be capitalized".
    const issues = getDocumentIssueSummary(document);
    if (issues.countErrors > 0) {
        console.error(chalk.red(`${document.uri.toString()}\n${issues.message}`));
        process.exit(1);
    }
    if (issues.countNonErrors > 0) {
        console.log(chalk.yellow(`${document.uri.toString()}\n${issues.message}`));
    }

    return document;
}

export async function extractAstNode<T extends AstNode>(fileName: string, extensions: readonly string[], services: LangiumCoreServices): Promise<T> {
    return (await extractDocument(fileName, extensions, services)).parseResult?.value as T;
}

interface FilePathData {
    destination: string,
    name: string
}

export function extractDestinationAndName(filePath: string, destination: string | undefined): FilePathData {
    filePath = path.basename(filePath, path.extname(filePath)).replace(/[.-]/g, '');
    return {
        destination: destination ?? path.join(path.dirname(filePath), 'generated'),
        name: path.basename(filePath)
    };
}
