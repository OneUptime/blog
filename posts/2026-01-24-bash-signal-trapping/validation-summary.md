# Validation Summary: How to Handle Signal Trapping in Bash

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Bash shell scripting
- Unix/Linux signals
- Bash `trap`, `EXIT`, `ERR`, and `DEBUG` handlers
- Linux process management commands such as `kill`, `wait`, and `mktemp`

## Sources Consulted
- GNU Bash Reference Manual: Bourne Shell Builtins, including `trap`, `exit`, `false`, and `eval` behavior: https://www.gnu.org/software/bash/manual/html_node/Bourne-Shell-Builtins.html
- GNU Bash Reference Manual: Signals: https://www.gnu.org/software/bash/manual/html_node/Signals.html
- Linux `bash(1)` manual on command execution environments, subshells, signal handling, `set -e`, and trap inheritance: https://man7.org/linux/man-pages/man1/bash.1.html
- Linux `signal(7)` manual on signal default actions, signal numbering, and uncatchable `SIGKILL`/`SIGSTOP`: https://man7.org/linux/man-pages/man7/signal.7.html
- Local GNU Bash 5.2.21 `help trap`, `help set`, `kill -l`, and `bash -n` syntax checks.

## Issues Found
- The post implied signal numbers were universal. Added a note that the listed signal numbers are common Linux x86/ARM values because `signal(7)` documents architecture-specific differences.
- The `EXIT` section overstated that cleanup runs for any exit reason. Updated it to clarify that `EXIT` runs when the shell exits, but uncatchable signals such as `SIGKILL` and `SIGSTOP` cannot run cleanup.
- The temporary-file examples used command substitution to call a function that mutates the `TEMP_FILES` array. Because command substitutions run in subshells, the parent array would not be updated. Reworked those helpers to assign through `printf -v` in the current shell.
- The preserving-exit-codes example used `false` without `set -e`, so the script would not exit where described. Added `set -e` and adjusted the comment.
- The `ERR` trap description incorrectly tied `ERR` only to `set -e`. Updated it to reflect Bash's documented behavior: `ERR` follows the same exception conditions as `errexit`.
- The signal-handler test accepted an expected output argument but never checked it. Updated the example to capture output and verify the expected string.
- The complete trap template captured `$?` after assignments, losing the original exit status. Moved exit-code capture to the start of cleanup and passed explicit signal/error statuses from handlers.
- The subshell example used `$$` as if it changed in subshells. Replaced it with `BASHPID` and corrected the wording to match Bash's documented trap reset behavior in subshell environments.

## Review Notes
All Bash code blocks were extracted and checked with `bash -n`. The examples are Bash-specific and use Bash features such as arrays, `[[ ... ]]`, negative array indexes, and `printf -v`, so `/bin/bash` is the appropriate shebang.
