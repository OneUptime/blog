# Validation Summary: How to Manage Multiple Multipass VMs on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Multipass (Canonical's VM manager)
- Ubuntu (host and guest)
- Bash scripting (awk, xargs, for-loops)
- SSH and `multipass transfer` for file movement

## Sources Consulted
- [Multipass documentation - snapshot command](https://documentation.ubuntu.com/multipass/latest/reference/command-line-interface/snapshot/)
- [Multipass documentation - restore command](https://documentation.ubuntu.com/multipass/latest/reference/command-line-interface/restore/)
- [Multipass documentation - settings reference](https://documentation.ubuntu.com/multipass/latest/reference/settings/)
- [Multipass documentation - modify an instance](https://documentation.ubuntu.com/multipass/latest/how-to-guides/manage-instances/modify-an-instance/)
- [Multipass documentation - list command](https://documentation.ubuntu.com/multipass/stable/reference/command-line-interface/list/)

## Issues Found

1. **Outdated snapshot section.** The post claimed "Multipass does not have a first-class snapshot feature like libvirt" and walked through manually copying disk images from the snap vault. This is incorrect - Multipass has supported snapshots natively since v1.13 (October 2023) via `multipass snapshot`, `multipass restore`, `multipass list --snapshots`, and `multipass delete <instance>.<snapshot> --purge`. The manual disk-copy approach was also unsupported and fragile (the actual image filename inside the vault varies and is not a stable interface). Rewrote the section to demonstrate the official snapshot/restore commands, including the requirement that the instance be stopped before taking a snapshot, the `<instance>.<snapshot>` reference format used by `restore`, and `--name` / `--comment` options.

2. **Invalid global default settings keys.** The post showed `sudo multipass set local.cpus=2`, `local.memory=2G`, and `local.disk=15G` as a way to set defaults for new VMs. These keys do not exist in Multipass - the settings system only exposes `local.<instance-name>.cpus`, `local.<instance-name>.memory`, and `local.<instance-name>.disk` (per-instance, after the instance has been launched). There is no way to change the built-in defaults of 1 CPU / 1G RAM / 5G disk via `multipass set`. Rewrote the section to (a) explicitly state the built-in defaults and that values must be specified at launch time for new VMs, and (b) demonstrate the correct per-instance settings keys for adjusting existing stopped instances.

## Review Notes

- The CSV column ordering used in the awk scripts (`$1`=Name, `$2`=State, `$3`=IPv4) matches `multipass list --format csv` output. Newer Multipass versions append additional columns (e.g., `Release`, `AllIPv4`), but the leading columns referenced by the scripts remain stable.
- The `--memory` long flag (rather than the older `--mem`) is correct for current Multipass releases.
- `multipass start --all` / `multipass stop --all` exist as built-in shortcuts for blanket operations, but the awk-filtered approach in the post is still valid and useful when filtering by state or name prefix, so left as-is.
- The vault path `/var/snap/multipass/common/data/multipassd/vault/instances/<name>/` is only valid for snap-based Multipass installs on Linux; on macOS/Windows the path differs. After the snapshot rewrite this path no longer appears in the post, so the caveat is moot.
- The author's writing style and section structure were preserved; only the two technically incorrect blocks were rewritten.
