# How to Backup etcd Before Kubernetes Cluster Upgrades

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, etcd, Backup

Description: Learn how to create reliable etcd backups before Kubernetes cluster upgrades with automated backup scripts, verification procedures, and disaster recovery strategies for production clusters.

---

Before upgrading any Kubernetes cluster, backing up etcd is non-negotiable. etcd stores all cluster state data including deployments, services, configurations, and secrets. Without a valid backup, a failed upgrade could result in complete data loss and an unrecoverable cluster.

## Understanding etcd Backup Importance

etcd is the brain of your Kubernetes cluster. Every resource you create, every configuration you apply, and every piece of cluster state lives in etcd. When you upgrade Kubernetes, you're potentially modifying how this data is stored and accessed. If something goes wrong, an etcd backup is your only path to recovery.

Managed Kubernetes services like EKS, GKE, and AKS automatically backup etcd for you. However, understanding how to backup and restore etcd is still valuable for self-managed clusters, disaster recovery planning, and migrating between clusters.

## Locating etcd in Your Cluster

First, identify where etcd is running and how to access it.

```bash
#!/bin/bash
# locate-etcd.sh

echo "Locating etcd in Kubernetes cluster..."

# Check if etcd runs as a pod (common in kubeadm clusters)
kubectl get pods -n kube-system | grep etcd

# Get etcd pod details
kubectl describe pod -n kube-system -l component=etcd

# For static pod etcd, check manifest location
if [ -f /etc/kubernetes/manifests/etcd.yaml ]; then
  echo "etcd manifest found: /etc/kubernetes/manifests/etcd.yaml"
  grep -A 5 "command:" /etc/kubernetes/manifests/etcd.yaml
fi

# Get etcd endpoints
kubectl get endpoints -n kube-system etcd -o yaml

# For external etcd, check kubeadm config
kubectl get cm -n kube-system kubeadm-config -o yaml | grep -A 10 etcd
```

## Installing etcdctl

The etcdctl command-line tool is required for etcd backups.

```bash
#!/bin/bash
# install-etcdctl.sh

ETCD_VERSION="v3.5.11"

echo "Installing etcdctl $ETCD_VERSION..."

# Download etcd release
wget https://github.com/etcd-io/etcd/releases/download/$ETCD_VERSION/etcd-$ETCD_VERSION-linux-amd64.tar.gz

# Extract and install
tar xzf etcd-$ETCD_VERSION-linux-amd64.tar.gz
sudo cp etcd-$ETCD_VERSION-linux-amd64/etcdctl /usr/local/bin/
sudo chmod +x /usr/local/bin/etcdctl

# Verify installation
etcdctl version

# Clean up
rm -rf etcd-$ETCD_VERSION-linux-amd64*

echo "etcdctl installed successfully"
```

## Creating etcd Snapshots

Create a snapshot of etcd data using etcdctl.

```bash
#!/bin/bash
# backup-etcd.sh

# Set etcd API version
export ETCDCTL_API=3

# etcd configuration (adjust for your cluster)
ETCD_ENDPOINTS="https://127.0.0.1:2379"
ETCD_CACERT="/etc/kubernetes/pki/etcd/ca.crt"
ETCD_CERT="/etc/kubernetes/pki/etcd/server.crt"
ETCD_KEY="/etc/kubernetes/pki/etcd/server.key"

# Backup location
BACKUP_DIR="/var/backups/etcd"
BACKUP_FILE="$BACKUP_DIR/etcd-snapshot-$(date +%Y%m%d-%H%M%S).db"

echo "Creating etcd snapshot..."

# Create backup directory
mkdir -p $BACKUP_DIR

# Create snapshot
etcdctl snapshot save $BACKUP_FILE \
  --endpoints=$ETCD_ENDPOINTS \
  --cacert=$ETCD_CACERT \
  --cert=$ETCD_CERT \
  --key=$ETCD_KEY

if [ $? -eq 0 ]; then
  echo "Snapshot created successfully: $BACKUP_FILE"

  # Verify snapshot
  etcdctl snapshot status $BACKUP_FILE \
    --write-out=table

  # Get snapshot size
  ls -lh $BACKUP_FILE
else
  echo "ERROR: Snapshot creation failed"
  exit 1
fi
```

