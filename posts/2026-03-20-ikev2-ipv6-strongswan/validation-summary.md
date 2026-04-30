# Validation Summary: How to Configure IKEv2 for IPv6 on Linux with strongSwan

## Status
validated

## Post Type
Guide

## Technologies Covered
- strongSwan
- IKEv2
- IPsec
- IPv6
- swanctl
- OpenSSL
- systemd

## Sources Consulted
- strongSwan Installation Documentation: https://docs.strongswan.org/docs/latest/install/install.html
- strongSwan `swanctl.conf` reference: https://docs.strongswan.org/docs/latest/swanctl/swanctlConf.html
- strongSwan `swanctl` directory reference: https://docs.strongswan.org/docs/latest/swanctl/swanctlDir.html
- strongSwan Algorithm Proposals (Cipher Suites): https://docs.strongswan.org/docs/latest/config/proposals.html
- strongSwan Virtual IP Addresses: https://docs.strongswan.org/docs/latest/features/vip.html
- strongSwan `charon-systemd` documentation: https://docs.strongswan.org/docs/latest/daemons/charon-systemd.html
- strongSwan `swanctl --initiate` reference: https://docs.strongswan.org/docs/latest/swanctl/swanctlInitiate.html
- strongSwan `swanctl --terminate` reference: https://docs.strongswan.org/docs/latest/swanctl/swanctlTerminate.html
- strongSwan `swanctl --list-conns` reference: https://docs.strongswan.org/docs/latest/swanctl/swanctlListConns.html
- strongSwan EAP Configuration with Passwords: https://docs.strongswan.org/docs/latest/interop/windowsEapServerConf.html
- Fedora strongSwan package details: https://packages.fedoraproject.org/pkgs/strongswan/strongswan/fedora-43.html
- OpenSSL 3.0.13 CLI behavior validated locally with the certificate-generation commands in the post

## Issues Found
- The Debian/Ubuntu install command used the `strongswan` metapackage even though the article is written around the `swanctl`/`vici` backend. I changed it to `charon-systemd` plus `strongswan-swanctl`, which matches strongSwan's documented modern workflow.
- Several example IPv6 literals and prefixes were not valid IPv6 syntax, including values such as `2001:db8:gw1::1` and `2001:db8:net1::/48`. I replaced them with valid documentation-prefix addresses and subnets.
- The ESP proposal `aes256gcm128-prfsha256-ecp256` was not a valid strongSwan ESP proposal. I changed it to `aes256gcm16-ecp256` because strongSwan uses `gcm16`-style keywords and PRFs are not part of ESP proposals.
- The site-to-site IKEv2 example set `dpd_timeout`, but strongSwan documents that this option has no effect on IKEv2 connections. I removed it.
- The road-warrior server example configured `remote_ts = ::/0` while also assigning IPv6 virtual addresses from a pool. I removed that setting so the documented default `dynamic` remote traffic selector is used for virtual IP clients.
- The management examples used invalid `swanctl` syntax (`conn:gw1-to-gw2`) and labeled `swanctl --list-conns` as showing active connections. I corrected the commands to the documented `--child`/`--ike` syntax and updated the description of `--list-conns`.
- The certificate copy and permission commands wrote into `/etc/swanctl` without `sudo`. I added `sudo` so the commands work from a regular shell session.

## Review Notes
- The remote-access configuration shown is server-side only; clients still need to request an IPv6 virtual IP for the configured pool to be used.
- On Debian/Ubuntu, avoid running both `charon-systemd` and `strongswan-starter` at the same time if the legacy packages were previously installed.
- Interoperability with non-Linux or tightly opinionated clients may require adjusting the explicitly configured IKE/ESP proposals.
