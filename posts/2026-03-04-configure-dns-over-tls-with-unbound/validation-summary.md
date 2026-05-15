# Validation Summary: How to Configure DNS-over-TLS with Unbound on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- Unbound DNS resolver
- DNS-over-TLS
- TLS certificates
- firewalld
- kdig / knot-utils
- tcpdump

## Sources Consulted
- NLnet Labs Unbound `unbound.conf(5)` documentation: https://nlnetlabs.nl/documentation/unbound/unbound.conf/
- Red Hat Enterprise Linux 9 Securing networks, encrypted DNS / DNS-over-TLS documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/securing_networks/securing-system-dns-traffic-with-encrypted-dns_securing-networks/
- Red Hat Enterprise Linux 9.6 release notes, encrypted DNS Technology Preview: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/9.6_release_notes/technology-previews
- Knot DNS `kdig` manual: https://knot.pages.nic.cz/knot-dns/master/html/man_kdig.html
- RFC 7858, Specification for DNS over Transport Layer Security: https://www.rfc-editor.org/rfc/rfc7858.html
- RFC 8310, Usage Profiles for DNS over TLS and DNS over DTLS: https://www.rfc-editor.org/rfc/rfc8310

## Issues Found
- Fixed a typo in the DoT explanation: `RHELer` was changed to `resolver`.
- Changed Unbound configuration code fences from `yaml` to `conf` because `unbound.conf` syntax is not YAML.
- Updated the self-signed certificate command to include a `subjectAltName` extension for `dns.example.com`, which is required by modern TLS hostname validation practices.
- Added an `access-control` example to the DoT server configuration and noted that it must be replaced with the client network. Without this, Unbound's default access controls would not allow typical network clients to query the resolver.

## Review Notes
- The Unbound DoT forwarding directives and server-side TLS directives match the official Unbound configuration documentation.
- RHEL 9 encrypted DNS integration is documented by Red Hat as a Technology Preview beginning with RHEL 9.6, but the post's manual Unbound configuration remains technically valid for Unbound builds that include TLS support.
- The `kdig @127.0.0.1 +tls example.com` test uses kdig's opportunistic TLS mode. For strict certificate validation, a future improvement could show `+tls-ca` and `+tls-hostname=dns.example.com`.
