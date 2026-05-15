# Validation Summary: How to Monitor and Troubleshoot Multipath Paths on RHEL

## Status
validated

## Post Type
Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- DM-Multipath
- multipath and multipathd CLI commands
- multipath.conf configuration
- Fibre Channel and iSCSI troubleshooting
- Linux sysfs and systemd journal diagnostics

## Sources Consulted
- Red Hat Enterprise Linux 9: Configuring device mapper multipath: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_device_mapper_multipath/index
- Red Hat Enterprise Linux 9: Managing multipathed volumes: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_device_mapper_multipath/managing-multipathed-volumes_configuring-device-mapper-multipath
- multipathd(8) manual page: https://man.archlinux.org/man/multipathd.8.en
- multipath.conf(5) manual page: https://man.archlinux.org/man/multipath.conf.5.en

## Issues Found
- The "Force a Path Check" section implied that `multipathd show paths` forces path checks and that `multipathd reconfigure` forces a path recheck. The documented behavior is that `show paths` displays monitored path state and `reconfigure` rereads configuration and reloads changed maps. Updated the heading and comments to describe those commands accurately.
- The "Multipath Device Not Created" command comment said `multipath -a /dev/sdb` forces multipath to pick up the device. Red Hat documents `multipath -a` as adding the device WWID to the wwids file. Updated the comment to say it adds the device WWID and asks `multipathd` to monitor the path.
- The `marginal_path_*` example was incomplete and used `marginal_path_err_sample_time 30`. The manual page documents this method as requiring the related marginal path parameters and an error sample time greater than 120 seconds. Changed the sample time to `180` and added `marginal_path_err_recheck_gap_time 300`.

## Review Notes
The remaining commands and format wildcards match Red Hat documentation or the multipathd manual page. Device names such as `sdb` are examples and should be replaced with the actual path device on a real host.
