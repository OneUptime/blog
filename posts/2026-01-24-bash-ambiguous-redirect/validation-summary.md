# Validation Summary: How to Fix 'Ambiguous Redirect' Errors in Bash

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Bash shell scripting
- Bash redirection
- Bash parameter expansion
- Bash `set` options
- POSIX `tee`

## Sources Consulted
- GNU Bash Reference Manual: Redirections - https://www.gnu.org/software/bash/manual/html_node/Redirections.html
- GNU Bash Reference Manual: The Set Builtin - https://www.gnu.org/software/bash/manual/html_node/The-Set-Builtin.html
- GNU Bash Reference Manual: Shell Parameter Expansion - https://www.gnu.org/software/bash/manual/html_node/Shell-Parameter-Expansion.html
- POSIX `tee` utility specification - https://pubs.opengroup.org/onlinepubs/9699919799/utilities/tee.html
- Local GNU Bash 5.2.21 behavior checks using `bash -c`

## Issues Found
- The "Empty or Unset Variable" example presented the default-value pattern and the "check if variable is set" pattern in one continuous snippet using the same `output_file` variable. After the default assignment, `output_file` is always non-empty, so the later check no longer demonstrates the unset/empty-variable case. I changed the check example to use `custom_output_file`, keeping the intended alternative pattern accurate.
- The unset-variable checks used direct parameter expansion. That is fine in default Bash settings, but the post later recommends `set -u`, where expanding an unset variable raises an error. I changed the checks to use `${var:-}` so they safely test unset or empty variables even when `nounset` is enabled.

## Review Notes
The main technical claims are consistent with Bash behavior: Bash applies expansions to redirection targets and reports an error when the target expands ambiguously; quoting variables prevents word splitting for filenames containing spaces; `tee` is appropriate when output should be written to multiple files; and `set -u` catches unset variables during parameter expansion before redirection is attempted.
