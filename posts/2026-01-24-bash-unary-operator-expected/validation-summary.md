# Validation Summary: How to Fix 'Unary Operator Expected' Errors in Bash

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Bash
- POSIX-style `test` / `[ ]` conditionals
- Bash `[[ ]]` conditional expressions
- Bash parameter expansion
- Bash arithmetic evaluation

## Sources Consulted
- GNU Bash manual, Conditional Expressions: https://www.gnu.org/software/bash/manual/bash.html#Bash-Conditional-Expressions
- GNU Bash manual, Shell Parameter Expansion: https://www.gnu.org/software/bash/manual/bash.html#Shell-Parameter-Expansion
- GNU Bash manual, Bash Conditional Expressions / `[[ expression ]]`: https://www.gnu.org/software/bash/manual/bash.html#Conditional-Constructs
- Local Bash 5.2.21 built-in help for `test`, `[[`, and arithmetic evaluation via `help test`, `help [[`, and `man bash`

## Issues Found
- The post described `${var:+alternate}` as using the alternate value if the variable is set. With the colon form, Bash substitutes the alternate only when the parameter is set and non-null. Updated the comment to say "set and non-empty."
- The post described `${var:?error_message}` as exiting only when unset. With the colon form, Bash errors when the parameter is unset or null. Updated the comment and example note to say "unset or empty."
- The "Check If Variable Is Set First" section used `-n`, which checks for non-zero string length rather than whether a variable is merely set. Updated the heading and explanatory comments to describe checking for non-empty content.

## Review Notes
The Bash examples were syntax-checked conceptually against Bash 5.2 behavior. The `[[ ]]` examples are Bash-specific and intentionally not POSIX portable; the post already notes that distinction. Quoting variables remains a good default even in many `[[ ]]` conditions, especially when the right-hand side is another variable and literal string comparison is intended instead of pattern matching.
