# Validation Summary: How to Configure DHCP Server Integration with IPAM Tools for IPv4

## Status
validated

## Post Type
Guide

## Technologies Covered
- DHCP
- ISC DHCP 4.4
- Kea DHCP
- phpIPAM API
- Bash
- Python
- IPv4 address management

## Sources Consulted
- ISC DHCP 4.4 `dhcpd.conf` manual page: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdconf
- ISC DHCP 4.4 `dhcp-eval` manual page: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcp-eval
- ISC DHCP 4.4 `dhcp-options` manual page: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcp-options
- ISC DHCP 4.4 `dhcpd.leases` manual page: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdleases
- Kea Administrator Reference Manual, Hook Libraries / `run_script`: https://kea.readthedocs.io/en/stable/arm/hooks.html
- phpIPAM API documentation: https://www.phpipam.net/api-documentation/

## Issues Found
- The post metadata and Kea section implied direct NetBox/phpIPAM-specific Kea integration, but the official Kea documentation describes a generic open-source `run_script` hook library rather than a built-in NetBox/phpIPAM hook. I removed the NetBox-specific metadata from this post and rewrote the Kea section around the documented `run_script` mechanism.
- The ISC DHCP example used `option dhcp-client-identifier` as a hostname fallback. That option is the client identifier, not the hostname. I changed the example to use `option fqdn.hostname` and `option host-name`, which match the documented hostname/FQDN fields.
- The phpIPAM shell example used search requests in a way that could fail once `curl -f` behavior was considered. phpIPAM documents that missing search results return HTTP `404`, so I kept `curl -f` for auth/update/create/delete but not for search, and I aligned the example with the documented `phpipam-token` header.
- The original `chown dhcpd:dhcpd` command was distro-specific and not required for the example to be executable. I reduced the command example to the portable `chmod 0755` step.
- The Kea section implied the ISC DHCP hook script could be reused unchanged. Kea documents that the script receives the hook-point name as its only command-line argument and exports lease data through environment variables, so I added that constraint and clarified the script-location requirement (`KEA_HOOK_SCRIPTS_PATH` or Kea's hook-scripts directory).
- The periodic lease-scanning example treated every matching lease record as current. ISC documents that `dhcpd.leases` is append-only and the last declaration for a lease is the active one, so I rewrote the example to parse lease blocks safely and process the effective active lease set before upserting records into phpIPAM.
- The conclusion overstated the guarantees of the integration by saying every lease event immediately updates IPAM and keeps records always current. I softened that language to near-real-time and described the tradeoff between event-driven hooks and periodic scanning.

## Review Notes
- ISC DHCP 4.4 is end-of-life. The corrected post now says so; the approach is still relevant for existing installations, but new deployments should prefer Kea.
- The phpIPAM examples still use a placeholder `subnetId` of `5`. That is acceptable as an example, but readers must substitute the correct subnet ID for their environment.
- The examples search phpIPAM by IP address and use the first returned record. In environments with overlapping space, multiple VRFs, or multiple matching records, a production integration should narrow that lookup further.
- Kea's current documentation exposes a `sync` parameter for `run_script`, but also states that synchronous external-script calls are not currently supported. The post now keeps `sync` set to `false`, which matches the documented behavior.
