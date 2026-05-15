# Validation Summary: How to Set Up DNSSEC Validation with Unbound on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- RHEL 9
- DNS
- DNSSEC
- Unbound
- dig
- systemd

## Sources Consulted
- Red Hat Enterprise Linux 9: Managing networking infrastructure services, Chapter 2 "Setting up an unbound DNS server": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/managing_networking_infrastructure_services/Red_Hat_Enterprise_Linux-9-Managing_networking_infrastructure_services-en-US.pdf
- NLnet Labs Unbound documentation, unbound.conf(5): https://unbound.docs.nlnetlabs.nl/en/latest/manpages/unbound.conf.html
- NLnet Labs Unbound documentation, unbound-anchor(8): https://unbound.docs.nlnetlabs.nl/en/latest/manpages/unbound-anchor.html
- NLnet Labs Unbound documentation, unbound-host(1): https://www.nlnetlabs.nl/documentation/unbound/unbound-host/
- NLnet Labs Unbound documentation, unbound-control(8): https://unbound.docs.nlnetlabs.nl/en/latest/manpages/unbound-control.html
- NLnet Labs Unbound how-to, "Howto enable DNSSEC": https://www.nlnetlabs.nl/documentation/unbound/howto-anchor/
- NLnet Labs Unbound how-to, "Howto Turn Off DNSSEC": https://www.nlnetlabs.nl/documentation/unbound/howto-turnoff-dnssec/

## Issues Found
- The opening DNSSEC explanation contained corrupted text: "cryptographicRHELtures" and "noRHEL tampered". I changed this to "cryptographic signatures" and "not been tampered with" because DNSSEC uses digital signatures to authenticate DNS data.
- The `unbound.conf` snippets were fenced as `yaml`, but Unbound configuration is not YAML. I changed the fences to `conf` while leaving the configuration content unchanged.
- The `dnssec-failed.org` test was introduced as "a signed domain", which was technically incomplete because the point of that domain is that it has intentionally broken DNSSEC. I changed the wording to "an intentionally broken signed domain".
- A stray `RHEL` token appeared after the conclusion. I removed it because it was not part of the post content.

## Review Notes
The listed Unbound options and commands are current and valid. On RHEL 9, Red Hat documents Unbound as having DNSSEC enabled by default. NLnet Labs documents `auto-trust-anchor-file`, `val-clean-additional`, `harden-dnssec-stripped`, `harden-below-nxdomain`, `domain-insecure`, `unbound-anchor -a`, `unbound-host -v -D`, and `unbound-control stats` as used in the post. `example.com` is currently DNSSEC signed, and `dnssec-failed.org` currently returns SERVFAIL from a validating resolver.
