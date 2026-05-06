# Validation Summary: How to Choose an IPAM Tool for IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- IPAM
- NetBox
- phpIPAM
- Infoblox NIOS / WAPI
- BlueCat Integrity
- EfficientIP SOLIDserver
- Docker Compose
- Python `requests`

## Sources Consulted
- NetBox Docker quickstart: https://github.com/netbox-community/netbox-docker
- NetBox IPAM documentation: https://netbox.readthedocs.io/en/stable/features/ipam/
- NetBox custom fields documentation: https://netbox.readthedocs.io/en/stable/customization/custom-fields/
- NetBox REST API documentation: https://netbox.readthedocs.io/en/stable/integrations/rest-api/
- NetBox GraphQL API documentation: https://netbox.readthedocs.io/en/stable/integrations/graphql-api/
- phpIPAM installation guide: https://phpipam.net/documents/installation/
- phpIPAM feature list: https://phpipam.net/documents/features/
- phpIPAM API documentation: https://phpipam.net/api/
- phpIPAM Docker image documentation: https://github.com/phpipam-docker/phpipam-docker
- Infoblox IPv6 solution note: https://www.infoblox.com/resources/solution-notes/nios-for-ipv6-only-networks
- Infoblox WAPI `ipv6network` reference: https://ipam.illinois.edu/wapidoc/objects/ipv6network.html
- Infoblox WAPI extensible attributes reference: https://ipam.illinois.edu/wapidoc/additional/extattrsearch.html
- BlueCat Integrity product page: https://bluecatnetworks.com/products/integrity/
- BlueCat DHCPv6 documentation: https://docs.bluecatnetworks.com/r/Address-Manager-Administration-Guide/DHCPv6/25.1.0
- BlueCat Network Discovery documentation: https://docs.bluecatnetworks.com/r/Network-Discovery-Administration-Guide/Introduction-to-Network-Discovery/24.1.2
- EfficientIP SOLIDserver DDI product page: https://efficientip.com/products/solidserver-ddi/
- EfficientIP SOLIDserver API documentation page: https://efficientip.com/solutions/solidserver-api-for-it-automation/
- EfficientIP IPv6 solution paper: https://efficientip.com/wp-content/uploads/2022/10/sp-IPv6-Needs-Smart-IPAM-EN-220414.pdf

## Issues Found
- The NetBox Docker commands were incomplete relative to the current community quickstart. I updated them to use the `release` branch, copy the override file, and create the first superuser.
- The phpIPAM Docker example was not runnable as written. It used incorrect environment variables for the official images and omitted the required database service. I replaced it with a current Docker Compose example based on the official phpIPAM Docker documentation.
- phpIPAM was described as having built-in/basic DHCPv6 integration via an ISC DHCP plugin. Current phpIPAM official documentation and feature lists do not document built-in DHCPv6 server integration. I revised the matrix, best-fit guidance, strengths, and limitations to reflect phpIPAM's documented IPv6 IPAM, API, and PowerDNS capabilities instead.
- The matrix used "SLAAC address discovery" wording and specific commercial price ranges that were not supported consistently by the product documentation I reviewed. I normalized this to documented IPv6 address discovery language and replaced commercial pricing figures with quote-based "Contact vendor" wording.
- The BlueCat prefix delegation row was overstated as automated. Public BlueCat documentation reviewed here clearly supports IPv6 hierarchy, DHCPv6, and discovery, but not the same documented automated prefix-delegation observability described by Infoblox and EfficientIP. I changed BlueCat's entry to manual.
- The Infoblox feature list included router advertisement monitoring, which I could not substantiate from the current public documentation reviewed. I replaced it with documented IPv6 discovery behavior for DHCPv6, SLAAC, and manually configured devices.
- The Infoblox Python example used an older WAPI path and disabled TLS verification. I updated it to a current WAPI version reference and safer `requests` usage with `timeout` and `raise_for_status()`.
- The decision tree referenced `phpIPAM Enterprise`, which is not a documented product offering, and it omitted BlueCat from the integrated DDI branch. I corrected those tool choices.
- The weighted scores were mathematically incorrect. I recalculated them from the published weights and category scores.

## Review Notes
- Some commercial IPv6 capabilities are module- or deployment-dependent, especially discovery workflows in BlueCat and EfficientIP, so buyers should verify exact licensing and module coverage during evaluation.
- Infoblox WAPI versions vary by NIOS release. The example now uses `v2.13.7`, which matched the public WAPI reference consulted during this review on 2026-05-06.
- Pricing for commercial DDI platforms is typically quote-based and environment-specific, so precise annual ranges are not reliable without current vendor quotes.
