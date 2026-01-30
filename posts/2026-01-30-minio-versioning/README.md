# How to Implement MinIO Versioning

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: MinIO, Object Storage, Versioning, Data Protection

Description: Enable object versioning in MinIO for data protection, recovery, and compliance with version lifecycle management and retention policies.

---

Object versioning is a critical feature for protecting data against accidental deletions and overwrites. MinIO provides S3-compatible versioning that maintains multiple variants of objects in the same bucket. This guide walks through implementing versioning in MinIO, from basic setup to advanced lifecycle management.

## Prerequisites

Before starting, ensure you have the following installed and configured:

- MinIO server running (standalone or distributed)
- MinIO client (mc) installed
- AWS CLI configured for MinIO (optional but useful)
- Python 3.8+ with boto3 library (for programmatic examples)

Set up your MinIO client alias to connect to your MinIO server.

```bash
# Configure mc alias for your MinIO server
mc alias set myminio http://localhost:9000 minioadmin minioadmin

# Verify the connection
mc admin info myminio
```

## Understanding Versioning in MinIO

MinIO versioning works similarly to Amazon S3 versioning. When enabled on a bucket, every object modification creates a new version instead of overwriting the existing object.

### Versioning States

A bucket can exist in one of three versioning states:

| State | Description | Behavior |
|-------|-------------|----------|
| Unversioned | Default state for new buckets | Objects are overwritten on PUT, permanently deleted on DELETE |
| Enabled | Versioning is active | Each PUT creates a new version, DELETE creates a delete marker |
| Suspended | Versioning was enabled but is now paused | New objects get null version ID, existing versions remain |

### Version ID Structure

MinIO generates unique version IDs for each object version. These IDs are:

- Automatically generated UUIDs
- Immutable once assigned
- Required for retrieving or deleting specific versions

## Enabling Versioning on Buckets

You can enable versioning using the MinIO client, AWS CLI, or programmatically.

### Using MinIO Client (mc)

Create a bucket and enable versioning with mc commands.

```bash
# Create a new bucket
mc mb myminio/my-versioned-bucket

# Enable versioning on the bucket
mc version enable myminio/my-versioned-bucket

# Verify versioning status
mc version info myminio/my-versioned-bucket
```

Expected output:

```
myminio/my-versioned-bucket versioning is enabled
```

### Using AWS CLI

The AWS CLI works with MinIO when configured with the correct endpoint.

```bash
# Configure AWS CLI for MinIO
export AWS_ACCESS_KEY_ID=minioadmin
export AWS_SECRET_ACCESS_KEY=minioadmin

# Enable versioning using AWS CLI
aws --endpoint-url http://localhost:9000 \
    s3api put-bucket-versioning \
    --bucket my-versioned-bucket \
    --versioning-configuration Status=Enabled

# Check versioning status
aws --endpoint-url http://localhost:9000 \
    s3api get-bucket-versioning \
    --bucket my-versioned-bucket
```

### Using Python (boto3)

For applications that need to manage versioning programmatically, use boto3.

```python
import boto3
from botocore.client import Config

# Initialize MinIO client using boto3
s3_client = boto3.client(
    's3',
    endpoint_url='http://localhost:9000',
    aws_access_key_id='minioadmin',
    aws_secret_access_key='minioadmin',
    config=Config(signature_version='s3v4'),
    region_name='us-east-1'
)

# Create bucket if it does not exist
bucket_name = 'my-versioned-bucket'
try:
    s3_client.create_bucket(Bucket=bucket_name)
    print(f"Bucket '{bucket_name}' created successfully")
except s3_client.exceptions.BucketAlreadyOwnedByYou:
    print(f"Bucket '{bucket_name}' already exists")

# Enable versioning
s3_client.put_bucket_versioning(
    Bucket=bucket_name,
    VersioningConfiguration={
        'Status': 'Enabled'
    }
)

# Verify versioning is enabled
response = s3_client.get_bucket_versioning(Bucket=bucket_name)
print(f"Versioning status: {response.get('Status', 'Not configured')}")
```

## Working with Object Versions

Once versioning is enabled, you can upload, retrieve, and manage multiple versions of objects.

### Uploading Objects and Creating Versions

Each PUT operation creates a new version. Upload the same key multiple times to create versions.

