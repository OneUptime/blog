# Validation Summary: How to Use cloud-localds for Local Cloud Image Testing on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- cloud-localds (from `cloud-image-utils` / `cloud-utils` package)
- cloud-init (NoCloud datasource, cc_final_message, write_files, runcmd, users, packages)
- Ubuntu 24.04 (noble) cloud images
- QEMU / KVM (qemu-system-x86_64, qemu-img, virtio drives, user-mode networking with hostfwd)
- Netplan v2 network configuration
- write-mime-multipart for multipart MIME user-data
- systemd-resolved / resolvectl

## Sources Consulted
- cloud-utils `cloud-localds` source: https://github.com/canonical/cloud-utils/blob/main/bin/cloud-localds
- cloud-init Module reference (cc_final_message): https://docs.cloud-init.io/en/latest/reference/modules.html
- cloud-init CLI reference: https://docs.cloud-init.io/en/latest/reference/cli.html
- cloud-init "How to identify the datasource I'm using": https://cloudinit.readthedocs.io/en/latest/howto/identify_datasource.html
- NoCloud datasource docs: https://docs.cloud-init.io/en/latest/reference/datasources/nocloud.html
- Ubuntu cloud images: https://cloud-images.ubuntu.com/noble/current/
- Local verification of `cloud-init --help` and `cloud-init query --help` output

## Issues Found

1. **`cloud-localds --version` does not exist.** The cloud-localds bash script only supports `--help`, `--disk-format`, `--filesystem`, `--hostname`, `--interfaces`, `--network-config`, `--dsmode`, `--vendor-data`, `--verbose`. Replaced with `cloud-localds --help | head -5` to verify the binary is installed and functional.

2. **`$UPTIME` template variable wrong case.** The `cc_final_message` module's supported template variables are lowercase: `$version`, `$timestamp`, `$datasource`, `$uptime`. Changed `$UPTIME` → `$uptime`.

3. **`cloud-init query datasource` does not work.** The `query` subcommand takes a dotted instance-data key, and there is no top-level `datasource` key. Replaced with the official commands: `cloud-id` (the dedicated binary for identifying which datasource is in use) and `sudo cloud-init query v1.cloud_name`.

4. **Misleading comment on `--disk-format=raw` example.** The original comment said `--disk-format` sets the disk label, but the label is always `cidata` (set automatically by cloud-localds via `genisoimage -volid cidata` / `mkfs.vfat -n cidata`). `--disk-format` controls the disk container format (raw/qcow2/vmdk). Also, `raw` is already the default — the original example was a no-op. Updated to use `--disk-format=qcow2` with an accurate explanatory comment about format options and that the label is automatic.

5. **Deprecated `systemd-resolve --status`.** The `systemd-resolve` binary was deprecated in favor of `resolvectl` and is no longer shipped in Ubuntu 24.04 (noble). Replaced with `resolvectl status`.

## Review Notes

- The QEMU invocations attach the seed ISO as a virtio block device rather than a CD-ROM. This is functionally fine because cloud-init's NoCloud datasource matches on the filesystem label (`cidata`), not on the device type. Some examples in upstream docs use `-cdrom seed.iso` instead — both work.
- The `cloud-image-utils` package on Ubuntu is what ships `cloud-localds` and `write-mime-multipart`; this is accurate.
- The NoCloud label is documented as case-insensitive (commonly `CIDATA` in docs, but cloud-localds writes the lowercase `cidata`). The post's mention of `CIDATA` is fine — both work.
- The `--filesystem=vfat` option produces a FAT filesystem inside a raw disk file — saving it with a `.img` extension (as the post does) is appropriate.
- The Ubuntu 24.04 cloud image's virtual disk is ~3.5GB; the post's "2–5GB" range is reasonable.
- The CI/CD script uses a fixed `sleep 30` before SSHing, which is fragile in practice — a polling loop would be more reliable. Not technically incorrect, just brittle; left as-is per the "don't restructure" guidance.
