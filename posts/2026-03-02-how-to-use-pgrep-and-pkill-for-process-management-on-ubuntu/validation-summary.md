# Validation Summary: How to Use pgrep and pkill for Process Management on Ubuntu

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- pgrep (procps-ng)
- pkill (procps-ng)
- Bash shell scripting
- Linux signals (SIGTERM, SIGKILL, SIGHUP, SIGUSR1)
- Ubuntu / Linux process management

## Sources Consulted
- `pgrep --help` and `pkill --help` (procps-ng on Ubuntu)
- `man pgrep` (PGREP(1) manual page from procps-ng)
- procps-ng project documentation: https://gitlab.com/procps-ng/procps
- Linux kernel TASK_COMM_LEN definition (15 chars + NUL terminator)
- Direct CLI verification of flags and options on Ubuntu

## Issues Found
1. **`pgrep -U` mislabeled as a negation flag.** The original text said `pgrep -U root nginx  # nginx processes not owned by root` and described the section as "Find processes NOT owned by a user (negation)". This is incorrect — per the man page, `-U, --uid` matches processes whose REAL user ID is listed (as opposed to `-u, --euid` which matches effective UID). It has nothing to do with negation. Fixed the comment to correctly describe `-U` as matching the real UID rather than the effective UID.

2. **`pkill --dry-run` does not exist.** The post recommended `pkill --dry-run nginx` as a way to preview kills. Verified directly that pkill rejects this option (`pkill: unrecognized option '--dry-run'`). Replaced with a note that pkill has no dry-run option, suggesting `pgrep` first or `pkill -e` (which echoes what was killed after the fact). The `-e/--echo` flag is the closest real equivalent in procps-ng.

3. **Example output for `pgrep -l` was incorrect.** The example showed long process titles like `nginx: master process /usr/sbin/nginx` as `-l` output, but `-l` lists only the process name from `/proc/PID/comm` which is limited to 15 characters (TASK_COMM_LEN - 1). Reorganized the example so `-l` shows the short names (`nginx`) and `-a` shows the full command lines, which matches actual behavior verified against `systemd` processes on the test system.

## Review Notes
- The "first 15 characters of argv[0]" claim is slightly imprecise — the process name actually comes from the kernel's `comm` field in `/proc/PID/stat`, which is initialized from the executable basename and can be modified via `prctl(PR_SET_NAME)`. The 15-character limit is correct. Left as-is since the practical implication for readers is accurate.
- `pkill -HUP -x nginx` example for nginx reload: works because all nginx processes have comm `nginx`, so all receive SIGHUP. Only the master meaningfully acts on it. Technically correct.
- The exit codes section omits codes 2 (syntax error) and 3 (fatal error) but the simplification (0 = match found, 1 = no match) is appropriate for scripting examples.
- Process monitor script uses unquoted `$PROCESS_CMD` expansion intentionally to allow word-splitting of args; this is a known shellcheck warning but is correct for this use case.
