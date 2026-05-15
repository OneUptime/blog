# Validation Summary: How to Configure SSH with System-Wide Crypto Policies on RHEL

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- System-wide crypto policies
- OpenSSH client and server configuration
- `update-crypto-policies`
- `nmap` SSH algorithm enumeration

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening: Using system-wide cryptographic policies: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/using-the-system-wide-cryptographic-policies_security-hardening
- Red Hat Enterprise Linux 9 Security hardening, OpenSSH opt-out and subpolicy examples: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/security_hardening/security_hardening
- Red Hat crypto-policies upstream `crypto-policies(7)` documentation: https://gitlab.com/redhat-crypto/fedora-crypto-policies/-/raw/master/crypto-policies.7.txt
- Red Hat crypto-policies upstream `update-crypto-policies(8)` documentation: https://gitlab.com/redhat-crypto/fedora-crypto-policies/-/raw/master/update-crypto-policies.8.txt
- OpenSSH manual pages index: https://www.openssh.org/manual.html
- Nmap `ssh2-enum-algos` NSE script documentation: https://nmap.org/nsedoc/scripts/ssh2-enum-algos.html

## Issues Found
- The FIPS policy was described as "FIPS 140-2 compliant." Red Hat's current RHEL documentation describes the `FIPS` crypto policy as helping enforce FIPS 140 requirements, not as making the system itself FIPS 140-2 compliant. Updated the table wording accordingly.
- The custom subpolicy used `key_exchange@SSH = -ECDH-SHA2-NISTP256`, which mixes an OpenSSH KEX algorithm name with crypto-policies syntax. Crypto-policies use `group@SSH` for SSH groups/curves. Changed it to `group@SSH = -SECP256R1`, the policy name corresponding to the P-256 curve.
- The custom subpolicy used `mac@SSH = -HMAC-SHA1 -HMAC-SHA1-ETM`. Crypto-policies use `mac` values such as `HMAC-SHA1`; Encrypt-then-MAC handling is controlled separately by `etm@SSH`. Removed the invalid `HMAC-SHA1-ETM` value.
- The OpenSSH override drop-in file was named `50-crypto.conf`. Red Hat's RHEL 9 documentation recommends a two-digit prefix smaller than `50` so the override lexicographically precedes `50-redhat.conf`. Changed the example to `49-crypto.conf`.

## Review Notes
The post is accurate after the fixes. Red Hat recommends rebooting after changing system-wide crypto policies for the change to fully apply system-wide; restarting `sshd` is sufficient for the SSH daemon example, but other already-running crypto-aware services may also need restart or reboot.
