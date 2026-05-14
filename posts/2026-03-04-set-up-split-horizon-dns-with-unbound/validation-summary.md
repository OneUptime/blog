# Validation Summary: How to Set Up Split-Horizon DNS with Unbound on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- RHEL 9
- Unbound
- DNS
- Split-horizon DNS

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Setting up an unbound DNS server, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_networking_infrastructure_services/assembly_setting-up-an-unbound-dns-server_networking-infrastructure-services
- Unbound official documentation: unbound.conf(5), https://unbound.docs.nlnetlabs.nl/en/latest/manpages/unbound.conf.html
- RFC 5737: IPv4 Address Blocks Reserved for Documentation, https://datatracker.ietf.org/doc/html/rfc5737

## Issues Found
- Fixed corrupted wording in the introduction that made the split-horizon DNS explanation inaccurate.
- Changed Unbound configuration code fences from `yaml` to `unbound` because `unbound.conf` is not YAML.
- Updated the view-based split-horizon example so external clients are actually mapped to an external view and receive a public documentation address for the same hostname.
- Added matching `access-control` entries to the view example because `access-control-view` maps clients to views but does not by itself grant recursive or local-data access.
- Updated the external test expectation to match the configured external view response.
- Added the RHEL firewalld commands needed to allow network clients to reach the DNS service.
- Removed an unrelated trailing `RHEL` token at the end of the post.

## Review Notes
The examples use documentation IP address space for the external answer. In a real deployment, replace the example subnets, server address, and DNS records with production network ranges and public service addresses.
