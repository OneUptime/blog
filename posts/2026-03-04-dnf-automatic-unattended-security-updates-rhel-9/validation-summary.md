# Validation Summary: How to Use DNF Automatic for Unattended Security Updates on RHEL

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- DNF and DNF Automatic
- systemd timers
- DNF updateinfo and history commands
- dnf-plugins-core needs-restarting
- DNF configuration

## Sources Consulted
- Red Hat Enterprise Linux 9, "Managing software with the DNF tool": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/managing_software_with_the_dnf_tool
- Red Hat Enterprise Linux 9, "Managing and monitoring security updates": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_and_monitoring_security_updates/managing_and_monitoring_security_updates
- Red Hat Customer Portal, "[dnf-automatic] implement reboot after upgrades": https://access.redhat.com/solutions/7062590
- DNF command reference: https://dnf.readthedocs.io/en/stable/command_ref.html
- DNF configuration reference: https://dnf.readthedocs.io/en/stable/conf_ref.html
- DNF upstream dnf-automatic systemd unit files and automatic.conf: https://github.com/rpm-software-management/dnf

## Issues Found
- The timer list described `dnf-automatic.timer` as always downloading and applying updates. Updated it to say the timer reports, downloads, or applies updates based on `/etc/dnf/automatic.conf`.
- The `dnf-automatic-install.timer` description said it installs regardless of config. Clarified that it overrides the `download_updates` and `apply_updates` settings, while other configuration such as `upgrade_type` still matters.
- The default timer schedule was described as one hour after boot and every 24 hours. Updated it to the RHEL/DNF timer default of daily at 6:00 AM with up to a 60-minute randomized delay.
- The testing section called a manual `dnf-automatic` invocation a dry run. Changed this to "manual test run" because it executes the configured workflow and can apply updates when `apply_updates = yes`.
- The command for listing available security updates used `dnf updateinfo list security`. Changed it to Red Hat's documented `dnf updateinfo list updates security` form.
- The download-only explanation said cached updates would install instantly. Reworded it to say DNF can reuse already downloaded packages.

## Review Notes
The post is technically relevant and accurate after the fixes. Red Hat's security-update documentation demonstrates `dnf-automatic-install.timer` for automatic security installation, while the main `dnf-automatic.timer` is also valid when `download_updates` and `apply_updates` are set in `/etc/dnf/automatic.conf`.
