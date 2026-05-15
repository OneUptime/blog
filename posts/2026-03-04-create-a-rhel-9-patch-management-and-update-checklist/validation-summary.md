# Validation Summary: How to Create a RHEL Patch Management and Update Checklist

## Status
validated

## Post Type
Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- DNF Automatic
- systemd timers
- systemctl
- journalctl
- RPM package queries

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Automating software updates in RHEL 9": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/assembly_automating-software-updates-in-rhel-9_managing-software-with-the-dnf-tool
- Red Hat Enterprise Linux 9 documentation, "Managing and monitoring security updates": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_and_monitoring_security_updates/
- systemctl manual: https://www.freedesktop.org/software/systemd/man/latest/systemctl.html
- journalctl manual: https://www.freedesktop.org/software/systemd/man/latest/journalctl.html
- Local command help for systemctl, journalctl, df, and free

## Issues Found
- The post used a generic service enable/start flow with `<service-name>` for DNF Automatic. Red Hat documents DNF Automatic periodic execution through systemd timer units, such as `dnf-automatic-install.timer`, enabled with `systemctl enable --now <timer_name>`. Updated the section to enable and check `dnf-automatic-install.timer`, and added `systemctl list-timers --all` for timer verification.
- The checklist described DNF Automatic as configured by running `dnf install dnf-automatic`. Installing the package alone does not fully configure update behavior, so the wording was changed to "installed and configured" while keeping the package installation command.
- The subscription check was written as a general checklist item even though `subscription-manager status` applies to RHEL subscription-managed systems, not CentOS Stream. Updated the wording to scope it to RHEL systems.
- The troubleshooting command referenced a generic service name. Updated it to check the DNF Automatic timer logs with `journalctl -u dnf-automatic-install.timer -e --no-pager`.

## Review Notes
The remaining health-check commands are valid. In a future revision, the guide could mention editing `/etc/dnf/automatic.conf` when using `dnf-automatic.timer`, or choosing between `dnf-automatic-download.timer`, `dnf-automatic-install.timer`, and `dnf-automatic-notifyonly.timer` based on the organization's patch policy.
