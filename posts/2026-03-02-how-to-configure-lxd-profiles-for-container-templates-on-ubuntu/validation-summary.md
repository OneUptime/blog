# Validation Summary: How to Configure LXD Profiles for Container Templates on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- LXD
- LXD profiles
- LXD `lxc` CLI
- LXD instance configuration
- LXD disk and NIC devices
- LXC raw configuration

## Sources Consulted
- LXD documentation: How to use profiles - https://documentation.ubuntu.com/lxd/v5/profiles/
- LXD documentation: `lxc profile` manpage - https://documentation.ubuntu.com/lxd/latest/reference/manpages/lxc/profile/
- LXD documentation: `lxc profile create` manpage - https://documentation.ubuntu.com/lxd/latest/reference/manpages/lxc/profile/create/
- LXD documentation: `lxc profile edit` manpage - https://documentation.ubuntu.com/lxd/latest/reference/manpages/lxc/profile/edit/
- LXD documentation: `lxc profile assign` manpage - https://documentation.ubuntu.com/lxd/latest/reference/manpages/lxc/profile/assign/
- LXD documentation: `lxc profile set` manpage - https://documentation.ubuntu.com/lxd/latest/reference/manpages/lxc/profile/set/
- LXD documentation: `lxc list` manpage - https://documentation.ubuntu.com/lxd/latest/reference/manpages/lxc/list/
- LXD documentation: Instance options - https://documentation.ubuntu.com/lxd/stable-5.0/reference/instance_options/
- LXD documentation: Disk devices - https://documentation.ubuntu.com/lxd/latest/reference/devices_disk/
- LXD documentation: NIC devices - https://documentation.ubuntu.com/lxd/latest/reference/devices_nic/
- LXC manpage: `lxc.container.conf` capabilities - https://linuxcontainers.org/lxc/manpages/man5/lxc.container.conf.5.html

## Issues Found
- Updated `lxc profile set` and `lxc config set` examples to the current documented `key=value` syntax. The old two-argument form is retained only for backward compatibility in the current manpage.
- Removed the redundant `cat |` pipeline from the here-document profile creation example. The here-document should feed `lxc profile create` directly.
- Renamed the Docker profile example from "Nested Virtualization" to "Nested Containers" because `security.nesting` is for running nested container workloads, not hardware virtualization.
- Corrected the high-security raw LXC capability example. `lxc.cap.keep=net_bind_service` is the documented way to keep only that capability; combining a drop-all pattern with `lxc.cap.keep` was misleading.
- Fixed the profile usage listing command. `lxc profile show` emits a `used_by` YAML field, not a "Used by" table label.
- Fixed the `lxc list` example to request the profiles column explicitly with `-c nP`; the default CSV columns do not include profiles.
- Fixed the restart loop to parse instances from the `used_by` entries instead of grepping for a non-existent `Managed:` field.
- Clarified that `lxc profile edit webserver < webserver-profile.yaml` updates an existing profile, while `lxc profile create webserver < webserver-profile.yaml` creates one.

## Review Notes
The examples assume the default managed bridge is named `lxdbr0` and the default storage pool is named `default`, which is common after interactive initialization but can differ on customized LXD installations.
