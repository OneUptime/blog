# Validation Summary: How to Use nload for Real-Time Network Monitoring on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- nload 0.7.4 (the version in Ubuntu's universe repository)
- Ubuntu (apt-get package management)
- `/proc/net/dev` kernel interface statistics
- Bash scripting (read, awk, /proc parsing)
- Related tools mentioned for comparison: bmon, iftop, nethogs, `ip -s link`

## Sources Consulted
- nload(1) man page extracted from the Ubuntu `nload_0.7.4-2build3` package
- `nload -h` output from the same binary (run locally for verification)
- nload upstream homepage: http://www.roland-riegel.de/nload/
- Live inspection of `/proc/net/dev` on the reviewer's system to confirm field layout (`iface:` then RX bytes, packets, errs, drop, fifo, frame, compressed, multicast, then TX bytes, packets, ...)
- Empirical test of the corrected `read -r _ RX _ _ _ _ _ _ _ TX _` pattern against `awk '{print $2}'` / `awk '{print $10}'` — values matched.

## Issues Found

1. **`nload --version` is not a valid flag.** nload's option parser only recognizes `-h`/`--help`; passing `--version` causes it to interpret the argument as a device name and start up normally. **Fix:** changed the verification step to `nload -h | head -n 2`, which prints the version/copyright banner.

2. **Key bindings were wrong.** The post claimed:
   - "F2 or Enter — Open the settings screen" — Enter actually switches to the next device per the man page (`'ArrowRight', 'ArrowDown', 'PageDown', 'Enter', 'Tab'`), not opens settings.
   - "F5 — Refresh the display" — F5 actually *saves* current settings to `~/.nload`.
   - F6 (reload settings) was missing.
   **Fix:** rewrote the key list to match the official man page, splitting next/previous navigation, correcting F5, and adding F6.

3. **Unit-flag comments inverted bits vs. bytes.** Per `nload(1)`: lowercase letters (`b/k/m/g`) are bit-based, uppercase (`B/K/M/G`) are byte-based. The post used `nload -u M eth0` with a comment "Display in Megabits per second" — that command actually displays MByte/s. **Fix:** added both `-u m` (MBit/s) and `-u M` (MByte/s) examples with correct comments, and clarified the full set of valid unit letters.

4. **`-U` flag was mis-described.** The post called it "Set graph data unit" — `-U` actually sets the unit for the cumulative *total* (the `Ttl` field), not the graph. **Fix:** updated the comment accordingly.

5. **Bash `read` patterns had a field-offset bug.** The original used `read -r _ _ RX_BYTES_1 _ _ _ _ _ _ TX_BYTES_1 _`. After `grep "iface:"`, field 1 is `iface:`, field 2 is RX bytes, field 10 is TX bytes. With two leading underscores, `RX_BYTES_1` was being assigned to RX *packets* (field 3), not RX bytes. **Fix:** dropped one leading underscore and added a trailing one in both the `bandwidth-stats.sh` script and the `check_bandwidth()` function, giving `_ RX _ _ _ _ _ _ _ TX _` (11 vars total). Verified empirically against the `lo` interface — the corrected pattern returns the same values as `awk '{print $2}'`/`awk '{print $10}'`.

6. **`-a` description was slightly off and used the default value.** The post said `-a 300 eth0  # 5-minute history window` and described it as "how much history the graph shows". Per the man page, `-a` sets the length of the time window for *average calculation* (default already 300). **Fix:** changed the example to `-a 60 eth0` (a clearly non-default value) and re-described it as "the time window for average calculation".

7. **Statistic labels updated.** nload's on-screen labels are `Curr` and `Avg`, not `Current` and `Average`. The descriptive list in "Understanding the Statistics" was adjusted to match what users actually see in the UI, and the `Avg` description now reflects that it's a windowed average (`-a`), not a since-start running mean.

## Review Notes

- The awk one-liner under "Useful One-Liners" was already correct (`$2` = RX bytes, `$10` = TX bytes) and was left unchanged.
- The interactive nload commands shown under "Setting Up nload for Remote Monitoring" (`ssh user@host "nload ..."`) will work over SSH but typically need `ssh -t` to allocate a TTY for ncurses; without `-t` the display can render poorly. This is a usability nuance rather than a correctness error, so it was left as-is.
- The "ASCII graph" wording is colloquial — nload actually uses Unicode block characters via ncurses — but the term is widely accepted and not technically misleading.
- nload 0.7.4 (2012) is the only version available in Ubuntu repositories through 24.04 LTS; upstream development is dormant, so version-specific caveats are unlikely to change in the near term.
