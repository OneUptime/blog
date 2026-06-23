# Validation Summary: PAM Authentication on Ubuntu: Configuration Guide with Examples

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Linux PAM (Pluggable Authentication Modules) on Ubuntu
- `/etc/pam.d/` configuration (common-auth, common-account, common-password, common-session, login, sshd, sudo, su)
- PAM modules: pam_unix, pam_deny, pam_permit, pam_pwquality, pam_faillock, pam_ldap, pam_google_authenticator, pam_motd, pam_exec, pam_access, pam_time, pam_limits, pam_securetty, pam_wheel, pam_faildelay, pam_nologin, pam_loginuid, pam_lastlog, pam_env, pam_mail
- pwquality (`/etc/security/pwquality.conf`, pwscore, pwmake)
- limits.conf resource limits
- access.conf and time.conf
- Google Authenticator TOTP 2FA + OpenSSH `sshd_config`
- pamtester, faillock CLI debugging tools

## Sources Consulted
- Ubuntu Manpage: pam_pwquality(8) — https://manpages.ubuntu.com/manpages/jammy/man8/pam_pwquality.8.html
- Ubuntu Manpage: pwquality.conf(5) — https://manpages.ubuntu.com/manpages/jammy/man5/pwquality.conf.5.html
- limits.conf(5) Linux manual page — https://man7.org/linux/man-pages/man5/limits.conf.5.html
- Ubuntu Manpage: limits.conf(5) — https://manpages.ubuntu.com/manpages/focal/en/man5/limits.conf.5.html

## Issues Found
- **Incorrect comment on `maxsyslogins` in limits.conf** (Configuring Limits section): The original comment read "Maximum concurrent logins for same user from same source." Per the limits.conf(5) man page, `maxsyslogins` is the *maximum number of all logins on the entire system* (per-user limits use `maxlogins`); there is no "same source" concept in limits.conf. Corrected the comment to "Maximum number of all logins on the entire system."

## Review Notes
- **`reject_username` (pam_pwquality)**: Verified as a valid module argument per the pam_pwquality(8) man page — it rejects passwords containing the username. (`usercheck` is the equivalent key in pwquality.conf.) No change needed.
- **`secret=/home/${USER}/.google_authenticator`**: pam_google_authenticator supports `${USER}` and `${HOME}` token expansion in the `secret=` path, so this is valid.
- **`ChallengeResponseAuthentication yes` (sshd_config)**: This directive was renamed to `KbdInteractiveAuthentication` in OpenSSH 8.7 (Ubuntu 22.04 ships 8.9). It still works as a deprecated alias on current Ubuntu releases, so the example remains functional, but readers on newer systems may prefer `KbdInteractiveAuthentication`. Left as-is since it is not incorrect.
- **`pam_securetty.so` in the sshd stack**: Functional on Ubuntu (the module is still shipped) and serves to deny root login on non-secure ttys, though it is more conventionally used for console `login`. Not an error.
- **`pam_motd` with separate `motd=` and `noupdate` lines**: Valid; both module argument styles are accepted.
- Control-flag explanations (required, requisite, sufficient, optional), the bracketed `[success=N default=ignore]` syntax, pam_faillock preauth/authfail stacking, and the limits.conf item units (memlock/as in KB, cpu in minutes) were all checked and are accurate.
