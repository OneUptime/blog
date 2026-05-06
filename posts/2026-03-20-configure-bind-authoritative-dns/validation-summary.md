# Validation Summary: How to Configure BIND as an Authoritative DNS Server

## Status
validated

## Post Type
Guide

## Technologies Covered
- BIND 9
- DNS authoritative server configuration
- DNS zone files
- Linux system administration
- `dig`, `named-checkconf`, and `named-checkzone`
- systemd service management

## Sources Consulted
- ISC BIND 9 Administrator Reference Manual: https://isc-projects.gitlab-pages.isc.org/bind9/
- ISC BIND 9 configuration reference and man pages: https://isc-projects.gitlab-pages.isc.org/bind9/reference.html and https://isc-projects.gitlab-pages.isc.org/bind9/manpages.html
- ISC KB, DNSSEC validation automatic trust anchor management: https://kb.isc.org/docs/916-dnssec-validation-automatic-trust-anchor-management
- ISC KB, authoritative servers making recursive queries: https://kb.isc.org/docs/why-does-my-authoritative-server-make-recursive-queries
- Red Hat documentation, setting up and configuring a BIND DNS server: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/managing_networking_infrastructure_services/setting-up-and-configuring-a-bind-dns-server
- Red Hat documentation, BIND zone file locations and `/var/named/`: https://docs.redhat.com/en/documentation/Red_Hat_Enterprise_Linux/5/html/deployment_guide/s1-bind-zone
- Debian package metadata for `bind9-utils`: https://packages.debian.org/stable/net/bind9-utils
- Debian package metadata for `bind9-dnsutils`: https://packages.debian.org/stable/bind9-dnsutils
- Ubuntu package metadata for `bind9-dnsutils`: https://packages.ubuntu.com/noble/bind9-dnsutils
- Debian BIND9 wiki page: https://wiki.debian.org/BIND9

## Issues Found
- The Ubuntu/Debian install command did not install `dig`, even though the verification section uses it. I updated the package list to include `bind9-dnsutils`, which provides `dig` on current Debian and Ubuntu releases.
- The post mixed Debian/Ubuntu and RHEL/CentOS conventions in ways that would fail if copied literally on RHEL, including config file locations, zone file locations, service names, and ownership examples. I kept the Debian/Ubuntu examples but added precise RHEL/CentOS equivalents where the original text implied cross-distro applicability.
- The post recommended `dnssec-validation auto;` on an authoritative-only server and described it as applying to recursive queries the server makes. ISC documents that authoritative-only servers do not need resolver DNSSEC validation and that `dnssec-validation auto;` still enables trust-anchor maintenance queries. I changed this to `dnssec-validation no;` and updated the explanation accordingly.
- The conclusion originally described the Debian/Ubuntu file layout as if it were universal. I corrected it to distinguish Debian/Ubuntu from RHEL/CentOS layouts and to note the authoritative-only DNSSEC behavior accurately.

## Review Notes
- The BIND syntax, zone declaration format, SOA/NS/MX/TXT examples, `named-checkconf`, and `named-checkzone` usage are technically valid after the fixes above.
- The post still uses placeholder addresses and a lab-style example zone. That is acceptable for a tutorial, but public authoritative deployments should replace the sample addresses, nameserver IPs, and transfer ACLs with real values appropriate for the delegated zone.
