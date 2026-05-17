# Validation Summary: How to Use trap for Signal Handling in Bash on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Bash (`trap` builtin, signal handling)
- POSIX signals (EXIT, INT, TERM, ERR, HUP, QUIT, DEBUG, KILL)
- Bash special variables (`$?`, `$$`, `$LINENO`, `$BASH_COMMAND`, `$BASH_LINENO`)
- `mktemp`, `kill`, `tar`, `wget`, `set -e/-u/-o pipefail`, `set -C` (noclobber)
- Ubuntu/Linux shell scripting

## Sources Consulted
- Bash reference manual / `man bash` (trap, BASH_LINENO, LINENO, BASH_COMMAND, FUNCNAME)
- `help trap` builtin documentation
- POSIX signal numbers (`signal(7)`)
- `mktemp(1)` man page (template requires at least 6 X's)
- Local verification via `bash -c` test cases for ERR trap and DEBUG trap behavior

## Issues Found
1. **ERR trap incorrectly described as requiring `set -e`** — The post stated `ERR - a command returned a non-zero exit code (when set -e is active)`. The ERR trap fires under the same conditions as `set -e` would cause an exit, but it works independently of whether `set -e` is enabled. Verified via `bash -c 'trap "echo fired" ERR; false'` which fires the trap with no `set -e`. Updated wording to: `fires under the same conditions as set -e, but works independently of it`.

2. **DEBUG trap example used `$BASH_LINENO` instead of `$LINENO`** — In the debugging section, the example printed `CMD[$BASH_LINENO]: $BASH_COMMAND`. `$BASH_LINENO` is an array variable that tracks line numbers where shell functions were invoked in the call stack (per the bash manual: "Use LINENO to obtain the current line number"). When accessed as `$BASH_LINENO` from a top-level DEBUG trap, it returns an empty string. Verified via test. Replaced with `$LINENO`, which correctly reports the line being executed.

## Review Notes
- The rest of the code is correct: `mktemp` templates use the required 6 X's, exit code 130 for SIGINT (128+2) is right, `kill -0` to test process existence is standard, signal numbers (1, 2, 3, 9, 15) are accurate, and the note that SIGKILL cannot be trapped is correct.
- The lock-file pattern using `set -C` (noclobber) is a valid idiom on Linux, though it is not fully atomic across NFS; for local-filesystem use on Ubuntu it works as described.
- Trapping `EXIT INT TERM` to the same handler in the "Multiple Resources" example is fine but slightly redundant — INT/TERM will trigger EXIT anyway. Not strictly wrong, so left untouched.
- `/var/run` is a tmpfs symlink to `/run` on modern Ubuntu, and `/var/lock` is a symlink to `/run/lock`. Writing to these typically requires root or appropriate permissions; the examples are illustrative and acceptable as written.
