# Validation Summary: How to Set Up Samba with macOS Integration on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Samba (smbd, nmbd, smb.conf)
- Samba vfs_fruit, vfs_catia, vfs_streams_xattr modules
- Avahi daemon / mDNS / Bonjour
- Apple SMB extensions (AAPL)
- Time Machine over SMB
- UFW firewall
- Ubuntu Linux
- macOS Finder / mount_smbfs / smbutil

## Sources Consulted
- Samba smb.conf(5) man page: https://www.samba.org/samba/docs/current/man-html/smb.conf.5.html
- Samba vfs_fruit(8) man page: https://www.samba.org/samba/docs/current/man-html/vfs_fruit.8.html
- Samba wiki "Configure Samba to Work Better with Mac OS X": https://wiki.samba.org/index.php/Configure_Samba_to_Work_Better_with_Mac_OS_X
- Avahi service file format documentation
- macOS `mount_smbfs(8)` and `smbutil(1)` man pages
- IANA Service Name and Transport Protocol Port Number Registry (NetBIOS / SMB ports)
- Apple macOS Ventura release notes (System Preferences renamed to System Settings)

## Issues Found

1. **Removed `read raw = yes` and `write raw = yes`** — These are SMB1-only parameters that have no effect with SMB2/SMB3 protocols. Since the config sets `server min protocol = SMB2`, they are meaningless and have been deprecated/removed from modern Samba.

2. **Changed `dos charset = CP932` to `dos charset = CP850`** — CP932 is the Japanese Shift-JIS variant. CP850 is the standard Samba default for Western European environments and is the more sensible generic default. Setting CP932 on a non-Japanese system causes incorrect filename interpretation for DOS-era clients.

3. **Moved `fruit:aapl = yes` from `[public]` to `[global]`** — Per the `vfs_fruit(8)` man page, `fruit:aapl` is a global-only (G) parameter. Setting it per-share has no effect. Moved it to the `[global]` section where it actually applies.

4. **Removed port 135/tcp from the firewall list** — Port 135 is the Microsoft RPC/DCE endpoint mapper used by Windows MSRPC. It is not a standard Samba file-sharing port. Samba uses 137/udp, 138/udp, 139/tcp, and 445/tcp.

5. **Added port 5353/udp (mDNS) to the firewall list** — The post's troubleshooting section already mentions that mDNS port 5353/UDP must not be blocked, but the firewall configuration section did not include it. Added the corresponding `ufw allow 5353/udp` rule.

6. **Updated Time Machine setup steps for modern macOS** — Apple renamed "System Preferences" to "System Settings" in macOS Ventura (2022) and moved Time Machine to System Settings > General > Time Machine. The "Select Disk" button is now "Add Backup Disk". Updated the steps to reflect the modern path while keeping a note for older macOS versions.

7. **Added `mkdir -p /Volumes/ubuntu_public` before `mount_smbfs`** — `mount_smbfs` on macOS requires the mount point directory to exist beforehand. Without this, the command fails with a "no such file or directory" error.

## Review Notes

- `socket options` is generally discouraged by the Samba team in modern versions; the defaults are usually best. The values shown will still work but might not always improve throughput. Left as-is since they are not technically incorrect.
- `kernel share modes = no` is now the default in Samba 4.9+, so explicitly setting it is redundant but harmless. Left for clarity.
- `spotlight = yes` requires a configured backend (Tracker or Elasticsearch) and matching `spotlight backend` parameter to be fully functional; without one, the share will still mount but Spotlight indexing will be non-functional. This is a deployment caveat, not an error.
- The `chmod 1777` on `/srv/shares/timemachine` is overly permissive on the filesystem layer; since `force user = nobody, force group = nogroup` is set in the share config, a tighter mode like `0770` would also work. Left as-is — it functions correctly.
- The Avahi `_adisk._tcp` TXT records use the documented Apple format for advertising Time Machine; values verified against community references.
