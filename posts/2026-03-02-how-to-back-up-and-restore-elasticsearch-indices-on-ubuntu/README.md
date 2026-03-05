# How to Back Up and Restore Elasticsearch Indices on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Elasticsearch, Backup, Recovery, DevOps

Description: Learn how to back up and restore Elasticsearch indices on Ubuntu using the snapshot and restore API, with local filesystem and S3-compatible repository configurations.

---

Elasticsearch uses a snapshot and restore system for backups. Unlike traditional databases, you cannot just copy the data directory while Elasticsearch is running - the files are not in a consistent state. The snapshot API creates a consistent point-in-time backup that can be restored to the same cluster or a different one. This guide covers setting up repositories, creating snapshots, and restoring data.

## Understanding Elasticsearch Snapshots

A snapshot captures the state of one or more indices (or the entire cluster) at a point in time. Snapshots are incremental - the first snapshot captures everything, and subsequent snapshots only store what changed. Multiple snapshots share data, so storing many snapshots does not multiply storage usage.

Snapshots are stored in a **snapshot repository** - which can be a local filesystem, NFS mount, S3, GCS, Azure Blob Storage, or other backends via plugins.

## Setting Up a Filesystem Repository

For a local backup, create a dedicated directory and register it as a repository:

```bash
# Create the backup directory
sudo mkdir -p /var/backups/elasticsearch
sudo chown elasticsearch:elasticsearch /var/backups/elasticsearch
sudo chmod 750 /var/backups/elasticsearch
```

Tell Elasticsearch it is allowed to use this path. Edit the configuration:

```bash
sudo nano /etc/elasticsearch/elasticsearch.yml
```

Add:

```yaml
# Allow Elasticsearch to write snapshots to these paths
path.repo: ["/var/backups/elasticsearch"]
```

```bash
sudo systemctl restart elasticsearch
```

Register the repository via the API:

```bash
# Register the filesystem repository
curl -u elastic:your_password \
  --cacert /etc/elasticsearch/certs/http_ca.crt \
  -X PUT https://localhost:9200/_snapshot/my_backup \
  -H "Content-Type: application/json" \
  -d '{
    "type": "fs",
    "settings": {
      "location": "/var/backups/elasticsearch",
      "compress": true,
      "max_restore_bytes_per_sec": "500mb",
      "max_snapshot_bytes_per_sec": "500mb"
    }
  }'

# Verify the repository is accessible
curl -u elastic:your_password \
  --cacert /etc/elasticsearch/certs/http_ca.crt \
  https://localhost:9200/_snapshot/my_backup?pretty

# Verify the repository is usable (Elasticsearch checks it can read/write)
curl -u elastic:your_password \
  --cacert /etc/elasticsearch/certs/http_ca.crt \
  -X POST https://localhost:9200/_snapshot/my_backup/_verify?pretty
```

## Creating Snapshots

```bash
# Take a snapshot of all indices
curl -u elastic:your_password \
  --cacert /etc/elasticsearch/certs/http_ca.crt \
  -X PUT "https://localhost:9200/_snapshot/my_backup/snapshot_$(date +%Y%m%d_%H%M%S)?wait_for_completion=true" \
  -H "Content-Type: application/json" \
  -d '{
    "indices": "*",
    "ignore_unavailable": true,
    "include_global_state": true
  }'

# Take a snapshot of specific indices only
curl -u elastic:your_password \
  --cacert /etc/elasticsearch/certs/http_ca.crt \
  -X PUT "https://localhost:9200/_snapshot/my_backup/products_backup" \
  -H "Content-Type: application/json" \
  -d '{
    "indices": ["products", "orders", "customers"],
    "ignore_unavailable": true,
    "include_global_state": false
  }'

# Take a snapshot without waiting for completion (async)
curl -u elastic:your_password \
  --cacert /etc/elasticsearch/certs/http_ca.crt \
  -X PUT "https://localhost:9200/_snapshot/my_backup/daily_backup"
```

## Monitoring Snapshot Progress

