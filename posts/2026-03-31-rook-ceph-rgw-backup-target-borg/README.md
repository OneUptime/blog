# How to Use Ceph RGW as Backup Target for Borg

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Borg, Backup, Object Storage, Deduplication, Encryption

Description: Use Ceph RGW with rclone as a transport layer to back up Borg repositories to your self-hosted Ceph object store for off-site deduplication and encryption.

---

## Overview

BorgBackup (Borg) is a deduplicating backup tool that traditionally uses SSH or local storage. By pairing Borg with rclone, you can store Borg repositories in Ceph RGW's S3-compatible object store, combining Borg's deduplication with Ceph's scalability.

## Architecture

The approach uses rclone to mount a Ceph RGW bucket as a local filesystem path. Borg treats this as a local repository, while data is transparently written to Ceph object storage.

## Step 1 - Create an RGW User and Bucket

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin user create \
  --uid=borg-backup \
  --display-name="Borg Backup User"

aws s3 mb s3://borg-repos \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc.cluster.local:80
```

## Step 2 - Install and Configure rclone

```bash
curl https://rclone.org/install.sh | sudo bash

mkdir -p ~/.config/rclone
cat > ~/.config/rclone/rclone.conf << 'EOF'
[ceph-rgw]
type = s3
provider = Ceph
access_key_id = YOUR_ACCESS_KEY
secret_access_key = YOUR_SECRET_KEY
endpoint = http://ceph-rgw.example.com:7480
EOF
```

## Step 3 - Mount the Ceph Bucket with rclone

```bash
mkdir -p /mnt/borg-ceph
rclone mount ceph-rgw:borg-repos /mnt/borg-ceph \
  --daemon \
  --allow-other \
  --vfs-cache-mode full \
  --vfs-cache-max-size 10G
```

Verify the mount:

```bash
df -h /mnt/borg-ceph
```

## Step 4 - Initialize a Borg Repository

```bash
export BORG_PASSPHRASE="your-strong-passphrase"
borg init --encryption=repokey /mnt/borg-ceph/myserver-repo
```

## Step 5 - Run a Backup

```bash
borg create --stats --progress \
  /mnt/borg-ceph/myserver-repo::"{hostname}-{now:%Y-%m-%d}" \
  /home /etc /var/www
```

## Step 6 - Automate with a Script

```bash
cat > /usr/local/bin/borg-backup.sh << 'EOF'
#!/bin/bash
export BORG_PASSPHRASE="your-strong-passphrase"
REPO=/mnt/borg-ceph/myserver-repo
ARCHIVE="${HOSTNAME}-$(date +%Y-%m-%d)"

borg create --stats "$REPO::$ARCHIVE" /home /etc /var/www

borg prune "$REPO" \
  --keep-daily 7 \
  --keep-weekly 4 \
  --keep-monthly 6

borg compact "$REPO"
EOF
chmod +x /usr/local/bin/borg-backup.sh
```

## Step 7 - Restore from Backup

```bash
borg list /mnt/borg-ceph/myserver-repo
mkdir -p /restore && cd /restore && borg extract /mnt/borg-ceph/myserver-repo::myserver-2026-03-31
```

## Summary

Using rclone as a FUSE mount bridges BorgBackup with Ceph RGW, giving you the best of both worlds - Borg's excellent deduplication and encryption with Ceph's scalable object storage. The rclone VFS cache ensures good write performance despite the object store backend. This approach keeps all backup data in your own Ceph cluster without requiring SSH access to a remote Borg server.
