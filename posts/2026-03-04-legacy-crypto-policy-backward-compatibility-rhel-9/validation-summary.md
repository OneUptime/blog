# Validation Summary: How to Use the LEGACY Crypto Policy on RHEL 9 for Backward Compatibility

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- System-wide crypto policies
- LEGACY and DEFAULT crypto policy levels
- Crypto policy sub-policy modules
- OpenSSH
- OpenSSL
- curl
- TLS

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening: Using system-wide cryptographic policies: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/using-the-system-wide-cryptographic-policies_security-hardening
- Red Hat Enterprise Linux 9 Securing networks: Security considerations for TLS in RHEL 9: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/securing_networks/planning-and-implementing-tls_securing-networks
- Red Hat Enterprise Linux 9 Considerations in adopting RHEL 9: Security changes and algorithms disabled in all policy levels: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/considerations_in_adopting_rhel_9/assembly_security_considerations-in-adopting-rhel-9
- curl man page: https://curl.se/docs/manpage.html
- OpenSSL s_client documentation: https://docs.openssl.org/3.0/man1/openssl-s_client/
- OpenSSH ssh_config manual page for RHEL-family systems: https://www.mankier.com/5/ssh_config

## Issues Found
- The post incorrectly said RHEL 9 LEGACY enables TLS 1.0 and TLS 1.1. RHEL 9 documentation says DEFAULT, FUTURE, and LEGACY allow only TLS 1.2 and TLS 1.3, so I changed the introduction, scenarios, flowchart, table, curl/OpenSSL examples, risk discussion, and summary to avoid claiming LEGACY restores older TLS versions.
- The post incorrectly said RHEL 9 LEGACY lowers RSA and Diffie-Hellman minimums to 1024 bits. RHEL 9 disables RSA keys and DH parameters below 2048 bits in LEGACY, DEFAULT, and FUTURE, so I corrected the policy table and replaced the RSA 1024 sub-policy example with an explicit 2048-bit minimum.
- The post incorrectly said RHEL 9 LEGACY enables 3DES, DSA, and limited RC4 use. RHEL 9 disables 3DES, DSA, and RC4 in LEGACY, DEFAULT, and FUTURE, so I corrected the policy table and removed related risk claims.
- The custom SHA-1 module was broader than needed and duplicated a RHEL-provided sub-policy. Red Hat documents DEFAULT:SHA1 for re-enabling SHA-1 signatures, so I changed that example to use `sudo update-crypto-policies --set DEFAULT:SHA1`.
- The restart guidance only restarted `sshd`, but Red Hat recommends rebooting after changing crypto policies so running services fully pick up the change. I changed the apply and revert examples to use `sudo reboot`.
- The curl and OpenSSL examples claimed to allow TLS 1.0 for a specific connection. I changed them to examples that adjust the cipher/security level for a single invocation without implying supported TLS 1.0 behavior on RHEL 9.
- The monitoring example used `ss`, which shows listening sockets but not negotiated TLS versions. I changed it to use `openssl s_client -brief` against a specific server and grep the negotiated protocol.
- The justification-file heredoc quoted `EOF`, which would write `$(date)` literally. I removed the heredoc quoting so the date expands when the command is run.

## Review Notes
RHEL 9 does still allow unsupported opt-out paths or custom configurations for some legacy TLS cases, but Red Hat documents those as outside supported system-wide crypto policy behavior. Future updates could add a separate section on application-specific opt-outs, but this validation kept changes limited to correcting inaccurate claims and examples.
