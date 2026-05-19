# Validation Summary: How to Configure Multipass VM Resources (CPU, RAM, Disk)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Multipass
- Virtual machines
- Multipass CLI resource settings
- Linux disk and filesystem resizing

## Sources Consulted
- Multipass launch command reference: https://documentation.ubuntu.com/multipass/latest/reference/command-line-interface/launch/
- Multipass settings reference: https://documentation.ubuntu.com/multipass/latest/reference/settings/
- Multipass modify an instance guide: https://documentation.ubuntu.com/multipass/latest/how-to-guides/manage-instances/modify-an-instance/
- Multipass local instance disk setting reference: https://documentation.ubuntu.com/multipass/stable/reference/settings/local-instance-name-disk/

## Issues Found
- The post claimed `multipass get local.cpus`, `local.memory`, and `local.disk` report launch defaults. Current Multipass settings do not include these global keys. I changed this to use `multipass help launch`, which documents the default CPU, memory, and disk values.
- The post claimed global CPU, memory, and disk defaults can be changed with `multipass set local.cpus`, `local.memory`, and `local.disk`. Current Multipass exposes per-instance keys, not global resource defaults. I changed the section to recommend reusing explicit launch flags.
- The post claimed existing instance resources require editing backend JSON configuration files because Multipass has no direct CLI support. Current Multipass supports modifying stopped instances with `multipass set local.<instance-name>.cpus`, `.memory`, and `.disk`. I replaced the unsupported config-file workaround with the documented CLI commands.
- The post described disk expansion using `growpart`. Multipass documentation recommends shelling into the instance, running `sudo parted /dev/sda resizepart 1 100%`, then `sudo resize2fs /dev/sda1` when a partition does not automatically expand. I updated the example accordingly.
- The post described memory as requiring whole-number `K`, `M`, and `G` suffixes and disk as using `G` only. Multipass accepts positive integers in bytes or decimal values with `K`, `M`, and `G` suffixes. I corrected those descriptions.

## Review Notes
The post is technically relevant and now matches current Multipass documentation for launch-time resources and stopped-instance resource modification. The disk-resize commands assume a typical Multipass Ubuntu cloud image using `/dev/sda1`; users should still confirm the actual device layout with `lsblk` before resizing.
