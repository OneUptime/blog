# Validation Summary: How to Save iptables Rules Permanently on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- iptables
- ip6tables
- iptables-persistent
- netfilter-persistent
- systemd services
- /etc/rc.local compatibility
- Ubuntu Linux firewall persistence

## Sources Consulted
- Local Ubuntu package metadata for `iptables-persistent` and `netfilter-persistent` 1.0.20 via `apt-cache show`
- Local Ubuntu package contents for `netfilter-persistent` and `iptables-persistent` 1.0.20 via `apt-get download` and `dpkg-deb`
- `iptables-save(8)` and `iptables-restore(8)` man pages from iptables 1.8.10
- `iptables-extensions(8)` man page from iptables 1.8.10
- `systemd.special(7)` and `systemd-rc-local-generator(8)` man pages from systemd 255
- Ubuntu Community Help Wiki: IptablesHowTo, https://help.ubuntu.com/community/IptablesHowTo
- Debian man page: `netfilter-persistent(8)`, https://manpages.debian.org/buster/netfilter-persistent/netfilter-persistent.8.en.html
- systemd NetworkTarget documentation, https://www.freedesktop.org/wiki/Software/systemd/NetworkTarget/

## Issues Found
- Fixed commands that used `sudo iptables-save > /etc/iptables/rules.v4` and `sudo ip6tables-save > /etc/iptables/rules.v6`. The shell redirection is performed before `sudo`, so it can fail against root-owned files. Updated these examples to use the supported `-f` option from `iptables-save(8)` and `ip6tables-save(8)`.
- Updated `cat /etc/iptables/rules.v4` examples to `sudo cat /etc/iptables/rules.v4` because the Ubuntu `iptables-persistent` plugin stores rules files with root-owned `0640` permissions.
- Added `sudo mkdir -p /etc/iptables` before the standalone systemd-service save example so the target directory exists when `iptables-persistent` has not already created it.
- Updated the custom systemd service to use `/usr/sbin/iptables-restore`, matching the current Ubuntu binary path.
- Reworked the `/etc/rc.local` legacy example into a complete executable script with a shebang and `exit 0`. The previous append-only snippet could create an invalid script if `/etc/rc.local` did not already exist, and `rc-local.service` is static on systemd systems, so `systemctl enable rc-local` was replaced with `systemctl daemon-reload`.
- Updated restore examples to pass the rules file as an `iptables-restore` argument instead of relying on shell input redirection.
- Corrected the saved-rules example so it shows actual `iptables-save` file syntax instead of commenting out every rule line. Also changed the state match example to the current `conntrack --ctstate` form and included the `nat` table `INPUT` chain shown by modern `iptables-save` output.

## Review Notes
- The post is technically relevant and the main recommendation, `iptables-persistent` with `netfilter-persistent save`, matches Ubuntu package behavior.
- On newer Ubuntu systems, many administrators may prefer UFW or nftables for higher-level firewall management, but the iptables persistence workflow covered here remains valid for iptables rules.
