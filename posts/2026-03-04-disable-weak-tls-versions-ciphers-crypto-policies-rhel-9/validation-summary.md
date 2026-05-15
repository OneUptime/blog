# Validation Summary: How to Disable Weak TLS Versions and Ciphers with Crypto Policies on RHEL 9

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- System-wide crypto policies
- TLS protocol and cipher configuration
- OpenSSL command-line verification
- OpenSSH client and server algorithm configuration
- Linux systemd service restart workflow

## Sources Consulted
- Red Hat Enterprise Linux 9 Security Hardening: Using system-wide cryptographic policies: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/using-the-system-wide-cryptographic-policies_security-hardening
- Red Hat crypto-policies RHEL 9 DEFAULT policy source: https://gitlab.com/redhat-crypto/fedora-crypto-policies/-/raw/rhel9/policies/DEFAULT.pol
- Red Hat crypto-policies RHEL 9 FUTURE policy source: https://gitlab.com/redhat-crypto/fedora-crypto-policies/-/raw/rhel9/policies/FUTURE.pol
- Red Hat crypto-policies RHEL 9 NO-SHA1 module source: https://gitlab.com/redhat-crypto/fedora-crypto-policies/-/raw/rhel9/policies/modules/NO-SHA1.pmod
- OpenSSH ssh(1) manual for `-Q` and `-G`: https://man.openbsd.org/ssh
- NIST SP 800-52 Rev. 2 overview: https://csrc.nist.gov/pubs/sp/800/52/r2/final
- PCI Security Standards Council FAQ on SSL and early TLS: https://www.pcisecuritystandards.org/faq/articles/Frequently_Asked_Question/Does-PCI-DSS-define-which-versions-of-TLS-must-be-used/
- FedRAMP guidance on cryptographic modules: https://www.fedramp.gov/docs/20x/using-cryptographic-modules/

## Issues Found
- The post described crypto policies as applying to all applications. Red Hat documents crypto policies as applying to core cryptographic subsystems and supported applications using the system-provided back ends, with possible application overrides. Updated the description and introduction to avoid overstatement.
- The SSH examples labeled `ssh -Q` output as "allowed" algorithms. OpenSSH documents `ssh -Q` as showing supported algorithms, not effective configured algorithms. Updated the wording and added `ssh -G localhost` for effective client configuration checks.
- The CBC-disable examples listed specific CBC ciphers. Red Hat's documented subpolicy examples use wildcard policy syntax such as `cipher = -*-CBC`, which is broader and more robust. Updated the CBC examples accordingly.
- The SHA-1-disable examples used incomplete signature algorithm names. Red Hat's provided `NO-SHA1.pmod` uses `sign = -*-SHA1` and `sha1_in_certs = 0`. Updated the SHA-1 examples to match that pattern and kept HMAC-SHA1 removal for stricter hardening.
- The AES-256-only example removed specific AES-128 modes but could miss AES-128 variants covered by crypto policies. Updated it to `cipher = -AES-128-*`, matching Red Hat's wildcard syntax.
- The verification section used `ssh -Q cipher | grep -i cbc` to test whether CBC was disabled. Because `ssh -Q` lists supported algorithms, this can produce misleading results. Updated it to inspect effective SSH client ciphers with `ssh -G localhost`.
- The compliance section claimed all listed standards could be met with at least DEFAULT. This was too broad, especially for FIPS/FedRAMP-style validated module requirements. Updated the language to state that DEFAULT is a TLS 1.2+ baseline and that FIPS or additional controls may be required.

## Review Notes
The post is now technically valid as a practical RHEL 9 hardening guide. Some verification commands still assume local services such as `sshd`, `httpd`, `nginx`, or HTTPS on port 443 are installed and running; that is acceptable for a tutorial but should be understood as environment-dependent.
