# Validation Summary: How to Fix 'Redirection' Errors in Bash

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Bash redirection
- Bash here documents and here strings
- Bash process substitution
- Bash file descriptor management
- GNU Coreutils commands: timeout, tee, mktemp, stat
- POSIX shell portability considerations

## Sources Consulted
- GNU Bash Reference Manual, Redirections: https://www.gnu.org/software/bash/manual/bash.html#Redirections
- GNU Bash Reference Manual, Process Substitution: https://www.gnu.org/software/bash/manual/bash.html#Process-Substitution
- GNU Coreutils manual, timeout invocation: https://www.gnu.org/software/coreutils/manual/html_node/timeout-invocation.html
- GNU Coreutils manual, tee invocation: https://www.gnu.org/software/coreutils/manual/html_node/tee-invocation.html
- GNU Coreutils manual, mktemp invocation: https://www.gnu.org/software/coreutils/manual/html_node/mktemp-invocation.html
- Local Bash 5.2.21 and GNU Coreutils help output for command behavior checks

## Issues Found
- The here-string example said unquoted here-string input with spaces undergoes word splitting. Bash documentation says here-string words do not undergo word splitting or filename expansion, so this was corrected to explain that quoting is for clarity and consistency rather than to prevent splitting in this specific syntax.
- The process substitution section implied `echo "data" > >(cat)` does not work. Bash documentation defines `>(list)` as output process substitution where writing to the generated file provides input to the list, so the text was corrected to note that it is valid but asynchronous.
- The permission-denied example checked an existing output file but did not explicitly check that the parent directory was writable before trying to create a new file. A parent-directory writability check was added.
- The atomic write helper did not handle `mktemp` failure before using the temp path. A failure check was added.
- The multi-file `tee` helper built an unused pipeline string and then used `tee` directly. The unused code and inaccurate process-substitution comment were removed, leaving the correct direct `tee "${files[@]}"` pattern.

## Review Notes
The examples are Bash-specific in several places, which is appropriate for the post. `timeout`, GNU-style `stat -c`, `/proc/$$/fd`, and `mktemp` behavior vary across non-GNU Unix systems, but the post is tagged Linux and includes a BSD-style `stat -f` fallback in one diagnostic example.
