'use strict';

import * as vscode from 'vscode';

function repeat(line: string, amount: number) : string {
    var result = "";
    for (; amount > 0; amount--) {
        result += line;
    }
    return result;
}

function correctCommandLine(line: string) : string {
    var result = "";
    var words = line.split(" ");

    // Remove all empty words
    words = words.filter(
        (value: string, index:number, array: string[]) => {
            return value != "";
        }
    )

    var expectingParameters = false;

    var allignings = [8, 32, 64, 80, 96, 108, 120, 132];
    var commandNumber = 0;

    for (var i = 0; i < words.length; i++) {

        var word = words[i];

        if (word == "")
            continue;

        // Label at the string begining
        if (i == 0 && word.match("^\\w+:$")) {
            result += word;
            if (word.length > 7)
                result += "\n";     // TROUBLE WITH IT - INCORRECT ACTUAL LENGTH OF STRING
            else {
                result += repeat(" ", 8 - word.length);
            }
            continue;
        }

        // Command
        if (!expectingParameters) {

            var allign = allignings[commandNumber];
            result += repeat(" ", allign - result.length);

            commandNumber++;

            result += word;
            result += " ";

            expectingParameters = true;
        // Parameters
        } else {

            if (!word.match("^[\\w\\+\\*\\(\\)]*,$") && words[i+1] != ",") {
                expectingParameters = false;
            }

            result += word;
            result += " ";
        }

    }

    return result;
}

export function activate(context: vscode.ExtensionContext) {

    vscode.languages.registerDocumentFormattingEditProvider('asm', {
        provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {

            var prevLineEmpty = false;
            var edits = [];

            for (var i = 0; i < document.lineCount; i++) {
                var currentLine = document.lineAt(i);

                // Empty line
                if (currentLine.isEmptyOrWhitespace) {
                    if (prevLineEmpty)
                        edits.push(vscode.TextEdit.delete(currentLine.rangeIncludingLineBreak));
                    prevLineEmpty = true;
                    continue;
                } else {
                    prevLineEmpty = false;
                }

                // Only comment in string
                if (currentLine.text.match("^\\s*\\/?[;*].*$")) {
                    continue;
                }

                // Directive string
                if (currentLine.text.match("^\\s*\\.")) {
                    continue;
                }

                // Label only
                if (currentLine.text.match("^\\s*\\w+:\\s*$")) {
                    edits.push(vscode.TextEdit.replace(currentLine.range, currentLine.text.trim()));
                    continue;
                }

                // Command string
                // label: com1 r1, r2   com2 r3, r5, r6  com3
                var str = currentLine.text;
                var newString = correctCommandLine(str);
                edits.push(vscode.TextEdit.replace(currentLine.range, newString));
            }

            return edits;
        }
    });
}

