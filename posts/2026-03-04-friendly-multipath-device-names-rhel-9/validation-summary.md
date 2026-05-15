# Validation Summary: How to Configure Friendly Multipath Device Names on RHEL

## Status
validated

## Post Type
Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- DM-Multipath
- `/etc/multipath.conf`
- `multipath`, `multipathd`, and `scsi_id` commands
- `/etc/multipath/bindings`
- `/etc/fstab`

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring device mapper multipath - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_device_mapper_multipath/index
- Red Hat Enterprise Linux 9 documentation: Modifying the DM Multipath configuration file - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_device_mapper_multipath/modifying-the-dm-multipath-configuration-file_configuring-device-mapper-multipath
- Red Hat Enterprise Linux 9 documentation: Managing multipathed volumes - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_device_mapper_multipath/managing-multipathed-volumes_configuring-device-mapper-multipath
- Red Hat Enterprise Linux 7 documentation: The multipathd Commands - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/dm_multipath/multipathd_commands
- Red Hat Enterprise Linux 9 documentation: Managing file systems, device identifiers - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_file_systems/managing_file_systems

## Issues Found
- The introduction said DM-Multipath uses `mpatha`/`mpathb` names by default. Red Hat's RHEL 9 multipath device identifier documentation states that WWID naming is the default unless user-friendly names or aliases are configured, while the basic `mpathconf --enable` setup can enable the `mpathN` naming format. Updated the sentence to say DM-Multipath can use either naming style depending on `user_friendly_names`.

## Review Notes
- The `multipaths` section syntax with `wwid` and `alias` is consistent with Red Hat documentation.
- `multipathd show maps format` and `multipathd reconfigure` are valid multipathd command forms.
- Red Hat documentation commonly uses `service multipathd reload` or `systemctl reload multipathd.service` after editing `/etc/multipath.conf`; the post's `multipathd reconfigure` approach is also valid for re-reading configuration.
