# Validation Summary: How to Implement a Patch Management Strategy for RHEL Fleets

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Red Hat Enterprise Linux (RHEL)
- DNF and DNF updateinfo
- dnf-automatic
- systemd timers
- LVM snapshots
- Bash scripting

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Managing and monitoring security updates - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_and_monitoring_security_updates/managing_and_monitoring_security_updates
- Red Hat Enterprise Linux 8 documentation: Automating software updates in RHEL - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/installing_managing_and_removing_user-space_components/automating-software-updates_using-appstream
- DNF Command Reference: updateinfo and security options - https://dnf.readthedocs.io/en/stable/command_ref.html
- DNF Automatic documentation: configuration file and systemd timers - https://dnf.readthedocs.io/en/stable/automatic.html

## Issues Found
- The severity-filter examples used `--severity`, which is not the documented DNF option. Changed them to `--sec-severity=Critical` and `--sec-severity=Important`.
- The production `dnf-automatic` example said to download updates but enabled `dnf-automatic-notifyonly.timer`, which reports only and overrides `download_updates`. Changed it to `dnf-automatic-download.timer`.
- The description mentioned content views, but the post does not cover Red Hat Satellite content views. Removed that phrase so the description matches the article.

## Review Notes
- The post is written for modern RHEL systems that use DNF, such as RHEL 8 and RHEL 9. RHEL 7 uses YUM-oriented tooling and is outside the scope of the commands shown.
- The LVM snapshot example is technically valid, but real fleets should size snapshots for expected write churn and test rollback procedures before relying on them in production.
