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
    
    var expectingParameters = false;

    var allignings = [8, 32, 64, 80, 96, 108, 120, 132];
    var commandNumber = 0;

    for (var i = 0; i < words.length; i++) {
        var word = words[i];

        // Label at the string begining
        if (i == 0 && word.match("^\w+:$")) {
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
            if (word.length > 7)
                result += " ";
            else
                result += repeat(" ", 8 - word.length);
        // Parameters
        } else {
            
            if (!word.match("^\w+,$") && words[i+1] != ",") {
                expectingParameters = false;
            }

            result += word;
            if (words[i+1] != ',')
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

                // Only comment in string
                if (currentLine.text.match("^ *;.*$")) {  
                    continue;
                }

                // Empty line
                if (currentLine.isEmptyOrWhitespace) {
                    if (prevLineEmpty)
                        edits.push(vscode.TextEdit.delete(currentLine.rangeIncludingLineBreak));
                    prevLineEmpty = true;
                } else {
                    prevLineEmpty = false;
                    continue;
                }

                // Label only
                if (currentLine.text.match("^ *\\w+: *$")) {
                    edits.push(vscode.TextEdit.replace(currentLine.range, currentLine.text.trim()));
                    continue;
                }
                
                // Command string
                // label: com1 r1, r2   com2 r3, r5, r6  com3 
                var newString = correctCommandLine(currentLine.text);
            }

            return edits;
        }
    });
}

