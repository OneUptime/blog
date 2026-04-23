# Validation Summary: How to Release a DHCP Lease

## Status
validated

## Post Type
Guide

## Technologies Covered
- DHCPv4
- Linux `dhclient`
- Linux NetworkManager / `nmcli`
- Windows `ipconfig`
- macOS `ipconfig`

## Sources Consulted
- RFC 2131, Dynamic Host Configuration Protocol: https://datatracker.ietf.org/doc/html/rfc2131
- RFC 2132, DHCP Options and BOOTP Vendor Extensions: https://www.rfc-editor.org/rfc/rfc2132.html
- ISC DHCP `dhclient` manual page: https://kb.isc.org/docs/isc-dhcp-41-manual-pages-dhclient
- NetworkManager `nmcli` reference manual: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nmcli.html
- Microsoft Learn, `ipconfig`: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ipconfig
- Apple Support, Renew your IP address from the DHCP server on Mac: https://support.apple.com/en-gb/guide/mac-help/mchlp1545/mac
- Apple Support, Change TCP/IP settings on Mac: https://support.apple.com/guide/mac-help/change-tcp-ip-settings-on-mac-mh14129/mac
- macOS `ipconfig` man page mirror used to verify `ipconfig set en0 NONE` syntax: https://www.unix.com/man-page/osx/8/ipconfig/

## Issues Found
- The post treated the workflow as generic DHCP, but the protocol details and commands shown are specifically DHCPv4. I updated the description and takeaways to make that explicit.
- The `dhclient` section claimed `dhclient -r` without an interface releases all leases on all interfaces. ISC's documentation only describes releasing the current lease for the recorded client process, so I removed that unsupported claim and kept the per-interface example.
- The Linux verification command used `ip addr show eth0`, which also shows non-IPv4 addresses. I changed it to `ip -4 addr show dev eth0` so the check matches the DHCPv4 behavior being discussed.
- The NetworkManager section said `nmcli connection down` "releases" the lease and suggested `nmcli device modify eth0 ipv4.method disabled` as a way to remove the IP without disconnecting. NetworkManager documents `connection down` as deactivating a connection and `device modify` as a temporary change to the active device settings, not as a DHCP release mechanism. I replaced the second command with `nmcli device disconnect eth0` and rewrote the comments to match documented behavior.
- The Windows verification note said the output should show `Media disconnected` or no IP. Microsoft documents that `/release` discards the DHCP-assigned configuration, but that exact output is not guaranteed. I changed the note to the precise check that the DHCP-assigned IPv4 address is gone.
- The macOS verification command used `grep inet`, which can also match `inet6`. I changed it to `grep 'inet '` so it checks IPv4 specifically.
- The `When to Release a Lease` section recommended doing this before shutting down a server with a reserved IP. That is misleading because a DHCP reservation is not generally returned to the shared pool for other clients by releasing it. I changed the example to decommissioning a client that no longer needs a dynamically assigned IP.
- The `DHCPRELEASE Message Format` section incorrectly described DHCPRELEASE as a DHCPREQUEST with message type 7. RFC 2132 defines DHCPRELEASE as its own DHCP message type carried in the standard BOOTP/DHCP packet format with option 53 set to 7. I corrected that explanation and aligned the lease-state wording with RFC 2131's "not allocated" behavior.
- The takeaway that releasing a lease returns the IP to the pool immediately was too absolute. RFC 2131 notes that correct DHCP operation does not depend on DHCPRELEASE, so I qualified the statement to apply when the server actually receives the release.

## Review Notes
- `dhclient` remains technically valid where installed, but many Linux systems now use NetworkManager, `systemd-networkd`, or other DHCP clients instead of ISC DHCP.
- Apple's public end-user documentation focuses on renewing DHCP leases in System Settings. The CLI syntax for `ipconfig set en0 NONE` was verified against a macOS `ipconfig` man page mirror because Apple's historical public man page URLs currently return 404.