```python
import boto3
from botocore.client import Config

s3_client = boto3.client(
    's3',
    endpoint_url='http://localhost:9000',
    aws_access_key_id='minioadmin',
    aws_secret_access_key='minioadmin',
    config=Config(signature_version='s3v4'),
    region_name='us-east-1'
)

bucket_name = 'my-versioned-bucket'
object_key = 'config/settings.json'

# Upload version 1
version1_content = '{"version": 1, "debug": false}'
response1 = s3_client.put_object(
    Bucket=bucket_name,
    Key=object_key,
    Body=version1_content,
    ContentType='application/json'
)
print(f"Version 1 ID: {response1['VersionId']}")

# Upload version 2 (same key, different content)
version2_content = '{"version": 2, "debug": true, "log_level": "info"}'
response2 = s3_client.put_object(
    Bucket=bucket_name,
    Key=object_key,
    Body=version2_content,
    ContentType='application/json'
)
print(f"Version 2 ID: {response2['VersionId']}")

# Upload version 3
version3_content = '{"version": 3, "debug": true, "log_level": "debug", "metrics": true}'
response3 = s3_client.put_object(
    Bucket=bucket_name,
    Key=object_key,
    Body=version3_content,
    ContentType='application/json'
)
print(f"Version 3 ID: {response3['VersionId']}")
```

### Listing Object Versions

Retrieve all versions of objects in a bucket or for a specific key prefix.

```python
import boto3
from botocore.client import Config
from datetime import datetime

s3_client = boto3.client(
    's3',
    endpoint_url='http://localhost:9000',
    aws_access_key_id='minioadmin',
    aws_secret_access_key='minioadmin',
    config=Config(signature_version='s3v4'),
    region_name='us-east-1'
)

bucket_name = 'my-versioned-bucket'

# List all versions in the bucket
response = s3_client.list_object_versions(Bucket=bucket_name)

print("Object Versions:")
print("-" * 80)

# Process versions (actual object data)
if 'Versions' in response:
    for version in response['Versions']:
        key = version['Key']
        version_id = version['VersionId']
        is_latest = version['IsLatest']
        size = version['Size']
        last_modified = version['LastModified']

        latest_marker = " (LATEST)" if is_latest else ""
        print(f"Key: {key}")
        print(f"  Version ID: {version_id}{latest_marker}")
        print(f"  Size: {size} bytes")
        print(f"  Last Modified: {last_modified}")
        print()

# Process delete markers (tombstones for deleted objects)
if 'DeleteMarkers' in response:
    print("\nDelete Markers:")
    print("-" * 80)
    for marker in response['DeleteMarkers']:
        key = marker['Key']
        version_id = marker['VersionId']
        is_latest = marker['IsLatest']

        print(f"Key: {key}")
        print(f"  Delete Marker ID: {version_id}")
        print(f"  Is Latest: {is_latest}")
        print()
```

### Listing Versions for a Specific Object

Filter versions by prefix to get versions of a specific object.

```python
import boto3
from botocore.client import Config

s3_client = boto3.client(
    's3',
    endpoint_url='http://localhost:9000',
    aws_access_key_id='minioadmin',
    aws_secret_access_key='minioadmin',
    config=Config(signature_version='s3v4'),
    region_name='us-east-1'
)

bucket_name = 'my-versioned-bucket'
object_key = 'config/settings.json'

# List versions for a specific object using prefix
response = s3_client.list_object_versions(
    Bucket=bucket_name,
    Prefix=object_key
)

print(f"Versions for '{object_key}':")
print("-" * 60)

versions = response.get('Versions', [])
for idx, version in enumerate(versions, 1):
    version_id = version['VersionId']
    is_latest = version['IsLatest']
    size = version['Size']
    last_modified = version['LastModified']

    status = "CURRENT" if is_latest else "PREVIOUS"
    print(f"{idx}. [{status}] Version: {version_id[:16]}...")
    print(f"   Size: {size} bytes | Modified: {last_modified}")
    print()
```

Using mc to list versions from the command line.

```bash
# List all versions in a bucket
mc ls --versions myminio/my-versioned-bucket

# List versions for a specific object
mc ls --versions myminio/my-versioned-bucket/config/settings.json
```

## Retrieving Specific Versions

Access any version of an object by specifying its version ID.

### Using Python

