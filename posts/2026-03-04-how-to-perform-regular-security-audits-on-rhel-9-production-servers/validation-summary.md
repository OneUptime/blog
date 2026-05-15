# Validation Summary: How to Perform Regular Security Audits on RHEL 9 Production Servers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- OpenSCAP and SCAP Security Guide
- Red Hat OVAL vulnerability definitions
- AIDE
- auditd / ausearch
- SELinux
- firewalld
- systemd / journalctl
- Linux account, SSH key, service, and socket auditing commands

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening: Scanning the system for configuration compliance and vulnerabilities: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/scanning-the-system-for-configuration-compliance-and-vulnerabilities_security-hardening
- Red Hat Enterprise Linux 9 Security hardening: Checking integrity with AIDE: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/checking-integrity-with-aide_security-hardening
- Red Hat Enterprise Linux 9 OpenSCAP image builder profile documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_a_customized_rhel_system_image/assembly_creating-pre-hardened-images-with-image-builder-openscap-integration_composing-a-customized-rhel-system-image
- Red Hat and OVAL compatibility: https://access.redhat.com/articles/221883
- firewalld firewall-cmd manual: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- systemd journalctl manual: https://www.freedesktop.org/software/systemd/man/latest/journalctl.html
- ausearch manual page: https://man7.org/linux/man-pages/man8/ausearch.8.html

## Issues Found
- The vulnerability scanning command used `/usr/share/xml/scap/ssg/content/ssg-rhel9-oval.xml` as the source for known CVEs. Red Hat documents vulnerability scanning with the Red Hat RHSA OVAL feed for RHEL 9, downloaded from `https://www.redhat.com/security/data/oval/v2/RHEL9/rhel-9.oval.xml.bz2`, then scanned with `oscap oval eval`. Updated the command to download, decompress, and scan `rhel-9.oval.xml`.
- The package installation command did not include `bzip2` or `wget`, which are needed by the corrected Red Hat OVAL download command. Added both packages to the `dnf install` command.
- The audit report generation commands wrote directly to `/var/log/audit/audit-report.txt` using shell redirection without elevated write permissions. Replaced the sequence with a grouped command piped to `sudo tee` so the report can be created in `/var/log/audit`.

## Review Notes
- The CIS OpenSCAP profile ID, `xccdf_org.ssgproject.content_profile_cis`, and the RHEL 9 datastream path, `/usr/share/xml/scap/ssg/content/ssg-rhel9-ds.xml`, match Red Hat documentation.
- The AIDE initialization path `/var/lib/aide/aide.db.new.gz` and database move to `/var/lib/aide/aide.db.gz` match Red Hat's RHEL 9 AIDE workflow.
- The `ausearch -m AVC -ts this-month`, `firewall-cmd --list-all`, and `journalctl --since="1 month ago"` usage is consistent with their respective command documentation.
