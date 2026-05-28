# How to Build a Hybrid Storage Architecture Using Filestore and On-Premises NFS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Filestore, NFS, Hybrid Storage, Cloud Storage

Description: A practical guide to building a hybrid storage architecture that connects Google Cloud Filestore with on-premises NFS systems for seamless cross-environment data access.

---

When you are migrating workloads to the cloud gradually, one of the hardest challenges is file storage. Your on-premises applications write to NFS shares, and your cloud applications need access to the same data. You cannot just flip a switch - you need a transition period where both environments can read and write files seamlessly.

In this post, I will walk through building a hybrid storage architecture that connects Google Cloud Filestore with your existing on-premises NFS infrastructure, giving both sides transparent access to shared data.

## Architecture Overview

The architecture uses Filestore as the cloud-side NFS server and establishes synchronization with your on-premises NFS:

```mermaid
graph TB
    subgraph "On-Premises"
        APP1[Legacy App]
        NFS1[(NFS Server)]
        SYNC1[Rsync Agent]
    end

    subgraph "Google Cloud"
        APP2[Cloud Workload]
        FS[(Filestore Instance)]
        GKE[GKE Pods]
        SYNC2[Cloud Sync Agent]
    end

    APP1 --> NFS1
    NFS1 <-->|VPN/Interconnect| FS
    SYNC1 <-->|Bidirectional Sync| SYNC2
    APP2 --> FS
    GKE --> FS
    SYNC2 --> FS
```

## Step 1: Set Up Filestore

Create a Filestore instance in the same region as your cloud workloads:

```bash
# Create a cost-effective Filestore instance

gcloud filestore instances create hybrid-nfs \
  --zone=us-central1-a \
  --tier=BASIC_HDD \
  --file-share=name=shared_data,capacity=1TB \
  --network=name=hybrid-vpc

# For production workloads that need better performance
gcloud filestore instances create hybrid-nfs-prod \
  --zone=us-central1-a \
  --tier=BASIC_SSD \
  --file-share=name=shared_data,capacity=2.5TB \
  --network=name=hybrid-vpc
```

Get the Filestore IP address for mounting:

```bash
# Get the IP address of the Filestore instance
gcloud filestore instances describe hybrid-nfs \
  --zone=us-central1-a \
  --format="value(networks[0].ipAddresses[0])"
```

## Step 2: Mount Filestore on GCE Instances

Mount the Filestore share on your Compute Engine instances:

```bash
# Install NFS client utilities
sudo apt-get update && sudo apt-get install -y nfs-common

# Create the mount point
sudo mkdir -p /mnt/shared_data

# Mount the Filestore share
# Replace FILESTORE_IP with the actual IP from the previous step
sudo mount FILESTORE_IP:/shared_data /mnt/shared_data

# Make the mount persistent across reboots
echo "FILESTORE_IP:/shared_data /mnt/shared_data nfs defaults,_netdev 0 0" | sudo tee -a /etc/fstab
```

For GKE, use a PersistentVolume and PersistentVolumeClaim:

```yaml
# kubernetes/filestore-pv.yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: filestore-pv
spec:
  capacity:
    storage: 1Ti
  accessModes:
    - ReadWriteMany
  nfs:
    # Replace with your Filestore IP
    server: 10.0.0.2
    path: /shared_data
  mountOptions:
    - hard
    - nfsvers=3

---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: filestore-pvc
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: ""
  volumeName: filestore-pv
  resources:
    requests:
      storage: 1Ti

---
# Use the PVC in a deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-with-shared-storage
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: app
          image: gcr.io/my-project/my-app:latest
          volumeMounts:
            - name: shared-data
              mountPath: /data
      volumes:
        - name: shared-data
          persistentVolumeClaim:
            claimName: filestore-pvc
```

## Step 3: Establish Network Connectivity

For the hybrid storage to work, your on-premises network needs to reach the Filestore instance. Use Cloud VPN or Cloud Interconnect:

```bash
# If using Cloud VPN, make sure the Filestore subnet is included in the routes
# The Filestore IP must be routable from on-premises

# Verify the Filestore is on the correct VPC
gcloud filestore instances describe hybrid-nfs \
  --zone=us-central1-a \
  --format="yaml(networks)"

# If your VPC has restrictive egress rules, allow NFS traffic to the Filestore IP range
gcloud compute firewall-rules create allow-nfs-to-filestore \
  --network=hybrid-vpc \
  --direction=EGRESS \
  --destination-ranges=FILESTORE_RESERVED_IP_RANGE \
  --allow=tcp:111,tcp:2046,tcp:2049,tcp:2050,tcp:4045 \
  --description="Allow NFS traffic to Filestore"
```

## Step 4: Set Up Bidirectional Data Synchronization

