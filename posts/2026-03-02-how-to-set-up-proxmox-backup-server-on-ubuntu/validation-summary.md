# Validation Summary: How to Set Up Proxmox Backup Server on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Proxmox Backup Server (PBS)
- Proxmox VE (PVE)
- Debian (PBS runs on its own Debian-based ISO; the post is tagged Ubuntu but explicitly states PBS is Debian-based)
- `proxmox-backup-manager` CLI
- `proxmox-backup-client` CLI
- `pvesm` / `vzdump` CLI
- Linux disk tooling: `parted`, `mkfs.ext4`, `/etc/fstab`
- APT package management

## Sources Consulted
- [Proxmox Backup Server documentation index](https://pbs.proxmox.com/docs/)
- [PBS Command Syntax appendix](https://pbs.proxmox.com/docs/command-syntax.html)
- [`proxmox-backup-manager` man page](https://pbs.proxmox.com/docs/proxmox-backup-manager/man1.html)
- [PBS Maintenance / Verification documentation](https://pbs.proxmox.com/docs/maintenance.html)
- [PBS Backup Storage documentation](https://pbs.proxmox.com/docs/storage.html)
- [PBS Managing Remotes documentation](https://pbs.proxmox.com/docs/managing-remotes.html)

## Issues Found

Several CLI commands referenced subcommands that do not exist on `proxmox-backup-manager` or had incorrect parameter names. Each was corrected to the form documented in the official command-syntax appendix.

1. **`proxmox-backup-manager datastore config <name>` does not exist.** The correct subcommand for viewing a datastore's configuration is `datastore show`. Changed `proxmox-backup-manager datastore config vm-backups` to `proxmox-backup-manager datastore show vm-backups`.

2. **`proxmox-backup-manager snapshots ...` does not exist.** Snapshot listing is a client-side operation. Replaced `proxmox-backup-manager snapshots vm/201/ubuntu-web-server` with the correct `proxmox-backup-client snapshot list [<group>] --repository ...` form (which supports an optional group such as `vm/201`).

3. **`proxmox-backup-manager status <datastore>` does not exist.** The `status` subcommand is on `proxmox-backup-client` and takes a `--repository` rather than a datastore positional argument. Replaced with `proxmox-backup-client status --repository pve-backup@pbs@<pbs-ip>:vm-backups`.

4. **`proxmox-backup-manager catalog dump ...` does not exist and the surrounding text misdescribed the operation.** `catalog dump` is a `proxmox-backup-client` subcommand and only dumps the catalog (file index) — it does not mount anything. Replaced with `proxmox-backup-client catalog dump --repository ... <snapshot>` and reworded the lead-in from "mounting backup archives" to "inspecting backup archives and restoring individual files" so it matches what the commands actually do. The subsequent `proxmox-backup-client restore` example was already correct and was retained as the way to extract an archive (e.g. a disk image) from a snapshot.

5. **`proxmox-backup-manager verify-job create` uses `--store`, not `--datastore`.** Per the documented syntax `verify-job create <id> --store <string> [OPTIONS]`, changed `--datastore vm-backups` to `--store vm-backups` and adjusted the comment to describe the command as scheduling a verification job (the next command in the block manually triggers verification).

The retention flags on `proxmox-backup-manager datastore update` (`--keep-last`, `--keep-daily`, `--keep-weekly`, `--keep-monthly`, `--keep-yearly`), the `gc-schedule` flag, the ACL update form (`/datastore/<name>` with `--auth-id` and `--role`), `proxmox-backup-manager cert info`, `proxmox-backup-manager verify <datastore>`, `pvesm add pbs ...`, and `vzdump --storage --mode snapshot --compress zstd` were all verified against the official documentation and left unchanged.

## Review Notes

- The post's title and `Ubuntu` tag are slightly misleading: PBS does not run on Ubuntu — it is installed from a dedicated Debian-based ISO. The body explicitly states this ("PBS is a separate product from Proxmox VE and runs on its own installation (based on Debian)"), so the technical content is internally consistent, but a future revision could either retitle the post or rework it as "install on existing Debian" using the [PBS on Debian instructions](https://pbs.proxmox.com/docs/installation.html#install-proxmox-backup-server-on-debian).
- The community repository line uses the Debian `bookworm` codename, which is correct for PBS 3.x. When PBS 4.x (`trixie`) becomes the recommended release, this codename should be updated.
- Retention can also be configured via standalone **prune jobs** (`proxmox-backup-manager prune-job create`) in recent PBS releases. The per-datastore `--keep-*` flags shown in the post still work and are still documented, but a future revision may want to mention prune jobs as the alternative for finer-grained per-group scheduling.
- The fingerprint command `proxmox-backup-manager cert info | grep Fingerprint` will return multiple fingerprint lines (the SHA-256 fingerprint is the one Proxmox VE expects); readers may need to pick the right one if they paste this output verbatim.
