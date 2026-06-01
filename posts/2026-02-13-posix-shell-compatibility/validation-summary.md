# Validation Summary: Writing POSIX-Compatible Shell Scripts for Maximum Portability

## Status
validated

## Post Type
Guide

## Technologies Covered
- POSIX shell (`sh`)
- Bash shell extensions
- Shell built-ins and utilities (`test`, `command`, `trap`, `printf`, `awk`, `tr`)
- ShellCheck
- Docker-based shell testing

## Sources Consulted
- POSIX.1-2024 Shell Command Language: https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html
- POSIX `command` utility: https://pubs.opengroup.org/onlinepubs/9799919799.2024edition/utilities/command.html
- POSIX `test` utility: https://pubs.opengroup.org/onlinepubs/9699919799/utilities/test.html
- POSIX `trap` utility: https://pubs.opengroup.org/onlinepubs/009604399/utilities/trap.html
- ShellCheck documentation: https://www.shellcheck.net/ and https://www.shellcheck.net/wiki/SC2148
- Docker `run` reference: https://docs.docker.com/reference/cli/docker/container/run/

## Issues Found
- Replaced `echo "$input" | tr ...` with `printf '%s\n' "$input" | tr ...` because POSIX `echo` has implementation-defined behavior for some inputs, while `printf` is the portable choice for arbitrary string data.
- Replaced the here-string alternative `name=$(printf '%s' "$input")` with a here document using `IFS= read -r`, because the original did not match the behavior of `read -r name <<< "$input"`.
- Replaced `echo` with `printf` in the floating-point `awk` example for the same POSIX portability reason.
- Changed the process-substitution replacement to create a temporary directory with `mkdir`, use quoted temporary file paths, and clean up with `trap`, avoiding unsafe direct `/tmp/file.$$` paths.
- Tightened broad portability claims about "every Unix-like system" and "runs everywhere" to POSIX-conforming systems and common Unix-like environments.
- Clarified that `==` in `[ ... ]` is a non-POSIX extension and that `source` is a Bash synonym rather than a POSIX command.
- Clarified that `dash` testing is a strong portability signal, not a proof of POSIX compliance.
- Fixed the Docker testing comment so it matches the two images actually used in the loop.
- Added missing-value guards to the complete deploy script's option parser so it behaves predictably under `set -u`.
- Qualified the final portability claim for the complete script to shell semantics and the presence of required external commands.

## Review Notes
The corrected examples were syntax-checked with `dash -n` where applicable. ShellCheck was not installed in the local environment, so ShellCheck behavior was verified against its public documentation rather than by running the command locally.
