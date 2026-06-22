# Validation Summary: How to Write and Debug Bash Scripts on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Bash scripting
- GNU Bash builtins and shell syntax
- GNU Coreutils commands such as `chmod` and `env`
- GNU Findutils `find`
- ShellCheck
- Linux command-line utilities including `top`, `df`, `free`, `systemctl`, `awk`, and redirection/process substitution

## Sources Consulted
- GNU Bash Reference Manual - Redirections: https://www.gnu.org/software/bash/manual/html_node/Redirections.html
- GNU Bash Reference Manual - Conditional Constructs: https://www.gnu.org/software/bash/manual/html_node/Conditional-Constructs.html
- GNU Bash Reference Manual - Bash Conditional Expressions: https://www.gnu.org/software/bash/manual/html_node/Bash-Conditional-Expressions.html
- GNU Bash Reference Manual - Shell Arithmetic: https://www.gnu.org/software/bash/manual/html_node/Shell-Arithmetic.html
- GNU Bash Reference Manual - Bash Variables: https://www.gnu.org/software/bash/manual/html_node/Bash-Variables.html
- GNU Coreutils Manual - `chmod`: https://www.gnu.org/software/coreutils/manual/html_node/chmod-invocation.html
- GNU Coreutils Manual - `env`: https://www.gnu.org/software/coreutils/manual/html_node/env-invocation.html
- GNU Findutils Manual - Combining Primaries With Operators: https://www.gnu.org/software/findutils/manual/html_node/find_html/Combining-Primaries-With-Operators.html
- ShellCheck Wiki - SC2086: https://www.shellcheck.net/wiki/SC2086
- ShellCheck Wiki - SC1125: https://www.shellcheck.net/wiki/SC1125
- ShellCheck Wiki - SC2310: https://www.shellcheck.net/wiki/SC2310
- Local GNU Bash 5.2.21 builtin help for `set`, `trap`, and `declare`
- Local GNU Findutils 4.9.0 `find --help`
- Local GNU Coreutils 9.4 `chmod --version` and `env --version`

## Issues Found
- The redirection example used `command 2>&1 > all_output.log` while saying it redirected both stdout and stderr to the same file. Bash processes redirections left to right, so that form redirects only stdout to the file and leaves stderr pointed at the previous stdout. I changed it to `command > all_output.log 2>&1`.
- The file-test example referenced `file1` and `file2` without defining them, and used `/usr/bin/python`, which is not guaranteed to exist on modern Ubuntu systems. I added `file1` and `file2` assignments and changed the symlink example to `/usr/bin/python3`.
- The debug-output example redirected stderr to `debug.log` and then claimed stderr still went to the terminal when demonstrating `BASH_XTRACEFD`. I restored stderr after the first example and used a separate file descriptor for `BASH_XTRACEFD`.
- The breakpoint helper used bare `read`. I changed it to `read -r` so backslashes are not treated as escapes.
- The ShellCheck CI script used a `find` expression whose `-o` precedence meant `*.sh` files could be matched without being printed. It also split the script list on whitespace. I rewrote it as a `while IFS= read -r` loop with grouped `find` predicates.
- The argument parsing example read `$2` for `--output` under `set -u` without first checking that the option argument existed. I added a missing-argument check.
- The logging helper computed a timestamp variable but called `timestamp` again when writing messages. I changed the output to use the captured `$timestamp` consistently.
- The complete health-check example estimated CPU usage from the user CPU field in `top`, not total non-idle CPU. I changed it to derive usage from the idle percentage.
- The complete health-check example used `bc` for a floating-point comparison without documenting that dependency. I replaced the comparison with `awk`, which the script already uses.
- The complete health-check example used post-increment arithmetic such as `((total_issues++))` under `set -e`. In Bash, arithmetic commands return status 1 when the expression evaluates to zero, so this could terminate the script on the first issue. I changed those increments to `((++total_issues))` or additive forms that return success for nonzero totals, and made the internal issue counters use pre-increment.

## Review Notes
- The post is technically relevant and code-heavy, so it was reviewed as a Bash tutorial.
- The examples are syntactically valid after the edits; I checked all 52 fenced Bash snippets with `bash -n`.
- Some introductory snippets intentionally favor readability over production hardening. Future improvements could add more quoting and NUL-delimited file handling examples for filenames containing whitespace or newlines, but the current post is technically accurate after the corrections above.
