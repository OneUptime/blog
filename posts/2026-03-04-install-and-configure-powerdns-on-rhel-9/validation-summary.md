# Validation Summary: How to Install and Configure PowerDNS on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9 / CentOS Stream 9
- PowerDNS Authoritative Server
- PowerDNS BIND backend
- systemd
- DNF
- DNS query verification with dig

## Sources Consulted
- PowerDNS Authoritative Server installation documentation: https://doc.powerdns.com/authoritative/installation.html
- PowerDNS Authoritative Server running and operating documentation: https://doc.powerdns.com/authoritative/running.html
- PowerDNS Authoritative Server settings reference: https://docs.powerdns.com/authoritative/settings.html
- PowerDNS BIND backend documentation: https://docs.powerdns.com/authoritative/backends/bind.html
- Fedora EPEL package information for `pdns` on EL9: https://packages.fedoraproject.org/pkgs/pdns/pdns/epel-9.html
- Red Hat DNF software management documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/managing_software_with_the_dnf_tool
- RFC 5737, IPv4 Address Blocks Reserved for Documentation: https://datatracker.ietf.org/doc/html/rfc5737

## Issues Found
- The installation command used the placeholder `<package-name>`, which would not install PowerDNS. Changed it to install `pdns` and `bind-utils`, with a note that EPEL or the official PowerDNS repository must be enabled.
- The configuration path `/etc/<service>/config.conf` was a placeholder and does not match PowerDNS packaging conventions. Changed it to `/etc/powerdns/pdns.conf`.
- The service name `<service-name>` was a placeholder. Changed systemd commands and journal commands to use the actual PowerDNS service name, `pdns`.
- The post did not configure a PowerDNS backend, so the service would not have a concrete data source for authoritative DNS records. Added a minimal BIND backend configuration using `launch=bind` and `bind-config=/etc/powerdns/named.conf`.
- The BIND backend example referenced a zone file, so added commands and a minimal RFC 5737 documentation-address zone file to make the local `dig` verification meaningful.
- The verification section only checked service status and logs. Added a `dig @127.0.0.1 example.com SOA` check to verify DNS responses from the local authoritative server.
- The troubleshooting section suggested `curl` for endpoint testing, which is not appropriate for basic DNS service verification on port 53. Changed it to use `ss` for listening sockets and `dig` for DNS responses.

## Review Notes
The revised guide is technically valid as a minimal PowerDNS Authoritative Server setup using the BIND backend. A production-ready guide should also include opening firewall port 53 where firewalld is enabled and choosing a database backend when API-managed zones are required.
