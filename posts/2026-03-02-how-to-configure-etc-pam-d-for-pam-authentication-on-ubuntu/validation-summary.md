# Validation Summary: How to Configure /etc/pam.d for PAM Authentication on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Linux-PAM
- `/etc/pam.d` PAM service configuration
- `pam_faillock`
- `pam_google_authenticator`
- OpenSSH `sshd_config`
- `pam_time`
- `pam_access`
- `pamtester`

## Sources Consulted
- Linux-PAM `pam.conf(5)` / `pam.d(5)`: https://man7.org/linux/man-pages/man5/pam.conf.5.html
- Linux-PAM `pam_faillock(8)`: https://man7.org/linux/man-pages/man8/pam_faillock.8.html
- Linux-PAM `faillock(8)`: https://man7.org/linux/man-pages/man8/faillock.8.html
- Linux-PAM `faillock.conf(5)`: https://man7.org/linux/man-pages/man5/faillock.conf.5.html
- Linux-PAM `time.conf(5)`: https://man7.org/linux/man-pages/man5/time.conf.5.html
- Ubuntu manpage for `pam_google_authenticator(8)`: https://manpages.ubuntu.com/manpages/jammy/man8/pam_google_authenticator.8.html
- OpenSSH `sshd_config(5)`: https://man.openbsd.org/sshd_config.5
- Ubuntu `pam` source package changelog / package metadata: https://launchpad.net/ubuntu/+source/pam/+changelog

## Issues Found
- The sample `/etc/pam.d/sshd` block showed `pam_access.so` enabled immediately after text saying to uncomment it only when needed. Changed the line to `# account  required     pam_access.so` to match the default-style example and avoid implying access controls are enabled before `/etc/security/access.conf` is configured.
- The common modules list included `pam_tally2.so` alongside `pam_faillock.so`. `pam_tally2` has been removed from current Ubuntu PAM packages and `pam_faillock` is the supported replacement, so the list and safety guidance now reference `pam_faillock` / `faillock` only.
- The SSH two-factor example used `ChallengeResponseAuthentication yes`, which is an older OpenSSH alias. Updated it to `KbdInteractiveAuthentication yes` and made `AuthenticationMethods` use `keyboard-interactive:pam`, matching current OpenSSH naming and PAM-backed keyboard-interactive authentication.
- The `pam_time` example claimed to allow weekday logins but used `Al0800-1800`, which means all days. Changed it to `Wk0800-1800`.
- The `pam_time` explanation said `We` means weekends. In Linux-PAM `time.conf`, `We` is Wednesday and `Wd` is weekend days, so this was corrected.

## Review Notes
The remaining examples are configuration-sensitive and should still be tested in a console or root session before applying to SSH or sudo on a production system, as the post already warns. The `pam_faillock` section correctly points readers toward `/etc/security/faillock.conf`, which is preferred over putting every option directly on PAM module lines.
