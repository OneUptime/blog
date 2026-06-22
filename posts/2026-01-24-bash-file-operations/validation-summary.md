# Validation Summary: How to Handle File Operations in Bash Scripts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Bash shell scripting
- GNU coreutils file utilities (`cp`, `mv`, `rm`, `mktemp`, `chmod`, `md5sum`, `realpath`)
- GNU sed and findutils
- rsync
- util-linux `flock`
- Freedesktop.org Trash specification

## Sources Consulted
- GNU Bash Reference Manual: https://www.gnu.org/software/bash/manual/
- Bash conditional expressions: https://www.gnu.org/software/bash/manual/html_node/Bash-Conditional-Expressions.html
- Bash builtins and redirection documentation: https://www.gnu.org/software/bash/manual/html_node/Bash-Builtins.html and https://www.gnu.org/software/bash/manual/html_node/Redirections.html
- GNU Coreutils manual for `cp`, `mv`, `mktemp`, `chmod`, `rm`, `md5sum`, `dirname`, and `realpath`: https://www.gnu.org/software/coreutils/manual/
- GNU sed manual / local `sed --version`: https://www.gnu.org/software/sed/
- GNU findutils local `find --version`: https://www.gnu.org/software/findutils/
- rsync 3.2.7 local `rsync --version`: https://rsync.samba.org/
- util-linux `flock(1)` manual: https://man7.org/linux/man-pages/man1/flock.1.html
- Freedesktop.org Trash Specification v1.0: https://specifications.freedesktop.org/trash/latest/
- Referenced URLs checked with HTTP requests: https://oneuptime.com, https://github.com/nawazdhandala, https://oneuptime.com/blog/post/2026-01-24-bash-set-e-error-handling, https://oneuptime.com/blog/post/2026-01-25-backup-automation

## Issues Found
- The file comparison example used `file1` and `file2` without defining them. Added example variable assignments so the snippet is self-contained.
- The "Using cat" comment said `cat` loads the file into memory. The memory issue is specifically the command substitution storing the whole output in a shell variable, so the comment was corrected.
- A line-reading example was labeled as a here-string even though it uses input redirection. Updated the label to "redirection."
- The delimited-data example was described as CSV processing, but `IFS=',' read` does not implement full CSV quoting/escaping rules. Renamed it to simple comma-delimited processing.
- The `safe_write` function did not handle `mktemp` failure explicitly. It now derives the target directory, creates a hidden temp file in that directory, and checks `mktemp` failure.
- The `safe_write` function cleared the process's existing `EXIT` trap on success. It now captures and restores the previous `EXIT` trap, or clears it only if none existed.
- The `safe_write` function used `echo` to write arbitrary content. Replaced it with `printf '%s\n'` to avoid implementation-dependent `echo` option and escape handling.
- The unsafe deletion comment said "if `$dir` is empty," which could be read as an empty directory. Clarified that the dangerous case is an empty `$dir` variable.
- The trash example called `realpath "$file"` after moving the file, so it would fail or record the wrong metadata. It now captures the original path before moving.
- The trash example created the `.trashinfo` file after moving the file, contrary to the Freedesktop.org Trash specification's ordering requirement. It now writes the metadata first, then moves the file, and removes the metadata file if the move fails.

## Review Notes
The Bash snippets were extracted from fenced code blocks and validated with `bash -n`. The examples are Linux/GNU-oriented; several options such as `cp --backup=numbered`, `chmod --reference`, and Bash negative array indexes are not portable to every POSIX shell or non-GNU userland, but they are appropriate for a Bash/Linux-focused post.
