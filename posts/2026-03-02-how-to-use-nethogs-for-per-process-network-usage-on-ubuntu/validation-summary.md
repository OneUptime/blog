# Validation Summary: How to Use nethogs for Per-Process Network Usage on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- nethogs (per-process network monitor)
- Ubuntu (22.04 / 24.04)
- systemd (service unit)
- logrotate
- Related tools mentioned for comparison: iftop, nload, ss, netstat, tcpdump, lsof

## Sources Consulted
- nethogs upstream repository: https://github.com/raboof/nethogs
- nethogs man page source: https://github.com/raboof/nethogs/blob/master/src/nethogs.8
- nethogs main.cpp getopt string and option handling (source of truth for supported flags)
- nethogs cui.cpp (display column header and keyboard handler)
- nethogs Line::log() in the source (tracemode output format)
- Ubuntu package metadata: nethogs 0.8.7-2build2 (universe/net) via `apt-cache show nethogs`

## Issues Found
1. **`nethogs --version` is not a valid flag.** nethogs uses getopt with only single-character options (getopt string: `Vhxtpsd:v:c:laf:Cbg:P:`); no long options are defined. Fixed by changing to `nethogs -V`.
2. **The `-v` flag was incorrectly described as a traffic threshold filter.** In reality, `-v` selects the view mode (display units): `0` = KB/s (default), `1` = total KB, `2` = total bytes, `3` = total MB, `4` = MB/s, `5` = GB/s. nethogs has no flag for filtering processes below a minimum traffic rate. The misleading "Setting a Threshold" subsection was replaced with an accurate "Changing the Display Units" subsection documenting `-v`, plus a new "Limiting the Number of Updates" subsection covering the legitimate `-c` flag (number of refresh cycles before exit).
3. **The `m` key cycles through 6 view modes, not 4.** The interactive controls table listed only `(KB/s, KB, B, MB)`. Updated to `(KB/s, KB, B, MB, MB/s, GB/s)` to match the actual VIEWMODE_COUNT in cui.cpp.
4. **Tracemode example used usernames for the UID field.** The source (`Line::log()`) writes `m_uid`, a numeric uid_t, not a username. Replaced `root` / `backup` with the corresponding numeric UIDs `0` / `1001`, and added a clarifying sentence describing the `program/PID/UID` format with tab-separated sent/received values.

## Review Notes
- The default column layout (PID, USER, PROGRAM, DEV, SENT, RECEIVED) is verified correct against `cui.cpp`.
- `-d`, `-t`, `-s`, `-r`, `-q`, and the keyboard shortcuts described otherwise (`r`, `s`, `q`) all match the upstream man page.
- The systemd unit, logrotate stanza, and supporting commands (`ss -tnp`, `lsof -p`, `ip -s link show`) are syntactically correct and idiomatic for Ubuntu 22.04 / 24.04.
- The Ubuntu repository version (nethogs 0.8.7) is current as of Ubuntu 24.04; the post's claim that the repo version is sufficient for most users holds.
- Minor stylistic note (not changed): the post mentions a "`nethogs` PPA" as an alternative for newer versions. There is no official upstream PPA for nethogs as of this review; users wanting newer code typically build from the GitHub source. This was left unchanged because the post does not provide a specific PPA URL, and a generic mention is not technically incorrect.
