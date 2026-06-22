# Validation Summary: How to Handle Process Substitution in Bash

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Bash process substitution
- Bash pipelines and subshell behavior
- GNU coreutils commands: sort, comm, join, paste, tee
- GNU diffutils commands: diff and diff3
- Git, SSH, MySQL, DNS, and Linux networking command examples

## Sources Consulted
- GNU Bash Reference Manual: Process Substitution: https://www.gnu.org/software/bash/manual/html_node/Process-Substitution.html
- GNU Bash Reference Manual: Pipelines: https://www.gnu.org/software/bash/manual/html_node/Pipelines.html
- GNU Bash local manual page for `lastpipe`, `/dev/fd`, and process substitution behavior (`man bash`)
- GNU Coreutils manual for `tee`, `paste`, `comm`, `join`, and `sort`: https://www.gnu.org/software/coreutils/manual/coreutils.html
- GNU Diffutils manual for `diff` and `diff3`: https://www.gnu.org/software/diffutils/manual/diffutils.html
- Local command help/version output for Bash 5.2.21, GNU coreutils 9.4, and GNU diffutils 3.10

## Issues Found
- Replaced the `diff3 <(...) <(...) <(...)` example with a `comm` example. On Bash systems where process substitution is implemented with pipes or `/dev/fd`, `diff3` can produce incorrect results because it may need to read inputs more than once.
- Removed the statement that `paste` requires file arguments. GNU `paste` accepts file operands and can also read standard input, so the original comment overstated the requirement.
- Changed pipeline variable-scope comments from absolute wording ("Always 0") to qualified wording ("usually") because Bash's `lastpipe` option can run the final pipeline element in the current shell when job control is disabled.
- Fixed the file descriptor limitation example so it demonstrates many simultaneous substitutions in one command instead of a loop that creates substitutions sequentially.
- Corrected the complete audit script summary comments and output label. The script counted diff output lines, not distinct configurations with differences, and the summary function did not use process substitution.
- Changed the conclusion from "Bash-specific" to "not POSIX compliant; supported by Bash and some other shells such as Zsh and ksh" to match the earlier compatibility discussion.

## Review Notes
The examples are written as illustrative shell snippets and assume the referenced files, commands, servers, and databases exist. Some examples, such as remote `cat $config` and command-string evaluation, should be adapted carefully for untrusted input in production scripts.
