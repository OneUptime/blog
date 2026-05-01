# Validation Summary: How to Configure a DHCPv6 Client on Linux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- DHCPv6
- IPv6
- Linux networking
- ISC `dhclient`
- `wide-dhcpv6` / `dhcp6c`
- `systemd-networkd`
- NetworkManager / `nmcli`

## Sources Consulted
- RFC 8415, Dynamic Host Configuration Protocol for IPv6 (DHCPv6): https://www.rfc-editor.org/rfc/rfc8415
- `systemd.network` manual: https://www.freedesktop.org/software/systemd/man/257/systemd.network.html
- NetworkManager `nm-settings-nmcli` reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- ISC DHCP 4.4 `dhclient` manual: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhclient
- ISC DHCP 4.4 `dhclient.conf` manual: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhclientconf
- ISC DHCP 4.4 `dhcp-options` reference: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcp-options
- ISC DHCP end-of-life notice: https://kb.isc.org/docs/isc-dhcp-eol-dates
- Debian `dhcp6c(8)` man page: https://manpages.debian.org/trixie/wide-dhcpv6-client/dhcp6c.8.en.html
- Debian `dhcp6c.conf(5)` man page: https://manpages.debian.org/unstable/wide-dhcpv6-client/dhcp6c.conf.5.en.html
- Debian `wide-dhcpv6-client` package file list: https://packages.debian.org/trixie/amd64/wide-dhcpv6-client/filelist

## Issues Found
- The `dhclient` configuration example used `/etc/dhcp/dhclient6.conf` without showing `-cf`, even though ISC documents the default config path as `dhclient.conf`. I corrected the example to use `/etc/dhcp/dhclient.conf`.
- The `dhclient` example included `default-lease-time`, `timeout`, and `retry` as if they were normal DHCPv6 tuning knobs. ISC’s `dhclient.conf` docs do not describe those timing directives as the right way to configure routine DHCPv6 behavior here, so I removed them from the example.
- The `dhclient` example requested `dhcp6.ntp-servers`, but ISC documents the DHCPv6 time option in client syntax as `dhcp6.sntp-servers`. I changed the request accordingly.
- The `dhclient` example manually sent `dhcp6.client-id <duid>`, which was not a valid copy-pasteable configuration and was unnecessary because `dhclient` manages DUID usage itself. I removed that line.
- The `wide-dhcpv6-client` section used `systemctl enable/start/status wide-dhcpv6-client`, but the Debian package ships `dhcp6c` plus init/ifupdown integration, not a systemd unit with that name. I replaced those commands with direct `dhcp6c` usage and PID inspection.
- The NetworkManager section used `"eth0"` as though it were always the connection profile name. `nmcli connection` commands operate on connection profiles, so I changed the example to use `"<connection_name>"`.
- The NetworkManager `auto` comment implied it always meant “SLAAC + DHCPv6”. The official docs are more specific: `auto` uses Router Advertisements and requests DHCPv6 when the network advertises it. I corrected that wording.
- The NetworkManager `dhcp` comment said only “DHCPv6 only, no SLAAC”, but the official docs also note that DHCPv6 does not provide the default gateway, so such connections are limited to their own subnet unless routes are configured some other way. I corrected that note.
- The verification section referenced `/var/lib/dhcpv6/dhcp6c.conf.bak`, which is not the documented `dhcp6c` state file. I replaced it with `/var/lib/dhcpv6/dhcp6c_duid`.
- The troubleshooting section used `journalctl -u wide-dhcpv6-client`, but there is no such systemd unit in the Debian package. I changed it to `journalctl -t dhcp6c` to match the daemon’s syslog identifier.
- The best-practices section said `DHCP=yes` enables both SLAAC and DHCPv6 in `systemd-networkd`. The systemd docs show that `DHCP=yes` enables DHCPv4 and DHCPv6; SLAAC is separate and depends on Router Advertisements. I corrected that statement.
- The conclusion described `wide-dhcpv6` as a current flexibility-focused choice. Based on the current package/manpage state, I revised the wording to describe it as a legacy option on some distributions.

## Review Notes
- `dhclient` is still packaged by some distributions, but ISC DHCP is end-of-life upstream.
- The Debian `dhcp6c(8)` man page explicitly notes that `dhcp6c` is incomplete and violates the DHCPv6 protocol specification in several aspects, so `systemd-networkd` is the stronger default recommendation for modern Linux systems.
- The post still uses `eth0` as a placeholder interface name in several examples. That is acceptable for a tutorial, but many modern Linux systems use predictable interface names such as `enp1s0`.