For etcd running as a pod:

```bash
#!/bin/bash
# backup-etcd-pod.sh

ETCD_POD=$(kubectl get pods -n kube-system -l component=etcd -o jsonpath='{.items[0].metadata.name}')
BACKUP_FILE="/var/backups/etcd-snapshot-$(date +%Y%m%d-%H%M%S).db"

echo "Creating etcd snapshot from pod $ETCD_POD..."

kubectl exec -n kube-system $ETCD_POD -- sh -c \
  "ETCDCTL_API=3 etcdctl snapshot save /tmp/snapshot.db \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key"

# Copy snapshot from pod
kubectl cp -n kube-system $ETCD_POD:/tmp/snapshot.db $BACKUP_FILE

echo "Snapshot saved to $BACKUP_FILE"
```

## Verifying etcd Backups

Always verify backups to ensure they're valid and restorable.

```bash
#!/bin/bash
# verify-etcd-backup.sh

BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup-file>"
  exit 1
fi

echo "Verifying etcd snapshot: $BACKUP_FILE"

# Check file exists
if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: Backup file not found"
  exit 1
fi

# Verify snapshot integrity
etcdctl snapshot status $BACKUP_FILE --write-out=table

if [ $? -eq 0 ]; then
  echo "Snapshot verification successful"

  # Get detailed status
  etcdctl snapshot status $BACKUP_FILE --write-out=json | jq '.'

  # Check snapshot size
  size=$(stat -f%z "$BACKUP_FILE" 2>/dev/null || stat -c%s "$BACKUP_FILE")
  size_mb=$((size / 1024 / 1024))
  echo "Snapshot size: ${size_mb}MB"

  if [ $size_mb -lt 1 ]; then
    echo "WARNING: Snapshot seems too small (< 1MB)"
  fi
else
  echo "ERROR: Snapshot verification failed"
  exit 1
fi
```

## Automating etcd Backups

Create automated backup scripts that run before upgrades.

```bash
#!/bin/bash
# automated-etcd-backup.sh

set -e

BACKUP_DIR="/var/backups/etcd"
RETENTION_DAYS=30
BACKUP_FILE="$BACKUP_DIR/etcd-snapshot-$(date +%Y%m%d-%H%M%S).db"

# Logging
LOG_FILE="$BACKUP_DIR/backup.log"
exec 1> >(tee -a $LOG_FILE)
exec 2>&1

log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log "Starting automated etcd backup"

# Create backup directory
mkdir -p $BACKUP_DIR

# Set etcd variables
export ETCDCTL_API=3
ETCD_ENDPOINTS="https://127.0.0.1:2379"
ETCD_CACERT="/etc/kubernetes/pki/etcd/ca.crt"
ETCD_CERT="/etc/kubernetes/pki/etcd/server.crt"
ETCD_KEY="/etc/kubernetes/pki/etcd/server.key"

# Create snapshot
log "Creating snapshot..."
etcdctl snapshot save $BACKUP_FILE \
  --endpoints=$ETCD_ENDPOINTS \
  --cacert=$ETCD_CACERT \
  --cert=$ETCD_CERT \
  --key=$ETCD_KEY

if [ $? -ne 0 ]; then
  log "ERROR: Snapshot creation failed"
  exit 1
fi

log "Snapshot created: $BACKUP_FILE"

# Verify snapshot
log "Verifying snapshot..."
etcdctl snapshot status $BACKUP_FILE --write-out=table

if [ $? -ne 0 ]; then
  log "ERROR: Snapshot verification failed"
  exit 1
fi

# Compress backup
log "Compressing backup..."
gzip $BACKUP_FILE
BACKUP_FILE="${BACKUP_FILE}.gz"

# Upload to S3 (optional)
if command -v aws &> /dev/null; then
  log "Uploading to S3..."
  aws s3 cp $BACKUP_FILE s3://my-etcd-backups/$(basename $BACKUP_FILE)
fi

# Clean old backups
log "Cleaning old backups..."
find $BACKUP_DIR -name "etcd-snapshot-*.db.gz" -mtime +$RETENTION_DAYS -delete

log "Backup completed successfully"
```