```bash
# Check status of a running snapshot
curl -u elastic:your_password \
  --cacert /etc/elasticsearch/certs/http_ca.crt \
  "https://localhost:9200/_snapshot/my_backup/daily_backup/_status?pretty"

# Check all currently running snapshots
curl -u elastic:your_password \
  --cacert /etc/elasticsearch/certs/http_ca.crt \
  "https://localhost:9200/_snapshot/_status?pretty"

# List all snapshots in the repository
curl -u elastic:your_password \
  --cacert /etc/elasticsearch/certs/http_ca.crt \
  "https://localhost:9200/_snapshot/my_backup/*?pretty"

# Get details of a specific snapshot
curl -u elastic:your_password \
  --cacert /etc/elasticsearch/certs/http_ca.crt \
  "https://localhost:9200/_snapshot/my_backup/snapshot_20260301_000000?pretty"
```

The snapshot status shows state: `SUCCESS`, `IN_PROGRESS`, or `FAILED`.

## Automating Snapshots with a Script

```bash
sudo nano /usr/local/bin/elasticsearch-backup.sh
```

```bash
#!/bin/bash
# Elasticsearch backup script

ES_HOST="https://localhost:9200"
ES_USER="elastic"
ES_PASS="your_elastic_password"
REPO="my_backup"
SNAPSHOT_NAME="auto_$(date +%Y%m%d_%H%M%S)"
CERT="/etc/elasticsearch/certs/http_ca.crt"
LOG_FILE="/var/log/elasticsearch-backup.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "Starting snapshot: $SNAPSHOT_NAME"

# Create snapshot and wait for completion
RESPONSE=$(curl -s -w "\n%{http_code}" \
  --cacert "$CERT" \
  -u "$ES_USER:$ES_PASS" \
  -X PUT "$ES_HOST/_snapshot/$REPO/$SNAPSHOT_NAME?wait_for_completion=true" \
  -H "Content-Type: application/json" \
  -d '{
    "indices": "*",
    "ignore_unavailable": true,
    "include_global_state": false
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -1)

if [ "$HTTP_CODE" -eq 200 ]; then
    STATE=$(echo "$BODY" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['snapshot']['state'])")
    if [ "$STATE" == "SUCCESS" ]; then
        log "Snapshot $SNAPSHOT_NAME completed successfully"
    else
        log "ERROR: Snapshot $SNAPSHOT_NAME failed with state: $STATE"
        exit 1
    fi
else
    log "ERROR: HTTP $HTTP_CODE - $BODY"
    exit 1
fi

# Delete snapshots older than 30 days
log "Cleaning up old snapshots..."
curl -s --cacert "$CERT" -u "$ES_USER:$ES_PASS" \
  "$ES_HOST/_snapshot/$REPO/*?pretty" \
  | python3 -c "
import sys, json
from datetime import datetime, timezone, timedelta

data = json.load(sys.stdin)
cutoff = datetime.now(timezone.utc) - timedelta(days=30)

for snap in data.get('snapshots', []):
    start_time = datetime.fromisoformat(snap['start_time'].replace('Z', '+00:00'))
    if start_time < cutoff:
        print(snap['snapshot'])
" | while read snapshot_name; do
    log "Deleting old snapshot: $snapshot_name"
    curl -s -X DELETE \
      --cacert "$CERT" \
      -u "$ES_USER:$ES_PASS" \
      "$ES_HOST/_snapshot/$REPO/$snapshot_name" > /dev/null
done

log "Backup process complete"
```

```bash
sudo chmod +x /usr/local/bin/elasticsearch-backup.sh

# Add to cron for daily backups at 2am
echo "0 2 * * * root /usr/local/bin/elasticsearch-backup.sh" \
  | sudo tee /etc/cron.d/elasticsearch-backup
```

## Restoring from a Snapshot

