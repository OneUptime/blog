# How to Recover Deleted Objects from a Versioned S3 Bucket

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, S3, Data Recovery, Storage

Description: Step-by-step instructions for recovering accidentally deleted files from a versioned S3 bucket by removing delete markers and restoring previous versions.

---

Someone just deleted a critical file from your S3 bucket. Or maybe an automated process went rogue and wiped out a whole prefix. If your bucket has versioning enabled, take a deep breath - your data is almost certainly still there. S3 versioning doesn't actually delete objects when you run a delete command. It adds a "delete marker" that hides the object from normal listing, but all previous versions remain intact.

Let's walk through how to find and recover your data.

## Understanding What Happens on Delete

When you delete an object from a versioned bucket, S3 does two things:
1. Creates a special zero-byte object called a "delete marker" and makes it the "latest" version
2. Keeps all previous versions untouched

The object appears gone when you list the bucket normally, but it's still there.

```bash
# This creates a delete marker - it does NOT remove data
aws s3 rm s3://my-bucket/important-file.csv

# This shows nothing (the file appears deleted)
aws s3 ls s3://my-bucket/important-file.csv
```

## Step 1: Find the Delete Marker

First, list all versions of the deleted object to see the delete marker and the previous versions.

List versions of a deleted object:

```bash
# List all versions including delete markers
aws s3api list-object-versions \
    --bucket my-bucket \
    --prefix important-file.csv

# Cleaner output - show versions and delete markers separately
aws s3api list-object-versions \
    --bucket my-bucket \
    --prefix important-file.csv \
    --query "{
        DeleteMarkers: DeleteMarkers[*].{VersionId: VersionId, IsLatest: IsLatest, Modified: LastModified},
        Versions: Versions[*].{VersionId: VersionId, IsLatest: IsLatest, Modified: LastModified, Size: Size}
    }" \
    --output table
```

You'll see something like this:

```
DeleteMarkers:
  VersionId: del-marker-abc123    IsLatest: True    Modified: 2026-02-12T15:30:00Z

Versions:
  VersionId: ver-xyz789    IsLatest: False    Modified: 2026-02-12T10:00:00Z    Size: 1048576
  VersionId: ver-def456    IsLatest: False    Modified: 2026-02-11T08:00:00Z    Size: 1048000
```

The delete marker is the latest version. Your actual data is in the older versions.

## Step 2: Remove the Delete Marker

To "undelete" the object, remove the delete marker. This makes the most recent actual version become the current version again.

Remove the delete marker to restore the object:

```bash
# Delete the delete marker (this restores the object)
aws s3api delete-object \
    --bucket my-bucket \
    --key important-file.csv \
    --version-id del-marker-abc123

# Verify the object is back
aws s3 ls s3://my-bucket/important-file.csv

# Download it to make sure it's intact
aws s3 cp s3://my-bucket/important-file.csv ./recovered-file.csv
```

That's it. The object is back and accessible through normal S3 operations.

## Step 3: Restore a Specific Version

If you don't want the most recent version (maybe it was corrupted before deletion), you can restore a specific older version.

Restore a specific version of an object:

```bash
# Option 1: Copy a specific version back as the current version
aws s3api copy-object \
    --bucket my-bucket \
    --key important-file.csv \
    --copy-source "my-bucket/important-file.csv?versionId=ver-def456"

# Option 2: Download the specific version and re-upload
aws s3api get-object \
    --bucket my-bucket \
    --key important-file.csv \
    --version-id ver-def456 \
    ./recovered-file.csv

# Then upload it back
aws s3 cp ./recovered-file.csv s3://my-bucket/important-file.csv
```

## Recovering Multiple Deleted Files

If a whole directory was deleted, you need to find and remove all the delete markers. This requires a script.

Recover all recently deleted objects under a prefix:

```bash
#!/bin/bash
# recover-prefix.sh - Recover all deleted objects under a prefix

BUCKET="my-bucket"
PREFIX="data/reports/"

echo "Finding delete markers for prefix: $PREFIX"

# List all delete markers under the prefix
aws s3api list-object-versions \
    --bucket "$BUCKET" \
    --prefix "$PREFIX" \
    --query "DeleteMarkers[?IsLatest==\`true\`].[Key,VersionId]" \
    --output text | while read KEY VERSION_ID; do

    if [ -n "$KEY" ] && [ -n "$VERSION_ID" ]; then
        echo "Recovering: $KEY (delete marker: $VERSION_ID)"
        aws s3api delete-object \
            --bucket "$BUCKET" \
            --key "$KEY" \
            --version-id "$VERSION_ID"
    fi
done

echo "Recovery complete!"
```

For large-scale recovery (thousands of objects), batch the delete operations for better performance:

