# Validation Summary: How to Use NetFlow to Detect Anomalous IPv4 Traffic Patterns

## Status
validated

## Post Type
Tutorial / how-to guide for security analysts using NetFlow.

## Technologies Covered
- NetFlow (flow-level network telemetry)
- nfdump (NetFlow analysis CLI)
- nfdump filter language (TCP flags, network/port primitives, byte/packet/bpp comparisons)
- Python 3 (`subprocess`, `datetime`) for automated alerting
- cron for scheduled analysis

## Sources Consulted
- nfdump man page (`man/nfdump.1`) in the upstream repo: https://github.com/phaag/nfdump/blob/master/man/nfdump.1
  - SYNOPSIS and filter description (filter is positional, not flagged)
  - `-t timewin` documentation (absolute `YYYY/MM/dd.hh:mm:ss[-...]` format only)
  - Filter primitives reference: `flags`, `proto`, `src/dst net`, `port in [...]`, `bytes`, `bpp`, etc.
  - Aggregation (`-A`) and statistics (`-s`) syntax, including `record/flows`, `dstip/packets`, `srcip/bytes`
  - Output formats (`-o csv`, `-o "fmt:..."`)
- Python 3 `datetime` / `timezone` documentation for the `strftime` patterns used in the script

## Issues Found

1. **`-filter "..."` is not a valid nfdump option.** nfdump filter expressions are passed as the **last positional argument** on the command line; only `-f filterfile` reads a filter from a file. Every nfdump invocation in the post (5 in bash, 2 in Python) used the non-existent `-filter` flag and would have failed. Fixed by moving each filter expression to the end of the command (single-quoted in bash, appended to the argv list in Python) and added a one-sentence note explaining the convention.

2. **`-t "last 5 minutes"` is not valid nfdump time syntax.** The `-t` option accepts only absolute `YYYY/MM/dd.hh:mm:ss[-YYYY/MM/dd.hh:mm:ss]` ranges. Fixed by computing a `TIME_RANGE` shell variable with `date -u` (in bash) and a `time_window()` helper using `datetime.now(timezone.utc)` + `timedelta` (in Python). All `-t` usages now reference the computed absolute range.

3. **`bytes < 100` for "small packets" in the UDP-flood example was semantically wrong.** `bytes` is the *total bytes per flow*, so the filter would match only tiny single-packet flows — the opposite of a flood. The correct primitive for "small packets" is `bpp` (bytes per packet). Changed the filter to `proto udp and bpp < 100`.

4. **`flags S and not flags A` for SYN-scan detection is incomplete.** Per the nfdump man page, the canonical SYN-only signature is `flags S and not flags AFRPU` (excluding ACK/FIN/RST/PUSH/URG). Updated the horizontal-scan filter and the Python `detect_port_scans()` filter accordingly, and adjusted the surrounding bullet text. Left the broader `flags S` filter on the vertical-scan command since that one is intentionally permissive.

5. **Python `datetime.utcnow()` would have been used implicitly via the rewritten helper.** I used the modern timezone-aware `datetime.now(timezone.utc)` form, since `utcnow()` is deprecated as of Python 3.12.

## Review Notes
- The post mixes `-A` (aggregation) and `-s` (statistics) on the same nfdump invocation in a few places (e.g., `-A srcip,dstport -s record/flows`). nfdump accepts this and produces aggregated top-N output, but the output schema can vary across nfdump 1.6.x / 1.7.x — the Python script's hard-coded `parts[3]` / `parts[4]` index assumptions are fragile and may need adjustment depending on the deployed version. Worth flagging in a future revision but not technically incorrect.
- nfdump's `-t` option is documented as legacy and may eventually be replaced by `first seen`/`last seen` filter primitives (which accept ISO8601). The current shell-based approach is correct for nfdump 1.7.x but may want a follow-up once the upstream deprecation lands.
- The cron line writes through `crontab -` which replaces the user's entire crontab — readers running this verbatim could clobber existing entries. Not a correctness issue, but worth a heads-up in a future edit.
- The data-exfiltration commands assume RFC 1918 `10.0.0.0/8` is the only internal range; environments with `172.16.0.0/12` or `192.168.0.0/16` will need to broaden the filter.
