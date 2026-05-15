# Validation Summary: How to Install and Initialize AIDE on RHEL for File Integrity Monitoring

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- AIDE (Advanced Intrusion Detection Environment)
- dnf package management
- Linux file integrity monitoring
- `/etc/aide.conf` configuration

## Sources Consulted
- Red Hat Enterprise Linux 9 Security Hardening, Chapter 9 "Checking integrity with AIDE": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/security_hardening/security_hardening
- Red Hat CentOS Stream 9 `aide` package source, default `aide.conf` and `README.quickstart`: https://gitlab.com/redhat/centos-stream/rpms/aide/-/tree/c9s
- AIDE upstream project repository: https://github.com/aide/aide
- AIDE aide(1) manual summary for `--init`, `--check`, and `--update`: https://www.mankier.com/1/aide

## Issues Found
- The post described `CONTENT_EX = sha512+ftype+p+u+g+n+acl+selinux+xattrs` and `DATAONLY = p+n+u+g+s+acl+selinux+xattrs+sha512` as default RHEL `aide.conf` attribute groups. That `CONTENT_EX` form is used in Red Hat OpenShift File Integrity Operator examples, but it is not a reliable RHEL default. I changed the section to describe rule groups more generally and used RHEL 9-style package examples: `NORMAL = R+sha512-m-c` and `DATAONLY = ftype+p+l+n+u+g+s+acl+selinux+xattrs+sha256`.
- The database activation command used `cp /var/lib/aide/aide.db.new.gz /var/lib/aide/aide.db.gz`. Red Hat's RHEL 9 hardening guide says to remove the `.new` substring from the initialized database filename, and shows `mv /var/lib/aide/aide.db.new.gz /var/lib/aide/aide.db.gz`. I changed the command and matching workflow/pitfall wording to use `mv`.

## Review Notes
The core install, initialization, check, output path, and update workflow matched Red Hat's RHEL 9 AIDE documentation. The quick verification using a new file under `/etc` is plausible with the packaged default rules, but production systems should still verify their local `/etc/aide.conf` because site-specific hardening profiles can change the monitored paths and attributes.
