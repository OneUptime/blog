# Validation Summary: How to Find Which Process Is Listening on a Specific Port with Netstat

## Status
validated

## Post Type
Tutorial / Reference (Linux command-line how-to)

## Technologies Covered
- netstat (net-tools package)
- ss (iproute2 replacement for netstat)
- lsof
- fuser
- pgrep
- bash scripting (awk, cut, grep)

## Sources Consulted
- netstat(8) man page (net-tools) — confirmed flag semantics for `-t`, `-u`, `-l`, `-n`, `-p` and the PID/Program name column behavior
- ss(8) man page (iproute2) — confirmed `-tlnp` flags work analogously
- lsof(8) man page — confirmed `-i :PORT` and `-i TCP:PORT` syntax
- fuser(1) man page — confirmed `PORT/PROTO` syntax and `-k` to kill
- pgrep(1) man page — confirmed `-n` selects newest matching process

## Issues Found
- **Inaccurate description of non-root netstat output**: The post claimed that without root privileges, UDP port 53 would show `"1100/-"` in the PID/Program name column. Per the netstat(8) man page, the PID/Program name column is a slash-separated pair of PID and program name, and a hyphen (`-`) alone is shown when the socket belongs to the kernel or when the user lacks privileges to identify the process — the PID is not exposed without permission. Updated the section to state that the column shows `"-"` (not `"1100/-"`) without root, and clarified that a hyphen also indicates a kernel-owned socket per the man page wording.

## Review Notes
- netstat is officially marked as "mostly obsolete" in its man page; ss (iproute2) is the modern replacement. The post does mention `ss -tlnp` as an alternative, which is good. A future revision could lead with `ss` and treat `netstat` as a fallback for systems still using net-tools.
- The simplified example output omits the `Recv-Q`, `Send-Q`, and `Foreign Address` columns that real netstat output includes. This is a presentation simplification rather than a technical error, and the `awk '{print $7}'` extraction is still correct because the actual netstat output has 7 whitespace-separated fields for TCP listening sockets.
- The `awk '{print $7}'` approach assumes TCP listening output (where the State column is populated). For UDP entries from `netstat -tulnp` the State column is blank, so the PID/Program field shifts to `$6` — but the kill/check scripts in the post all use `-tlnp` (TCP-only listening), where `$7` is correct.
- `pgrep -n nginx` returns only the newest matching PID; for processes with multiple workers (like nginx with worker processes), `pgrep nginx` (without `-n`) or targeting the master via `pgrep -f "nginx: master"` may be more useful in practice. Not a technical error, just a usage caveat.
