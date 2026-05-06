# Validation Summary: How to Configure BlueCat for IPv6 IPAM

## Status
validated

## Post Type
Guide

## Technologies Covered
- BlueCat Address Manager (BAM)
- BlueCat Address Manager RESTful v2 API
- IPv6 IPAM
- DHCPv6
- DNS host records and reverse DNS
- Python `requests`

## Sources Consulted
- BlueCat Address Manager RESTful v2 API Guide, Basic authentication: https://docs.bluecatnetworks.com/r/Address-Manager-RESTful-v2-API-Guide/Basic-authentication/9.5.0
- BlueCat Address Manager RESTful v2 API Guide, v1 REST API to RESTful v2 API migration guide: https://docs.bluecatnetworks.com/r/Address-Manager-RESTful-v2-API-Guide/v1-REST-API-to-RESTful-v2-API-migration-guide/25.1.0
- BlueCat Address Manager RESTful v2 API Guide, What's New in v9.6.0: https://docs.bluecatnetworks.com/r/Address-Manager-RESTful-v2-API-Guide/What-s-New-in-v9.6.0/9.6.0
- BlueCat Address Manager Administration Guide, Working with IPv6 blocks and networks: https://docs.bluecatnetworks.com/r/Address-Manager-Administration-Guide/Working-with-IPv6-blocks-and-networks/25.1.0
- BlueCat Address Manager Administration Guide, Reference: Object types: https://docs.bluecatnetworks.com/r/Address-Manager-Administration-Guide/Reference-Object-types/25.1.0
- BlueCat Address Manager Administration Guide, Reference: Generic resource record types: https://docs.bluecatnetworks.com/r/Address-Manager-Administration-Guide/Reference-Generic-resource-record-types/9.5.0
- BlueCat Address Manager Administration Guide, Creating reverse zones: https://docs.bluecatnetworks.com/r/Address-Manager-Administration-Guide/Creating-reverse-zones/26.1.0

## Issues Found
- The post used legacy-style authentication (`GET /login` plus `BAMAuthToken`) for a REST v2 workflow. I replaced it with `POST /api/v2/sessions` and `Authorization: Basic {basicAuthenticationCredentials}` because BlueCat documents v2 sessions that way and explicitly states that v1 `BAMAuthToken` is not valid for v2 authentication from v9.6.0 onward.
- The post used incorrect top-level resource endpoints such as `POST /api/v2/blocks`, `POST /api/v2/networks`, `POST /api/v2/ranges`, `POST /api/v2/addresses`, and `POST /api/v2/resourceRecords`. I changed these to the documented nested collection endpoints such as `configurations/{id}/blocks`, `blocks/{id}/blocks`, `blocks/{id}/networks`, `networks/{id}/ranges`, `networks/{id}/addresses`, and `zones/{id}/resourceRecords`.
- The post treated BlueCat collection responses as plain lists. I corrected the examples to read collection members from the `data` array returned by the REST v2 API.
- The /48 site prefix was created as an `IPv6Network`, but BlueCat documents that an IPv6 network's parent is always an IPv6 block. I changed the /48 site prefix to an `IPv6Block` and nested the /64 VLAN network underneath it.
- The AAAA example used `AaaaRecord` and the PTR example manually created a `PtrRecord` under `ip6.arpa`. I replaced that with a `HostRecord` carrying an `IPv6Address` plus `reverseRecord: true`, because BlueCat documents Host records as the primary A/AAAA mechanism and documents PTR creation as part of reverse-enabled host record workflows when reverse DNS is configured.
- The post claimed `nextAvailableAddress` was the relevant v2 allocation method. I replaced that example with a documented v2 address query that filters the network's addresses for `state:'UNASSIGNED'`.
- The post used ad hoc `properties` strings for DHCPv6 enablement, router advertisements, and IPv6 static assignment details. I removed those unsupported examples and updated the conclusion to reflect BlueCat's documented model: DHCPv6 and router advertisement behavior is configured through deployment roles and deployment options, not arbitrary network-creation properties.
- The CSV import loop created networks with standalone `address` and `cidr` fields. I corrected that example to use the documented `range` representation and the proper block-scoped network creation endpoint.

## Review Notes
- The examples still use `verify=False`; that is functional for lab-style examples but should be replaced with proper TLS validation in production.
- The HostRecord example assumes the target reverse zone and the necessary DNS deployment roles already exist; otherwise `reverseRecord: true` will not produce a usable deployed PTR record.
- The DHCPv6 example assumes DHCP deployment roles and DHCPv6 options are configured separately on the relevant network/server hierarchy.
