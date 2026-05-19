# Validation Summary: How to Configure Password Complexity Rules with PAM on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Linux PAM
- pam_pwquality / libpwquality
- pam_pwhistory
- pam_unix
- chage
- login.defs
- OpenSSH sshd_config

## Sources Consulted
- Ubuntu manpage: pam_pwquality(8) - https://manpages.ubuntu.com/manpages/noble/man8/pam_pwquality.8.html
- Ubuntu manpage: pwquality.conf(5) - https://manpages.ubuntu.com/manpages/noble/man5/pwquality.conf.5.html
- Ubuntu manpage: pam_pwhistory(8) - https://manpages.ubuntu.com/manpages/noble/man8/pam_pwhistory.8.html
- Ubuntu manpage: pwscore(1) - https://manpages.ubuntu.com/manpages/noble/man1/pwscore.1.html
- Ubuntu manpage: chage(1) - https://manpages.ubuntu.com/manpages/noble/man1/chage.1.html
- Ubuntu manpage: login.defs(5) - https://manpages.ubuntu.com/manpages/noble/man5/login.defs.5.html
- Ubuntu manpage: sshd_config(5) - https://manpages.ubuntu.com/manpages/noble/man5/sshd_config.5.html
- Ubuntu Launchpad package: libpam-pwquality - https://launchpad.net/ubuntu/noble/+package/libpam-pwquality
- Ubuntu Launchpad package: libpwquality-tools - https://launchpad.net/ubuntu/noble/+package/libpwquality-tools
- Local Ubuntu 24.04 man pages for pam_pwquality(8), pwquality.conf(5), pam_pwhistory(8), pam_unix(8), chage(1), login.defs(5), passwd(1), and chpasswd(8)

## Issues Found
- The installation section said `libpam-pwquality` is usually already installed on Ubuntu 20.04 and later. This is true for some desktop tasks but not guaranteed, so the wording was changed to say it may already be installed and is safe to install explicitly.
- The `pwscore` example assumed `pwscore` was available after installing `libpam-pwquality`. On Ubuntu, `pwscore` is provided by `libpwquality-tools`, so an optional install command for that package was added.
- The `pwquality.conf` example used `enforce_for_root = 1`. Ubuntu's packaged `pwquality.conf` documents this as a presence flag, so the example was changed to `enforce_for_root`.
- The `pam_pwhistory` example used the incorrect option `use_authok`. The valid PAM option is `use_authtok`, so the snippet was corrected.
- The `/etc/login.defs` example included `PASS_MIN_LEN` as a backup for PAM. On Ubuntu this option is obsolete under PAM, so it was removed from the snippet and the note was corrected.
- The `pwscore` testing text described the command as a root-only check for a specific user. The manpage shows `pwscore` reads from stdin and accepts an optional username argument for username-similarity checks, so the wording and example were adjusted.

## Review Notes
The remaining examples and explanations match Ubuntu Noble man pages and package metadata. The PAM stack example is still a simplified local-account configuration; systems using SSSD, LDAP, or pam-auth-update-managed customizations should preserve their existing stack control flow.
