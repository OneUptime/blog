# Validation Summary: How to Set Up Unattended Power-On Settings in BIOS via Ubuntu

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- IPMI / `ipmitool` (chassis policy commands, lanplus interface)
- `rtcwake` (util-linux RTC wake scheduling)
- `/sys/class/rtc/rtc0/wakealarm` sysfs interface
- `ethtool` (Wake-on-LAN configuration)
- systemd service units
- Netplan (Ubuntu network configuration)
- NetworkManager / `nmcli`
- `wakeonlan` and `etherwake` CLI tools
- Python `socket` module (UDP broadcast for magic packets)
- ACPI sleep states (S3 / S4 / S5)
- cron / `/etc/cron.d/`

## Sources Consulted
- `man rtcwake` (util-linux 2.x) — verified `-m` modes (mem/disk/off/show), `-s`, `-t`, `--version` flags
- `man ethtool` — verified `wol g` (magic packet) syntax and option letters
- ipmitool documentation — chassis policy values: `always-on`, `always-off`, `previous`, `list`
- Ubuntu apt package metadata for `etherwake` (binary at `/usr/sbin/etherwake`) and `wakeonlan` (Perl-based tool, supports `-i` for broadcast IP)
- Netplan reference documentation (`wakeonlan: <bool>` is a valid ethernet property)
- NetworkManager `nm-settings` reference (`802-3-ethernet.wake-on-lan` accepts `magic`)
- ACPI Specification — S3 (suspend-to-RAM), S4 (hibernate), S5 (soft-off) state definitions
- Wake-on-LAN magic packet format (6 bytes 0xFF followed by MAC address repeated 16 times)

## Issues Found
No technical issues found.

All verified items:
- `ipmitool chassis policy {always-on,previous,always-off,list}` — correct subcommands
- `ipmitool -I lanplus -H ... -U ... -P ... chassis power {on,status}` — correct flags
- `rtcwake -m {mem,disk,off,show}`, `-s SECONDS`, `-t TIMESTAMP`, `--version` — all valid
- `/sys/class/rtc/rtc0/wakealarm` sysfs technique (echo 0 to clear, then echo timestamp) — correct
- `ethtool -s eth0 wol g` and `ethtool eth0 | grep Wake` — correct
- systemd unit syntax and `ExecStart=/sbin/ethtool ...` — works via usrmerge symlink on modern Ubuntu
- Netplan `wakeonlan: true` under `ethernets:` — valid since Netplan 0.96+
- `nmcli connection modify ... 802-3-ethernet.wake-on-lan magic` — correct property and value
- `wakeonlan MAC` and `wakeonlan -i BROADCAST_IP MAC` — correct usage
- `etherwake MAC` — correct (binary installs as `/usr/sbin/etherwake`)
- Python magic packet: `b'\xff' * 6 + mac_bytes * 16` to UDP port 9 with `SO_BROADCAST` — correct (102-byte packet, port 9 is the standard discard port commonly used for WoL)
- ACPI state descriptions (S5 soft-off, S4 hibernate, S3 suspend) accurate

## Review Notes
- The Python script imports `struct` but does not use it; harmless and not worth touching.
- The `# Install rtcwake (part of util-linux)` comment is slightly misleading — util-linux is pre-installed on Ubuntu, so the line below it (`rtcwake --version`) is only a presence check, not an installation. Not technically wrong.
- `/sbin/ethtool` in the systemd unit works on current Ubuntu (24.04+) only because `/sbin` is symlinked to `/usr/sbin` post-usrmerge. The canonical path is `/usr/sbin/ethtool`. Either works at present.
- Port 9 (discard) is used for the magic packet; port 7 (echo) is also valid per the WoL convention. The post's choice is fine.
- The IPMI password is shown in plaintext on the command line — fine for a tutorial, but in production an `-f passwordfile` or `IPMI_PASSWORD` env var is preferable. Not an error in the post.