```python
import boto3
from botocore.client import Config

s3_client = boto3.client(
    's3',
    endpoint_url='http://localhost:9000',
    aws_access_key_id='minioadmin',
    aws_secret_access_key='minioadmin',
    config=Config(signature_version='s3v4'),
    region_name='us-east-1'
)

bucket_name = 'my-versioned-bucket'
object_key = 'config/settings.json'

# First, get all versions to find the version IDs
versions_response = s3_client.list_object_versions(
    Bucket=bucket_name,
    Prefix=object_key
)

versions = versions_response.get('Versions', [])

# Retrieve each version and display its content
for version in versions:
    version_id = version['VersionId']
    is_latest = version['IsLatest']

    # Get the specific version
    obj_response = s3_client.get_object(
        Bucket=bucket_name,
        Key=object_key,
        VersionId=version_id
    )

    content = obj_response['Body'].read().decode('utf-8')

    status = "CURRENT" if is_latest else "HISTORICAL"
    print(f"[{status}] Version: {version_id[:16]}...")
    print(f"Content: {content}")
    print("-" * 40)
```

### Using mc

```bash
# Download a specific version
mc cp --version-id "your-version-id-here" \
    myminio/my-versioned-bucket/config/settings.json \
    ./settings-old.json

# View content of a specific version
mc cat --version-id "your-version-id-here" \
    myminio/my-versioned-bucket/config/settings.json
```

### Using AWS CLI

```bash
# Get a specific version
aws --endpoint-url http://localhost:9000 \
    s3api get-object \
    --bucket my-versioned-bucket \
    --key config/settings.json \
    --version-id "your-version-id-here" \
    output-file.json
```

## Deleting Objects and Understanding Delete Markers

Deleting objects in a versioned bucket behaves differently than in non-versioned buckets.

### Simple DELETE (Creates a Delete Marker)

A DELETE request without a version ID creates a delete marker instead of permanently removing the object.

```python
import boto3
from botocore.client import Config

s3_client = boto3.client(
    's3',
    endpoint_url='http://localhost:9000',
    aws_access_key_id='minioadmin',
    aws_secret_access_key='minioadmin',
    config=Config(signature_version='s3v4'),
    region_name='us-east-1'
)

bucket_name = 'my-versioned-bucket'
object_key = 'config/settings.json'

# Delete without version ID - creates a delete marker
response = s3_client.delete_object(
    Bucket=bucket_name,
    Key=object_key
)

print(f"Delete marker created: {response.get('DeleteMarker', False)}")
print(f"Delete marker version ID: {response.get('VersionId', 'N/A')}")

# The object now appears deleted, but all versions still exist
# Trying to GET the object will return a 404
try:
    s3_client.get_object(Bucket=bucket_name, Key=object_key)
except s3_client.exceptions.NoSuchKey:
    print("Object appears deleted (404), but versions are preserved")
```

### Understanding Delete Markers

Delete markers act as placeholders indicating an object was deleted. They have the following characteristics:

| Property | Description |
|----------|-------------|
| Zero bytes | Delete markers contain no data |
| Version ID | Each delete marker has its own version ID |
| Is Latest | When created, the delete marker becomes the latest version |
| Recoverable | Remove the delete marker to restore the object |

### Permanently Deleting a Specific Version

To permanently remove a version, specify the version ID in the DELETE request.

```python
import boto3
from botocore.client import Config

s3_client = boto3.client(
    's3',
    endpoint_url='http://localhost:9000',
    aws_access_key_id='minioadmin',
    aws_secret_access_key='minioadmin',
    config=Config(signature_version='s3v4'),
    region_name='us-east-1'
)

bucket_name = 'my-versioned-bucket'
object_key = 'config/settings.json'

# List versions to find the one to delete
response = s3_client.list_object_versions(
    Bucket=bucket_name,
    Prefix=object_key
)

# Find and delete a specific version (e.g., the oldest one)
versions = response.get('Versions', [])
if versions:
    # Get the oldest version (last in the list, sorted by newest first)
    oldest_version = versions[-1]
    version_id = oldest_version['VersionId']

    # Permanently delete this specific version
    delete_response = s3_client.delete_object(
        Bucket=bucket_name,
        Key=object_key,
        VersionId=version_id
    )

    print(f"Permanently deleted version: {version_id}")
    print(f"This operation cannot be undone")
```

