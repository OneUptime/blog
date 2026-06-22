# Validation Summary: How to Fix 'Broken Pipe' Errors in Bash Pipelines

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Bash pipelines and shell scripting
- Linux pipes, SIGPIPE, and EPIPE
- GNU coreutils commands including `cat`, `head`, `tail`, `tac`, and `yes`
- GNU grep
- GNU sed and awk-style early exits
- `strace` debugging

## Sources Consulted
- GNU Bash Reference Manual: Pipelines: https://www.gnu.org/software/bash/manual/html_node/Pipelines.html
- Linux `pipe(7)` manual page: https://man7.org/linux/man-pages/man7/pipe.7.html
- Linux `bash(1)` manual page, `PIPESTATUS`: https://man7.org/linux/man-pages/man1/bash.1.html
- GNU Grep Manual: https://www.gnu.org/software/grep/manual/grep.html
- GNU Coreutils Manual: https://www.gnu.org/software/coreutils/manual/coreutils.html
- Linux `sed(1)` manual page: https://man7.org/linux/man-pages/man1/sed.1.html
- Local command checks with GNU Bash 5.2.21, GNU coreutils 9.4, and GNU grep 3.11.

## Issues Found
- The `cat /var/log/syslog | head` explanation said `cat` reads the entire file. Changed it to say `cat` writes until the pipe closes, which matches pipe/SIGPIPE behavior.
- The first `PIPESTATUS` example used `${PIPESTATUS[0]}` after an intervening `echo`, which overwrites `PIPESTATUS`. Changed the example to save the array immediately after the pipeline.
- The SIGPIPE trap example implied ignoring `SIGPIPE` makes broken pipes disappear. Updated it to explain that inherited ignored SIGPIPE can produce write errors instead.
- The generic `safe_pipeline` wrapper could not inspect the inner pipeline status it claimed to handle. Replaced it with a foreground pipeline and immediate `PIPESTATUS` capture example.
- The process substitution section claimed SIGPIPE was avoided. Updated it to say the main command's status is separated from the producer's possible SIGPIPE.
- The flowchart implied `pipefail` tracks all exit codes. Updated it to describe the rightmost non-zero aggregate status; `PIPESTATUS` remains the per-stage mechanism.
- The `sed -n '/pattern/p;q'` example quit after the first input line, not the first matching line. Changed it to `sed -n '/pattern/{p;q;}'`.
- The log-processing example claimed `tac | grep -m` avoids broken pipe. Updated the comments to note that `tac` may still receive SIGPIPE after `grep` has enough matches.
- The checkpoint example checked for broken pipe on a file redirection with no upstream pipe. Changed it to pipe the checkpoint file into `load_data` under `pipefail`.
- The interactive pager example attributed broken pipe to `less`. Updated it so `grep` is the producer that may receive SIGPIPE, with `pipefail` scoped to a subshell.
- The `eval`-based pipeline wrappers claimed to capture all per-stage exit codes. Updated them to use aggregate `pipefail` status and describe that limitation accurately.

## Review Notes
- Several examples use GNU-specific options such as `grep --line-buffered`; this is appropriate for the Linux/GNU context of the article but would need portability notes for POSIX-only shell environments.
