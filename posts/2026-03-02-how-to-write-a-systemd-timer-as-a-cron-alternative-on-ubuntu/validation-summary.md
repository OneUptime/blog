# Validation Summary: How to Write a systemd Timer as a Cron Alternative on Ubuntu

## Status
validated

## Post Type
Tutorial / How-To Guide

## Technologies Covered
- systemd (unit files: `.service`, `.timer`)
- systemd timers (monotonic timers: `OnBootSec`, `OnUnitActiveSec`; calendar timers: `OnCalendar`)
- `systemctl` (daemon-reload, enable, start, status, list-timers)
- `systemd-analyze calendar`
- `systemd-run` (transient timers with `--on-active`, `--on-calendar`)
- `journalctl`
- Ubuntu / Linux shell scripting (bash)
- cron (for comparison)

## Sources Consulted
- systemd.timer(5) manual: https://manpages.ubuntu.com/manpages/jammy/en/man5/systemd.timer.5.html — verified `[Timer]` options (`OnBootSec`, `OnUnitActiveSec`, `OnCalendar`, `AccuracySec`, `RandomizedDelaySec`, `Persistent`), behavior of `Persistent=true`, and that multiple `OnCalendar=` entries may be specified in a single timer.
- systemd-run(1) manual: https://manpages.ubuntu.com/manpages/jammy/en/man1/systemd-run.1.html — confirmed `--on-active` and `--on-calendar` flags.
- systemd-analyze(1) manual: https://manpages.ubuntu.com/manpages/jammy/en/man1/systemd-analyze.1.html — confirmed `calendar` subcommand and `--iterations=N` flag.
- systemd.time(7) calendar event syntax — verified shorthand keywords (`daily`, `weekly`) and expressions such as `*:0/15`, `*:15`, `0/6:00:00`, `Mon..Fri *-*-* 08:00:00`.

## Issues Found
- **`Persistent=true` on a monotonic-only timer (Step 2, hourly-cleanup.timer).** The post originally included `Persistent=true` in a timer that uses only monotonic triggers (`OnBootSec` and `OnUnitActiveSec`). Per the systemd.timer(5) documentation, `Persistent=` only has an effect on timers configured with `OnCalendar=`. The accompanying comment ("If a run was missed (system was off), run it when the system comes back up") incorrectly attributed catch-up behavior to `Persistent=` on a monotonic timer. **Fix:** removed the ineffective `Persistent=true` line and its misleading comment from the example, and added a short clarifying note explaining that `Persistent=` applies to `OnCalendar=` timers only, while monotonic timers simply restart based on `OnBootSec=` after reboot.

## Review Notes
- The cron expression analysis for `30 4 1,15 * 5` is correct: in cron, when both day-of-month and day-of-week are specified, they are OR-ed (a well-known cron quirk), so the schedule matches the 1st OR 15th of any month OR every Friday at 04:30.
- The post recommends two separate timer files to express this OR logic. This works, but the same result can be achieved with two `OnCalendar=` lines in a single timer file (the systemd docs confirm multiple `OnCalendar=` entries are OR-ed). The post's approach is not wrong, just less concise; no change made since the example is functional.
- All `OnCalendar` examples (`daily`, `weekly`, `*:0/15`, `*:15`, `0/6:00:00`, `Mon..Fri *-*-* 18:00:00`, etc.) match the syntax defined in systemd.time(7).
- The `systemctl list-timers` column headers shown in the example output are illustrative; actual formatting varies slightly across systemd versions but the columns named (`NEXT`, `LEFT`, `LAST`, `PASSED`, `UNIT`, `ACTIVATES`) match recent systemd releases.
- `Type=oneshot` vs `Type=simple` characterization is accurate.
- The bash script in the "Complete Working Example" section is syntactically correct and uses standard commands available on Ubuntu.
