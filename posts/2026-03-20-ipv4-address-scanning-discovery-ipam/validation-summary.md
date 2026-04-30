# Validation Summary: How to Set Up IPv4 Address Scanning and Discovery with IPAM Tools

## Status
validated

## Post Type
Guide

## Technologies Covered
- Nmap
- IPv4 host discovery
- NetBox REST API
- Python (`subprocess`, `xml.etree.ElementTree`, `requests`)
- `arp-scan`
- phpIPAM
- cron

## Sources Consulted
- Nmap host discovery reference: https://nmap.org/man/man-host-discovery.html
- Nmap DNS resolution reference: https://nmap.org/book/host-discovery-dns.html
- Nmap grepable output (`-oG`) reference and deprecation note: https://nmap.org/book/output-formats-grepable-output.html
- Nmap XML output guidance: https://nmap.org/book/output-formats-xml-output.html
- Nmap interactive output caveats: https://nmap.org/book/output-formats-interactive.html
- NetBox REST API overview and pagination: https://netbox.readthedocs.io/en/stable/integrations/rest-api/
- NetBox API integration overview: https://netbox.readthedocs.io/en/stable/features/api-integration/
- NetBox IP address filter implementation (`parent` filter): https://github.com/netbox-community/netbox/blob/main/netbox/ipam/filtersets.py
- Python `subprocess` documentation: https://docs.python.org/3/library/subprocess.html
- Python `xml.etree.ElementTree` documentation: https://docs.python.org/3/library/xml.etree.elementtree.html
- Requests quickstart: https://requests.readthedocs.io/en/latest/user/quickstart/
- `arp-scan` upstream documentation: https://github.com/royhills/arp-scan
- phpIPAM discovery CLI script: https://github.com/phpipam/phpipam/blob/master/functions/scripts/discoveryCheck.php
- phpIPAM status scan CLI script: https://github.com/phpipam/phpipam/blob/master/functions/scripts/pingCheck.php
- phpIPAM scan agent UI: https://github.com/phpipam/phpipam/blob/master/app/admin/scan-agents/index.php
- phpIPAM subnet scanning settings: https://github.com/phpipam/phpipam/blob/master/app/admin/subnets/edit.php

## Issues Found
- The `nmap` one-liner for "live hosts only (no hostnames)" did not disable reverse DNS, so it could print hostnames instead of raw IP addresses. I added `-n` and simplified the filter so the command actually outputs IPs only.
- The post used Nmap's deprecated grepable output format (`-oG`) in both a shell example and the Python automation example. Upstream recommends XML for programs, so I replaced the Python example with `-oX -` plus `xml.etree.ElementTree` parsing and changed the shell example to a non-`-oG` form.
- The "more thorough discovery" explanation did not match the actual flags used. I corrected the note to reflect that the command adds ICMP echo/timestamp probes plus TCP SYN/ACK probes, while Nmap still performs ARP discovery automatically on local Ethernet networks.
- The NetBox example used the legacy `Authorization: Token` header and a generic token placeholder. Current NetBox documentation recommends v2 tokens with `Authorization: Bearer nbt_<key>.<token>`, so I updated the sample accordingly.
- The NetBox helper only consumed the first page of results. Because NetBox list endpoints are paginated, I updated the example to follow `next` links and added `raise_for_status()` for basic API error handling.
- The phpIPAM section referenced `functions/scripts/scanSubnets.php`, which is not present in the current upstream tree. I corrected the example to use `functions/scripts/discoveryCheck.php` and fixed the surrounding explanation to reflect that recurring scheduling is handled by cron while agents/settings are associated with subnets in the UI.
- The `arp-scan` description made an unsupported comparative claim. I tightened it to the upstream-supported statement that `arp-scan` is designed for IPv4 host discovery on local subnets.

## Review Notes
- NetBox still documents legacy `Authorization: Token <token>` authentication for older v1 tokens, but v2 `Bearer` tokens are the current recommended format and v1 support is planned for removal in a future release.
- The NetBox `parent` filter used in the sample is valid in current upstream code, even though the general REST API docs emphasize the interactive schema/UI for enumerating available filters.
- The cron snippets assume the necessary tooling is installed on the scanning host, including `nmap`, Python dependencies such as `requests`, and any phpIPAM scan dependencies configured on that system.
