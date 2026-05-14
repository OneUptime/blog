# Validation Summary: How to Set Up Two-Factor Authentication (OTP) in FreeIPA on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Red Hat Identity Management / FreeIPA
- OTP, TOTP, and HOTP authentication
- Kerberos, `kinit`, and FAST armor
- SSSD, PAM, OpenSSH, and `authselect`
- `qrencode`

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Accessing Identity Management services": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/accessing_identity_management_services/index
- FreeIPA OTP design documentation: https://www.freeipa.org/page/V4/OTP
- FreeIPA `otptoken_add` API documentation: https://freeipa.readthedocs.io/en/ipa-4-9/api/otptoken_add.html
- FreeIPA `otpconfig_mod` API documentation: https://freeipa.readthedocs.io/en/ipa-4-12/api/otpconfig_mod.html
- Local OpenSSH `sshd_config(5)` manual page

## Issues Found
- The original `kinit jsmith` test omitted FAST armor, which Red Hat documents for retrieving an IdM TGT as an OTP or RADIUS user on RHEL 9.1 and later. Updated the example to create an anonymous armor cache with `kinit -n` and authenticate with `kinit -T FILE:armor.ccache`.
- The original token creation text stated that `ipa otptoken-add` outputs an `otpauth://` URI. FreeIPA documentation and client behavior center on displaying a QR code, while URI output can vary by version. Updated the text to say the command displays a QR code and may show an `otpauth://` URI.
- The SSH section said to verify SSH configuration on the client and checked `ChallengeResponseAuthentication`. The setting belongs on the SSH server, and OpenSSH treats `ChallengeResponseAuthentication` as a deprecated alias for `KbdInteractiveAuthentication`. Updated the command to check server-side `KbdInteractiveAuthentication` and `UsePAM`.

## Review Notes
The command examples for `ipa config-mod`, `ipa user-mod`, `ipa otptoken-add`, `ipa otptoken-find`, `ipa otptoken-del`, `ipa otptoken-mod`, `ipa otpconfig-show`, and `ipa otpconfig-mod --totp-auth-window` are consistent with FreeIPA and Red Hat documentation. The post correctly notes that combining `password` and `otp` authentication types makes either method sufficient for command-line authentication; administrators should remove password-only access after enrollment if OTP is meant to be mandatory.
