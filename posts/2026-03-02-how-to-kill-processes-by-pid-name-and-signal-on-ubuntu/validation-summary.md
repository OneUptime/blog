# Validation Summary: How to Kill Processes by PID, Name, and Signal on Ubuntu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- Linux signals (SIGTERM, SIGKILL, SIGHUP, SIGINT, SIGSTOP, SIGCONT, SIGUSR1, SIGUSR2)
- `kill` (util-linux / coreutils builtin)
- `killall` (psmisc)
- `pkill` / `pgrep` (procps-ng)
- `ps`, `ss`, `lsof`, `fuser` for finding processes/ports
- Bash scripting (process state checks, timeout loops)
- systemd `systemctl reload`

## Sources Consulted
- killall(1) man page (psmisc) — verified flag semantics for `-i`, `-I`, `-v`, `-o`, `-y`, `-u`
- pgrep(1) / pkill(1) man page (procps-ng) — verified `-v` is disabled in pkill, `-f`, `-P`, `-g`, `-o`, `-n`, `-x`
- kill(1) / kill(2) — signal semantics, negative PID as process group, `kill -0` for existence check
- signal(7) — signal numbers on Linux/x86_64 (SIGSTOP=19, SIGCONT=18, SIGUSR1=10, SIGUSR2=12)
- procps-ng pkill `--help` output (confirmed no `--dry-run` flag exists)
- lsof(8), fuser(1), ss(8) for port-related commands

## Issues Found

1. **`killall -i NGINX` described as case-insensitive** — Incorrect. In killall, `-i` is `--interactive` (prompts before killing). The case-insensitive flag is `-I` (capital). Fixed to `killall -I NGINX`. The later use of `-i` for interactive mode in the same code block is correct and was left as-is.

2. **`killall -v nginx` described as "Verify without actually killing (dry run)"** — Incorrect. killall has no dry-run option; `-v` is `--verbose` which reports whether the signal was successfully sent but still kills the process. Comment updated to accurately describe `-v` as verbose reporting.

3. **`pkill --dry-run -f "my-script"`** — Incorrect. procps-ng pkill has no `--dry-run` flag (confirmed by `pkill --dry-run` returning "unrecognized option" and absence from the man page / help output). Replaced with `pgrep -af "my-script"`, which is the standard idiom for previewing what pkill would match.

4. **`pkill -u username -v -x bash` to invert match** — Incorrect. The pkill man page states `-v` (inverse) is explicitly **disabled** in pkill ("In pkill's context the short option is disabled to avoid accidental usage of the option"). Verified empirically: `pkill -v` returns "invalid option". Replaced with the correct idiom `pgrep -u username -v -x bash | xargs -r kill -TERM`, which uses pgrep (where `-v` works) and pipes PIDs to kill.

## Review Notes

- Signal numbers in the table are correct for Linux on x86/x86_64/ARM (the architectures Ubuntu ships). On Alpha/MIPS/SPARC some numbers differ, but this is well out of scope for an Ubuntu-focused post.
- The claim that SIGKILL "won't work for D state processes" is accurate in practice — the signal is queued but cannot be delivered while the task is in TASK_UNINTERRUPTIBLE; it will be delivered once the kernel I/O completes.
- `/var/run/sshd.pid` is referenced; on modern Ubuntu `/var/run` is a tmpfs symlink to `/run`, so the path resolves correctly. Worth noting `/run/sshd.pid` is the canonical modern path, but the older form still works.
- `pkill -g` is correct for matching by process group ID (per procps-ng man page).
- The graceful-then-force termination pattern, the `kill -0` existence probe, and the negative-PID process group trick are all idiomatically correct.
- `sudo systemctl reload nginx` is the preferred modern alternative to `kill -HUP` and is correctly mentioned alongside.