### Removing a Delete Marker to Restore an Object

If the latest version is a delete marker, remove it to "undelete" the object.

```python
import boto3
from botocore.client import Config

s3_client = boto3.client(
    's3',
    endpoint_url='http://localhost:9000',
    aws_access_key_id='minioadmin',
    aws_secret_access_key='minioadmin',
    config=Config(signature_version='s3v4'),
    region_name='us-east-1'
)

bucket_name = 'my-versioned-bucket'
object_key = 'config/settings.json'

# List all versions including delete markers
response = s3_client.list_object_versions(
    Bucket=bucket_name,
    Prefix=object_key
)

# Find the delete marker (if it is the latest)
delete_markers = response.get('DeleteMarkers', [])
for marker in delete_markers:
    if marker['IsLatest']:
        delete_marker_version_id = marker['VersionId']

        # Remove the delete marker
        s3_client.delete_object(
            Bucket=bucket_name,
            Key=object_key,
            VersionId=delete_marker_version_id
        )

        print(f"Removed delete marker: {delete_marker_version_id}")
        print("Object is now restored - the previous version is accessible")
        break
```

### Bulk Version Deletion

Delete multiple versions or delete markers in a single request.

```python
import boto3
from botocore.client import Config

s3_client = boto3.client(
    's3',
    endpoint_url='http://localhost:9000',
    aws_access_key_id='minioadmin',
    aws_secret_access_key='minioadmin',
    config=Config(signature_version='s3v4'),
    region_name='us-east-1'
)

bucket_name = 'my-versioned-bucket'
object_key = 'config/settings.json'

# Get all versions for the object
response = s3_client.list_object_versions(
    Bucket=bucket_name,
    Prefix=object_key
)

# Build the delete request for all versions except the latest
objects_to_delete = []

versions = response.get('Versions', [])
for version in versions:
    if not version['IsLatest']:  # Keep the current version
        objects_to_delete.append({
            'Key': version['Key'],
            'VersionId': version['VersionId']
        })

# Include delete markers if any
delete_markers = response.get('DeleteMarkers', [])
for marker in delete_markers:
    objects_to_delete.append({
        'Key': marker['Key'],
        'VersionId': marker['VersionId']
    })

# Perform bulk delete
if objects_to_delete:
    delete_response = s3_client.delete_objects(
        Bucket=bucket_name,
        Delete={
            'Objects': objects_to_delete,
            'Quiet': False
        }
    )

    deleted_count = len(delete_response.get('Deleted', []))
    error_count = len(delete_response.get('Errors', []))

    print(f"Deleted {deleted_count} versions/markers")
    if error_count > 0:
        print(f"Failed to delete {error_count} items")
        for error in delete_response['Errors']:
            print(f"  Error: {error['Key']} - {error['Message']}")
else:
    print("No old versions to delete")
```

## Lifecycle Rules for Version Management

Lifecycle rules automate version cleanup, reducing storage costs while maintaining compliance requirements.

### Creating a Lifecycle Policy

Configure rules to automatically expire old versions after a specified number of days.

```python
import boto3
from botocore.client import Config

s3_client = boto3.client(
    's3',
    endpoint_url='http://localhost:9000',
    aws_access_key_id='minioadmin',
    aws_secret_access_key='minioadmin',
    config=Config(signature_version='s3v4'),
    region_name='us-east-1'
)

bucket_name = 'my-versioned-bucket'

# Define lifecycle configuration
lifecycle_config = {
    'Rules': [
        {
            'ID': 'expire-old-versions',
            'Status': 'Enabled',
            'Filter': {
                'Prefix': ''  # Apply to all objects
            },
            'NoncurrentVersionExpiration': {
                'NoncurrentDays': 30  # Delete non-current versions after 30 days
            }
        },
        {
            'ID': 'cleanup-delete-markers',
            'Status': 'Enabled',
            'Filter': {
                'Prefix': ''
            },
            'Expiration': {
                'ExpiredObjectDeleteMarker': True  # Remove orphaned delete markers
            }
        },
        {
            'ID': 'expire-logs-versions',
            'Status': 'Enabled',
            'Filter': {
                'Prefix': 'logs/'  # Only apply to logs/ prefix
            },
            'NoncurrentVersionExpiration': {
                'NoncurrentDays': 7  # Delete old log versions after 7 days
            }
        }
    ]
}

# Apply the lifecycle configuration
s3_client.put_bucket_lifecycle_configuration(
    Bucket=bucket_name,
    LifecycleConfiguration=lifecycle_config
)

print("Lifecycle configuration applied successfully")
```

