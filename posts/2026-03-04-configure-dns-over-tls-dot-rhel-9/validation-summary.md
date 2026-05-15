# Validation Summary: How to Configure DNS-over-TLS (DoT) on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- DNS-over-TLS (DoT)
- systemd-resolved
- Unbound
- firewalld
- Knot DNS `kdig`
- OpenSSL

## Sources Consulted
- RFC 7858, Specification for DNS over Transport Layer Security (TLS): https://www.rfc-editor.org/rfc/rfc7858.html
- Red Hat Enterprise Linux 9 networking documentation for systemd-resolved support scope: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_networking/index
- systemd 252 RHEL 9 `resolved.conf` manual: https://redhat-plumbers.github.io/systemd-rhel9/resolved.conf.html
- systemd 252 RHEL 9 `resolvectl` manual: https://redhat-plumbers.github.io/systemd-rhel9/resolvconf.html
- Unbound User Manual, `unbound.conf(5)` TLS and remote-control settings: https://unbound.readthedocs.io/_/downloads/en/latest/pdf/
- Cloudflare DNS-over-TLS documentation: https://developers.cloudflare.com/1.1.1.1/encryption/dns-over-tls/
- Knot DNS `kdig` manual: https://knot.pages.nic.cz/knot-dns/master/html/man_kdig.html
- firewalld `firewall-cmd` manual: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- Local OpenSSL command help for `openssl req` and `openssl verify`.

## Issues Found
- The post stated broadly that RHEL supports DoT through both systemd-resolved and Unbound. Red Hat documents systemd-resolved on RHEL 9 as a Technology Preview, so the wording was updated to call out that support scope.
- The Unbound examples later used `unbound-control stats`, but the snippets replaced `/etc/unbound/unbound.conf` without enabling Unbound remote control. Added a `remote-control` section and `unbound-control-setup` to the Unbound setup steps.
- The Unbound DoT server option used a log file and DNSSEC trust anchor but did not create or validate them when followed as a standalone option. Added the log directory, `unbound-anchor`, and `unbound-checkconf` steps before starting Unbound.
- The `kdig @192.168.1.10 +tls google.com` test used opportunistic TLS and did not validate the server certificate. Updated it to use `+tls-ca` and `+tls-hostname=dns.example.com`, and added a note for self-signed certificates.
- The troubleshooting example verified a self-signed Unbound server certificate against the public system CA bundle, which would fail for the certificate generated earlier in the post. Updated the example to verify the self-signed certificate against itself for the test scenario.

## Review Notes
- The main DoT explanation, port 853 usage, systemd-resolved `DNS=address#server_name` syntax, Unbound `forward-tls-upstream` and `forward-addr` syntax, and firewalld commands are technically correct.
- For production use, a publicly trusted certificate or an internal CA with client trust distribution is preferable to a leaf self-signed certificate.
