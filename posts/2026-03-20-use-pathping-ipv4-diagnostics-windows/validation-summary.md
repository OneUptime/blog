# Validation Summary: How to Use pathping for IPv4 Network Diagnostics on Windows

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Windows `pathping` command
- `tracert` (for comparison)
- `ping` (for comparison)
- `mtr` (Linux equivalent)
- ICMP / IPv4 networking

## Sources Consulted
- Microsoft Learn / Windows command-line reference for `pathping`: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/pathping
- Microsoft Learn / Windows command-line reference for `tracert`: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/tracert
- Microsoft Learn / Windows command-line reference for `ping`: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ping
- `mtr` manual page (BitWizard): https://www.bitwizard.nl/mtr/

## Issues Found
No technical issues found.

Verified items:
- `-n` correctly described as suppressing DNS name resolution.
- `-4` correctly forces IPv4 (available on Windows Vista and later).
- `-q NumQueries` default of 100 queries per hop — correct.
- `-h MaximumHops` option — correct (default 30 if not specified, which aligns with the guidance).
- `-w Timeout` default of 3000 ms — correct per Microsoft docs.
- `-p Period` default of 250 ms between pings — correct.
- Two-phase operation (discovery then statistics) accurately described.
- "75 seconds" for the sample 3-hop output is correct: 3 hops × 100 queries × 250 ms = 75 s (matches "25 seconds per hop" rule of thumb).
- Output columns ("RTT", "Source to Here Lost/Sent", "This Node/Link Lost/Sent") are accurately described.
- Interpretation guidance (per-hop vs. cumulative loss, `*` for non-responsive hops) is technically correct.
- `mtr -n` usage on Linux is correct.

## Review Notes
- The "about 75 seconds" figure in the conclusion is tied to the specific 3-hop example; for longer paths the statistics phase will take proportionally longer (~25 seconds per hop by default). This is not inaccurate in context but readers with longer paths will see longer runtimes.
- pathping's stats rely on intermediate routers responding to ICMP Echo. Many modern routers/firewalls rate-limit or drop ICMP to transit interfaces, which can produce apparent "This Node/Link" loss that isn't real data-plane loss — a worthwhile caveat for a future revision.
- `pathping` does not perform UDP or TCP probing (unlike Linux `mtr --tcp`/`--udp` or `tcpping`), so it can miss issues specific to non-ICMP traffic. Also a possible future-addition note.
- The comparison table is fair; a minor nit is that `tracert` does report per-hop RTT (three samples), which the post already captures as "Latency only".