```bash
# List available snapshots before restoring
curl -u elastic:your_password \
  --cacert /etc/elasticsearch/certs/http_ca.crt \
  "https://localhost:9200/_snapshot/my_backup/*?pretty"

# Close the index before restoring (if it exists)
curl -u elastic:your_password \
  --cacert /etc/elasticsearch/certs/http_ca.crt \
  -X POST "https://localhost:9200/products/_close"

# Restore a specific index from a snapshot
curl -u elastic:your_password \
  --cacert /etc/elasticsearch/certs/http_ca.crt \
  -X POST "https://localhost:9200/_snapshot/my_backup/products_backup/_restore" \
  -H "Content-Type: application/json" \
  -d '{
    "indices": ["products"],
    "ignore_unavailable": true,
    "include_global_state": false
  }'

# Restore with index renaming (useful for not overwriting existing data)
curl -u elastic:your_password \
  --cacert /etc/elasticsearch/certs/http_ca.crt \
  -X POST "https://localhost:9200/_snapshot/my_backup/snapshot_20260301_000000/_restore" \
  -H "Content-Type: application/json" \
  -d '{
    "indices": ["products"],
    "rename_pattern": "(.+)",
    "rename_replacement": "restored_$1"
  }'

# Restore all indices from a snapshot
curl -u elastic:your_password \
  --cacert /etc/elasticsearch/certs/http_ca.crt \
  -X POST "https://localhost:9200/_snapshot/my_backup/snapshot_20260301_000000/_restore?wait_for_completion=true" \
  -H "Content-Type: application/json" \
  -d '{
    "indices": "*",
    "ignore_unavailable": true,
    "include_global_state": false
  }'
```

## Monitoring Restore Progress

```bash
# Check restore status
curl -u elastic:your_password \
  --cacert /etc/elasticsearch/certs/http_ca.crt \
  "https://localhost:9200/_cat/recovery?v&active_only=true"

# Check the recovered bytes and total
curl -u elastic:your_password \
  --cacert /etc/elasticsearch/certs/http_ca.crt \
  "https://localhost:9200/products/_recovery?pretty"

# Check cluster health (should go from red -> yellow -> green)
curl -u elastic:your_password \
  --cacert /etc/elasticsearch/certs/http_ca.crt \
  "https://localhost:9200/_cluster/health?wait_for_status=green&timeout=60s"
```

## Using S3 as a Snapshot Repository

For production, use S3-compatible storage for offsite backups:

```bash
# Install the S3 repository plugin
sudo /usr/share/elasticsearch/bin/elasticsearch-plugin install repository-s3

# Configure S3 credentials using Elasticsearch keystore
sudo /usr/share/elasticsearch/bin/elasticsearch-keystore add s3.client.default.access_key
sudo /usr/share/elasticsearch/bin/elasticsearch-keystore add s3.client.default.secret_key

sudo systemctl restart elasticsearch

# Register the S3 repository
curl -u elastic:your_password \
  --cacert /etc/elasticsearch/certs/http_ca.crt \
  -X PUT https://localhost:9200/_snapshot/s3_backup \
  -H "Content-Type: application/json" \
  -d '{
    "type": "s3",
    "settings": {
      "bucket": "my-elasticsearch-backups",
      "region": "us-east-1",
      "base_path": "snapshots/production",
      "compress": true
    }
  }'
```

## Snapshot Lifecycle Management (SLM)

Automate snapshots with Elasticsearch's built-in SLM:

```bash
# Create an SLM policy
curl -u elastic:your_password \
  --cacert /etc/elasticsearch/certs/http_ca.crt \
  -X PUT https://localhost:9200/_slm/policy/daily-snapshots \
  -H "Content-Type: application/json" \
  -d '{
    "schedule": "0 30 1 * * ?",
    "name": "<daily-snap-{now/d}>",
    "repository": "my_backup",
    "config": {
      "indices": ["*"],
      "include_global_state": false
    },
    "retention": {
      "expire_after": "30d",
      "min_count": 5,
      "max_count": 50
    }
  }'

# Check SLM policy status
curl -u elastic:your_password \
  --cacert /etc/elasticsearch/certs/http_ca.crt \
  "https://localhost:9200/_slm/policy/daily-snapshots?pretty"

# Manually trigger a snapshot via SLM
curl -u elastic:your_password \
  --cacert /etc/elasticsearch/certs/http_ca.crt \
  -X POST https://localhost:9200/_slm/policy/daily-snapshots/_execute
```

Test your restore process regularly - a backup you have never restored is an untested backup.