Create a systemd timer for regular backups:

```ini
# /etc/systemd/system/etcd-backup.timer
[Unit]
Description=Automated etcd backup timer
Requires=etcd-backup.service

[Timer]
OnCalendar=daily
OnCalendar=*-*-* 02:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

```ini
# /etc/systemd/system/etcd-backup.service
[Unit]
Description=Automated etcd backup service

[Service]
Type=oneshot
ExecStart=/usr/local/bin/automated-etcd-backup.sh
User=root
```

Enable the timer:

```bash
sudo systemctl daemon-reload
sudo systemctl enable etcd-backup.timer
sudo systemctl start etcd-backup.timer
sudo systemctl status etcd-backup.timer
```

## Backing Up etcd Certificates

Along with data, backup the etcd certificates needed for restore operations.

```bash
#!/bin/bash
# backup-etcd-certs.sh

CERT_BACKUP_DIR="/var/backups/etcd-certs"
BACKUP_FILE="$CERT_BACKUP_DIR/etcd-certs-$(date +%Y%m%d-%H%M%S).tar.gz"

echo "Backing up etcd certificates..."

mkdir -p $CERT_BACKUP_DIR

# Backup all etcd certificates
tar czf $BACKUP_FILE \
  /etc/kubernetes/pki/etcd/ca.crt \
  /etc/kubernetes/pki/etcd/ca.key \
  /etc/kubernetes/pki/etcd/server.crt \
  /etc/kubernetes/pki/etcd/server.key \
  /etc/kubernetes/pki/etcd/peer.crt \
  /etc/kubernetes/pki/etcd/peer.key \
  /etc/kubernetes/pki/etcd/healthcheck-client.crt \
  /etc/kubernetes/pki/etcd/healthcheck-client.key

echo "Certificates backed up to: $BACKUP_FILE"

# Set secure permissions
chmod 600 $BACKUP_FILE

# List contents
tar tzf $BACKUP_FILE
```

## Pre-Upgrade Backup Checklist

Create a comprehensive pre-upgrade backup procedure.

```bash
#!/bin/bash
# pre-upgrade-backup.sh

set -e

BACKUP_ROOT="/var/backups/k8s-upgrade-$(date +%Y%m%d-%H%M%S)"
mkdir -p $BACKUP_ROOT

log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a $BACKUP_ROOT/backup.log
}

log "Starting pre-upgrade backup"

# 1. Backup etcd
log "Backing up etcd..."
export ETCDCTL_API=3
etcdctl snapshot save $BACKUP_ROOT/etcd-snapshot.db \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key

# 2. Verify etcd backup
log "Verifying etcd backup..."
etcdctl snapshot status $BACKUP_ROOT/etcd-snapshot.db --write-out=table

# 3. Backup certificates
log "Backing up certificates..."
tar czf $BACKUP_ROOT/pki-backup.tar.gz /etc/kubernetes/pki/

# 4. Backup kubeconfig
log "Backing up kubeconfig..."
cp /etc/kubernetes/admin.conf $BACKUP_ROOT/admin.conf

# 5. Export all resources
log "Exporting cluster resources..."
kubectl get all --all-namespaces -o yaml > $BACKUP_ROOT/all-resources.yaml
kubectl get cm --all-namespaces -o yaml > $BACKUP_ROOT/configmaps.yaml
kubectl get secrets --all-namespaces -o yaml > $BACKUP_ROOT/secrets.yaml
kubectl get pv -o yaml > $BACKUP_ROOT/persistent-volumes.yaml
kubectl get pvc --all-namespaces -o yaml > $BACKUP_ROOT/persistent-volume-claims.yaml

