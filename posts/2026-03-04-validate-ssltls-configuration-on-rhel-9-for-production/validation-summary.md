# Validation Summary: How to Validate SSL/TLS Configuration on RHEL for Production

## Status
validated

## Post Type
Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- SSL/TLS
- OpenSSL
- Nmap NSE ssl-enum-ciphers
- systemd and journalctl
- RPM package queries
- RHEL system-wide cryptographic policies

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Using system-wide cryptographic policies: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/using-the-system-wide-cryptographic-policies_security-hardening
- Red Hat Enterprise Linux 9 documentation: Planning and implementing TLS: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/securing_networks/planning-and-implementing-tls_securing-networks
- OpenSSL 3.0 openssl-s_client documentation: https://docs.openssl.org/3.0/man1/openssl-s_client/
- OpenSSL 3.0 openssl-verify documentation: https://docs.openssl.org/3.0/man1/openssl-verify/
- OpenSSL openssl-x509 documentation: https://docs.openssl.org/3.3/man1/openssl-x509/
- Nmap ssl-enum-ciphers NSE script documentation: https://nmap.org/nsedoc/scripts/ssl-enum-ciphers.html
- systemd journalctl documentation: https://www.freedesktop.org/software/systemd/man/latest/journalctl.html
- Local command help for openssl, systemctl, journalctl, and rpm.

## Issues Found
- The `openssl s_client` certificate validation command did not explicitly verify that the certificate matches the requested hostname. I added `-verify_hostname <hostname>` because OpenSSL documents hostname checking as a separate verification option, while `-servername` only sets the SNI extension.

## Review Notes
- The command examples use placeholder paths and service names, so users must replace them with their actual certificate, CA bundle, hostname, and unit name.
- The `nmap` command is technically correct, but `nmap` may need to be installed separately on a minimal RHEL system.
- The `openssl s_client` example forces TLS 1.2 with `-tls1_2`; production validation may also need separate TLS 1.3 testing when the service is expected to support TLS 1.3.
