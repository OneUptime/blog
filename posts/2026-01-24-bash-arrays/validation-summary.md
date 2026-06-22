# Validation Summary: How to Handle Arrays in Bash Scripts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Bash indexed arrays
- Bash associative arrays
- Bash parameter expansion
- Bash builtins: `declare`, `local`, `read`, `mapfile`
- Shell scripting patterns for iteration, sorting, parsing, and log analysis
- GNU `sort`

## Sources Consulted
- GNU Bash Reference Manual: Arrays - https://www.gnu.org/software/bash/manual/html_node/Arrays.html
- GNU Bash Reference Manual: Shell Parameter Expansion - https://www.gnu.org/software/bash/manual/html_node/Shell-Parameter-Expansion.html
- GNU Bash Reference Manual: Bash Conditional Expressions - https://www.gnu.org/software/bash/manual/html_node/Bash-Conditional-Expressions.html
- GNU Bash Reference Manual: Bash Builtin Commands - https://www.gnu.org/software/bash/manual/html_node/Bash-Builtins.html
- Bash CHANGES file maintained by Chet Ramey - https://tiswww.case.edu/php/chet/bash/CHANGES
- Local GNU Bash 5.2.21 `help declare` and `man bash`

## Issues Found
- The post described indexed arrays as "Bash 3.0+". Bash indexed arrays are a built-in Bash feature, while the examples that use `local -n` namerefs require Bash 4.3+. Updated the intro and diagram to avoid an inaccurate minimum-version claim and added the nameref version caveat.
- The `files=($(ls *.txt 2>/dev/null))` example was unsafe for filenames containing whitespace and relied on parsing `ls` output. Replaced it with a `nullglob` plus glob-array assignment example.
- The C-style and `while` index loops were presented generally, but they only work correctly for contiguous indexed arrays. Added that caveat to the method comments.
- Sorting examples used `IFS=$'\n' array=($(sort <<< "${array[*]}"))`, which can split elements incorrectly and mutates `IFS`. Replaced them with `mapfile -t` plus `printf "%s\n" "${array[@]}" | sort`.
- The array operations diagram showed invalid loop pseudo-syntax (`for i in arr[@]` and `for i in !arr[@]`). Updated the labels to show the correct array expansions.
- The best-practices example said `[[ -v my_array[@] ]]` checks whether an array is set. Per Bash documentation, for indexed arrays with `@` or `*`, this checks whether the array has any set elements. Updated the comment and output text.

## Review Notes
The remaining examples are syntactically valid Bash. Several helper functions intentionally target simple tutorial data, not every edge case, such as values containing newlines or command-line parsing of negative numeric arguments.
