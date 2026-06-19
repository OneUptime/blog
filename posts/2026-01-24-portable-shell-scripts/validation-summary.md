# Validation Summary: How to Write Portable Shell Scripts

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- POSIX shell (`sh`)
- Bash shell features
- Unix command-line utilities (`sed`, `grep`, `date`, `find`, `mktemp`, `readlink`, `realpath`)
- Linux, macOS, BSD, BusyBox/Alpine shell environments
- ShellCheck portability guidance

## Sources Consulted
- POSIX.1-2024 Shell Command Language: https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html
- POSIX `test` utility: https://pubs.opengroup.org/onlinepubs/9799919799/utilities/test.html
- POSIX `grep` utility: https://pubs.opengroup.org/onlinepubs/9799919799/utilities/grep.html
- POSIX `sed` utility: https://pubs.opengroup.org/onlinepubs/9799919799/utilities/sed.html
- POSIX `date` utility: https://pubs.opengroup.org/onlinepubs/9799919799/utilities/date.html
- POSIX `find` utility: https://pubs.opengroup.org/onlinepubs/9799919799/utilities/find.html
- POSIX `read` utility: https://pubs.opengroup.org/onlinepubs/9799919799/utilities/read.html
- GNU sed manual: https://www.gnu.org/software/sed/manual/
- GNU Coreutils `date` documentation: https://www.gnu.org/software/coreutils/manual/html_node/date-invocation.html
- FreeBSD manual pages for BSD-style utilities: https://man.freebsd.org/
- ShellCheck SC3043 (`local` is undefined in POSIX sh): https://www.shellcheck.net/wiki/SC3043

## Issues Found
- The compatibility diagram described Bash as the Linux default and zsh as the macOS default without distinguishing login or interactive shells from `/bin/sh`. Updated the labels to "Common Linux login shell" and "macOS interactive default" to avoid implying those are universal POSIX shell implementations.
- The `#!/usr/bin/env sh` example was described as recommended for maximum compatibility. Updated the wording because `#!/bin/sh` is the conventional maximum-portability shebang, while `env sh` is useful when PATH-based shell selection is desired.
- Several `#!/bin/sh` examples used `local`, which is widely supported but not specified by POSIX. Replaced those declarations with plain assignments and updated the summary table to mark `local` as non-portable.
- The temporary-file fallback used `$RANDOM`, which is not POSIX. Replaced it with a PID-based fallback using POSIX noclobber redirection.
- The recursive grep helper used `find -print0` and `xargs -0`, which are common but not POSIX. Replaced it with `find ... -exec grep ... {} +`.
- The script-directory helper was labeled POSIX-compliant while using `readlink`, which is not specified by POSIX. Updated the wording to "Common portable approach" and guarded symlink resolution on `readlink` availability.

## Review Notes
The remaining examples are appropriate for a practical portability guide: some commands such as `mktemp`, `readlink`, `realpath`, GNU `date -d`, and BSD `date -v` are not POSIX, but the post now presents them as widely available or platform-specific rather than strictly POSIX. The edited function snippets were syntax-checked with `dash -n`.
