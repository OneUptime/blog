# Validation Summary: How to Configure FreeIPA with IPv6

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- FreeIPA / IdM
- IPv6
- Kerberos
- LDAP
- Integrated DNS
- firewalld
- Linux networking and host name resolution

## Sources Consulted
- Red Hat Enterprise Linux 10, Installing Identity Management: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html-single/installing_identity_management/index
- Red Hat Enterprise Linux 10, Working with DNS in Identity Management: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html-single/working_with_dns_in_identity_management/index
- FreeIPA workshop, Unit 1: Installing the FreeIPA server: https://freeipa.readthedocs.io/en/latest/workshop/1-server-install.html
- FreeIPA API reference, `dnsrecord_add`: https://freeipa.readthedocs.io/en/latest/api/dnsrecord_add.html
- FreeIPA API reference, `dns_update_system_records`: https://freeipa.readthedocs.io/en/ipa-4-11/api/dns_update_system_records.html
- MIT Kerberos documentation, `klist`: https://web.mit.edu/kerberos/www/krb5-1.17/doc/user/user_commands/klist.html
- `ipa-server-install(1)` package man page: https://manpages.debian.org/unstable/freeipa-server/ipa-server-install.1.en.html
- `ipa-client-install(1)` package man page: https://manpages.debian.org/experimental/freeipa-client/ipa-client-install.1.en.html

## Issues Found
- The package names in the install commands did not match the RHEL/CentOS/AlmaLinux packaging used in the post heading. I changed `freeipa-server`, `freeipa-server-dns`, and `freeipa-client` to `ipa-server`, `ipa-server-dns`, and `ipa-client`.
- `hostnamectl set-hostname` was shown without privilege escalation. I changed it to `sudo hostnamectl set-hostname ...` so the command works in the same privilege model as the rest of the post.
- The prerequisite verification step claimed to check forward and reverse DNS but only ran `hostname -f`. I replaced that with resolver checks that actually validate forward and reverse lookups, while keeping `hostname -f`.
- The unattended server install example did not create reverse DNS zones even though the post later added a PTR record. I added `--auto-reverse` so the reverse-zone example is consistent with the installation flow.
- The socket checks did not restrict output to IPv6 listeners, so they could match IPv4-only sockets. I changed the `ss` commands to use `-6`.
- The DNS section attempted to add the IPA server's own AAAA record after an integrated-DNS install. Because integrated DNS installation already creates IPA server DNS records, I changed that step to verify the installer-created record instead.
- The IPv6 PTR example used an incorrect reverse zone name. I corrected the `ip6.arpa` zone to match the example address and a `/64` reverse zone layout.
- The client enrollment note incorrectly implied that `--ip-address` helps when server DNS is unavailable. I rewrote the note to reflect what the flag actually does: add the client's A/AAAA record in IPA DNS.
- `ipa-client-install --test` is not a valid verification command. I replaced it with `id admin`, which matches Red Hat's documented client test.
- `klist -v` is not a valid MIT Kerberos option for listing tickets. I replaced it with `klist`.
- `nc -6 2001:db8::10 88` would open an interactive TCP session rather than perform a simple reachability check. I changed it to `nc -6 -z ...`.
- The firewall example omitted the current grouped IdM firewalld service. I replaced the separate LDAP/Kerberos/HTTPS rules with `freeipa-4` plus `dns`, which matches current Red Hat guidance.

## Review Notes
- The post is now technically sound for a current IdM/FreeIPA workflow on RHEL-family systems using integrated DNS.
- One caveat for some IPv6-only environments: older RHEL/SSSD combinations can require `lookup_family_order = ipv6_only` when DNS returns both A and AAAA records but only IPv6 connectivity is usable. The post does not cover that edge case, but it is not required for the general walkthrough presented here.