### Viewing Current Lifecycle Rules

```python
import boto3
from botocore.client import Config
import json

s3_client = boto3.client(
    's3',
    endpoint_url='http://localhost:9000',
    aws_access_key_id='minioadmin',
    aws_secret_access_key='minioadmin',
    config=Config(signature_version='s3v4'),
    region_name='us-east-1'
)

bucket_name = 'my-versioned-bucket'

try:
    response = s3_client.get_bucket_lifecycle_configuration(Bucket=bucket_name)

    print("Current Lifecycle Rules:")
    print("-" * 60)

    for rule in response.get('Rules', []):
        print(f"Rule ID: {rule['ID']}")
        print(f"  Status: {rule['Status']}")

        # Show filter
        filter_config = rule.get('Filter', {})
        prefix = filter_config.get('Prefix', '')
        print(f"  Prefix: '{prefix}' (empty means all objects)")

        # Show version expiration
        if 'NoncurrentVersionExpiration' in rule:
            days = rule['NoncurrentVersionExpiration']['NoncurrentDays']
            print(f"  Non-current version expiration: {days} days")

        # Show delete marker cleanup
        if 'Expiration' in rule:
            if rule['Expiration'].get('ExpiredObjectDeleteMarker'):
                print("  Cleanup expired delete markers: Yes")

        print()

except s3_client.exceptions.ClientError as e:
    if e.response['Error']['Code'] == 'NoSuchLifecycleConfiguration':
        print("No lifecycle configuration exists for this bucket")
    else:
        raise
```

### Using mc for Lifecycle Management

```bash
# View current lifecycle rules
mc ilm rule ls myminio/my-versioned-bucket

# Add a rule to expire non-current versions after 30 days
mc ilm rule add --noncurrent-expire-days 30 \
    --id "expire-old-versions" \
    myminio/my-versioned-bucket

# Add a rule for a specific prefix
mc ilm rule add --noncurrent-expire-days 7 \
    --id "expire-logs" \
    --prefix "logs/" \
    myminio/my-versioned-bucket

# Remove a lifecycle rule
mc ilm rule rm --id "expire-old-versions" myminio/my-versioned-bucket
```

### Advanced Lifecycle Configuration with Version Limits

Keep only a specific number of versions for each object.

```python
import boto3
from botocore.client import Config

s3_client = boto3.client(
    's3',
    endpoint_url='http://localhost:9000',
    aws_access_key_id='minioadmin',
    aws_secret_access_key='minioadmin',
    config=Config(signature_version='s3v4'),
    region_name='us-east-1'
)

bucket_name = 'my-versioned-bucket'

# Configuration to keep only the 5 most recent versions
lifecycle_config = {
    'Rules': [
        {
            'ID': 'keep-latest-versions',
            'Status': 'Enabled',
            'Filter': {
                'Prefix': ''
            },
            'NoncurrentVersionExpiration': {
                'NewerNoncurrentVersions': 5,  # Keep 5 non-current versions
                'NoncurrentDays': 1  # Delete excess after 1 day
            }
        }
    ]
}

s3_client.put_bucket_lifecycle_configuration(
    Bucket=bucket_name,
    LifecycleConfiguration=lifecycle_config
)

print("Version limit lifecycle rule applied")
print("MinIO will keep the current version plus 5 non-current versions")
```

## Practical Examples

### Example 1: Configuration File Version Control

Track changes to application configuration files with full history.

