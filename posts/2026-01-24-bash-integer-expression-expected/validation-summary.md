# Validation Summary: How to Fix 'Integer Expression Expected' Errors

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Bash
- Shell scripting
- Bash conditional expressions and arithmetic evaluation
- `test` / `[` numeric comparison operators
- `[[ ... =~ ... ]]` regular expression matching
- `bc`
- `awk`

## Sources Consulted
- GNU Bash Reference Manual: Bash Conditional Expressions - https://www.gnu.org/software/bash/manual/html_node/Bash-Conditional-Expressions.html
- GNU Bash Reference Manual: Conditional Constructs - https://www.gnu.org/software/bash/manual/html_node/Conditional-Constructs.html
- GNU Bash Reference Manual: Shell Arithmetic - https://www.gnu.org/software/bash/manual/html_node/Shell-Arithmetic.html
- GNU Bash Reference Manual: Bash Builtins - https://www.gnu.org/software/bash/manual/html_node/Bash-Builtins.html
- Local Bash built-in documentation from `help test`, `help [[`, and `help ((` on GNU Bash 5.2.21
- GNU bc manual: Boolean Expressions / relational results - https://www.gnu.org/software/bc/manual/html_node/bc_12.html
- POSIX awk utility specification - https://pubs.opengroup.org/onlinepubs/7908799/xcu/awk.html

## Issues Found
- The post said a "number with spaces" can cause `integer expression expected` and showed leading/trailing whitespace as the example. In Bash, `[ "$count" -gt 0 ]` accepts quoted leading/trailing whitespace around an integer, and `(( count > 0 ))` also handles that case. I changed the wording and diagram to refer specifically to embedded whitespace, updated the failing example to `count="4 2"`, and narrowed the arithmetic expansion note to leading/trailing whitespace.
- The empty-variable example used `[ $count -gt 0 ]`, which fails with `unary operator expected`, not the article's `integer expression expected` message. I changed it to `[ "$count" -gt 0 ]`, which matches the documented issue while still demonstrating the need for a default value or arithmetic evaluation.
- The user-input validation example accepted `0` with `^[0-9]+$` and the later range check allowed `0`, but the error message said "positive integer." I changed the message to "non-negative integer" to match the actual validation.

## Review Notes
- The `awk "BEGIN {exit !($value > 3)}"` example is technically valid for controlled numeric values, but interpolating untrusted input directly into an awk program can be unsafe. A future improvement could pass values with `awk -v` after validation.
- The `bc` example assumes a `bc` implementation that supports relational expressions returning `0` or `1`, which is true for GNU bc and common modern implementations.
