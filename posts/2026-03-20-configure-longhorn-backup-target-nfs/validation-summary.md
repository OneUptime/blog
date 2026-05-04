# Validation Summary: How to Configure Longhorn Backup Target to NFS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Longhorn (distributed block storage for Kubernetes)
- Kubernetes (kubectl, CRDs)
- NFS (Network File System, NFSv4)
- nfs-kernel-server (Debian/Ubuntu) / nfs-utils (RHEL/CentOS)
- systemd (service management)
- Longhorn RecurringJob CRD (longhorn.io/v1beta2)

## Sources Consulted
- Longhorn official documentation: Set Backup Target — https://longhorn.io/docs/1.7.0/snapshots-and-backups/backup-and-restore/set-backup-target/
- Longhorn official documentation: Scheduling Backups and Snapshots / RecurringJob CRD — https://longhorn.io/docs/1.7.0/snapshots-and-backups/scheduling-backups-and-snapshots/
- Linux NFS server documentation (`/etc/exports`, `exportfs`)
- systemd unit conventions for `nfs-kernel-server` (Debian/Ubuntu) and `nfs-client.target` (RHEL/CentOS)

## Issues Found
No technical issues found.

The following items were verified against official documentation:
- NFS backup target URL format `nfs://<host>:/<path>` matches Longhorn's documented format.
- `kubectl patch settings.longhorn.io backup-target` and `backup-target-credential-secret` are valid Longhorn settings names and the merge-patch syntax is correct.
- The `RecurringJob` CRD example uses the correct `apiVersion: longhorn.io/v1beta2`, `kind: RecurringJob`, and valid spec fields (`cron`, `task`, `retain`, `concurrency`, `labels`). `task: "backup"` is a valid task type.
- Volume label syntax `recurring-job.longhorn.io/<job-name>=enabled` matches Longhorn's documented labeling convention.
- NFS export options (`rw,sync,no_subtree_check,no_root_squash`) are valid `/etc/exports` options; `no_root_squash` is genuinely required because the Longhorn manager writes as root into the export.
- Port 2049 is the correct NFS port.
- Package names (`nfs-common`, `nfs-utils`, `nfs-kernel-server`) are correct for the listed distributions.
- The `backupvolumes.longhorn.io` CRD name is correct.
- The directory layout (`backupstore/volumes/<volume>/...`) matches Longhorn's backupstore layout.

## Review Notes
- Longhorn requires NFSv4 specifically. The post lists `nfs-common`/`nfs-utils` as a prerequisite (which provide NFSv4 support) but does not explicitly call out the NFSv4 requirement. The example `mount -t nfs ...` command relies on the modern Linux default of NFSv4; on older systems it could fall back to NFSv3 and silently mislead a reader. Not a technical error, but a future improvement could be to make the NFSv4 requirement explicit (e.g., `mount -t nfs4` or `-o nfsvers=4`) and mention Longhorn's optional `?nfsOptions=...` URL parameter for tuning client mount options.
- The post uses the legacy `settings.longhorn.io backup-target` setting. This still works in current Longhorn releases for backwards compatibility, though Longhorn 1.7+ has introduced a dedicated `BackupTarget` custom resource as the newer, preferred mechanism. This is a forward-looking note, not a current correctness issue.
- `chmod 777` on the export directory is permissive; a more restrictive permission scheme combined with `no_root_squash` would be safer in production. Functionally correct as written.
