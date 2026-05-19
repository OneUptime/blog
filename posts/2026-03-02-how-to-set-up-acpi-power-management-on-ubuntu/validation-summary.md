# Validation Summary: How to Set Up ACPI Power Management on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ACPI (Advanced Configuration and Power Interface)
- acpid (ACPI events daemon)
- acpi / acpitool CLI utilities
- acpica-tools (acpidump, acpixtract, iasl)
- systemd-logind (logind.conf)
- Linux thermal subsystem (/sys/class/thermal)
- Linux power supply subsystem (/sys/class/power_supply)
- cpupower (CPU frequency governor)
- Ubuntu (server/desktop)

## Sources Consulted
- [Ubuntu package: acpitool](https://packages.ubuntu.com/) — confirmed the correct package name is `acpitool` (singular), not `acpitools`.
- [logind.conf(5) man page](https://man7.org/linux/man-pages/man5/logind.conf.5.html) — verified valid `Handle*Key`/`HandleLidSwitch*` directives and `HoldoffTimeoutSec` semantics.
- [systemd issue #28353 — apply HoldoffTimeoutSec to buttons](https://github.com/systemd/systemd/issues/28353) — confirmed `HoldoffTimeoutSec` is a holdoff after startup/resume for lid events (not a power-key long-press timer).
- [acpid(8) man page](https://linux.die.net/man/8/acpid) — verified acpid flag list; confirmed there is no `--test` flag, but `-f` (foreground) and `-d` (debug) are valid.
- [acpi_listen(8)](https://manpages.ubuntu.com/) — confirmed `-s` socket flag is valid.
- ACPI specification — verified thermal trip point types (critical, hot, active, passive).
- acpica-tools documentation — verified `acpidump -o`, `acpixtract -a`, and `iasl -d` flag usage.

## Issues Found
1. **Incorrect package name `acpitools`** — The Ubuntu package is `acpitool` (singular). Installing `acpitools` would fail with "Unable to locate package". Changed to `acpitool`.
2. **Misleading comment on `acpi -V`** — Original comment was "List current ACPI events". `acpi -V` shows all ACPI device information (battery, AC adapter, thermal, cooling), not events. Updated comment to "Show all ACPI information" to match what the command actually does (and to be consistent with the same command used later in the post).
3. **Incorrect comment on `HoldoffTimeoutSec`** — Original comment described it as "How long power key must be held for long-press action". This is wrong; `HoldoffTimeoutSec` is the period after system startup or resume during which logind will hold off reacting to lid-switch events (so external monitors/docks can be detected first). The example value `0` would also disable the holdoff entirely. Updated the comment to describe the actual semantics and changed the example value to the documented default of `30s`.
4. **Invalid flag `acpid --test`** — `acpid` does not provide a `--test` option; running it would fail. Replaced with `sudo acpid -f -d`, which runs acpid in the foreground with debug output and is the standard way to validate the event/handler configuration interactively.

## Review Notes
- The `acpi-support` package is being phased out and is no longer present in Ubuntu 24.04 (Noble). The package is still useful on older Ubuntu LTS releases (22.04 and earlier), and `apt install` on a newer release will simply fail for that one package without affecting the others, so the install line was left as-is. Readers on 24.04+ may need to drop `acpi-support` from the install command.
- The AC adapter sysfs path `/sys/class/power_supply/AC0/online` may vary by hardware (commonly `AC`, `AC0`, or `ACAD`). The script tolerates this with `2>/dev/null || echo "unknown"`, which is acceptable.
- The post's `cpupower` example in the AC adapter handler targets desktop/laptop scenarios; on a true server (no battery) this section is mostly illustrative, which is reasonable in context.
- `journalctl -u acpid` works but events that go through the kernel input layer (when acpid is run with `-n/--netlink`) won't necessarily show in the acpid journal — `journalctl -k | grep -i acpi` (already shown later in the post) is the complementary source.
