# Validation Summary: How to Configure phpIPAM for IPv6 Address Management

## Status
validated

## Post Type
Guide

## Technologies Covered
- phpIPAM
- IPv6
- Docker Compose
- phpIPAM REST API
- Python `requests`
- Kea DHCP

## Sources Consulted
- phpIPAM API documentation: https://www.phpipam.net/api-documentation/
- phpIPAM upstream repository and source code: https://github.com/phpipam/phpipam
- phpIPAM release history: https://github.com/phpipam/phpipam/releases
- phpIPAM Docker image documentation: https://github.com/phpipam-docker/phpipam-docker
- phpIPAM scan agent repository: https://github.com/phpipam/phpipam-agent
- Kea configuration reference: https://kea.readthedocs.io/en/stable/arm/config.html
- Kea DHCPv6 server reference: https://kea.readthedocs.io/en/kea-2.6.4/arm/dhcp6-srv.html

## Issues Found
- The original Docker example was incomplete for the official deployment model and implied a standalone `phpipam-www` container setup without the documented full stack. I replaced it with an official-style Docker Compose deployment and removed the incorrect claim that IPv6 must be enabled with a dedicated toggle.
- The post claimed phpIPAM can scan IPv6 subnets with ping/discovery. Current upstream phpIPAM blocks IPv6 subnet scans in the UI and the scheduled ping/discovery jobs explicitly limit themselves to IPv4 subnets. I removed the `pingSubnet` IPv6 API example and rewrote the scanning section and conclusion accordingly.
- The DHCP section claimed support for importing ISC DHCPv6 lease files and suggested a `phpipam-agent` DHCP sync workflow. Current upstream phpIPAM's DHCP wrapper is Kea-based and does not support ISC DHCPv6 lease import. I replaced that section with the current Kea-based configuration model.
- The Step 2 example was marked as `php` even though it was not executable PHP. I changed it to a plain text example.
- The Python API snippets were technically close but light on correctness checks. I removed an unused import, changed numeric fields to JSON numbers, and added `raise_for_status()` calls so the examples behave correctly on API failures.

## Review Notes
- The public phpIPAM API documentation page still reports version 1.7.4, so the current upstream repository and changelog were also used to validate present-day behavior.
- Current phpIPAM source includes Kea-focused DHCP support, but IPv6 lease visibility is backend-dependent; the source shows incomplete support for some Kea backend combinations, so future DHCPv6 deep dives should call that out explicitly.
