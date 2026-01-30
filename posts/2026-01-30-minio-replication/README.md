# How to Implement MinIO Replication

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: MinIO, ObjectStorage, Replication, HighAvailability

Description: A practical guide to configuring MinIO bucket and site-to-site replication for data redundancy across distributed object storage clusters.

---

Data redundancy is not optional when you are running production workloads. MinIO, the high-performance S3-compatible object storage system, provides robust replication features that let you mirror data across buckets, sites, and even geographic regions. This guide walks through the configuration, modes, and monitoring of MinIO replication to help you build a resilient storage layer.

## Replication Architecture Overview

MinIO supports two primary replication models:

- **Bucket Replication:** Copies objects from a source bucket to one or more destination buckets (same cluster or remote).
- **Site Replication:** Synchronizes entire MinIO deployments across multiple sites for disaster recovery.

```mermaid
flowchart LR
    subgraph Site_A["Site A (Primary)"]
        A1[MinIO Node 1]
        A2[MinIO Node 2]
        A3[MinIO Node 3]
    end

    subgraph Site_B["Site B (DR)"]
        B1[MinIO Node 1]
        B2[MinIO Node 2]
        B3[MinIO Node 3]
    end

    A1 <-->|Site Replication| B1
    A2 <-->|Site Replication| B2
    A3 <-->|Site Replication| B3

    Client[Application] --> A1
    Client -.->|Failover| B1
```

## Prerequisites

Before configuring replication, ensure you have:

- MinIO clusters running version RELEASE.2022-08-25T07-17-05Z or later
- Network connectivity between source and destination clusters
- Admin credentials for both clusters
- Versioning enabled on buckets (required for bucket replication)

```bash
# Install the MinIO client (mc) if you have not already
curl https://dl.min.io/client/mc/release/linux-amd64/mc \
  --create-dirs -o /usr/local/bin/mc
chmod +x /usr/local/bin/mc

# Configure aliases for your MinIO clusters
mc alias set source-minio https://minio-primary.example.com ACCESS_KEY SECRET_KEY
mc alias set dest-minio https://minio-dr.example.com ACCESS_KEY SECRET_KEY
```

## Bucket Replication Configuration

Bucket replication copies objects between buckets based on rules you define. It works across clusters and supports both synchronous and asynchronous modes.

### Step 1: Enable Versioning

Versioning must be enabled on both the source and destination buckets before replication can work.

```bash
# Enable versioning on the source bucket
mc version enable source-minio/my-bucket

# Enable versioning on the destination bucket
mc version enable dest-minio/my-bucket-replica
```

### Step 2: Create a Replication User on the Destination

The source cluster needs credentials to write to the destination. Create a dedicated user with the necessary permissions.

```bash
# Create a replication user on the destination cluster
mc admin user add dest-minio repl-user repl-secret-password

# Create a policy that allows replication writes
cat > /tmp/replication-policy.json << 'EOF'
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetBucketLocation",
                "s3:GetBucketVersioning",
                "s3:GetReplicationConfiguration",
                "s3:ListBucket",
                "s3:ListBucketMultipartUploads",
                "s3:GetObject",
                "s3:GetObjectVersion",
                "s3:GetObjectVersionTagging",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:ReplicateObject",
                "s3:ReplicateDelete",
                "s3:ReplicateTags"
            ],
            "Resource": [
                "arn:aws:s3:::my-bucket-replica",
                "arn:aws:s3:::my-bucket-replica/*"
            ]
        }
    ]
}
EOF

# Apply the policy
mc admin policy create dest-minio replication-policy /tmp/replication-policy.json
mc admin policy attach dest-minio replication-policy --user repl-user
```

### Step 3: Add the Remote Target

Register the destination cluster as a replication target on the source.

```bash
# Add the remote target for replication
# This returns a target ARN that you will use in the replication rule
mc admin bucket remote add source-minio/my-bucket \
  https://repl-user:repl-secret-password@minio-dr.example.com/my-bucket-replica \
  --service replication
```

The command returns an ARN like:
```
arn:minio:replication::unique-id:my-bucket-replica
```

### Step 4: Configure the Replication Rule

Create a replication rule that specifies what objects to replicate and how.

```bash
# Create a replication rule using the ARN from the previous step
mc replicate add source-minio/my-bucket \
  --remote-bucket "arn:minio:replication::unique-id:my-bucket-replica" \
  --replicate "delete,delete-marker,existing-objects"
```

