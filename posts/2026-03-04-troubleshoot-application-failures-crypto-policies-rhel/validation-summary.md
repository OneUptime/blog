# Validation Summary: How to Troubleshoot Application Failures Caused by Crypto Policies on RHEL

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux system-wide cryptographic policies
- update-crypto-policies
- OpenSSL TLS diagnostics
- OpenSSH client and server diagnostics
- systemd journal and service restarts

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening documentation: Using system-wide cryptographic policies, including changing policies, re-enabling SHA-1, and custom subpolicies: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/using-system-wide-cryptographic-policies
- Red Hat Enterprise Linux 10 Security hardening documentation: Customizing system-wide cryptographic policies with subpolicies: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/security_hardening/using-system-wide-cryptographic-policies
- Red Hat Customer Portal article: System-wide cryptographic policies in RHEL: https://access.redhat.com/articles/3666211
- Red Hat Customer Portal solution: Standard default policy requires disabling SHA-1 but the application requires SHA-1 crypto policy: https://access.redhat.com/solutions/7088966
- crypto-policies(7) manual reference for policy keywords and module syntax: https://www.mankier.com/7/crypto-policies
- update-crypto-policies(8) manual reference for policy setting syntax: https://www.mankier.com/8/update-crypto-policies
- OpenSSL 3.0 openssl-s_client and openssl-ciphers documentation: https://docs.openssl.org/3.0/man1/openssl-s_client/ and https://docs.openssl.org/3.0/man1/openssl-ciphers/
- OpenSSH ssh(1), sshd(8), and sshd_config(5) manual pages: https://man.openbsd.org/ssh.1, https://man.openbsd.org/sshd.8, and https://man.openbsd.org/sshd_config.5

## Issues Found
- The TLS diagnostic example said `openssl s_client -cipher 'ALL'` checks which ciphers the server offers. `s_client` reports the negotiated cipher for a single connection, not a complete server cipher inventory. Changed the comment to "Check the negotiated cipher" and added `-servername server` so the test works correctly with SNI-based virtual hosts.
- The "Compare ciphers between policies" example did not compare policies; it saved the current cipher list and then only displayed the current crypto policy. Changed the comments and command to inspect the generated OpenSSL crypto policy configuration instead.
- The custom SHA-1 module used nonstandard policy modifier syntax for SHA-1 certificate/signature compatibility. Updated it to the Red Hat-documented form using `hash = +SHA1`, `sign = +*-SHA1`, and `sha1_in_certs = 1`.

## Review Notes
Red Hat documentation recommends rebooting after changing the system-wide cryptographic policy so changes fully apply. Restarting affected services, as shown in the post, is often enough for those services because policies are applied at application startup, but a reboot is the more complete operational step.
