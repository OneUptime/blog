# Validation Summary: How to Configure SSH with Two-Factor Authentication on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- OpenSSH server configuration
- PAM authentication stack
- Google Authenticator PAM module
- TOTP two-factor authentication
- EPEL package repository

## Sources Consulted
- Red Hat Enterprise Linux 9 Securing networks documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/securing_networks/securing_networks
- Fedora EPEL getting started documentation: https://docs.fedoraproject.org/en-US/epel/getting-started/
- OpenSSH `sshd_config(5)` manual: https://man.openbsd.org/sshd_config
- Google Authenticator PAM module README and manuals: https://github.com/google/google-authenticator-libpam
- `pam_google_authenticator(8)` upstream manual: https://raw.githubusercontent.com/google/google-authenticator-libpam/master/man/pam_google_authenticator.8.md
- `google-authenticator(1)` upstream manual: https://raw.githubusercontent.com/google/google-authenticator-libpam/master/man/google-authenticator.1.md
- Linux-PAM `pam_succeed_if(8)` manual: https://man7.org/linux/man-pages/man8/pam_succeed_if.8.html
- Local `sshd_config(5)` manual output for authentication directives

## Issues Found
- The EPEL setup command used `sudo dnf install epel-release -y`, which is not the official RHEL 9 EPEL enablement path. Updated it to enable CodeReady Builder and install the EPEL release package from the Fedora EPEL permalink.
- The Google Authenticator setup text said the output includes a QR code unconditionally. Updated it to note that QR output depends on QR support, and that the command also provides an otpauth URL/secret.
- The SSH key + TOTP PAM example removed `password-auth` but still relied on `nullok` alone during rollout. Because `nullok` can ignore the module when no secret exists, the stack needs a successful PAM result in that rollout case. Added `pam_permit.so` and explained its role while `nullok` is enabled.
- The SSH key + password example used `publickey,keyboard-interactive:pam`, which conflicts with the surrounding TOTP-oriented PAM configuration and can be ambiguous. Updated it to `AuthenticationMethods publickey,password` and clarified that the normal `password-auth` PAM stack should remain enabled without the Google Authenticator line.
- The admin override suggested removing a user's `.google_authenticator` file to disable 2FA. Clarified that this only bypasses TOTP while `nullok` remains enabled; after enforcement, a PAM exemption is required.

## Review Notes
The OpenSSH directives used for `AuthenticationMethods`, `KbdInteractiveAuthentication`, `PubkeyAuthentication`, and `PasswordAuthentication` are valid. The Google Authenticator command flags are current in the upstream manual. The service-account exemption using `pam_succeed_if.so user ingroup ...` is consistent with Linux-PAM syntax, assuming the skip count remains immediately before the Google Authenticator PAM line.