The `--replicate` flag accepts these options:
- `delete` - Replicate delete operations
- `delete-marker` - Replicate delete markers (versioning)
- `existing-objects` - Replicate objects that existed before the rule was created
- `metadata-sync` - Sync metadata changes

## Synchronous vs Asynchronous Replication

MinIO supports two replication modes that affect consistency and performance.

### Asynchronous Replication (Default)

Objects are queued for replication after the write completes. This mode provides lower latency for writes but has a replication lag.

```mermaid
sequenceDiagram
    participant Client
    participant Source as Source MinIO
    participant Queue as Replication Queue
    participant Dest as Destination MinIO

    Client->>Source: PUT object
    Source->>Source: Write to disk
    Source->>Client: 200 OK
    Source->>Queue: Queue replication task
    Queue->>Dest: Replicate object (async)
    Dest->>Queue: ACK
```

### Synchronous Replication

Objects are written to both source and destination before acknowledging the client. This ensures strong consistency but increases write latency.

```bash
# Enable synchronous replication on a bucket
mc replicate add source-minio/critical-data \
  --remote-bucket "arn:minio:replication::unique-id:critical-data-replica" \
  --replicate "delete,delete-marker,existing-objects" \
  --sync
```

```mermaid
sequenceDiagram
    participant Client
    participant Source as Source MinIO
    participant Dest as Destination MinIO

    Client->>Source: PUT object
    Source->>Source: Write to disk
    Source->>Dest: Replicate object (sync)
    Dest->>Dest: Write to disk
    Dest->>Source: ACK
    Source->>Client: 200 OK
```

**When to use synchronous replication:**
- Financial transactions or compliance-critical data
- When RPO (Recovery Point Objective) must be zero
- Low-latency network links between sites

**When to use asynchronous replication:**
- General backup and DR scenarios
- High-throughput workloads where latency matters
- Sites connected over WAN with variable latency

## Site-to-Site Replication Setup

Site replication is a higher-level feature that synchronizes entire MinIO deployments, including buckets, IAM policies, and configurations.

### Architecture

```mermaid
flowchart TB
    subgraph Primary["Primary Site"]
        P_IAM[IAM Policies]
        P_Buckets[Buckets]
        P_Config[Configurations]
    end

    subgraph DR["DR Site"]
        D_IAM[IAM Policies]
        D_Buckets[Buckets]
        D_Config[Configurations]
    end

    subgraph Tertiary["Tertiary Site"]
        T_IAM[IAM Policies]
        T_Buckets[Buckets]
        T_Config[Configurations]
    end

    Primary <-->|Bidirectional Sync| DR
    DR <-->|Bidirectional Sync| Tertiary
    Primary <-->|Bidirectional Sync| Tertiary
```

### Configuring Site Replication

Site replication requires all sites to be accessible and running compatible MinIO versions.

```bash
# Step 1: Configure aliases for all sites
mc alias set site1 https://minio-site1.example.com ADMIN_KEY ADMIN_SECRET
mc alias set site2 https://minio-site2.example.com ADMIN_KEY ADMIN_SECRET
mc alias set site3 https://minio-site3.example.com ADMIN_KEY ADMIN_SECRET

# Step 2: Initialize site replication
# This command links all three sites for bidirectional replication
mc admin replicate add site1 site2 site3

# Verify the site replication status
mc admin replicate info site1
```

### What Gets Replicated

Site replication synchronizes:

| Component | Replicated | Notes |
| --- | --- | --- |
| Bucket data | Yes | All objects and versions |
| Bucket policies | Yes | Access policies |
| IAM users | Yes | User accounts |
| IAM groups | Yes | Group memberships |
| IAM policies | Yes | Custom policies |
| Service accounts | Yes | Programmatic access keys |
| Bucket lifecycle rules | Yes | Expiration and transition rules |
| Bucket encryption | Yes | SSE-S3 and SSE-KMS configs |
| Object lock configs | Yes | Retention and legal holds |

### Handling Conflicts

When the same object is modified at multiple sites simultaneously, MinIO uses a last-write-wins strategy based on the object's modification timestamp. To minimize conflicts:

- Designate a primary site for write operations when possible
- Use object locking for compliance-critical data
- Implement application-level conflict resolution for sensitive workloads

## Replication Status Monitoring

Monitoring replication health is critical for maintaining data redundancy guarantees.

### Check Bucket Replication Status

