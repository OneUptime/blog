# Validation Summary: How to Fix 'Division by Zero' Errors in Bash

## Status
validated

## Post Type
Technical tutorial / guide

## Technologies Covered
- Bash arithmetic expansion and integer arithmetic
- Shell scripting error handling
- GNU bc
- awk / GNU awk
- Python 3
- Standard Unix/Linux commands such as find, wc, df, date, and sleep

## Sources Consulted
- GNU Bash Reference Manual, Shell Arithmetic: https://www.gnu.org/software/bash/manual/html_node/Shell-Arithmetic.html
- GNU Bash Reference Manual, Arithmetic Expansion: https://www.gnu.org/software/bash/manual/html_node/Arithmetic-Expansion.html
- Bash 5.2.21 local builtin help for `let`, `set`, and `read`
- GNU bc manual: https://www.gnu.org/software/bc/manual/html_mono/bc.html
- GNU Awk User's Guide, printf control letters: https://www.gnu.org/software/gawk/manual/html_node/Control-Letters.html
- Python documentation, `sys.argv`: https://docs.python.org/3/library/sys.html
- Python documentation, built-in exceptions: https://docs.python.org/3/library/exceptions.html

## Issues Found
- The post claimed that, without `set -e`, a script continues after `result=$((10 / 0))`. Bash documentation says invalid arithmetic expansion does not perform the substitution and does not execute the associated command; local Bash 5.2 testing showed the script-style example exits before the following command. Updated the explanation, flowchart, and example comment.
- The displayed Bash error used `division by zero`; current Bash output uses `division by 0`. Updated the sample output.
- The `try_divide` example attempted to redirect and catch an arithmetic expansion failure inside command substitution, but the expansion error could still be emitted by the current Bash evaluation context. Updated it to run the arithmetic in a child Bash process and redirect that process's stderr.
- The `calculate_percentage` helper and `safe_percent` library function used arithmetic comparisons before validating numeric operands. Added integer and precision validation before arithmetic tests.
- The Python helper interpolated shell variables directly into Python source. Updated it to pass operands through `sys.argv`, convert with `float()`, and handle non-numeric operands explicitly.

## Review Notes
The remaining examples are consistent with Bash's integer arithmetic model and the documented use of `bc`, `awk`, and Python for decimal division. Some examples are intentionally concise and do not cover every input-validation or portability edge case, such as systems without `bc` installed or all possible `df` output formats.