```python
import boto3
from botocore.client import Config
import json
from datetime import datetime

class ConfigVersionManager:
    def __init__(self, endpoint, access_key, secret_key, bucket):
        self.s3 = boto3.client(
            's3',
            endpoint_url=endpoint,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            config=Config(signature_version='s3v4'),
            region_name='us-east-1'
        )
        self.bucket = bucket

    def save_config(self, config_name, config_data, comment=""):
        """Save a configuration with metadata"""
        key = f"configs/{config_name}.json"

        # Add metadata about this version
        metadata = {
            'comment': comment,
            'saved-at': datetime.utcnow().isoformat()
        }

        response = self.s3.put_object(
            Bucket=self.bucket,
            Key=key,
            Body=json.dumps(config_data, indent=2),
            ContentType='application/json',
            Metadata=metadata
        )

        return response['VersionId']

    def get_config(self, config_name, version_id=None):
        """Retrieve a configuration, optionally by version"""
        key = f"configs/{config_name}.json"

        params = {'Bucket': self.bucket, 'Key': key}
        if version_id:
            params['VersionId'] = version_id

        response = self.s3.get_object(**params)

        return {
            'data': json.loads(response['Body'].read().decode('utf-8')),
            'version_id': response['VersionId'],
            'metadata': response.get('Metadata', {}),
            'last_modified': response['LastModified']
        }

    def list_config_versions(self, config_name):
        """List all versions of a configuration"""
        key = f"configs/{config_name}.json"

        response = self.s3.list_object_versions(
            Bucket=self.bucket,
            Prefix=key
        )

        versions = []
        for v in response.get('Versions', []):
            # Get metadata for each version
            obj = self.s3.head_object(
                Bucket=self.bucket,
                Key=v['Key'],
                VersionId=v['VersionId']
            )

            versions.append({
                'version_id': v['VersionId'],
                'is_latest': v['IsLatest'],
                'last_modified': v['LastModified'],
                'size': v['Size'],
                'comment': obj.get('Metadata', {}).get('comment', '')
            })

        return versions

    def rollback_config(self, config_name, version_id):
        """Rollback to a specific version by copying it as the new latest"""
        key = f"configs/{config_name}.json"

        # Get the old version
        old_config = self.get_config(config_name, version_id)

        # Save it as a new version with rollback comment
        new_version_id = self.save_config(
            config_name,
            old_config['data'],
            comment=f"Rollback to version {version_id[:8]}..."
        )

        return new_version_id


# Usage example
manager = ConfigVersionManager(
    endpoint='http://localhost:9000',
    access_key='minioadmin',
    secret_key='minioadmin',
    bucket='my-versioned-bucket'
)

# Save initial configuration
v1 = manager.save_config('database', {
    'host': 'localhost',
    'port': 5432,
    'pool_size': 10
}, comment="Initial database config")
print(f"Saved version 1: {v1[:16]}...")

# Update configuration
v2 = manager.save_config('database', {
    'host': 'db.production.local',
    'port': 5432,
    'pool_size': 25,
    'ssl': True
}, comment="Production settings")
print(f"Saved version 2: {v2[:16]}...")

# List all versions
print("\nConfiguration history:")
for v in manager.list_config_versions('database'):
    status = "CURRENT" if v['is_latest'] else "OLD"
    print(f"  [{status}] {v['version_id'][:16]}... - {v['comment']}")
```

### Example 2: Document Audit Trail

Maintain audit trails for document modifications.

```python
import boto3
from botocore.client import Config
from datetime import datetime
import hashlib

def create_audit_trail(s3_client, bucket, object_key):
    """Generate an audit trail for all versions of an object"""

    response = s3_client.list_object_versions(
        Bucket=bucket,
        Prefix=object_key
    )

    audit_entries = []

    # Process all versions
    for version in response.get('Versions', []):
        # Get detailed metadata
        head = s3_client.head_object(
            Bucket=bucket,
            Key=version['Key'],
            VersionId=version['VersionId']
        )

        # Get content for hash
        obj = s3_client.get_object(
            Bucket=bucket,
            Key=version['Key'],
            VersionId=version['VersionId']
        )
        content = obj['Body'].read()
        content_hash = hashlib.sha256(content).hexdigest()

        audit_entries.append({
            'action': 'MODIFY',
            'version_id': version['VersionId'],
            'timestamp': version['LastModified'].isoformat(),
            'size_bytes': version['Size'],
            'content_sha256': content_hash,
            'is_current': version['IsLatest'],
            'etag': version['ETag'].strip('"'),
            'metadata': head.get('Metadata', {})
        })

    # Process delete markers
    for marker in response.get('DeleteMarkers', []):
        audit_entries.append({
            'action': 'DELETE',
            'version_id': marker['VersionId'],
            'timestamp': marker['LastModified'].isoformat(),
            'is_current': marker['IsLatest']
        })

    # Sort by timestamp
    audit_entries.sort(key=lambda x: x['timestamp'])

    return audit_entries


# Initialize client
s3_client = boto3.client(
    's3',
    endpoint_url='http://localhost:9000',
    aws_access_key_id='minioadmin',
    aws_secret_access_key='minioadmin',
    config=Config(signature_version='s3v4'),
    region_name='us-east-1'
)

# Generate audit trail
audit = create_audit_trail(
    s3_client,
    'my-versioned-bucket',
    'configs/database.json'
)

print("Audit Trail")
print("=" * 70)
for entry in audit:
    print(f"Timestamp: {entry['timestamp']}")
    print(f"  Action: {entry['action']}")
    print(f"  Version: {entry['version_id'][:16]}...")
    if entry['action'] == 'MODIFY':
        print(f"  Size: {entry['size_bytes']} bytes")
        print(f"  SHA256: {entry['content_sha256'][:32]}...")
    print(f"  Current: {entry.get('is_current', False)}")
    print()
```

