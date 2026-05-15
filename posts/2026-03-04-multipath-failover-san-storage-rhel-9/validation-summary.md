# Validation Summary: How to Set Up Multipath Failover for SAN Storage on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- DM-Multipath
- SAN storage failover
- `/etc/multipath.conf`
- `multipath`, `multipathd`, `iscsiadm`, and Linux block device state controls

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring device mapper multipath - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_device_mapper_multipath/index
- Red Hat Enterprise Linux 9 documentation: Modifying multipath configuration file defaults - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_device_mapper_multipath/modifying-the-dm-multipath-configuration-file_configuring-device-mapper-multipath
- Red Hat Enterprise Linux 9 documentation: Troubleshooting with the multipathd interactive console - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_device_mapper_multipath/index#troubleshooting-with-the-multipathd-interactive-console_troubleshooting-dm-multipath

## Issues Found
- The introduction described failover as the default for most storage arrays. RHEL documents `failover` as the default DM-Multipath path grouping policy, so the wording was changed to make the claim RHEL-specific and avoid overgeneralizing array defaults.
- The failover explanation said one path handles all I/O. In DM-Multipath output and configuration, failover operates by path group, so the wording now says one active path group.
- The "Setting Path Priorities" section claimed the per-LUN example set path priorities, but the snippet only set a per-LUN failover policy. The heading and lead-in were changed to describe the snippet accurately.
- The ALUA example used a specific vendor string while presenting a generic ALUA configuration. It now uses placeholder vendor/product values so readers do not copy a vendor-specific match for unrelated arrays.
- The testing section described `status=active` and `status=enabled` as individual path status. These are path group statuses in `multipath -ll` output, so the wording now refers to path groups.

## Review Notes
The local environment does not have `multipath` or `multipathd` installed, so command behavior was verified against Red Hat's RHEL 9 documentation rather than local `--help` or man-page output.
