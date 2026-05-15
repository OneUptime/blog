# Validation Summary: How to Configure Automatic System Updates with dnf-automatic on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- DNF and dnf-automatic
- systemd timers and services
- DNF security advisories and updateinfo
- dnf-plugins-core needs-restarting
- INI-style DNF configuration

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Automating software updates in RHEL 9 - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/assembly_automating-software-updates-in-rhel-9_managing-software-with-the-dnf-tool
- Red Hat Enterprise Linux 9 documentation: Managing and monitoring security updates - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_and_monitoring_security_updates/index
- DNF upstream documentation: DNF Automatic - https://dnf.readthedocs.io/en/stable/automatic.html
- dnf-plugins-core documentation: DNF needs-restarting Plugin - https://dnf-plugins-core.readthedocs.io/en/latest/needs_restarting.html
- systemd.timer manual page - https://www.freedesktop.org/software/systemd/man/systemd.timer.html

## Issues Found
- The `[commands]` example described `download_updates` and `apply_updates` as numeric mode values. Changed the comments to state that they are boolean `yes` or `no` settings, matching the dnf-automatic documentation.
- The same example labeled `random_sleep` as an automatic reboot setting. Changed the comment to describe it as a random delay before downloading updates, and added the actual `reboot = never` setting with the supported reboot policy values.
- The `[command_email]` example used a non-existent `command_email` configuration key. Changed it to `command_format`, which is the documented key for the command email emitter.
- The security update listing command used `dnf updateinfo list security`. Changed it to Red Hat's documented `dnf updateinfo list updates security` form for listing available, not-yet-installed security updates.
- The testing section called `dnf-automatic --timer` a dry run. Changed the wording because that command runs dnf-automatic through the timer code path and can perform configured actions.
- The reboot section stated that dnf-automatic does not reboot after updates. Changed it to say this is the default behavior unless the `reboot` option is configured.
- The reboot-check examples used bare `needs-restarting`. Changed them to `dnf needs-restarting -r` and `dnf needs-restarting -s`, matching the documented DNF plugin invocation.

## Review Notes
The guide is technically relevant and remains valid for RHEL 9 after the corrections. For production use, readers should still test automatic update behavior against their own subscription, repositories, SMTP setup, and maintenance-window policies.
