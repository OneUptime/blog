# Validation Summary: How to Configure DNS Servers in /etc/resolv.conf on Linux

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux name resolution
- `/etc/resolv.conf`
- glibc resolver behavior
- NetworkManager
- `nmcli`
- `systemd-resolved`
- `resolvectl`
- `dig`
- `nslookup`

## Sources Consulted
- `resolv.conf(5)` Linux man page: https://man7.org/linux/man-pages/man5/resolv.conf.5.html
- NetworkManager configuration reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/NetworkManager.conf.html
- NetworkManager `nm-settings-nmcli` reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- NetworkManager `nmcli` examples: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nmcli-examples.html
- `systemd-resolved.service(8)` reference: https://www.freedesktop.org/software/systemd/man/249/systemd-resolved.html
- Local `resolved.conf(5)` man page (`man 5 resolved.conf`)
- `resolvectl(1)` reference: https://www.freedesktop.org/software/systemd/man/latest/resolvectl.html
- Local `nslookup(1)` man page (`man 1 nslookup`)
- Local `dig -h` output
- Local `chattr(1)` man page (`man 1 chattr`)

## Issues Found
- The comment for `options ndots:5` described it as overriding search/domain order. I changed it to say it controls when the search list is used, which matches `resolv.conf(5)`.
- The `NetworkManager` section implied that disabling `NetworkManager` DNS management was sufficient to make direct edits persistent on all modern systems. I added the missing caveat that if `/etc/resolv.conf` is still a `systemd-resolved` symlink, edits will still be overwritten and `resolved.conf` should be used instead.
- The `nmcli` example used comma-separated DNS server values. I changed it to the documented space-separated form used by NetworkManager examples.
- The per-connection `nmcli` DNS example did not disable DHCP-provided DNS, so on `ipv4.method auto` profiles it would not reliably use only the listed servers. I added `ipv4.ignore-auto-dns yes` to match NetworkManager's documented behavior.
- The `nmcli` DNS search-domain example used comma-separated values. I changed it to the documented space-separated list form and noted that DHCP search domains are merged unless `ipv4.ignore-auto-dns yes` is set.
- The `dig +short TXT whoami.resolver.cymru.com` example was labeled as checking "what resolver is being used," which is ambiguous on systems with a local stub resolver. I corrected the wording to say it shows which upstream recursive resolver the query used.
- The `systemd-resolved` symlink check used wording that was too absolute. I changed it to "typically" for modern Ubuntu, which matches systemd's documented multiple supported `/etc/resolv.conf` modes.
- The immutability section did not mention that `chattr +i` only applies when `/etc/resolv.conf` is a regular file on a filesystem that supports the immutable attribute. I added that caveat and adjusted the conclusion so it no longer implies this works unconditionally.

## Review Notes
- The post is technically valid after the fixes, but direct editing of `/etc/resolv.conf` remains distribution-specific and should generally be treated as a last resort on `systemd-resolved` systems.
- The examples are IPv4-focused. On dual-stack systems, analogous `ipv6.*` NetworkManager settings may also be needed if DHCPv6 or RA-provided DNS should be overridden.
