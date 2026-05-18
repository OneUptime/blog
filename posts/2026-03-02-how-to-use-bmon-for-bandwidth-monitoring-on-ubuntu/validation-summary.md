# Validation Summary: How to Use bmon for Bandwidth Monitoring on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- bmon (bandwidth monitor)
- Ubuntu / apt-get package management
- Bash scripting
- `/proc/net/dev` interface statistics
- systemd service units
- SSH for remote bandwidth sampling
- Comparison tools: iftop, nload, nethogs

## Sources Consulted
- bmon source code (option parsing in `src/bmon.c`): https://github.com/tgraf/bmon/blob/master/src/bmon.c
- bmon configuration defaults (`src/conf.c`): https://github.com/tgraf/bmon
- bmon format output module (`src/out_format.c`): placeholder syntax and module parameters
- bmon source tree listing for available output modules (`src/`): confirmed `ascii`, `curses`, `format`, `null`
- Linux `/proc/net/dev` field layout (kernel documentation): RX bytes at field 2, RX packets at 3, TX bytes at 10, TX packets at 11

## Issues Found

1. **Incorrect `-s 2` claim ("Set update interval to 2 seconds (default is 1)")**
   - `-s` is `--sleep-interval`, whose default is 20 ms (0.02 s), not 1 s. The flag that matches the description "update/read interval, default 1 s" is `-r` / `--read-interval`.
   - Changed `bmon -s 2` to `bmon -r 2` with corrected comment.

2. **Nonexistent `--histsize=30` option**
   - bmon has no command-line `--histsize` option. History interval/size are defined in the config (predefined "second/minute/hour/day" sets of size 60), not via a CLI flag.
   - Removed the example and replaced it with a valid one (`bmon -U` for SI units, which is also covered by a real flag).

3. **Invalid `-o plain` output module (referenced 4 times)**
   - bmon's output modules are only `ascii`, `curses`, `format`, and `null` (verified from `src/out_*.c`). There is no `plain` module.
   - Replaced all occurrences with `-o ascii` (in the "Plain Text Output" section, redirect example, and the remote SSH script). Renamed the section heading from "Plain Text Output" to "ASCII Output" to match the actual module name.

4. **Incorrect format module invocation syntax**
   - `bmon -o format:'$(...)'` is missing the required `fmt=` parameter name. The format module's parameter is `fmt`, so the correct form is `bmon -o 'format:fmt=$(...)'`.
   - Also, the "CSV Output" examples used space-separated fields, not commas, despite the section being titled CSV. Changed separators to commas to actually produce CSV.
   - Removed the `$(ts)` example because bmon's format module does not provide a `$(ts)` timestamp placeholder; replaced it with a valid `$(element:desc)` example.

5. **Misleading "current bandwidth" comment in Quick Reference**
   - The `awk 'NR==3{...}' /proc/net/dev` one-liner reads cumulative bytes since boot for whatever interface happens to be on line 3, not "current bandwidth". Updated the comment to describe what it actually does.

## Review Notes
- The build-from-source dependency list (`build-essential libconfuse-dev libnl-3-dev libnl-route-3-dev`) is correct for current bmon releases.
- The `/proc/net/dev` field offsets used by the bash scripts (`$2`, `$3`, `$10`, `$11`) are correct given that grep emits the line `<iface>: <RX bytes> <RX packets> <RX errs> ...`.
- The `-o ascii` mode is interactive/curses-like; piping it through `timeout` and `tee` will capture rendered text but contains terminal-style framing — readers using it for parsing should consider `-o 'format:fmt=...'` instead, but the underlying claim that the command runs and terminates is correct.
- The systemd unit, alert script arithmetic (rate-over-interval), and curl webhook usage are syntactically and semantically correct.
- Tool comparison claims for `nload`, `iftop`, and `nethogs` accurately describe each tool's scope.
