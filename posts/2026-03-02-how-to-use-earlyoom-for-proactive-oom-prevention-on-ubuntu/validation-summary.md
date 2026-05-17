# Validation Summary: How to Use earlyoom for Proactive OOM Prevention on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- earlyoom (userspace OOM daemon)
- Linux kernel OOM killer / `oom_score`, `oom_score_adj`
- systemd / systemd unit files (`OOMScoreAdjust`)
- systemd-oomd
- Ubuntu 20.04+ / 22.04+
- `/etc/default/earlyoom` configuration
- journalctl, ps, free, /proc/meminfo

## Sources Consulted
- earlyoom upstream source (rfjakob/earlyoom): https://github.com/rfjakob/earlyoom
  - `main.c` — option parsing (`short_opt = "m:s:M:S:kingN:P:dvr:ph"`) and built-in help text
  - `kill.c` — environment variables set for the `-N` notify script (EARLYOOM_PID, EARLYOOM_UID, EARLYOOM_NAME, EARLYOOM_CMDLINE)
- earlyoom upstream README and CHANGELOG (for `-k` deprecation since v1.2 and `-i` deprecation since v1.7)
- Ubuntu package `earlyoom` (in main since 20.04)
- Linux kernel docs: `Documentation/filesystems/proc.rst` — `oom_score`, `oom_score_adj` ranges (-1000 to 1000)
- systemd.exec(5) — `OOMScoreAdjust=` directive

## Issues Found

1. **`-k` option mis-described and used in examples.** The post claimed `-k` sends "SIGTERM first, wait 1 second, then SIGKILL." In modern earlyoom this option is a no-op — `main.c` prints "Option -k is ignored since earlyoom v1.2" and returns. The actual SIGTERM-then-SIGKILL behavior is governed by the `-m PERCENT,KILL_PERCENT` and `-s PERCENT,KILL_PERCENT` syntax (SIGTERM at PERCENT, SIGKILL at KILL_PERCENT which defaults to PERCENT/2). Fixed: removed `-k` from the options table, the production-server example, and the desktop-workstation example; rewrote surrounding comments to describe the actual default behavior.

2. **`-i` option mis-described.** The post said `-i` enables d-bus notifications. In modern earlyoom this option is a no-op — `main.c` prints "Option -i is ignored since earlyoom v1.7". Removed from the options table.

3. **`-n` option mis-described.** The post said `-n` "Send notifications using notify-send." Per the official help text, `-n` actually enables d-bus notifications (`args.notify = true`). Corrected.

4. **`-r` option mis-described.** The post said `-r <seconds>` is the "Poll interval in seconds." The official help text says `-r INTERVAL` is the "memory report interval in seconds (default 1), set to 0 to disable completely." Corrected.

5. **`--notify-command` does not exist.** The post used `--notify-command '/usr/local/bin/oom-notify.sh %p %n'`. earlyoom only accepts `-N /PATH/TO/SCRIPT` (no `%p`/`%n` placeholder substitution). Replaced with `-N /usr/local/bin/oom-notify.sh`.

6. **Notification script used wrong argument convention.** The post's `oom-notify.sh` read `$1` and `$2` for PID and process name. earlyoom doesn't pass positional arguments to the `-N` script — it sets environment variables `EARLYOOM_PID`, `EARLYOOM_UID`, `EARLYOOM_NAME`, `EARLYOOM_CMDLINE` (per `kill.c`). Rewrote the script to read those env vars and updated the explanatory comment.

7. **Victim-ranking claim was inaccurate.** The post said "earlyoom uses memory-mapped sizes to rank processes." Per the help text and source, earlyoom ranks by the kernel's `oom_score` by default (same as the kernel OOM killer), and uses RSS only when `--sort-by-rss` is passed. Corrected the description in the "Understanding Process Priority for Killing" section.

8. **Options table was incomplete.** While correcting the table I also added `-N`, `-g`, `-p`, `--ignore`, `--sort-by-rss`, `--ignore-root-user`, and `--dryrun` — all of which appear in the upstream help text and are useful context.

## Review Notes

- `oom_score_adj` range (-1000 to +1000), the semantics of negative vs. positive values, the use of systemd's `OOMScoreAdjust=` directive, and the `ps`/`free`/`journalctl`/`/proc/meminfo` examples are all correct.
- The comparison to `systemd-oomd` (shipped on Ubuntu 22.04+, cgroup-based, mutually exclusive in practice) is accurate.
- The `--avoid` and `--prefer` regex examples use POSIX extended regex (correct — earlyoom calls `regcomp(..., REG_EXTENDED | REG_NOSUB)`).
- Note for future readers: earlyoom dynamically adjusts its polling cadence based on memory pressure; there is no user-facing "poll interval" knob (only the report-interval knob `-r`). Worth keeping in mind if anyone asks about tuning responsiveness.
- The `-N` script runs as a child process of earlyoom and should be kept short — earlyoom waits for it (via SIGCHLD handler) but a slow notify script will delay subsequent kill decisions.