```bash
# View replication configuration for a bucket
mc replicate ls source-minio/my-bucket

# Check replication status of a specific object
mc stat source-minio/my-bucket/path/to/object.txt
```

The object status will show one of these replication states:
- `PENDING` - Queued for replication
- `COMPLETED` - Successfully replicated
- `FAILED` - Replication failed (check logs)
- `REPLICA` - This object is itself a replica

### Monitor Replication Metrics

MinIO exposes Prometheus metrics for replication monitoring.

```bash
# Get replication metrics
mc admin prometheus generate source-minio
```

Key metrics to monitor:

```yaml
# Replication metrics to track
- minio_bucket_replication_sent_bytes
    # Total bytes sent for replication
- minio_bucket_replication_received_bytes
    # Total bytes received (on destination)
- minio_bucket_replication_pending_count
    # Objects waiting to be replicated
- minio_bucket_replication_failed_count
    # Failed replication attempts
- minio_bucket_replication_latency_ms
    # Replication latency in milliseconds
```

### Create a Monitoring Dashboard

Here is a sample Prometheus alerting rule for replication lag:

```yaml
# prometheus-rules.yaml
groups:
  - name: minio-replication
    rules:
      # Alert if replication queue is backing up
      - alert: MinIOReplicationQueueHigh
        expr: minio_bucket_replication_pending_count > 1000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "MinIO replication queue is backing up"
          description: "Pending replication count is {{ $value }}"

      # Alert if replication failures are occurring
      - alert: MinIOReplicationFailures
        expr: increase(minio_bucket_replication_failed_count[5m]) > 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "MinIO replication failures detected"
          description: "{{ $value }} objects failed to replicate"
```

### Resync Failed Objects

If objects fail to replicate, you can trigger a resync:

```bash
# Resync all objects that failed replication
mc replicate resync start source-minio/my-bucket \
  --remote-bucket "arn:minio:replication::unique-id:my-bucket-replica"

# Check resync status
mc replicate resync status source-minio/my-bucket \
  --remote-bucket "arn:minio:replication::unique-id:my-bucket-replica"
```

## Best Practices

### Network Configuration

- Use dedicated network interfaces or VLANs for replication traffic
- Enable TLS for all replication connections
- Consider bandwidth limits during peak hours:

```bash
# Set bandwidth limit for replication (e.g., 100 Mbps)
mc admin config set source-minio api bandwidth_limit=100MB
```

### Performance Tuning

```bash
# Increase replication workers for higher throughput
mc admin config set source-minio replication workers=8

# Set batch size for bulk operations
mc admin config set source-minio replication batch_size=1000
```

### Disaster Recovery Testing

Schedule regular DR drills to validate your replication setup:

1. Write test objects to the source
2. Verify they appear on the destination within your RPO window
3. Simulate a source failure and confirm failover works
4. Test restore procedures from the replica site

```bash
# Write a test object and verify replication
echo "DR test $(date)" | mc pipe source-minio/my-bucket/dr-test.txt

# Wait for replication and verify on destination
sleep 10
mc cat dest-minio/my-bucket-replica/dr-test.txt
```

## Troubleshooting Common Issues

### Objects Not Replicating

```bash
# Check if versioning is enabled
mc version info source-minio/my-bucket

# Verify the replication rule is active
mc replicate ls source-minio/my-bucket --status

# Check MinIO server logs for errors
mc admin logs source-minio --type replication
```

### High Replication Lag

- Check network bandwidth between sites
- Increase the number of replication workers
- Verify destination cluster is not under resource pressure
- Look for large objects blocking the queue

### Authentication Failures

```bash
# Test connectivity to the remote target
mc admin bucket remote ls source-minio/my-bucket

# Re-add the remote target if credentials changed
mc admin bucket remote rm source-minio/my-bucket --arn "arn:minio:replication::unique-id:my-bucket-replica"
mc admin bucket remote add source-minio/my-bucket \
  https://repl-user:new-password@minio-dr.example.com/my-bucket-replica \
  --service replication
```

## Summary

MinIO replication provides flexible options for building redundant object storage:

- **Bucket replication** for targeted object copying between specific buckets
- **Site replication** for full deployment synchronization across geographic regions
- **Synchronous mode** when zero RPO is required
- **Asynchronous mode** for general DR with better write performance

The key to successful replication is continuous monitoring. Track replication lag, queue depth, and failure counts in your observability platform so you know your data is protected before you need it.
