# Validation Summary: How to Release and Renew DHCP Leases on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Ubuntu (server and desktop)
- DHCP (DHCPv4 and DHCPv6) — RFC 2131
- `dhclient` (ISC DHCP client)
- `systemd-networkd` and `networkctl`
- Netplan
- NetworkManager (`nmcli`)
- `ip` (iproute2)
- `tcpdump`, `arping`
- `journalctl`

## Sources Consulted
- systemd source: `sd-dhcp-lease.c` (lease file save/load format) — https://github.com/systemd/systemd/blob/v254/src/libsystemd-network/sd-dhcp-lease.c
- systemd source: `networkctl.c` (verb argument requirements, `--all` flag scope) — https://github.com/systemd/systemd/blob/v254/src/network/networkctl.c
- `networkctl(1)` manpage — https://www.freedesktop.org/software/systemd/man/networkctl.html
- RFC 2131 (DHCP) — T1 = 0.5 × duration, T2 = 0.875 × duration, DORA exchange
- `dhclient(8)` manpage — `-r` (release), `-6` (IPv6)
- `nmcli(1)` documentation — `device reapply`, `connection up/down`, `device disconnect/connect`

## Issues Found

1. **`sudo networkctl renew` without arguments** (line 49 originally): The `renew` verb in `networkctl` requires at least one device name (`renew DEVICES...`, min 2 argv entries). Running it bare fails with "Expected one or more link names." The `--all` flag only applies to `status`, not `renew`. Changed the example to show multiple devices passed explicitly (`sudo networkctl renew eth0 wlan0`).

2. **`EXPIRY` field in the systemd-networkd lease file** (lease example block): There is no `EXPIRY` field in `/run/systemd/netif/leases/<ifindex>`. The actual fields are `LIFETIME`, `T1`, and `T2`, all stored as `uint32` durations in seconds (per `sd-dhcp-lease.c` save and load functions). The example values shown looked like epoch timestamps (e.g., `1740955200`), which would correspond to ~55 years of lease time — clearly not real durations. Replaced with realistic duration values (`LIFETIME=86400`, `T1=43200`, `T2=75600` for a 24-hour lease) and added a note clarifying the semantics.

3. **"Check remaining lease time" using `EXPIRY`** (DHCP Renewal Timing section): The code piped `EXPIRY` (which doesn't exist) into `date -d @...`, which would not have worked. Rewrote the snippet to read `LIFETIME` and combine it with the lease file's mtime (the approximate acquisition time) to compute the absolute expiry.

## Review Notes

- `networkctl renew`, `reconfigure`, `up`, and `down` were added in systemd 248. Ubuntu 18.04 ships with systemd 237 and Ubuntu 20.04 with 245, so these commands are only available on Ubuntu 22.04+ in practice. The post says "Most Ubuntu server installs (18.04+) use systemd-networkd" — that statement about *use of systemd-networkd* is accurate, but `networkctl renew` itself is not available before 22.04. Left as-is since the post does not explicitly claim 18.04 support for these commands.
- `nmcli device reapply` does not strictly trigger a fresh DHCP DORA exchange — it re-applies pending connection config changes. For a guaranteed release/renew, `nmcli connection down/up` or `nmcli device disconnect/connect` is more reliable. The post does present these alternatives later in the same section and in the comparison comments, so the discussion is reasonable; left unchanged.
- The DHCP timing constants (T1=50%, T2=87.5%) and the DORA acronym are accurate per RFC 2131.
- `dhclient -r`, `dhclient -6`, ports 67/68 for DHCP, and `/var/lib/dhcp/dhclient.leases` are all correct for Ubuntu.
- The shell script's IPv4 extraction regex (`grep -oP '(?<=inet )\d+\.\d+\.\d+\.\d+'`) is correct.
