# Validation Summary: How to Prevent Password Reuse on RHEL

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux-PAM
- pam_pwhistory
- pam_pwquality
- pam_unix
- authselect
- PCI DSS, CIS Benchmark, and DISA STIG password history settings

## Sources Consulted
- Red Hat Enterprise Linux 9.2 Release Notes: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/9.2_release_notes/Red_Hat_Enterprise_Linux-9-9.2_Release_Notes-en-US.pdf
- Red Hat Enterprise Linux 9 authselect documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_authentication_and_authorization_in_rhel/index
- Linux-PAM pam_pwhistory(8): https://man7.org/linux/man-pages/man8/pam_pwhistory.8.html
- Linux-PAM pwhistory.conf(5): https://man7.org/linux/man-pages/man5/pwhistory.conf.5.html
- Linux-PAM pam_unix(8): https://man7.org/linux/man-pages/man8/pam_unix.8.html
- Local pam_pwquality(8) man page on the review host
- OpenSCAP RHEL 9 CIS guidance: https://static.open-scap.org/ssg-guides/ssg-rhel9-guide-cis.html
- DISA RHEL 9 STIG rule reference: https://www.stigaview.com/products/rhel9/v1r2/RHEL-09-611020

## Issues Found
- The post said `pwhistory.conf` was introduced in "RHEL.1+". Red Hat's RHEL 9.2 release notes document this feature, so the post now says RHEL 9.2+.
- The PAM-stack section only described a custom authselect profile. RHEL 9.2 added authselect support for pam_pwhistory, and OpenSCAP guidance uses `authselect enable-feature with-pwhistory` where available, so the post now recommends that before the custom-profile fallback.
- The custom-profile instructions only edited `system-auth`. RHEL/OpenSCAP guidance checks both `system-auth` and `password-auth`, so the post now tells readers to edit both templates when using a custom profile.
- The testing commands used `sudo passwd reusetest` for reuse and similarity checks. Root-initiated password changes do not provide the same old-password context for pam_pwquality similarity checks, and immediate reuse after the first set may not populate history as expected. The test flow now changes the password as the test user first, then attempts to reuse the prior password and test a similar password.

## Review Notes
The remaining examples use valid pam_pwhistory, pam_pwquality, pam_unix, authselect, chmod, chown, truncate, useradd, passwd, and chage syntax. The compliance values are reasonable examples, but organizations should still confirm the exact benchmark profile and version they are targeting.