### Example 3: Automated Version Cleanup Script

A script to clean up old versions while keeping a minimum number.

```python
import boto3
from botocore.client import Config
from datetime import datetime, timezone
from collections import defaultdict

def cleanup_old_versions(
    s3_client,
    bucket,
    prefix='',
    keep_versions=3,
    older_than_days=30,
    dry_run=True
):
    """
    Clean up old object versions while keeping a minimum number

    Parameters:
    - keep_versions: Minimum number of versions to keep per object
    - older_than_days: Only delete versions older than this
    - dry_run: If True, only report what would be deleted
    """

    # Get all versions
    paginator = s3_client.get_paginator('list_object_versions')

    # Group versions by object key
    objects = defaultdict(lambda: {'versions': [], 'delete_markers': []})

    for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
        for version in page.get('Versions', []):
            objects[version['Key']]['versions'].append(version)
        for marker in page.get('DeleteMarkers', []):
            objects[marker['Key']]['delete_markers'].append(marker)

    # Calculate cutoff date
    cutoff = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    cutoff = cutoff.replace(day=cutoff.day - older_than_days)

    to_delete = []

    for key, data in objects.items():
        versions = data['versions']

        # Sort versions by date (newest first)
        versions.sort(key=lambda x: x['LastModified'], reverse=True)

        # Keep the required number of versions
        for idx, version in enumerate(versions):
            if idx < keep_versions:
                continue  # Keep this version

            # Check if old enough to delete
            if version['LastModified'] < cutoff:
                to_delete.append({
                    'Key': key,
                    'VersionId': version['VersionId']
                })

        # Also clean up orphaned delete markers
        for marker in data['delete_markers']:
            # If there are no versions and only a delete marker, clean it up
            if not versions and marker['IsLatest']:
                to_delete.append({
                    'Key': key,
                    'VersionId': marker['VersionId']
                })

    if dry_run:
        print(f"DRY RUN - Would delete {len(to_delete)} versions:")
        for item in to_delete[:10]:  # Show first 10
            print(f"  {item['Key']} - {item['VersionId'][:16]}...")
        if len(to_delete) > 10:
            print(f"  ... and {len(to_delete) - 10} more")
        return to_delete

    # Perform actual deletion in batches of 1000
    deleted_count = 0
    for i in range(0, len(to_delete), 1000):
        batch = to_delete[i:i + 1000]
        response = s3_client.delete_objects(
            Bucket=bucket,
            Delete={'Objects': batch, 'Quiet': True}
        )
        deleted_count += len(batch)

    print(f"Deleted {deleted_count} old versions")
    return to_delete


# Initialize client
s3_client = boto3.client(
    's3',
    endpoint_url='http://localhost:9000',
    aws_access_key_id='minioadmin',
    aws_secret_access_key='minioadmin',
    config=Config(signature_version='s3v4'),
    region_name='us-east-1'
)

# Run cleanup in dry-run mode first
cleanup_old_versions(
    s3_client,
    bucket='my-versioned-bucket',
    prefix='logs/',
    keep_versions=3,
    older_than_days=30,
    dry_run=True  # Set to False to actually delete
)
```

## Suspending Versioning

You can suspend versioning on a bucket. This stops creating new versions but preserves existing ones.