For event-driven sync, run the watcher on the NFS server or on the host where writes happen, then copy changes to Filestore with `rsync`:

```bash
#!/bin/bash
# sync-agent.sh - Runs on the NFS server or on a host where writes happen
# Uses inotifywait to detect local filesystem changes and rsync to sync them

# Configuration
ONPREM_PATH="/exports/shared_data"
CLOUD_PATH="/mnt/filestore/shared_data"
LOG_FILE="/var/log/nfs-sync.log"
LOCK_FILE="/tmp/nfs-sync.lock"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

# Sync from on-premises to cloud
sync_to_cloud() {
    if [ ! -f "$LOCK_FILE" ]; then
        touch "$LOCK_FILE"
        rsync -avz --delete \
            --exclude='.sync-lock' \
            "$ONPREM_PATH/" "$CLOUD_PATH/" >> "$LOG_FILE" 2>&1
        rm -f "$LOCK_FILE"
        log "Synced on-premises changes to cloud"
    fi
}

# Watch for changes on the on-premises NFS mount
inotifywait -m -r -e modify,create,delete,move "$ONPREM_PATH" |
while read -r directory event filename; do
    log "Change detected: $directory $event $filename"
    sync_to_cloud
done
```

For a scheduled bidirectional sync, use `rsync --update` so the newer file wins when the same path exists on both sides:

```python
# sync_service.py - Scheduled bidirectional NFS sync service
import time
import subprocess
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('nfs-sync')

ONPREM_PATH = '/mnt/onprem_nfs/shared_data'
CLOUD_PATH = '/mnt/filestore/shared_data'

def sync():
    """Run bidirectional sync, keeping the newest copy of each file."""
    logger.info("Starting sync cycle")

    # Use rsync for efficient sync
    # On-premises to cloud
    subprocess.run([
        'rsync', '-avz', '--update',
        f'{ONPREM_PATH}/',
        f'{CLOUD_PATH}/'
    ], check=True)

    # Cloud to on-premises
    subprocess.run([
        'rsync', '-avz', '--update',
        f'{CLOUD_PATH}/',
        f'{ONPREM_PATH}/'
    ], check=True)

    logger.info("Sync cycle complete")

if __name__ == '__main__':
    while True:
        sync()
        time.sleep(30)  # Sync every 30 seconds
```

## Step 5: Monitor Storage Health

Set up monitoring for both the sync process and the Filestore instance:

```bash
# Monitor Filestore capacity and IOPS
gcloud monitoring dashboards create --config-from-file=- << 'EOF'
{
  "displayName": "Hybrid NFS Storage",
  "mosaicLayout": {
    "tiles": [
      {
        "widget": {
          "title": "Filestore Used Capacity",
          "xyChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"filestore_instance\" AND metric.type=\"file.googleapis.com/nfs/server/used_bytes_percent\""
                }
              }
            }]
          }
        }
      },
      {
        "widget": {
          "title": "Filestore Read/Write IOPS",
          "xyChart": {
            "dataSets": [
              {
                "timeSeriesQuery": {
                  "timeSeriesFilter": {
                    "filter": "resource.type=\"filestore_instance\" AND metric.type=\"file.googleapis.com/nfs/server/read_ops_count\""
                  }
                }
              },
              {
                "timeSeriesQuery": {
                  "timeSeriesFilter": {
                    "filter": "resource.type=\"filestore_instance\" AND metric.type=\"file.googleapis.com/nfs/server/write_ops_count\""
                  }
                }
              }
            ]
          }
        }
      }
    ]
  }
}
EOF

# Alert when Filestore capacity is getting full
gcloud monitoring policies create \
  --display-name="Filestore Capacity Alert" \
  --condition-display-name="Filestore over 80% full" \
  --condition-filter='resource.type="filestore_instance" AND metric.type="file.googleapis.com/nfs/server/used_bytes_percent"' \
  --duration=300s \
  --if='> 80' \
  --notification-channels=projects/my-project/notificationChannels/oncall
```

## Migration Strategy

Once you have the hybrid setup running, plan the full migration:

1. **Phase 1:** Run both systems in parallel with bidirectional sync
2. **Phase 2:** Migrate applications one by one to use Filestore directly
3. **Phase 3:** Switch the sync direction - cloud becomes primary, on-premises becomes the replica
4. **Phase 4:** Decommission the on-premises NFS once all applications are migrated

## Wrapping Up

A hybrid NFS architecture using Filestore and on-premises NFS gives you a smooth migration path without disrupting existing workloads. The key components are network connectivity via VPN or Interconnect, the Filestore instance as your cloud NFS server, and a reliable synchronization mechanism between the two systems.

Start with unidirectional sync from on-premises to cloud, test thoroughly, then enable bidirectional sync when you are confident in your conflict handling strategy. This approach lets you migrate at your own pace without a risky big-bang cutover.
