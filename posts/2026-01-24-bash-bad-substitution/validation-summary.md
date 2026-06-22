# Validation Summary: How to Fix 'Bad Substitution' Errors in Bash

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Bash shell scripting
- POSIX `sh`
- Shell parameter expansion
- Bash arrays, arithmetic expansion, indirect expansion, and namerefs
- Common Unix utilities: `chmod`, `tr`, `basename`, `sed`

## Sources Consulted
- GNU Bash Reference Manual: https://www.gnu.org/software/bash/manual/bash.html
- POSIX Shell Command Language: https://pubs.opengroup.org/onlinepubs/9699919799/utilities/V3_chap02.html
- GNU Coreutils `basename` manual: https://www.gnu.org/software/coreutils/manual/html_node/basename-invocation.html
- GNU sed manual: https://www.gnu.org/software/sed/manual/sed.html
- Local Bash help/man output for `declare`, `let`, `set -x`, and parameter expansion behavior

## Issues Found
- The parameter expansion reference showed `${empty_var:=default}` followed immediately by `${empty_var:+alternate}` with a comment saying the variable was unset. In Bash, `:=` assigns the default value, so `${empty_var:+alternate}` then expands to `alternate`. Added `unset empty_var` before the `:+` example so the comment and behavior match.
- The debugging version-check example used `${name,,}` without defining `name` first. Added `name="HELLO"` before the feature check so the example demonstrates lowercase conversion correctly.
- The "Verify Your Shell" snippet used `$SHELL` under a comment saying it checked which shell was running. `$SHELL` usually reflects the user's login/default shell, not necessarily the interpreter executing the script. Removed that line and adjusted the comment to check Bash status via `BASH_VERSION`.

## Review Notes
The remaining examples align with current Bash parameter expansion behavior and POSIX `sh` limitations. The portable version check uses a major-version comparison, which is sufficient for the Bash 4+ features discussed.