```bash
#!/bin/bash
# batch-recover.sh - Recover deleted objects using batch delete

BUCKET="my-bucket"
PREFIX="data/"
BATCH_SIZE=1000

echo "Collecting delete markers..."

# Build the batch delete JSON
aws s3api list-object-versions \
    --bucket "$BUCKET" \
    --prefix "$PREFIX" \
    --query "DeleteMarkers[?IsLatest==\`true\`].{Key: Key, VersionId: VersionId}" \
    --output json > /tmp/delete-markers.json

# Count total delete markers
TOTAL=$(python3 -c "import json; print(len(json.load(open('/tmp/delete-markers.json'))))")
echo "Found $TOTAL delete markers to remove"

# Process in batches of 1000 (S3 batch delete limit)
python3 << 'PYEOF'
import json
import subprocess

with open('/tmp/delete-markers.json') as f:
    markers = json.load(f)

batch_size = 1000
for i in range(0, len(markers), batch_size):
    batch = markers[i:i + batch_size]
    delete_request = {
        "Objects": [{"Key": m["Key"], "VersionId": m["VersionId"]} for m in batch],
        "Quiet": True
    }

    with open('/tmp/batch-delete.json', 'w') as f:
        json.dump(delete_request, f)

    result = subprocess.run([
        'aws', 's3api', 'delete-objects',
        '--bucket', 'my-bucket',
        '--delete', 'file:///tmp/batch-delete.json'
    ], capture_output=True, text=True)

    batch_num = (i // batch_size) + 1
    total_batches = (len(markers) + batch_size - 1) // batch_size
    print(f"Processed batch {batch_num}/{total_batches} ({len(batch)} objects)")

print("Recovery complete!")
PYEOF
```

## Recovering Objects Deleted Before a Specific Time

Sometimes you know approximately when the deletion happened and want to recover to a point in time.

Recover all objects to their state before a specific timestamp:

```bash
#!/bin/bash
# point-in-time-recover.sh - Restore objects to their state at a specific time

BUCKET="my-bucket"
PREFIX="data/"
RESTORE_TIME="2026-02-12T10:00:00Z"

echo "Restoring to state at: $RESTORE_TIME"

# Find the correct version for each object at the specified time
aws s3api list-object-versions \
    --bucket "$BUCKET" \
    --prefix "$PREFIX" \
    --output json > /tmp/all-versions.json

python3 << PYEOF
import json
from datetime import datetime

restore_time = datetime.fromisoformat("$RESTORE_TIME".replace("Z", "+00:00"))

with open("/tmp/all-versions.json") as f:
    data = json.load(f)

versions = data.get("Versions", [])
delete_markers = data.get("DeleteMarkers", [])

# Combine and group by key
all_entries = []
for v in versions:
    v["Type"] = "Version"
    all_entries.append(v)
for d in delete_markers:
    d["Type"] = "DeleteMarker"
    all_entries.append(d)

# Group by key
by_key = {}
for entry in all_entries:
    key = entry["Key"]
    if key not in by_key:
        by_key[key] = []
    by_key[key].append(entry)

# For each key, find the version that was current at restore_time
for key, entries in by_key.items():
    entries.sort(key=lambda x: x["LastModified"], reverse=True)

    for entry in entries:
        entry_time = datetime.fromisoformat(entry["LastModified"].replace("Z", "+00:00"))
        if entry_time <= restore_time:
            if entry["Type"] == "Version":
                print(f"Restore: {key} -> version {entry['VersionId']}")
            else:
                print(f"Skip (was deleted): {key}")
            break
PYEOF
```

## Prevention: Protecting Against Future Deletions

While recovery is possible, prevention is better.

Set up protections against accidental deletions:

```bash
# 1. Enable MFA Delete (requires root credentials)
# This requires MFA for permanent deletion of versions
aws s3api put-bucket-versioning \
    --bucket my-bucket \
    --versioning-configuration Status=Enabled,MFADelete=Enabled \
    --mfa "arn:aws:iam::123456789012:mfa/root-mfa 123456"

# 2. Use S3 Object Lock for critical data
aws s3api put-object-retention \
    --bucket my-bucket \
    --key critical-data.csv \
    --retention '{"Mode":"GOVERNANCE","RetainUntilDate":"2027-01-01T00:00:00Z"}'

# 3. Restrict delete permissions in IAM policies
# Only grant s3:DeleteObject to specific roles
```

## Using S3 Batch Operations for Large-Scale Recovery

For enterprise-scale recovery (millions of objects), use S3 Batch Operations. This is more efficient than scripting individual API calls.

```bash
# Create an inventory of delete markers to remove
# First, generate a CSV manifest of delete markers
aws s3api list-object-versions \
    --bucket my-bucket \
    --prefix "data/" \
    --query "DeleteMarkers[?IsLatest==\`true\`].[Key,VersionId]" \
    --output text | awk '{print "my-bucket," $1 "," $2}' > manifest.csv

# Upload the manifest
aws s3 cp manifest.csv s3://my-manifest-bucket/recovery-manifest.csv

# Create a Batch Operations job to delete the delete markers
# (This is done through the console or with a more detailed API call)
```

## Quick Reference

Here's a cheat sheet for common recovery operations:

```bash
# List all versions of an object
aws s3api list-object-versions --bucket BUCKET --prefix KEY

# Download a specific version
aws s3api get-object --bucket BUCKET --key KEY --version-id VID output.txt

# Remove a delete marker (undelete)
aws s3api delete-object --bucket BUCKET --key KEY --version-id DELETE_MARKER_VID

# Copy a specific version as the current version
aws s3api copy-object --bucket BUCKET --key KEY \
    --copy-source "BUCKET/KEY?versionId=VID"
```

The key takeaway: if you have [versioning enabled](https://oneuptime.com/blog/post/enable-s3-bucket-versioning/view), your data is recoverable. The "delete" operation in S3 versioned buckets is really just a "hide" operation. Your data is still there, waiting for you to bring it back.
