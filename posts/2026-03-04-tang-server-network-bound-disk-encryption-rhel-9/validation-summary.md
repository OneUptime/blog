# Validation Summary: How to Set Up a Tang Server for Network-Bound Disk Encryption on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Tang
- Clevis
- Network-Bound Disk Encryption (NBDE)
- LUKS
- systemd socket activation
- firewalld
- JSON Web Keys (JWK)

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening documentation, "Network-bound disk encryption" and "Deploying a Tang server with SELinux in enforcing mode": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/security_hardening/security_hardening
- Red Hat Enterprise Linux 9 Security hardening documentation, "Rotating Tang server keys and updating bindings on clients": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/security_hardening/security_hardening
- Tang upstream README and protocol documentation: https://github.com/latchset/tang
- Tang upstream documentation for advertisement and McCallum-Relyea exchange behavior: https://github.com/latchset/tang

## Issues Found
- The post originally said Tang "holds encryption keys." This could imply Tang stores client disk encryption keys, which is not how NBDE/Tang works. Updated it to say Tang holds its own asymmetric keys for network-bound unlocking, while preserving the later correct statement that Tang never stores or learns client encryption keys.
- The key rotation example generated new keys while leaving old keys advertised. Red Hat's RHEL 9 rotation procedure hides existing keys from advertisement by prefixing them with a dot, then generates new keys and updates client bindings. Updated the commands and surrounding explanation to reflect that workflow and to mention `clevis luks regen`.

## Review Notes
- The basic Tang installation, `tangd.socket` activation, default port 80 behavior, `/adv` endpoint check, `/var/db/tang` key location, and `firewall-cmd` examples are consistent with RHEL 9 and Tang documentation.
- The backup and restore guidance is technically plausible because clients can continue using a replacement Tang server with the same keys at the expected address. Key backups should remain encrypted and tightly controlled.
