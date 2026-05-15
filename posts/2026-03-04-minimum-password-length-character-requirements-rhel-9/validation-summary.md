# Validation Summary: How to Configure Minimum Password Length and Character Requirements on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- PAM
- pam_pwquality
- libpwquality / pwquality.conf
- shadow-utils / login.defs
- authselect
- NIST password guidance

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring user authentication using authselect": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_authentication_and_authorization_in_rhel/configuring-user-authentication-using-authselect_configuring-authentication-and-authorization-in-rhel
- Local RHEL-compatible `pam_pwquality(8)` man page
- Local RHEL-compatible `pwquality.conf(5)` man page
- Local `pam_succeed_if(8)` man page
- Linux man-pages `login.defs(5)`: https://www.man7.org/linux/man-pages/man5/login.defs.5.html
- Linux man-pages `useradd(8)`: https://www.man7.org/linux/man-pages/man8/useradd.8.html
- NIST SP 800-63B, Digital Identity Guidelines: https://pages.nist.gov/800-63-4/sp800-63b.html

## Issues Found
- The post incorrectly described `/etc/login.defs` as a place to configure minimum password length for `passwd` on RHEL. Modern shadow-utils documentation states that `/etc/login.defs` is no longer used by `passwd`; password quality enforcement is handled through PAM. I changed the introduction, mechanism diagram, bullets, and conclusion to make `pam_pwquality` the enforcement point for length and character requirements.
- The post instructed readers to set `PASS_MIN_LEN` in `/etc/login.defs`. That setting is not documented in the current `login.defs(5)` interface used by modern shadow-utils, and RHEL password length enforcement should be configured with `minlen` in `pwquality.conf` or on the `pam_pwquality.so` line. I replaced that section with related password aging settings that are valid in `login.defs`.
- The post said the `grep` command showed the "compiled" pwquality configuration. The command only displays uncommented settings from the main `/etc/security/pwquality.conf` file and does not include all effective sources such as `pwquality.conf.d` or PAM-line overrides. I corrected the command comment.
- The post showed editing `/etc/pam.d/system-auth` for per-group PAM branching without noting that RHEL 9 commonly manages this file through authselect. Red Hat documentation warns to use a custom authselect profile for persistent PAM-template changes. I added that caveat while keeping the example intact.

## Review Notes
The `pam_pwquality` options shown in the post, including `minlen`, `dcredit`, `ucredit`, `lcredit`, `ocredit`, `minclass`, `maxrepeat`, `maxclassrepeat`, `dictcheck`, `usercheck`, `retry`, and `enforce_for_root`, match the documented options. The NIST-oriented example is directionally correct because current NIST guidance favors longer passwords and avoids composition rules for memorized secrets.
