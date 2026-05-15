# Validation Summary: How to Configure Log Rotation with logrotate on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- logrotate
- systemd timers
- Linux shell commands
- SELinux troubleshooting commands

## Sources Consulted
- logrotate upstream manual page: https://man7.org/linux/man-pages/man8/logrotate.8.html
- logrotate configuration manual page: https://man7.org/linux/man-pages/man5/logrotate.conf.5.html
- Red Hat Customer Portal solution, "Where is /etc/cron.daily/logrotate?": https://access.redhat.com/solutions/7131336
- Red Hat Enterprise Linux 9 "Considerations in adopting RHEL 9" documentation: https://docs.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/pdf/considerations_in_adopting_rhel_9/considerations-in-adopting-rhel-9.pdf
- CentOS Stream/RHEL 9 logrotate package spec: https://gitlab.com/redhat/centos-stream/rpms/logrotate/-/raw/c9s/logrotate.spec
- logrotate 3.18.0 upstream release example configuration: https://github.com/logrotate/logrotate/releases/download/3.18.0/logrotate-3.18.0.tar.xz

## Issues Found
- The post said logrotate is triggered by a systemd timer "or cron" that runs daily. RHEL 9 uses `logrotate.timer` rather than `/etc/cron.daily/logrotate`, so the wording was changed to state that RHEL 9 uses a systemd timer.
- The default RHEL configuration example showed `compress` enabled globally. The RHEL 9 package installs the upstream example where `compress` is commented out by default, so the snippet was corrected to show `#compress` with opt-in wording.
- The size-based rotation section implied rotation happens immediately when a file reaches the configured size. logrotate only evaluates this when it runs, so the sentence was changed to "when logrotate runs and a file has reached a certain size."

## Review Notes
The remaining directives and commands checked are consistent with the logrotate manual pages and RHEL 9 systemd timer behavior. The examples use placeholder users and groups such as `appuser` and `appgroup`; these must exist on a real system before the examples can be used unchanged.
