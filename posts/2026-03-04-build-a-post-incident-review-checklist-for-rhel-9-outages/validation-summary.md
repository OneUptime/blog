# Validation Summary: How to Build a Post-Incident Review Checklist for RHEL Outages

## Status
validated

## Post Type
Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- systemd and `systemctl`
- systemd journal and `journalctl`
- RPM package queries
- Linux system health commands

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Managing systemd": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/managing-systemd_configuring-basic-system-settings
- Red Hat Enterprise Linux 9 documentation, "Searching for RHEL 9 content": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/assembly_searching-for-rhel-9-content_managing-software-with-the-dnf-tool
- Red Hat Customer Portal, "How to install or upgrade an RPM package?": https://access.redhat.com/solutions/1189
- systemd `journalctl` manual: https://www.freedesktop.org/software/systemd/man/latest/journalctl.html
- RPM upstream `rpm(8)` manual: https://rpm.org/docs/4.19.x/man/rpm.8.html
- Local command help in the review environment: `systemctl --help`, `journalctl --help`

## Issues Found
- The service-management examples used shell placeholders such as `<service-name>`. In a shell, angle brackets are parsed as redirection, so copying the examples as written would fail before `systemctl` or `journalctl` ran. I replaced the service-management example with a `SERVICE_NAME=sshd.service` variable and quoted uses of that variable.
- The troubleshooting package check used `rpm -qa | grep <package-name>`, which has the same shell placeholder problem and is less direct than querying a specific installed package. I changed it to `rpm -q package-name`, which matches RPM query usage for checking one installed package.

## Review Notes
- The remaining commands are syntactically valid for RHEL-like systems: `systemctl --failed`, `journalctl -p err --since "24 hours ago" --no-pager`, `df -h`, `free -m`, and `uptime`.
- The article remains a lightweight checklist and generic operational guide. It could be improved in the future by aligning the section headings more closely with post-incident review work rather than service setup, but that is outside the scope of technical correction.
