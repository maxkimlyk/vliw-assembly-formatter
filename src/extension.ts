'use strict';

import * as vscode from 'vscode';

function repeat(line: string, amount: number) : string {
    var result = "";
    for (; amount > 0; amount--) {
        result += line;
    }
    return result;
}

class AlligningsChanged extends Error {}

class Formatter {

    private allignings = [8, 40, 72, 96, 120, 136, 152, 168];

    public dispose() : any {
        // Do nothing
    }

    public formatDocument(document: vscode.TextDocument): vscode.TextEdit[] {
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

            try {
                var edit = this.formatNotEmptyLine(currentLine);
                if (edit != null) {
                    edits.push(edit);
                }
            } catch (e) {
                if (e instanceof AlligningsChanged) {
                    // Reformat document
                    return this.formatDocument(document);
                }
            }
        }

        return edits;
    }

    private formatNotEmptyLine(currentLine: vscode.TextLine) : vscode.TextEdit {
        var postfix = "";
        var commandString = currentLine.text;

        // Only comment in string
        if (commandString.match("^\\s*\\/?[;*].*$")) {
            return null;
        }

        // Directive string
        if (commandString.match("^\\s*\\.")) {
            return null;
        }

        // Label only
        if (commandString.match("^\\s*\\w+:\\s*$")) {
            return vscode.TextEdit.replace(currentLine.range, commandString.trim());
        }

        // Comment at the end of string
        var commentIndex = commandString.indexOf(";");
        if (commentIndex > 0) {
            var commentString = currentLine.text.substr(commentIndex);
            commandString = currentLine.text.substr(0, commentIndex);
            postfix = commentString;
        }

        // Command string
        if (!commandString.match(",") && !commandString.match("^\\s*(br|b|j|jmp)(\\.p\\d)? ")) {
            var newString = this.formatCommandLineWithoutSeparators(commandString);
        } else {
            var newString = this.formatRegularCommandLine(commandString);
        }

        if (postfix != "") {
            newString = newString + " " + commentString;
        }

        return vscode.TextEdit.replace(currentLine.range, newString);
    }

    private formatCommandLineWithoutSeparators(line: string) : string {
        var result = repeat(" ", 8);
        var words = line.split(" ");

        // Remove all empty words
        words = words.filter(
            (value: string, index: number, array: string[]) => {
                return value != "";
            }
        )

        for (var i = 0; i < words.length; i++) {
            result += words[i];
            if (i != words.length - 1)
                result += " ";
        }

        return result;
    }

    private formatRegularCommandLine(line: string) : string {
        var result = "";
        var resultPrefix = "";
        var words = line.split(" ");

        // Remove all empty words
        words = words.filter(
            (value: string, index:number, array: string[]) => {
                return value != "";
            }
        )

        var expectingParameters = false;
        var commandNumber = 0;
        var prevWordIsLabel = false;
        var comment = false;
        var bracketCount = 0;

        for (var i = 0; i < words.length; i++) {

            var word = words[i];

            if (word == "")
                continue;

            // Label at the string begining
            if (i == 0 && word.match("^\\\\?[\\w]+:")) {
                if (word.length > 7) {
                    resultPrefix += word;
                    resultPrefix += "\n";
                } else {
                    result += word + repeat(" ", 8 - word.length);
                    prevWordIsLabel = true;
                }
                continue;
            }

            // Check brackets
            var openingBracketMatch = word.match("\\(");
            var closingBracketMatch = word.match("\\)");
            if (openingBracketMatch != null)
                bracketCount += openingBracketMatch.length;
            if (closingBracketMatch != null)
                bracketCount -= closingBracketMatch.length;

            // Command
            if (!expectingParameters) {

                var allign = this.allignings[commandNumber];
                var whitespacesNecessary = allign - result.length;

                // Must be at least 4 whitespaces between commands
                if (!prevWordIsLabel && whitespacesNecessary < 4) {

                    if (allign < result.length)
                        var addToAlign = Math.ceil((result.length - allign) / 4.0) * 4 + 4;
                    else var addToAlign = 4;

                    allign += addToAlign;
                    for (var k = commandNumber; k < this.allignings.length; k++) {
                        this.allignings[k] += addToAlign;
                    }

                    throw new AlligningsChanged();
                }

                result += repeat(" ", allign - result.length);

                commandNumber++;

                result += word;

                if (word.length > 7)
                    result += " ";
                else
                    result += repeat(" ", 8 - word.length);

                prevWordIsLabel = false;
                expectingParameters = true;
            // Parameters
            } else {

                result += word;

                if (!word.match("^[^,]*,$") && words[i+1] != "," && bracketCount <= 0) {
                    expectingParameters = false;
                    continue;
                }

                result += " ";
            }

        }

        return resultPrefix + result;
    }
}

export function activate(context: vscode.ExtensionContext) {

    vscode.languages.registerDocumentFormattingEditProvider('asm', {
        provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {
            var formatter = new Formatter();
            context.subscriptions.push(formatter);
            return formatter.formatDocument(document);
        }
    });
}