```python
import boto3
from botocore.client import Config

s3_client = boto3.client(
    's3',
    endpoint_url='http://localhost:9000',
    aws_access_key_id='minioadmin',
    aws_secret_access_key='minioadmin',
    config=Config(signature_version='s3v4'),
    region_name='us-east-1'
)

bucket_name = 'my-versioned-bucket'

# Suspend versioning
s3_client.put_bucket_versioning(
    Bucket=bucket_name,
    VersioningConfiguration={
        'Status': 'Suspended'
    }
)

print("Versioning suspended")
print("Existing versions are preserved")
print("New objects will have null version ID")

# Verify status
response = s3_client.get_bucket_versioning(Bucket=bucket_name)
print(f"Current status: {response.get('Status', 'Unversioned')}")
```

Using mc to suspend versioning.

```bash
# Suspend versioning
mc version suspend myminio/my-versioned-bucket

# Check status
mc version info myminio/my-versioned-bucket
```

## Best Practices

### Storage Cost Management

Versioning increases storage usage since all versions are retained. Implement these strategies:

| Strategy | Description | Implementation |
|----------|-------------|----------------|
| Lifecycle rules | Automatically expire old versions | Set NoncurrentVersionExpiration |
| Version limits | Keep only N recent versions | Use NewerNoncurrentVersions |
| Prefix-based rules | Different retention for different data | Use prefix filters in lifecycle |
| Regular audits | Monitor storage growth | Script periodic version counts |

### Security Considerations

```bash
# Enable object locking for compliance (must be set at bucket creation)
mc mb --with-lock myminio/compliance-bucket

# Enable versioning (required for object locking)
mc version enable myminio/compliance-bucket

# Set default retention
mc retention set --default governance 30d myminio/compliance-bucket
```

### Performance Tips

1. Use pagination when listing versions in buckets with many objects
2. Batch delete operations to reduce API calls
3. Consider separate buckets for high-churn vs. archival data
4. Monitor bucket metrics to track version growth

## Troubleshooting Common Issues

### Issue: Cannot Delete Bucket with Versions

You must delete all versions and delete markers before removing a versioned bucket.

```python
import boto3
from botocore.client import Config

def force_delete_bucket(s3_client, bucket_name):
    """Delete all versions and the bucket itself"""

    # Get all versions
    paginator = s3_client.get_paginator('list_object_versions')

    for page in paginator.paginate(Bucket=bucket_name):
        objects_to_delete = []

        # Add versions
        for version in page.get('Versions', []):
            objects_to_delete.append({
                'Key': version['Key'],
                'VersionId': version['VersionId']
            })

        # Add delete markers
        for marker in page.get('DeleteMarkers', []):
            objects_to_delete.append({
                'Key': marker['Key'],
                'VersionId': marker['VersionId']
            })

        # Delete batch
        if objects_to_delete:
            s3_client.delete_objects(
                Bucket=bucket_name,
                Delete={'Objects': objects_to_delete}
            )
            print(f"Deleted {len(objects_to_delete)} versions/markers")

    # Now delete the empty bucket
    s3_client.delete_bucket(Bucket=bucket_name)
    print(f"Bucket '{bucket_name}' deleted")


# Use with caution
s3_client = boto3.client(
    's3',
    endpoint_url='http://localhost:9000',
    aws_access_key_id='minioadmin',
    aws_secret_access_key='minioadmin',
    config=Config(signature_version='s3v4'),
    region_name='us-east-1'
)

# force_delete_bucket(s3_client, 'bucket-to-remove')
```

### Issue: Object Appears Deleted But Versions Exist

This happens when a delete marker is the current version. List versions to see the history.

```bash
# Check for delete markers
mc ls --versions myminio/my-versioned-bucket/path/to/object

# Remove the delete marker to restore
mc rm --version-id "delete-marker-version-id" \
    myminio/my-versioned-bucket/path/to/object
```

## Conclusion

MinIO versioning provides robust data protection with minimal configuration overhead. By enabling versioning, you gain the ability to recover from accidental deletions, track object history, and maintain compliance requirements. Combined with lifecycle rules, you can balance data retention needs with storage costs effectively.

Key takeaways:

- Enable versioning early in your MinIO deployment
- Implement lifecycle rules to manage storage costs
- Use version IDs for precise object retrieval and deletion
- Understand delete markers for proper object recovery
- Monitor storage usage as versions accumulate

With these practices in place, your MinIO deployment will provide reliable, recoverable object storage for your applications.
