# Validation Summary: How to Set Up Multi-Factor Authentication with PAM on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- OpenSSH server configuration
- PAM
- Google Authenticator PAM module
- TOTP / MFA
- EPEL repository

## Sources Consulted
- Red Hat blog: What's EPEL, and how do I use it?, RHEL 9 CodeReady Builder and EPEL release setup: https://www.redhat.com/en/blog/whats-epel-and-how-do-i-use-it
- Fedora Packages: google-authenticator for EPEL 9, installed files and package contents: https://packages.fedoraproject.org/pkgs/google-authenticator/google-authenticator/epel-9.html
- Red Hat Enterprise Linux 9 documentation: Securing networks / OpenSSH server configuration: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/securing_networks/
- OpenSSH `sshd_config(5)` man page for `AuthenticationMethods`, `KbdInteractiveAuthentication`, `ChallengeResponseAuthentication`, and `UsePAM`
- Google Authenticator PAM module man page for `pam_google_authenticator.so`, `secret`, `user`, permissions, and `nullok`: https://manpages.ubuntu.com/manpages/noble/man8/pam_google_authenticator.8.html
- RFC 6238: TOTP: Time-Based One-Time Password Algorithm: https://www.rfc-editor.org/rfc/rfc6238

## Issues Found
- The original EPEL setup used `sudo dnf install epel-release -y`. On RHEL 9, EPEL's documented setup requires enabling CodeReady Builder and installing the EPEL release RPM from Fedora. Updated the commands to use `subscription-manager repos --enable codeready-builder-for-rhel-9-$(arch)-rpms` and `dnf install` with the official EPEL 9 release RPM URL.
- The SSH configuration used `ChallengeResponseAuthentication yes`, which is a deprecated OpenSSH alias for `KbdInteractiveAuthentication`. Updated the snippet to `KbdInteractiveAuthentication yes`.
- The `AuthenticationMethods` examples used generic `keyboard-interactive`. For PAM-backed MFA on sshd, OpenSSH supports restricting keyboard-interactive to the `pam` device. Updated the examples to `keyboard-interactive:pam` and `publickey,keyboard-interactive:pam`.

## Review Notes
The post is technically relevant and the remaining PAM module options, `nullok` rollout behavior, per-user secret file path, default secret file permissions, centralized secret storage example, scratch-code behavior, and RHEL log path are consistent with the consulted documentation. A future improvement could mention SELinux considerations for non-standard secret-file locations, but the existing centralized-secret example is syntactically valid.