# 6. Backup node configuration
log "Backing up node configuration..."
kubectl get nodes -o yaml > $BACKUP_ROOT/nodes.yaml

# 7. Create cluster state snapshot
log "Creating cluster state snapshot..."
cat > $BACKUP_ROOT/cluster-info.txt << EOF
Backup Date: $(date)
Kubernetes Version: $(kubectl version --short)
Node Count: $(kubectl get nodes --no-headers | wc -l)
Pod Count: $(kubectl get pods --all-namespaces --no-headers | wc -l)
Service Count: $(kubectl get svc --all-namespaces --no-headers | wc -l)
EOF

# 8. Compress everything
log "Compressing backup..."
cd $(dirname $BACKUP_ROOT)
tar czf $(basename $BACKUP_ROOT).tar.gz $(basename $BACKUP_ROOT)

log "Backup complete: $BACKUP_ROOT.tar.gz"
log "Backup size: $(du -h $BACKUP_ROOT.tar.gz | cut -f1)"
```

## Testing etcd Restore

Periodically test your backup restore process to ensure it works.

```bash
#!/bin/bash
# test-etcd-restore.sh

BACKUP_FILE="$1"
TEST_DATA_DIR="/tmp/etcd-restore-test"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup-file>"
  exit 1
fi

echo "Testing etcd restore from: $BACKUP_FILE"

# Clean test directory
rm -rf $TEST_DATA_DIR
mkdir -p $TEST_DATA_DIR

# Restore snapshot to test location
export ETCDCTL_API=3
etcdctl snapshot restore $BACKUP_FILE \
  --data-dir=$TEST_DATA_DIR \
  --name=test-restore \
  --initial-cluster=test-restore=http://127.0.0.1:2380 \
  --initial-advertise-peer-urls=http://127.0.0.1:2380

if [ $? -eq 0 ]; then
  echo "Restore test successful"
  echo "Restored data size: $(du -sh $TEST_DATA_DIR | cut -f1)"

  # List restored files
  find $TEST_DATA_DIR -type f | head -10

  # Clean up
  rm -rf $TEST_DATA_DIR
  echo "Test cleanup complete"
else
  echo "ERROR: Restore test failed"
  exit 1
fi
```

## Storing Backups Securely

Implement proper backup storage and retention policies.

```bash
#!/bin/bash
# store-backup-securely.sh

BACKUP_FILE="$1"
S3_BUCKET="my-etcd-backups"
ENCRYPTION_KEY="/etc/etcd-backup-encryption-key"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup-file>"
  exit 1
fi

echo "Storing backup securely..."

# Encrypt backup
echo "Encrypting backup..."
openssl enc -aes-256-cbc -salt -pbkdf2 \
  -in $BACKUP_FILE \
  -out ${BACKUP_FILE}.enc \
  -pass file:$ENCRYPTION_KEY

# Upload to S3 with encryption
echo "Uploading to S3..."
aws s3 cp ${BACKUP_FILE}.enc \
  s3://$S3_BUCKET/$(basename ${BACKUP_FILE}.enc) \
  --server-side-encryption AES256 \
  --storage-class STANDARD_IA

# Upload to second region for redundancy
aws s3 cp ${BACKUP_FILE}.enc \
  s3://$S3_BUCKET-dr/$(basename ${BACKUP_FILE}.enc) \
  --region us-west-2 \
  --server-side-encryption AES256

# Clean up encrypted local file
rm ${BACKUP_FILE}.enc

echo "Backup stored securely"
```

Backing up etcd before Kubernetes upgrades is your insurance policy against disaster. By implementing automated backup procedures, regular verification, secure storage, and tested restore processes, you ensure that no matter what happens during an upgrade, you can always recover your cluster to a known good state.
