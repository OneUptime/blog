# Validation Summary: How to Flush and Renew IPv4 Address with ipconfig /release and /renew

## Status
validated

## Post Type
Guide

## Technologies Covered
- Windows `ipconfig`
- Windows `findstr`
- Windows `netsh`
- Windows service control (`sc`, `net start`)
- DHCP / DHCP lease renewal
- DNS client cache and dynamic DNS registration
- Linux `dhclient`
- NetworkManager `nmcli`
- `systemd-networkd` / `networkctl`
- macOS `ipconfig`
- macOS `networksetup`

## Sources Consulted
- Microsoft Learn: `ipconfig` https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ipconfig?view=windows-server-2019
- Microsoft Learn: `findstr` https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/findstr
- Microsoft Learn: `netsh interface` https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh-interface
- Microsoft Learn: `sc.exe query` https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/sc-query
- Microsoft Learn: Troubleshoot problems on the DHCP client https://learn.microsoft.com/en-us/troubleshoot/windows-server/networking/troubleshoot-problems-dhcp-client
- RFC 2131: Dynamic Host Configuration Protocol https://datatracker.ietf.org/doc/html/rfc2131
- NetworkManager Reference Manual: `nmcli` https://www.networkmanager.dev/docs/api/latest/nmcli.html
- systemd manual: `networkctl` https://www.freedesktop.org/software/systemd/man/latest/networkctl.html
- Apple Support: `networksetup` reference https://support.apple.com/en-mide/guide/remote-desktop/apdd0c5a2d5/mac
- macOS `ipconfig(8)` man page mirror used to verify command syntax https://www.unix.com/man-page/osx/8/ipconfig

## Issues Found
- The post implied that `/renew` always gives you a new or different IPv4 address. I corrected this to refer to requesting a new DHCP lease, because DHCP can renew the same address.
- The DNS section described `ipconfig /flushdns` and `ipconfig /registerdns` as a general best practice for release/renew. I corrected this to make the sequence optional and DNS-specific, which matches Microsoft's documentation for resolver-cache flushing and manual DNS registration.
- The DHCP explanation stated that `/renew` always performs a full Discover/Offer/Request/Acknowledge exchange. I corrected this to explain that a full DORA-style exchange is typical when no usable lease is present, but an existing-lease renewal can begin with `DHCPREQUEST`.
- The batch example used `findstr "IPv4\\|Gateway"`, but `findstr` does not support `|` alternation. I replaced it with `findstr /c:"IPv4" /c:"Gateway"` so the script matches the intended lines correctly.
- The macOS `networksetup -setdhcp` example was updated to `sudo networksetup -setdhcp "Wi-Fi"` because it changes network configuration.

## Review Notes
- No deprecated Windows commands were found in the post.
- The Linux examples are valid, but they are stack-specific: `dhclient` applies where ISC DHCP client is installed, `nmcli` applies to NetworkManager-managed systems, and `networkctl renew` applies to `systemd-networkd`.
- Apple does not appear to expose the current `ipconfig(8)` man page in an easily linkable public doc page, so the macOS `ipconfig` syntax was cross-checked with a man-page mirror.
