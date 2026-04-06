# How to Use Ceph RGW as Backup Target for Restic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Restic, Backup, S3, Object Storage, Deduplication

Description: Configure Ceph RGW as an S3-compatible repository backend for Restic, enabling deduplicating encrypted backups stored in your self-hosted Ceph cluster.

---

## Overview

Restic is a fast, encrypted, deduplicating backup program that supports S3-compatible object storage. Ceph RGW's S3 API makes it an ideal self-hosted repository for Restic backups. This guide shows you how to connect them.

## Prerequisites

- Rook-Ceph cluster with RGW deployed and accessible
- Restic installed on the backup client
- Network access from backup client to RGW endpoint

## Step 1 - Create an RGW User and Bucket

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin user create \
  --uid=restic-backup \
  --display-name="Restic Backup User"

# Create the bucket via S3 API
aws s3 mb s3://restic-repo \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc:80
```

## Step 2 - Configure Restic Environment Variables

Set up the environment for Restic to connect to Ceph RGW:

```bash
export AWS_ACCESS_KEY_ID=YOUR_ACCESS_KEY
export AWS_SECRET_ACCESS_KEY=YOUR_SECRET_KEY
export RESTIC_REPOSITORY=s3:http://ceph-rgw.example.com:7480/restic-repo
export RESTIC_PASSWORD=your-strong-repo-password
```

For persistent configuration, add these to a file:

```bash
cat > ~/.restic-env << 'EOF'
export AWS_ACCESS_KEY_ID=YOUR_ACCESS_KEY
export AWS_SECRET_ACCESS_KEY=YOUR_SECRET_KEY
export RESTIC_REPOSITORY=s3:http://ceph-rgw.example.com:7480/restic-repo
export RESTIC_PASSWORD=your-strong-repo-password
EOF
chmod 600 ~/.restic-env
```

## Step 3 - Initialize the Restic Repository

```bash
source ~/.restic-env
restic init
```

Expected output:

```text
created restic repository abc123 at s3:http://ceph-rgw.example.com:7480/restic-repo
```

## Step 4 - Run Your First Backup

```bash
restic backup /home /etc /var/lib/postgresql
```

Check snapshots in the repository:

```bash
restic snapshots
```

## Step 5 - Verify Backup Integrity

```bash
restic check
restic check --read-data-subset=10%
```

## Step 6 - Schedule Regular Backups

Create a systemd timer for automated backups:

```bash
cat > /etc/systemd/system/restic-backup.service << 'EOF'
[Unit]
Description=Restic Backup to Ceph RGW

[Service]
Type=oneshot
EnvironmentFile=/root/.restic-env
ExecStart=/usr/bin/restic backup /home /etc
ExecStartPost=/usr/bin/restic forget --keep-daily 7 --keep-weekly 4 --keep-monthly 12 --prune
EOF

cat > /etc/systemd/system/restic-backup.timer << 'EOF'
[Unit]
Description=Daily Restic Backup

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
EOF

systemctl enable --now restic-backup.timer
```

## Step 7 - Restore from Backup

```bash
restic restore latest --target /restore-dir
restic restore latest --target /restore-dir --include /home/user
```

## Summary

Ceph RGW combined with Restic gives you a powerful self-hosted backup solution with built-in deduplication, encryption, and integrity verification. By storing backups in your own Ceph cluster, you avoid cloud egress costs while maintaining full control over your backup data. The S3-compatible API requires no special drivers, making Restic work out of the box.
