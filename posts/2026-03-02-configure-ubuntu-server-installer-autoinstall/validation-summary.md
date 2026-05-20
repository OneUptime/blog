# Validation Summary: How to Configure the Ubuntu Server Installer with Autoinstall

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu Server installer
- Subiquity Autoinstall
- cloud-init NoCloud datasource
- curtin storage configuration
- Netplan network configuration
- GRUB boot parameters
- xorriso
- QEMU/KVM

## Sources Consulted
- Ubuntu Autoinstall configuration reference: https://canonical-subiquity.readthedocs-hosted.com/en/latest/reference/autoinstall-reference.html
- Ubuntu Autoinstall quick start: https://canonical-subiquity.readthedocs-hosted.com/en/latest/howto/autoinstall-quickstart.html
- Ubuntu Autoinstall validation guide: https://canonical-subiquity.readthedocs-hosted.com/en/latest/howto/autoinstall-validation.html
- cloud-init NoCloud datasource documentation: https://docs.cloud-init.io/en/latest/reference/datasources/nocloud.html
- curtin storage documentation: https://curtin.readthedocs.io/en/latest/topics/storage.html
- Ubuntu LiveCD customization documentation: https://help.ubuntu.com/community/LiveCDCustomization

## Issues Found
- The LVM encryption example used `encrypted: true` with `password`. Subiquity's documented LVM layout encryption is configured by providing the layout password, so the incorrect `encrypted: true` line was removed.
- The custom curtin storage example omitted `storage.version`. Curtin's storage documentation shows custom storage configs with a version and config list, so `version: 1` was added.
- The custom LVM partition example did not mark the remaining partition as an LVM partition. Added `flag: lvm` to match curtin partition flags and the intended use.
- The swap mount example used `path: ""`. Curtin treats swap as a special case, so the example now omits the mount path and leaves a comment explaining that swap has no mount path.
- The HTTP verification command checked `/autoinstall.yaml`, but NoCloud fetches `user-data` and `meta-data` from the seed URL. Updated the command to check `/user-data`.
- The GRUB boot parameter examples used an unescaped semicolon in `ds=nocloud...;s=...`. cloud-init documents that GRUB treats an unescaped semicolon as a statement separator, so the examples now escape it as `\;`.
- The troubleshooting validation command only checked YAML syntax. Replaced it with Subiquity's official `validate-autoinstall-user-data.py` command, which validates the autoinstall structure.

## Review Notes
- The QEMU example follows Ubuntu's autoinstall quick start pattern of passing the NoCloud datasource through `-append`; escaping the semicolon is only needed in GRUB, not in QEMU's direct kernel append string.
- The custom ISO repacking command is version- and image-layout-sensitive. The blog's high-level guidance is valid, but future edits could mention deriving exact xorriso boot options from the source ISO for maximum portability.
