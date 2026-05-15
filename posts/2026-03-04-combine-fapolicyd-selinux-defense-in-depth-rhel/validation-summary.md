# Validation Summary: How to Combine fapolicyd with SELinux for Defense-in-Depth on RHEL

## Status
validated

## Post Type
Guide

## Technologies Covered
- Red Hat Enterprise Linux
- fapolicyd
- SELinux
- Apache HTTP Server SELinux policy
- Linux audit tooling

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening, "Blocking and allowing applications by using fapolicyd": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/assembly_blocking-and-allowing-applications-using-fapolicyd_security-hardening
- Red Hat Enterprise Linux 9 Using SELinux, "Getting started with SELinux": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux
- Red Hat Enterprise Linux 10 Security hardening, "Blocking and allowing applications by using fapolicyd": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/security_hardening/blocking-and-allowing-applications-by-using-fapolicyd
- Red Hat Enterprise Linux 10 Using SELinux: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html-single/using_selinux/using_selinux

## Issues Found
- The fapolicyd verification used a newly created shell script in `/tmp` and stated it should be denied. RHEL's documented default fapolicyd rules include a shell-script allow rule, so this is not a reliable denial test. Changed it to copy `/bin/ls` to `/tmp/test_ls`, matching Red Hat's documented verification pattern for an untrusted copied binary.
- The Apache example said httpd can only serve content with the `httpd_sys_content_t` label. That was too absolute because SELinux has several httpd-related content and script labels. Changed the wording to say static content under `/var/www/html` is normally labeled `httpd_sys_content_t`.
- The `/tmp` scenario said SELinux blocks execution from `/tmp` generally. Red Hat documents this more specifically as the `httpd_t` domain lacking access to files labeled `tmp_t` by default. Updated the wording to avoid implying a system-wide SELinux execution ban for `/tmp`.
- The best-practices comment referred to updating "fapolicyd trust" with `fapolicyd-cli --update`. The command refreshes the fapolicyd database after manual trust or RPM database changes; updated the comment to describe that more accurately.

## Review Notes
The commands are RHEL-oriented and depend on the relevant packages being installed. `fapolicyd-cli --update`, `fapolicyd-cli --dump-db`, `systemctl is-active fapolicyd`, SELinux context inspection with `ps -eZ` and `ls -Z`, and audit searches with `ausearch` are consistent with Red Hat documentation.
