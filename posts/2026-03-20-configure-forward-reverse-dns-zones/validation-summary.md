# Validation Summary: How to Configure Forward and Reverse DNS Zones

## Status
validated

## Post Type
Guide

## Technologies Covered
- DNS
- BIND 9
- Forward DNS zones
- Reverse DNS zones
- PTR records
- `dig`
- `named-checkzone`

## Sources Consulted
- BIND 9 Administrator Reference Manual, "Configurations and Zone Files": https://bind9.readthedocs.io/en/v9.20.22/chapter3.html
- BIND 9 Manual Pages, `named-checkzone`: https://bind9.readthedocs.io/en/v9.20.20/manpages.html
- BIND 9 Manual Pages, `dig`: https://bind9.readthedocs.io/en/v9.21.16/manpages.html
- BIND 9 Configuration Reference, zone types (`primary` and `master`): https://bind9.readthedocs.io/en/v9.18.34/reference.html
- RFC 1912, "Common DNS Operational and Configuration Errors": https://www.rfc-editor.org/rfc/rfc1912
- RFC 2181, "Clarifications to the DNS Specification": https://www.rfc-editor.org/rfc/rfc2181
- Amazon EC2, "Create a reverse DNS record for email on Amazon EC2": https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/Using_Elastic_Addressing_Reverse_DNS.html
- Google Cloud Compute Engine, "Create a PTR record for a VM instance": https://docs.cloud.google.com/compute/docs/instances/create-ptr-record
- Google Cloud DNS, "Create a managed reverse lookup zone": https://docs.cloud.google.com/dns/docs/zones/managed-reverse-lookup-zones
- Microsoft Learn, "Overview of reverse DNS in Azure": https://learn.microsoft.com/en-us/azure/dns/dns-reverse-dns-overview
- Microsoft Learn, "Reverse DNS for Azure services": https://learn.microsoft.com/en-us/azure/dns/dns-reverse-dns-for-azure-services

## Issues Found
- The post said the reverse-zone name is the "network address reversed." I changed this to "network prefix reversed" because octet-aligned reverse zones use the reversed network prefix, not the full IPv4 network address.
- The `/16` reverse-zone example had PTR owner names in the wrong order (`0.1`, `0.2`, `0.10`, `1.10`). I corrected them to `1.0`, `2.0`, `10.0`, and `10.1` so they expand to the intended `in-addr.arpa` names.
- The `/8` explanatory comment said "Last three octets in PTR records." I clarified that those octets are written in reverse order.
- The batch verification loop claimed to check all PTR records, but it only queried the apex `A` record for `example.com`. I replaced it with an explicit loop over the sample IPs used in the zone examples.
- The cloud-provider guidance was inaccurate or too broad. I updated it to reflect current provider behavior: AWS reverse DNS is configured for Elastic IPs in EC2, Google Cloud PTR records for external VM IPs are configured in Compute Engine rather than by manually adding Cloud DNS PTR records, and Azure-assigned public IP reverse DNS is configured on the Public IP resource while Azure DNS hosts reverse zones only for IP ranges assigned to the organization.
- I added `mkdir -p /etc/bind/zones` before writing zone files because the sample commands otherwise fail on systems where that directory does not already exist.

## Review Notes
- The updated forward, `/24` reverse, and `/16` reverse sample zone files were validated with `named-checkzone` in an Ubuntu 24.04 container using `bind9-utils`; all three loaded successfully.
- The post's use of `type master;` is still valid in current BIND 9 because `master` remains a synonym for `primary`, so no change was required.
- The post states that multiple PTR records for one IP are valid. That is technically correct per RFC 2181, though some operational environments prefer a single PTR for predictability.
