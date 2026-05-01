# Validation Summary: How to Configure DHCPv6 Failover for High Availability

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kea DHCPv6
- Kea High Availability (HA) hook
- Kea Control Agent
- DHCPv6
- IPv6
- Linux systemd

## Sources Consulted
- ISC Kea Administrator Reference Manual 2.6.4, "Hook Libraries" (`libdhcp_ha.so`) - https://kea.readthedocs.io/en/kea-2.6.4/arm/hooks.html
- ISC Kea Administrator Reference Manual 2.6.4, "The DHCPv6 Server" - https://kea.readthedocs.io/en/kea-2.6.4/arm/dhcp6-srv.html
- ISC Knowledge Base, "Kea HA Quickstart Guide" - https://kb.isc.org/v1/docs/kea-ha-quickstart-guide
- ISC Knowledge Base, "Kea API and Control Sockets" - https://kb.isc.org/docs/kea-api-sockets
- ISC Knowledge Base, "Kea HA Strategies Comparison" - https://kb.isc.org/docs/kea-ha-strategies-comparison
- ISC Knowledge Base, "Ports used by Kea" - https://kb.isc.org/docs/kea-ports
- RFC 8156, "DHCPv6 Failover Protocol" - https://datatracker.ietf.org/doc/html/rfc8156
- Debian package file list for `kea-dhcp6-server` - https://packages.debian.org/bookworm/amd64/kea-dhcp6-server/filelist
- Debian/Ubuntu package metadata for `kea-dhcp6-server` and `kea-ctrl-agent` - https://packages.debian.org/bookworm/kea-dhcp6-server and https://packages.ubuntu.com/kea-ctrl-agent

## Issues Found
- The introduction incorrectly implied that DHCPv4 has a standardized failover protocol and that DHCPv6 HA is simply "implemented differently." Kea's own HA documentation notes that the DHCPv4 failover effort was never completed and that DHCPv6 has RFC 8156, which Kea does not implement. I corrected the explanation to describe Kea's HA hook accurately.
- The DHCPv6 HA examples omitted `libdhcp_lease_cmds.so`, which ISC documents as required alongside `libdhcp_ha.so` for HA to function. I added the missing hook library to both server configurations.
- The DHCPv6 HA examples omitted the local `control-socket` configuration needed for the Control Agent to forward commands to `kea-dhcp6`. I added matching UNIX control socket definitions to both server configurations.
- The Control Agent and DHCPv6 examples used `/tmp/kea6-ctrl-socket`. Current Kea documentation notes that modern releases restrict control sockets to the Kea control-socket directory unless overridden, and recommends omitting the path component. I changed the socket name to `kea6-ctrl-socket` consistently.
- The memfile lease database example used an absolute path. Current Kea documentation similarly restricts lease-file locations and recommends omitting the path component for portability. I changed the lease file name to `dhcp6.leases`.
- The standby server snippet was incomplete as written: it only showed the HA hook block, even though the text said the configuration was otherwise identical. I expanded it so it includes the same interface, control socket, lease database, and subnet configuration as the primary, with only `this-server-name` changed.
- The prerequisites and best-practices sections incorrectly suggested that a shared lease database or lease-file sync was required for Kea HA. ISC documents shared lease databases as a separate HA strategy; the HA hook normally synchronizes leases between paired servers. I corrected those statements.
- The failover explanation and conclusion implied takeover would happen "within seconds." Kea's HA timing depends on `heartbeat-delay`, `max-response-delay`, `max-ack-delay`, and `max-unacked-clients`, so the timing is configuration-dependent. I corrected the wording.
- The packet-capture and journald comments were too narrow or too specific. I broadened the `tcpdump` example to observe both DHCPv6 client and server ports, and changed the log expectation to the documented `partner-down` transition rather than an exact message string.

## Review Notes
- The corrected post is accurate for the Kea 2.6.x-style deployment model that uses `kea-ctrl-agent` plus UNIX control sockets. In newer Kea branches, direct HTTP/HTTPS control channels were introduced and the Control Agent is no longer the preferred long-term API path, so a future refresh may want to retarget the article explicitly if it is meant to cover Kea 2.7+/3.x.
