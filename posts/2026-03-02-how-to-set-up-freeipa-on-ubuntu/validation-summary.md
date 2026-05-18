# Validation Summary: How to Set Up FreeIPA on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- FreeIPA (server and client)
- Ubuntu 22.04
- LDAP (389 Directory Server)
- Kerberos KDC
- BIND DNS (integrated)
- Dogtag Certificate Authority
- SSSD (implicit, used by `freeipa-client`)
- UFW firewall
- systemd (`hostnamectl`, `journalctl`, `dirsrv@`, `krb5kdc`)

## Sources Consulted
- FreeIPA official documentation: https://www.freeipa.org/page/Documentation
- Red Hat Identity Management documentation (IdM is the downstream of FreeIPA): https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html/installing_identity_management/
- `ipa-server-install(1)` man page
- `ipa-client-install(1)` man page
- `ipa-replica-install(1)` man page
- `ipa(1)` CLI reference (sudorule, hbacrule, user, group, cert subcommands)
- Ubuntu 22.04 (jammy) package archive for `freeipa-server`, `freeipa-server-dns`, `freeipa-client`
- FreeIPA port requirements: https://www.freeipa.org/page/Deployment_Recommendations (and corresponding RH IdM port list)

## Issues Found
- **Firewall port 7389/tcp removed.** The post listed `sudo ufw allow 7389/tcp` with the comment "IPA-specific LDAP (dogtag)". Port 7389 was used by a separate Dogtag-internal LDAP instance in FreeIPA 2.x. Since FreeIPA 3.0, Dogtag PKI shares the same 389-ds directory instance as FreeIPA and listens on the normal 389/636 ports. Port 7389 is not used by any current FreeIPA release on Ubuntu 22.04, so opening it in the firewall is incorrect/misleading. Removed the line; the remaining ports (80, 443, 389, 636, 88 tcp+udp, 464 tcp+udp, 53 tcp+udp) match the official required-ports list.

## Review Notes
- The post does not mention NTP/chrony, which Kerberos requires for time sync. In modern FreeIPA installations chrony is configured automatically (and `--no-ntp` exists to opt out), so this is technically fine but worth noting if the post is ever expanded.
- `ipa-server-install` flags (`--domain`, `--realm`, `--ds-password`, `--admin-password`, `--setup-dns`, `--no-forwarders`, `--unattended`) all match the current man page.
- `ipa-client-install` flags (`--server`, `--domain`, `--realm`, `--principal`, `--password`, `--unattended`) all match the current man page.
- `ipa-replica-install` flags shown are valid; in practice a replica is usually prepared by a host enrollment first, but the form used (with `--admin-password`) still works.
- `dirsrv@EXAMPLE-COM` is the correct systemd instance name (the realm's `.` is replaced with `-`).
- `ipa cert-request --principal HTTP/webserver.example.com csr.pem` is valid syntax (CSR is the positional argument).
- The DNS SRV record names used in troubleshooting (`_kerberos._tcp.example.com`, `_ldap._tcp.example.com`) are correct.
- `ipa user-mod jsmith --sshpubkey="$(cat ~/.ssh/id_ed25519.pub)"` replaces any existing keys with the one provided. To add additional keys without replacing, multiple `--sshpubkey` flags or the web UI is needed — not an error, but a subtlety worth being aware of.
- FreeIPA server packaging on Ubuntu lagged the Fedora/RHEL ecosystem for years; the post's recommendation to use 22.04 specifically is reasonable, though 24.04 also ships `freeipa-server`.
