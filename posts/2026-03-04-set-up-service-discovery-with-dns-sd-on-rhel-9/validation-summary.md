# Validation Summary: How to Set Up Service Discovery with DNS-SD on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- DNS-Based Service Discovery (DNS-SD)
- Multicast DNS (mDNS)
- Avahi
- nss-mdns / Name Service Switch
- BIND-style DNS zone records
- firewalld
- Python subprocess usage

## Sources Consulted
- RFC 6763: DNS-Based Service Discovery: https://www.rfc-editor.org/rfc/rfc6763.html
- Avahi avahi-daemon.conf manual source: https://raw.githubusercontent.com/avahi/avahi/master/man/avahi-daemon.conf.5.xml.in
- Avahi service file manual source: https://raw.githubusercontent.com/avahi/avahi/master/man/avahi.service.5.xml.in
- Avahi avahi-browse manual source: https://raw.githubusercontent.com/avahi/avahi/master/man/avahi-browse.1.xml.in
- Avahi avahi-resolve manual source: https://raw.githubusercontent.com/avahi/avahi/master/man/avahi-resolve.1.xml.in
- Avahi nss-mdns documentation: https://github.com/avahi/nss-mdns
- Red Hat Enterprise Linux 9 CUPS documentation note about nss-mdns availability: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/configuring_and_using_a_cups_printing_server/Red_Hat_Enterprise_Linux-9-Configuring_and_using_a_CUPS_printing_server-en-US.pdf
- Red Hat Enterprise Linux 9 firewalld documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters

## Issues Found
- The install command included `nss-mdns` as if it were provided by standard RHEL 9 repositories. Red Hat documents that RHEL does not provide the `nss-mdns` NSS plugin, so the install command now installs only `avahi` and `avahi-tools`, and the NSS section now states that `nss-mdns` requires a trusted third-party compatible package.
- The service verification example used `avahi-resolve-host-name myserver.local` while describing service resolution to get host and port. Avahi's resolve command resolves host names to addresses, not service instances, so the example now uses `avahi-browse -r -t _http._tcp`.
- The Avahi configuration hardcoded `allow-interfaces=eth0`. Because RHEL systems commonly use predictable interface names and Avahi supports an empty list to use all normal local interfaces, the example now leaves `allow-interfaces` empty.
- The SSH service name used `%h` without `replace-wildcards="yes"`. Avahi only substitutes `%h` when wildcard replacement is enabled, so the service definition now sets `replace-wildcards="yes"`.
- The unicast DNS-SD zone example put SRV and TXT records directly on `_http._tcp.internal.example.com`. RFC 6763 uses PTR records from the service type to service instance names, with SRV and TXT records on those instance names. The zone example and `dig` commands now follow that layout.
- Introductory wording described the standard DNS approach as only SRV/TXT records. It now refers to PTR, SRV, and TXT records to match DNS-SD.

## Review Notes
- The Python example was syntax-checked with Python 3. The XML service snippets were parsed successfully as XML.
- `dig` syntax was checked locally. Avahi commands were verified against upstream Avahi manual sources because Avahi tools were not installed in the local review environment.
