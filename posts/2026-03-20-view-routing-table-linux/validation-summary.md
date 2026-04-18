# Validation Summary: How to View the Routing Table on Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux networking (iproute2)
- `ip route` command
- Legacy `route` (net-tools)
- `netstat -rn` (net-tools)
- Linux routing policy database (rt_tables: main=254, local=255, default=253)
- Python (`subprocess` module)

## Sources Consulted
- iproute2 `ip-route(8)` man page (https://man7.org/linux/man-pages/man8/ip-route.8.html)
- iproute2 `ip(8)` man page — `-r, --resolve` option (https://man7.org/linux/man-pages/man8/ip.8.html)
- `/etc/iproute2/rt_tables` default table IDs (local=255, main=254, default=253)
- net-tools `route(8)` man page — route flag definitions (U, G, H, !, etc.)
- `netstat(8)` man page — `-r` and `-n` options
- Python 3 `subprocess.run()` documentation (https://docs.python.org/3/library/subprocess.html)
- Verified `ip route help` output locally

## Issues Found
- **Duplicate/misleading command in first code block**: The first `bash` block listed `ip route show` twice, with the second instance commented as `# Numeric output (no hostname resolution)`. This was incorrect because `ip route` does not resolve hostnames by default — the command shown was identical to the first one and the comment was misleading. Replaced the duplicate with `ip -r route show` and updated the comment to `# Resolve hostnames in output (default is numeric)`, which accurately reflects the `-r, --resolve` flag documented in `ip(8)`.

## Review Notes
- Table IDs (main=254, local=255, default=253) are correct per `/etc/iproute2/rt_tables`.
- Route flags (U, G, H, !) in the `route -n` section are correctly documented per the net-tools man page.
- The sample `ip route get` output omits the `uid` field that modern iproute2 typically includes, but the shown form is still valid output.
- The Python snippet uses `subprocess.run(..., capture_output=True, text=True)`, which is the current recommended API (Python 3.7+).
- Both `route` and `netstat` are part of the legacy `net-tools` package and may not be installed by default on modern distributions; the post appropriately labels them as "Legacy Commands".
