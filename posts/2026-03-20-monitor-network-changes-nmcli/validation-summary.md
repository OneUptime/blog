# Validation Summary: How to Monitor Network Changes with nmcli monitor

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- nmcli (NetworkManager CLI)
- NetworkManager
- systemd journalctl
- iproute2 (`ip monitor`)
- Bash / `watch`

## Sources Consulted
- nmcli(1) man page (NetworkManager upstream documentation): https://networkmanager.dev/docs/api/latest/nmcli.html
- NetworkManager documentation: https://networkmanager.dev/
- ip-monitor(8) man page: https://man7.org/linux/man-pages/man8/ip-monitor.8.html
- journalctl(1) man page: https://man7.org/linux/man-pages/man1/journalctl.1.html
- Local `man nmcli` output (verified `nmcli monitor`, `nmcli device monitor [ifname...]`, `nmcli device status` syntax)

## Issues Found
No technical issues found.

All commands verified against the nmcli(1) man page:
- `nmcli monitor` — valid global monitor command.
- `nmcli device monitor [ifname...]` — accepts optional interface names; `nmcli device monitor eth0` and `nmcli device monitor` are both correct invocations.
- `nmcli device status` — valid command with the documented column layout (DEVICE, TYPE, STATE, CONNECTION).
- `journalctl -u NetworkManager -f` — correct unit-follow syntax.
- `ip monitor address`, `ip monitor route`, `ip monitor all` — all valid `ip monitor` object types per ip-monitor(8).

The device state values (`connected`, `disconnected`, `unavailable`, `unmanaged`, `connecting`) and their descriptions match NetworkManager's documented device states.

## Review Notes
- The `unavailable` state can result from causes other than an unplugged cable (e.g., rfkill on Wi-Fi, missing firmware, device not yet initialized). The post's "No carrier (cable unplugged)" description is a common case but not exhaustive — acceptable as a beginner-friendly summary.
- NetworkManager has additional intermediate device states (`ip-config`, `ip-check`, `secondaries`, `deactivating`, `failed`) not listed in the table; the table covers the most commonly observed states, which is reasonable for an introductory post.
- The example output for `nmcli monitor` matches the format produced by current NetworkManager releases.
- The `nmcli monitor >> /var/log/network-events.log 2>&1 &` example will require root (or appropriate permissions on `/var/log/`) to write to that path — readers running as a normal user may want to log to a user-writable location instead. This is a usage caveat, not a technical error.
