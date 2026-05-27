# Validation Summary: How to Use Ansible for Bare Metal Server Provisioning

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and roles
- Ansible built-in modules: apt, command, wait_for, wait_for_connection, template, get_url, file, include_role
- ansible.posix mount module
- IPMI and ipmitool
- PXE boot provisioning
- Ubuntu Server 22.04 autoinstall / Subiquity
- Curtin storage configuration and Linux software RAID
- dnsmasq, tftpd-hpa, nginx
- lm-sensors, smartmontools, mdadm
- Prometheus node_exporter collectors

## Sources Consulted
- Ansible apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible get_url module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/get_url_module.html
- Ansible file module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/file_module.html
- Ansible wait_for_connection module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/wait_for_connection_module.html
- ansible.posix mount module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/posix/mount_module.html
- ipmitool manual page: https://man.he.net/man1/ipmitool
- Ubuntu autoinstall configuration reference: https://canonical-subiquity.readthedocs-hosted.com/en/latest/reference/autoinstall-reference.html
- Ubuntu autoinstall storage guide: https://canonical-subiquity.readthedocs-hosted.com/en/latest/howto/configure-storage.html
- Curtin storage documentation: https://curtin.readthedocs.io/en/latest/topics/storage.html
- Ubuntu 22.04 release image listing: https://releases.ubuntu.com/22.04/
- Ubuntu package search for lm-sensors: https://packages.ubuntu.com/jammy/lm-sensors
- Ubuntu package search for mdadm: https://packages.ubuntu.com/jammy/mdadm
- Ubuntu package search for smartmontools: https://packages.ubuntu.com/smartmontools
- Prometheus node_exporter documentation: https://github.com/prometheus/node_exporter

## Issues Found
- The Ubuntu ISO URL used `ubuntu-22.04-live-server-amd64.iso`, which is not the listed current 22.04 server image. Updated it to `ubuntu-22.04.5-live-server-amd64.iso` and adjusted the local filename.
- The PXE server tasks wrote to `/srv/tftp` and `/srv/www/autoinstall` without ensuring parent directories existed, and nginx on Ubuntu serves `/var/www/html` by default. Added an Ansible file task to create `/srv/tftp` and `/var/www/html/autoinstall`, then updated the autoinstall destination path.
- The inventory included `raid10`, but the shown autoinstall template only implemented `raid1`. Changed the example host to `raid1` so the inventory matches the demonstrated template.
- The autoinstall storage config omitted Curtin's `version` field. Added `version: 1` under `storage`.
- The RAID example partitioned an md device without declaring a partition table on the RAID device. Added `ptable: gpt` to the RAID action.
- The IPMI task requests UEFI PXE boot with `options=efiboot`, but the autoinstall storage example did not create an EFI System Partition. Added boot partitions, formatted the primary ESP as FAT32, mounted it at `/boot/efi`, and moved `grub_device: true` to the ESP.
- The autoinstall template comment used `inventory_hostname`, which would refer to the PXE server during the loop rather than the target host. Changed it to `{{ item }}`.
- The autoinstall password hash was unquoted. Quoted it so special characters in password hashes are handled as a YAML string.
- The hardware monitoring package list included `megacli`, which is not a standard Ubuntu 22.04 package in the Ubuntu package archive. Replaced it with `mdadm`, which matches the Linux software RAID monitoring used in the post.

## Review Notes
The examples are technically consistent after the fixes, but a complete production PXE implementation would also need bootloader/menu configuration that passes the autoinstall or NoCloud datasource URL for each server. Vendor-specific hardware RAID tools may still be needed on systems using hardware RAID controllers, but they should be installed from the vendor-supported source rather than assumed to be an Ubuntu package.
