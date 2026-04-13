# How to Download Atlas Backup Snapshots

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Backup, Snapshot, Download

Description: Learn how to download MongoDB Atlas backup snapshots as compressed archives for local storage, manual restores, and compliance data exports.

---

## Why Download Atlas Backup Snapshots

Downloading snapshots lets you store backups outside Atlas for compliance requirements, restore to environments that cannot connect to Atlas, inspect data offline, or migrate clusters to self-hosted MongoDB. Atlas provides download links via the Admin API.

## Step 1: List Available Snapshots

Find the snapshot you want to download:

```bash
curl -u "PUBLIC_KEY:PRIVATE_KEY" \
  --digest \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/clusters/{clusterName}/backup/snapshots" \
  -H "Accept: application/json" \
  | python3 -c "
import json, sys
data = json.load(sys.stdin)
for s in data['results']:
    size_gb = s.get('storageSizeBytes', 0) / 1024**3
    print(f\"{s['id']} | {s['createdAt']} | {s['status']} | {size_gb:.2f} GB\")
" 2>/dev/null
```

## Step 2: Create a Download Restore Job

Initiate a download restore job to get a signed download URL:

```bash
curl -u "PUBLIC_KEY:PRIVATE_KEY" \
  --digest \
  -X POST \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/clusters/{clusterName}/backup/restoreJobs" \
  -H "Content-Type: application/json" \
  -d '{
    "deliveryType": "download",
    "snapshotId": "{snapshotId}"
  }'
```

Response includes a restore job ID and eventually a download URL.

## Step 3: Poll for the Download URL

The download URL is not immediately available. Poll until the job completes:

```bash
#!/bin/bash
GROUP_ID="{groupId}"
CLUSTER_NAME="{clusterName}"
JOB_ID="{restoreJobId}"
AUTH="PUBLIC_KEY:PRIVATE_KEY"

while true; do
  RESPONSE=$(curl -s -u "$AUTH" --digest \
    "https://cloud.mongodb.com/api/atlas/v1.0/groups/${GROUP_ID}/clusters/${CLUSTER_NAME}/backup/restoreJobs/${JOB_ID}")

  STATUS=$(echo "$RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('status',''))")
  URL=$(echo "$RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); urls=d.get('deliveryUrl',[]); print(urls[0] if urls else '')")

  echo "Status: $STATUS"

  if [ "$STATUS" = "COMPLETED" ] && [ -n "$URL" ]; then
    echo "Download URL: $URL"
    break
  fi

  sleep 30
done
```

## Step 4: Download the Snapshot Archive

Use `wget` or `curl` to download the snapshot. The URL is pre-signed and expires in 4 hours:

```bash
# Download with progress indicator
wget -O mongodb_snapshot_$(date +%Y%m%d).tar.gz \
  "https://storage.googleapis.com/...signed-url..."

# Or with curl
curl -L -o mongodb_snapshot_$(date +%Y%m%d).tar.gz \
  "https://storage.googleapis.com/...signed-url..."
```

Snapshots are downloaded as `.tar.gz` archives containing WiredTiger data files.

## Step 5: Inspect the Archive Contents

Before restoring, examine the archive structure:

```bash
# List archive contents without extracting
tar -tzf mongodb_snapshot_20240115.tar.gz | head -30
```

Expected output:

```text
./
./WiredTiger
./WiredTiger.lock
./WiredTiger.turtle
./WiredTiger.wt
./collection-0-*.wt
./index-1-*.wt
./sizeStorer.wt
```

## Step 6: Restore from the Downloaded Snapshot

To restore a downloaded snapshot to a self-hosted MongoDB instance:

```bash
# Stop the target mongod instance first
sudo systemctl stop mongod

# Extract to the data directory
sudo tar -xzf mongodb_snapshot_20240115.tar.gz \
  -C /var/lib/mongodb/ \
  --strip-components=1

# Fix ownership
sudo chown -R mongodb:mongodb /var/lib/mongodb/

# Restart MongoDB
sudo systemctl start mongod

# Verify startup
mongosh --eval "db.adminCommand({ ping: 1 })"
```

## Step 7: Automate Snapshot Downloads with a Script

Schedule regular offline copies:

```python
import requests
from requests.auth import HTTPDigestAuth
import subprocess
import os
from datetime import datetime

API_BASE = "https://cloud.mongodb.com/api/atlas/v1.0"
GROUP_ID = os.environ["ATLAS_GROUP_ID"]
CLUSTER = os.environ["ATLAS_CLUSTER_NAME"]
AUTH = HTTPDigestAuth(os.environ["ATLAS_PUBLIC_KEY"], os.environ["ATLAS_PRIVATE_KEY"])

def get_latest_snapshot():
    r = requests.get(
        f"{API_BASE}/groups/{GROUP_ID}/clusters/{CLUSTER}/backup/snapshots",
        auth=AUTH,
        params={"itemsPerPage": 1}
    )
    r.raise_for_status()
    return r.json()["results"][0]["id"]

snapshot_id = get_latest_snapshot()
print(f"Downloading snapshot: {snapshot_id}")
# Continue with restore job creation...
```

## Summary

Downloading MongoDB Atlas backup snapshots requires creating a DOWNLOAD restore job via the Admin API, polling for the signed download URL, downloading the `.tar.gz` archive before the URL expires (4 hours), and optionally restoring by extracting the WiredTiger data files to a MongoDB data directory. Automate the process to maintain offline backup copies for compliance or disaster recovery scenarios outside Atlas.
