# Validation Summary: How to Configure DHCP for IPv4 with systemd-networkd

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux
- systemd-networkd
- `systemd.network` `.network` files
- DHCPv4
- `networkctl`
- `iproute2`

## Sources Consulted
- `systemd.network(5)` official documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.network.html
- `networkctl(1)` official documentation: https://www.freedesktop.org/software/systemd/man/latest/networkctl.html
- `hostname(5)` official documentation: https://www.freedesktop.org/software/systemd/man/latest/hostname.html
- RFC 4361, Node-specific Client Identifiers for DHCPv4: https://datatracker.ietf.org/doc/html/rfc4361
- Local `systemd 255.4` man pages and CLI help: `systemd.network(5)`, `networkctl(1)`, `networkctl --help`, `systemd --version`

## Issues Found
- The post said `ClientIdentifier=mac` was the default and implied that `ClientIdentifier=duid` used the hostname. In `systemd.network(5)`, the default is `duid`, and `duid` means an RFC 4361 client identifier based on IAID and DUID. The comments were corrected.
- The section title "Request Specific DHCP Options" was misleading. The example used `UseRoutes=`, `UseDNS=`, `UseNTP=`, `UseHostname=`, and `Hostname=`, which control DHCP client behavior and use of server-provided values rather than the DHCP request options list. The title was corrected.
- The "DHCP with Fallback Static Address" section was technically incorrect. `Address=` in `[Network]` configures a static address alongside DHCP; it is not a fallback that activates only when DHCP fails. The section title and comments were corrected.
- The `UseHostname=` comment implied the DHCP hostname simply becomes the system hostname. Per `hostname(5)` and `systemd.network(5)`, it is applied as a transient hostname. The comment was corrected.
- The `networkctl renew` example was described as a forced renew. In `networkctl(1)`, `renew` requests renewal of dynamic configuration, while `forcerenew` is a separate command. The comment was corrected.

## Review Notes
- `systemctl restart systemd-networkd` is valid, but `networkctl reload` is the documented way to reload edited `.network` files and reconfigure matching interfaces with less disruption.
- `networkctl status <interface>` is the documented inspection command. Lease files under `/run/systemd/netif/leases/` are runtime data and may be less stable to rely on than `networkctl status`.
