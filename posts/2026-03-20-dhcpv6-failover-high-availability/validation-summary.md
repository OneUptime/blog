# Validation Summary: How to Configure DHCPv6 Failover for High Availability - High Availability

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- DHCPv6
- IPv6
- ISC Kea DHCP
- Kea HA hook (`libdhcp_ha`)
- Kea lease commands hook (`libdhcp_lease_cmds`)
- Kea HTTP control sockets
- RFC 8156

## Sources Consulted
- RFC 8156: DHCPv6 Failover Protocol - https://datatracker.ietf.org/doc/html/rfc8156
- ISC Knowledge Base: Kea High Availability vs. ISC DHCP Failover - https://kb.isc.org/docs/aa-01617
- Kea Administrator Reference Manual, configuration templates - https://kea.readthedocs.io/en/latest/arm/config-templates.html
- Kea Administrator Reference Manual, DHCPv6 server management API - https://kea.readthedocs.io/en/kea-3.0.0/arm/dhcp6-srv.html
- Kea Administrator Reference Manual, HA hook documentation - https://kea.readthedocs.io/en/stable/arm/hooks.html

## Issues Found
- The overview conflated standardized DHCPv6 failover from RFC 8156 with ISC Kea's HA implementation. I rewrote the explanation to state that Kea HA is a separate mechanism rather than an RFC 8156 implementation.
- The architecture diagram incorrectly showed Kea peers using the RFC 8156 failover protocol on TCP port 647 and sharing a single lease database. I updated it to show Kea HA REST/control-channel lease synchronization and separate lease databases per server.
- The primary configuration omitted the required `libdhcp_lease_cmds` hook. I added it because Kea HA depends on it for lease exchange and synchronization.
- The post used an outdated Control Agent-centered setup and peer URLs that were inconsistent with current Kea guidance. I updated the example to use HTTP control sockets directly on `kea-dhcp6`, and I changed the operational commands accordingly.
- The DHCPv6 configuration did not assign a subnet `id`. I added one because current Kea versions warn when subnet IDs are omitted and HA lease handling relies on consistent subnet identifiers.
- The secondary-server note was incomplete once the local control socket address became server-specific. I updated the explanation and changed-fields example to include the secondary server's local listener address.
- The expected `ha-heartbeat` output shape was outdated for direct HTTP control-socket use. I updated the example response to the current list-wrapped form.
- The load-balancing and passive-backup descriptions were overly simplified. I corrected them to reflect pool/scope partitioning requirements and the fact that passive-backup does not provide automatic failover.
- The best-practices section incorrectly implied that exceeding `max-response-delay` alone triggers takeover. I corrected this to reflect Kea's additional failure-detection checks before transition to `partner-down`.
- The summary overstated the guarantee by claiming no DHCPv6 clients lose connectivity. I softened this to the more accurate claim that the HA pair keeps DHCPv6 service available through a server outage.
- The post description still referred generically to DHCPv6 failover after the body was corrected for Kea HA. I updated the description to match the actual implementation discussed.

## Review Notes
Kea documentation currently spans both older Control Agent-centric HA examples and newer direct HTTP/HTTPS control-socket guidance. This post was updated to reflect the current direct control-socket approach. Systemd unit names can vary slightly by distribution, so operators should confirm the local service name if `kea-dhcp6` is packaged differently.
