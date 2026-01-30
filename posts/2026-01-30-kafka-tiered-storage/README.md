# How to Create Kafka Tiered Storage

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Kafka, Storage, Tiered Storage, Architecture

Description: A comprehensive guide to implementing Apache Kafka tiered storage with S3, GCS, and Azure Blob Storage, including configuration best practices, cost optimization strategies, and production deployment patterns.

---

> "Store hot data fast, archive cold data cheap - that is the essence of tiered storage." - Anonymous

Apache Kafka's tiered storage feature, introduced in KIP-405, allows you to offload older log segments from local broker storage to cheaper remote object stores like Amazon S3, Google Cloud Storage, or Azure Blob Storage. This architectural pattern enables virtually unlimited data retention while keeping your Kafka cluster lean and cost-effective.

This guide covers everything you need to know to implement Kafka tiered storage in production environments.

---

## Understanding Kafka Tiered Storage Architecture

Traditional Kafka stores all data on local broker disks. As data volume grows, you face two unappealing choices: either add more expensive local storage or reduce retention periods. Tiered storage solves this by creating a two-tier architecture where recent data lives on fast local storage and older data moves to inexpensive object storage.

```mermaid
flowchart TB
    subgraph Producers
        P1[Producer 1]
        P2[Producer 2]
        P3[Producer N]
    end

    subgraph KafkaCluster["Kafka Cluster"]
        subgraph Broker1["Broker 1"]
            LS1[Local Storage<br/>Hot Segments]
        end
        subgraph Broker2["Broker 2"]
            LS2[Local Storage<br/>Hot Segments]
        end
        subgraph Broker3["Broker 3"]
            LS3[Local Storage<br/>Hot Segments]
        end
    end

    subgraph RemoteStorage["Remote Storage (Cold Tier)"]
        S3[Amazon S3]
        GCS[Google Cloud Storage]
        Azure[Azure Blob Storage]
    end

    subgraph Consumers
        C1[Consumer 1<br/>Recent Data]
        C2[Consumer 2<br/>Historical Data]
    end

    P1 --> Broker1
    P2 --> Broker2
    P3 --> Broker3

    LS1 -.->|Offload| S3
    LS2 -.->|Offload| GCS
    LS3 -.->|Offload| Azure

    Broker1 --> C1
    S3 -.->|Fetch| C2
```

### Key Concepts

- **Local Log Segment**: The standard Kafka log segment stored on broker disk, containing recent messages
- **Remote Log Segment**: A log segment that has been copied to object storage
- **Remote Log Metadata**: Metadata tracking which segments are stored remotely and their locations
- **Local Retention**: How long segments remain on local disk before deletion (independent of total retention)
- **Remote Retention**: How long segments remain in remote storage

### How Tiered Storage Works

```mermaid
sequenceDiagram
    participant P as Producer
    participant B as Broker
    participant LS as Local Storage
    participant RS as Remote Storage
    participant C as Consumer

    P->>B: Produce Message
    B->>LS: Write to Active Segment
    Note over LS: Segment fills up
    B->>LS: Roll to New Segment
    B->>RS: Copy Closed Segment
    Note over RS: Segment archived
    B->>LS: Delete after local retention

    C->>B: Fetch Recent Data
    B->>LS: Read from Local
    B->>C: Return Data

    C->>B: Fetch Historical Data
    B->>RS: Fetch from Remote
    RS->>B: Return Segment
    B->>C: Return Data
```

---

## Prerequisites and Requirements

Before enabling tiered storage, ensure your environment meets these requirements.

### Kafka Version Requirements

Tiered storage is available in:
- Apache Kafka 3.6.0+ (KIP-405 implementation)
- Confluent Platform 7.5+

```bash
# Check your Kafka version
kafka-broker-api-versions.sh --bootstrap-server localhost:9092 | head -5

# Verify tiered storage support
kafka-configs.sh --bootstrap-server localhost:9092 --describe --entity-type brokers --all | grep remote
```

### Storage Backend Requirements

| Storage Backend | Minimum Version | Authentication |
|----------------|-----------------|----------------|
| Amazon S3 | Standard S3 API | IAM Role or Access Keys |
| Google Cloud Storage | Standard GCS API | Service Account |
| Azure Blob Storage | Standard Blob API | Managed Identity or Keys |
| MinIO | RELEASE.2023-01-01+ | Access Keys |

---

## Configuring S3 as Remote Storage

Amazon S3 is the most common choice for Kafka tiered storage. Here is how to configure it.

### Broker Configuration

Add these settings to your `server.properties` file:

```properties
# Enable tiered storage feature
# This activates the remote log manager in the broker
remote.log.storage.system.enable=true

# Remote storage manager class for S3
# This tells Kafka which implementation to use for remote storage
remote.log.storage.manager.class.name=org.apache.kafka.tiered.storage.s3.S3RemoteStorageManager

# Remote log metadata manager class
# Manages the metadata about which segments are stored remotely
remote.log.metadata.manager.class.name=org.apache.kafka.tiered.storage.internals.metadatamanager.RemoteLogMetadataManagerConfig

# S3 bucket configuration
# Use a dedicated bucket for Kafka tiered storage
remote.log.storage.manager.class.path=/opt/kafka/libs/kafka-tiered-storage-s3-*.jar
remote.log.storage.s3.bucket.name=kafka-tiered-storage-prod

# AWS region where your bucket is located
# Choose a region close to your Kafka cluster for lower latency
remote.log.storage.s3.region=us-east-1

# Authentication options (choose one):

# Option 1: IAM role (recommended for EC2/EKS)
# No additional config needed - uses instance profile
remote.log.storage.s3.credentials.provider=DEFAULT

# Option 2: Access keys (for non-AWS deployments)
# remote.log.storage.s3.credentials.provider=STATIC
# remote.log.storage.s3.access.key.id=AKIAIOSFODNN7EXAMPLE
# remote.log.storage.s3.secret.access.key=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

# Performance tuning
# Maximum segment size to upload in a single request (multipart threshold)
remote.log.storage.s3.multipart.upload.threshold.bytes=104857600

# Part size for multipart uploads (5MB minimum for S3)
remote.log.storage.s3.multipart.upload.part.size.bytes=5242880

# Connection pool size for S3 operations
remote.log.storage.s3.max.connections=50

# Read buffer size when fetching from S3
remote.log.storage.s3.read.buffer.size.bytes=1048576
```

### IAM Policy for S3 Access

Create an IAM policy with the minimum required permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "KafkaTieredStorageAccess",
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:ListBucket",
                "s3:GetBucketLocation",
                "s3:AbortMultipartUpload",
                "s3:ListMultipartUploadParts",
                "s3:ListBucketMultipartUploads"
            ],
            "Resource": [
                "arn:aws:s3:::kafka-tiered-storage-prod",
                "arn:aws:s3:::kafka-tiered-storage-prod/*"
            ]
        }
    ]
}
```

### S3 Bucket Setup

Configure your S3 bucket with appropriate settings:

```bash
# Create the bucket with versioning disabled
# Kafka manages its own segment versions
aws s3api create-bucket \
    --bucket kafka-tiered-storage-prod \
    --region us-east-1

# Enable server-side encryption by default
# Protects data at rest
aws s3api put-bucket-encryption \
    --bucket kafka-tiered-storage-prod \
    --server-side-encryption-configuration '{
        "Rules": [{
            "ApplyServerSideEncryptionByDefault": {
                "SSEAlgorithm": "aws:kms",
                "KMSMasterKeyID": "alias/kafka-tiered-storage"
            },
            "BucketKeyEnabled": true
        }]
    }'

# Block all public access
# Critical for security
aws s3api put-public-access-block \
    --bucket kafka-tiered-storage-prod \
    --public-access-block-configuration '{
        "BlockPublicAcls": true,
        "IgnorePublicAcls": true,
        "BlockPublicPolicy": true,
        "RestrictPublicBuckets": true
    }'

# Enable intelligent tiering for automatic cost optimization
aws s3api put-bucket-intelligent-tiering-configuration \
    --bucket kafka-tiered-storage-prod \
    --id kafka-auto-tiering \
    --intelligent-tiering-configuration '{
        "Id": "kafka-auto-tiering",
        "Status": "Enabled",
        "Tierings": [
            {"Days": 90, "AccessTier": "ARCHIVE_ACCESS"},
            {"Days": 180, "AccessTier": "DEEP_ARCHIVE_ACCESS"}
        ]
    }'
```

---

## Configuring Google Cloud Storage

For GCP deployments, use Google Cloud Storage as your remote storage backend.

### Broker Configuration

```properties
# Enable tiered storage
remote.log.storage.system.enable=true

# GCS remote storage manager
remote.log.storage.manager.class.name=org.apache.kafka.tiered.storage.gcs.GcsRemoteStorageManager

# GCS bucket configuration
remote.log.storage.gcs.bucket.name=kafka-tiered-storage-prod

# GCS project ID
remote.log.storage.gcs.project.id=your-gcp-project-id

# Authentication options:

# Option 1: Application Default Credentials (recommended for GKE)
# Uses Workload Identity automatically
remote.log.storage.gcs.credentials.provider=APPLICATION_DEFAULT

# Option 2: Service account key file
# remote.log.storage.gcs.credentials.provider=SERVICE_ACCOUNT_FILE
# remote.log.storage.gcs.credentials.file=/etc/kafka/gcs-credentials.json

# Performance settings
remote.log.storage.gcs.chunk.size.bytes=16777216
remote.log.storage.gcs.max.connections=50
```

### GCS IAM Configuration

```bash
# Create service account for Kafka
gcloud iam service-accounts create kafka-tiered-storage \
    --display-name="Kafka Tiered Storage"

# Grant storage permissions on the bucket
gsutil iam ch \
    serviceAccount:kafka-tiered-storage@PROJECT_ID.iam.gserviceaccount.com:objectAdmin \
    gs://kafka-tiered-storage-prod

# For GKE: Configure Workload Identity
gcloud iam service-accounts add-iam-policy-binding \
    kafka-tiered-storage@PROJECT_ID.iam.gserviceaccount.com \
    --role roles/iam.workloadIdentityUser \
    --member "serviceAccount:PROJECT_ID.svc.id.goog[kafka/kafka-broker]"
```

### GKE Workload Identity Setup

```yaml
# Kubernetes ServiceAccount with GCS access
apiVersion: v1
kind: ServiceAccount
metadata:
  name: kafka-broker
  namespace: kafka
  annotations:
    # Link to GCP service account
    iam.gke.io/gcp-service-account: kafka-tiered-storage@PROJECT_ID.iam.gserviceaccount.com
```

---

## Configuring Azure Blob Storage

For Azure deployments, configure Azure Blob Storage as your cold tier.

### Broker Configuration

```properties
# Enable tiered storage
remote.log.storage.system.enable=true

# Azure Blob remote storage manager
remote.log.storage.manager.class.name=org.apache.kafka.tiered.storage.azure.AzureBlobRemoteStorageManager

# Azure storage account and container
remote.log.storage.azure.account.name=kafkatieredstorage
remote.log.storage.azure.container.name=kafka-segments

# Authentication options:

# Option 1: Managed Identity (recommended for Azure VMs/AKS)
remote.log.storage.azure.credentials.provider=MANAGED_IDENTITY

# Option 2: Account key
# remote.log.storage.azure.credentials.provider=ACCOUNT_KEY
# remote.log.storage.azure.account.key=BASE64_ENCODED_ACCOUNT_KEY

# Option 3: SAS token
# remote.log.storage.azure.credentials.provider=SAS_TOKEN
# remote.log.storage.azure.sas.token=sv=2021-06-08&ss=b&srt=sco...

# Performance settings
remote.log.storage.azure.block.size.bytes=4194304
remote.log.storage.azure.max.connections=50
```

### Azure Storage Account Setup

```bash
# Create resource group
az group create \
    --name kafka-storage-rg \
    --location eastus

# Create storage account with appropriate tier
az storage account create \
    --name kafkatieredstorage \
    --resource-group kafka-storage-rg \
    --location eastus \
    --sku Standard_LRS \
    --kind StorageV2 \
    --access-tier Cool \
    --min-tls-version TLS1_2 \
    --allow-blob-public-access false

# Create container for Kafka segments
az storage container create \
    --name kafka-segments \
    --account-name kafkatieredstorage \
    --auth-mode login

# Enable soft delete for data protection
az storage blob service-properties delete-policy update \
    --account-name kafkatieredstorage \
    --enable true \
    --days-retained 7
```

---

## Configuring Topic-Level Tiered Storage

Tiered storage can be enabled at the topic level, giving you fine-grained control over which topics use remote storage.

### Creating Topics with Tiered Storage

```bash
# Create a topic with tiered storage enabled
# This topic will automatically offload segments to remote storage
kafka-topics.sh --bootstrap-server localhost:9092 \
    --create \
    --topic events.user.activity \
    --partitions 12 \
    --replication-factor 3 \
    --config remote.storage.enable=true \
    --config local.retention.ms=86400000 \
    --config retention.ms=2592000000 \
    --config segment.bytes=1073741824

# Explanation of configurations:
# remote.storage.enable=true     -> Enable tiered storage for this topic
# local.retention.ms=86400000    -> Keep segments locally for 1 day
# retention.ms=2592000000        -> Total retention of 30 days (in remote)
# segment.bytes=1073741824       -> 1GB segments for efficient offload
```

### Modifying Existing Topics

```bash
# Enable tiered storage on an existing topic
kafka-configs.sh --bootstrap-server localhost:9092 \
    --alter \
    --entity-type topics \
    --entity-name events.user.activity \
    --add-config remote.storage.enable=true,local.retention.ms=86400000

# Verify the configuration
kafka-configs.sh --bootstrap-server localhost:9092 \
    --describe \
    --entity-type topics \
    --entity-name events.user.activity
```

### Topic Configuration Reference

| Configuration | Description | Default | Recommended |
|--------------|-------------|---------|-------------|
| `remote.storage.enable` | Enable tiered storage | false | true |
| `local.retention.ms` | Time to keep locally after upload | 24 hours | 1-7 days |
| `local.retention.bytes` | Size to keep locally | -1 (unlimited) | Based on disk |
| `retention.ms` | Total retention including remote | 7 days | As needed |
| `segment.bytes` | Log segment size | 1GB | 1GB |
| `segment.ms` | Time before segment roll | 7 days | 1 day |

### Batch Configuration Script

```bash
#!/bin/bash
# Script to enable tiered storage on multiple topics
# Useful for migrating existing clusters to tiered storage

BOOTSTRAP_SERVER="localhost:9092"
LOCAL_RETENTION_MS="86400000"  # 1 day

# Topics to enable tiered storage on
TOPICS=(
    "events.user.activity"
    "events.order.created"
    "events.payment.processed"
    "logs.application"
    "metrics.system"
)

for topic in "${TOPICS[@]}"; do
    echo "Enabling tiered storage for topic: $topic"

    kafka-configs.sh --bootstrap-server "$BOOTSTRAP_SERVER" \
        --alter \
        --entity-type topics \
        --entity-name "$topic" \
        --add-config "remote.storage.enable=true,local.retention.ms=$LOCAL_RETENTION_MS"

    if [ $? -eq 0 ]; then
        echo "Successfully enabled tiered storage for $topic"
    else
        echo "Failed to enable tiered storage for $topic"
    fi
done

echo "Tiered storage configuration complete"
```

---

## Data Flow and Segment Lifecycle

Understanding how data flows through the tiered storage system helps with capacity planning and troubleshooting.

```mermaid
stateDiagram-v2
    [*] --> ActiveSegment: Producer writes
    ActiveSegment --> ClosedSegment: Segment rolls
    ClosedSegment --> Uploading: Upload triggered
    Uploading --> RemoteAndLocal: Upload complete
    RemoteAndLocal --> RemoteOnly: Local retention expires
    RemoteOnly --> Deleted: Remote retention expires
    Deleted --> [*]

    state ActiveSegment {
        [*] --> Writing
        Writing --> Writing: Append messages
        Writing --> Full: Size/time limit
    }

    state Uploading {
        [*] --> CopyToRemote
        CopyToRemote --> UpdateMetadata
        UpdateMetadata --> [*]
    }
```

### Segment Lifecycle Timeline

```mermaid
gantt
    title Kafka Segment Lifecycle with Tiered Storage
    dateFormat  YYYY-MM-DD

    section Segment 1
    Active Writing       :a1, 2024-01-01, 1d
    Closed (Local)       :a2, after a1, 2d
    Uploading to Remote  :a3, after a1, 4h
    Local + Remote       :a4, after a3, 1d
    Remote Only          :a5, after a4, 27d
    Deleted              :milestone, after a5, 0d

    section Segment 2
    Active Writing       :b1, 2024-01-02, 1d
    Closed (Local)       :b2, after b1, 2d
    Uploading to Remote  :b3, after b1, 4h
    Local + Remote       :b4, after b3, 1d
    Remote Only          :b5, after b4, 27d
```

---

## Cost Optimization Strategies

Tiered storage enables significant cost savings. Here is how to maximize your savings.

### Storage Cost Comparison

```mermaid
flowchart LR
    subgraph Hot["Hot Tier (Local SSD)"]
        H1[Last 24 hours<br/>NVMe SSD<br/>$0.10/GB/month]
    end

    subgraph Warm["Warm Tier (S3 Standard)"]
        W1[1-7 days<br/>Frequent Access<br/>$0.023/GB/month]
    end

    subgraph Cold["Cold Tier (S3 IA)"]
        C1[7-30 days<br/>Infrequent Access<br/>$0.0125/GB/month]
    end

    subgraph Archive["Archive Tier (Glacier)"]
        A1[30+ days<br/>Rare Access<br/>$0.004/GB/month]
    end

    Hot -->|Offload| Warm
    Warm -->|Lifecycle| Cold
    Cold -->|Lifecycle| Archive
```

### S3 Lifecycle Policy Configuration

Configure S3 lifecycle rules to automatically move data to cheaper storage classes:

```json
{
    "Rules": [
        {
            "ID": "KafkaTieredStorageLifecycle",
            "Status": "Enabled",
            "Filter": {
                "Prefix": ""
            },
            "Transitions": [
                {
                    "Days": 7,
                    "StorageClass": "STANDARD_IA"
                },
                {
                    "Days": 30,
                    "StorageClass": "GLACIER_IR"
                },
                {
                    "Days": 90,
                    "StorageClass": "GLACIER"
                },
                {
                    "Days": 365,
                    "StorageClass": "DEEP_ARCHIVE"
                }
            ],
            "Expiration": {
                "Days": 2555
            },
            "NoncurrentVersionExpiration": {
                "NoncurrentDays": 7
            }
        }
    ]
}
```

Apply the lifecycle policy:

```bash
aws s3api put-bucket-lifecycle-configuration \
    --bucket kafka-tiered-storage-prod \
    --lifecycle-configuration file://lifecycle-policy.json
```

### Cost Estimation Calculator

```python
#!/usr/bin/env python3
"""
Kafka Tiered Storage Cost Estimator

This script helps estimate monthly costs based on your data volume
and retention requirements.
"""

def estimate_monthly_cost(
    daily_ingestion_gb: float,
    local_retention_days: float,
    warm_retention_days: int,
    cold_retention_days: int,
    archive_retention_days: int,
    read_ratio_warm: float = 0.1,
    read_ratio_cold: float = 0.01,
    local_storage_per_gb: float = 0.10,
    s3_standard_per_gb: float = 0.023,
    s3_ia_per_gb: float = 0.0125,
    glacier_per_gb: float = 0.004,
    replication_factor: int = 3
) -> dict:
    """
    Estimate monthly costs for Kafka tiered storage.

    Args:
        daily_ingestion_gb: Amount of data ingested per day (before replication)
        local_retention_days: Days to keep on local broker storage
        warm_retention_days: Days in S3 Standard
        cold_retention_days: Days in S3 Standard-IA
        archive_retention_days: Days in Glacier
        read_ratio_warm: Percentage of warm data read per month
        read_ratio_cold: Percentage of cold data read per month
        local_storage_per_gb: Cost per GB for local SSD storage
        s3_standard_per_gb: Cost per GB for S3 Standard
        s3_ia_per_gb: Cost per GB for S3 Standard-IA
        glacier_per_gb: Cost per GB for Glacier
        replication_factor: Kafka replication factor

    Returns:
        Dictionary with cost breakdown
    """
    # Calculate data volume in each tier (accounting for replication)
    replicated_daily_gb = daily_ingestion_gb * replication_factor

    # Local storage (replicated across brokers)
    local_data_gb = replicated_daily_gb * local_retention_days

    # Remote storage (single copy, S3 handles durability)
    warm_data_gb = daily_ingestion_gb * warm_retention_days
    cold_data_gb = daily_ingestion_gb * cold_retention_days
    archive_data_gb = daily_ingestion_gb * archive_retention_days

    # Storage costs
    local_cost = local_data_gb * local_storage_per_gb
    warm_cost = warm_data_gb * s3_standard_per_gb
    cold_cost = cold_data_gb * s3_ia_per_gb
    archive_cost = archive_data_gb * glacier_per_gb

    # API costs (approximate)
    # PUT requests for uploads
    segments_per_day = (daily_ingestion_gb * 1024) / 1024  # 1GB segments
    put_requests = segments_per_day * 30
    put_cost = (put_requests / 1000) * 0.005

    # GET requests for reads
    warm_reads_gb = warm_data_gb * read_ratio_warm
    cold_reads_gb = cold_data_gb * read_ratio_cold
    get_requests = ((warm_reads_gb + cold_reads_gb) * 1024) / 64  # 64MB reads
    get_cost = (get_requests / 1000) * 0.0004

    # Retrieval costs for IA
    ia_retrieval_cost = cold_reads_gb * 0.01

    # Total costs
    total_storage = local_cost + warm_cost + cold_cost + archive_cost
    total_api = put_cost + get_cost + ia_retrieval_cost
    total = total_storage + total_api

    # Compare to all-local storage
    all_local_gb = replicated_daily_gb * (
        local_retention_days + warm_retention_days +
        cold_retention_days + archive_retention_days
    )
    all_local_cost = all_local_gb * local_storage_per_gb

    savings = all_local_cost - total
    savings_percent = (savings / all_local_cost) * 100 if all_local_cost > 0 else 0

    return {
        "local_tier": {
            "storage_gb": round(local_data_gb, 2),
            "cost": round(local_cost, 2)
        },
        "warm_tier": {
            "storage_gb": round(warm_data_gb, 2),
            "cost": round(warm_cost, 2)
        },
        "cold_tier": {
            "storage_gb": round(cold_data_gb, 2),
            "cost": round(cold_cost, 2)
        },
        "archive_tier": {
            "storage_gb": round(archive_data_gb, 2),
            "cost": round(archive_cost, 2)
        },
        "api_costs": round(total_api, 2),
        "total_monthly_cost": round(total, 2),
        "all_local_cost": round(all_local_cost, 2),
        "monthly_savings": round(savings, 2),
        "savings_percent": round(savings_percent, 1)
    }


if __name__ == "__main__":
    # Example: 100GB/day ingestion with tiered retention
    result = estimate_monthly_cost(
        daily_ingestion_gb=100,
        local_retention_days=1,
        warm_retention_days=6,
        cold_retention_days=23,
        archive_retention_days=60,
        replication_factor=3
    )

    print("Kafka Tiered Storage Cost Estimate")
    print("=" * 50)
    print(f"Local Tier:   {result['local_tier']['storage_gb']:>8} GB  ${result['local_tier']['cost']:>8}")
    print(f"Warm Tier:    {result['warm_tier']['storage_gb']:>8} GB  ${result['warm_tier']['cost']:>8}")
    print(f"Cold Tier:    {result['cold_tier']['storage_gb']:>8} GB  ${result['cold_tier']['cost']:>8}")
    print(f"Archive Tier: {result['archive_tier']['storage_gb']:>8} GB  ${result['archive_tier']['cost']:>8}")
    print(f"API Costs:                       ${result['api_costs']:>8}")
    print("-" * 50)
    print(f"Total Monthly Cost:              ${result['total_monthly_cost']:>8}")
    print(f"All-Local Cost Would Be:         ${result['all_local_cost']:>8}")
    print(f"Monthly Savings:                 ${result['monthly_savings']:>8}")
    print(f"Savings Percentage:              {result['savings_percent']:>7}%")
```

---

## Monitoring Tiered Storage Operations

Effective monitoring is critical for tiered storage success. Here are the key metrics to track.

### Key JMX Metrics

```yaml
# Prometheus JMX Exporter configuration for Kafka tiered storage metrics
rules:
  # Remote storage manager metrics
  - pattern: 'kafka.log.remote<type=RemoteLogManager, name=(.+)><>(Count|Value)'
    name: kafka_remote_log_manager_$1
    type: GAUGE

  # Segment upload metrics
  - pattern: 'kafka.log.remote<type=RemoteLogManager, name=RemoteLogSegmentBytes><>Count'
    name: kafka_remote_log_segment_bytes_total
    type: COUNTER

  # Upload/download rates
  - pattern: 'kafka.log.remote<type=RemoteLogManager, name=RemoteCopyBytesPerSec><>Count'
    name: kafka_remote_copy_bytes_per_sec
    type: GAUGE

  - pattern: 'kafka.log.remote<type=RemoteLogManager, name=RemoteFetchBytesPerSec><>Count'
    name: kafka_remote_fetch_bytes_per_sec
    type: GAUGE

  # Error metrics
  - pattern: 'kafka.log.remote<type=RemoteLogManager, name=RemoteCopyErrors><>Count'
    name: kafka_remote_copy_errors_total
    type: COUNTER

  - pattern: 'kafka.log.remote<type=RemoteLogManager, name=RemoteFetchErrors><>Count'
    name: kafka_remote_fetch_errors_total
    type: COUNTER
```

### Critical Metrics Dashboard

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `kafka_remote_log_segment_bytes_total` | Total bytes in remote storage | Track trend |
| `kafka_remote_copy_bytes_per_sec` | Upload throughput | < expected rate |
| `kafka_remote_fetch_bytes_per_sec` | Download throughput | Unexpected spikes |
| `kafka_remote_copy_errors_total` | Upload failures | > 0 |
| `kafka_remote_fetch_errors_total` | Download failures | > 0 |
| `kafka_remote_copy_lag_segments` | Segments waiting upload | > threshold |

### Prometheus Alert Rules

```yaml
# Prometheus alerting rules for Kafka tiered storage
groups:
  - name: kafka-tiered-storage
    rules:
      # Alert on upload failures
      - alert: KafkaRemoteCopyErrors
        expr: increase(kafka_remote_copy_errors_total[5m]) > 0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Kafka remote copy errors detected"
          description: "{{ $value }} remote copy errors in the last 5 minutes on {{ $labels.instance }}"

      # Alert on fetch failures
      - alert: KafkaRemoteFetchErrors
        expr: increase(kafka_remote_fetch_errors_total[5m]) > 0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Kafka remote fetch errors detected"
          description: "{{ $value }} remote fetch errors in the last 5 minutes"

      # Alert on upload lag
      - alert: KafkaRemoteCopyLagHigh
        expr: kafka_remote_copy_lag_segments > 100
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Kafka remote copy lag is high"
          description: "{{ $value }} segments waiting to be uploaded"

      # Alert on zero upload activity (may indicate problems)
      - alert: KafkaNoRemoteCopyActivity
        expr: rate(kafka_remote_copy_bytes_per_sec[1h]) == 0
        for: 2h
        labels:
          severity: warning
        annotations:
          summary: "No Kafka remote copy activity"
          description: "No segments have been uploaded in the last 2 hours"
```

### Monitoring Script

```bash
#!/bin/bash
# Script to check tiered storage health
# Run periodically as a cron job or Kubernetes CronJob

BOOTSTRAP_SERVER="${KAFKA_BOOTSTRAP_SERVER:-localhost:9092}"
ALERT_ENDPOINT="${ALERT_ENDPOINT:-https://oneuptime.com/api/alerts}"

echo "Checking Kafka tiered storage health..."

# Check remote storage metrics via JMX
METRICS=$(curl -s http://localhost:7071/metrics 2>/dev/null)

if [ -z "$METRICS" ]; then
    echo "ERROR: Cannot reach JMX exporter"
    exit 1
fi

# Extract key metrics
COPY_ERRORS=$(echo "$METRICS" | grep 'kafka_remote_copy_errors_total' | awk '{print $2}')
FETCH_ERRORS=$(echo "$METRICS" | grep 'kafka_remote_fetch_errors_total' | awk '{print $2}')
COPY_RATE=$(echo "$METRICS" | grep 'kafka_remote_copy_bytes_per_sec' | awk '{print $2}')

echo "Remote copy errors: $COPY_ERRORS"
echo "Remote fetch errors: $FETCH_ERRORS"
echo "Remote copy rate: $COPY_RATE bytes/sec"

# Alert on errors
if [ "${COPY_ERRORS:-0}" -gt 0 ]; then
    echo "WARNING: Remote copy errors detected"
    curl -X POST "$ALERT_ENDPOINT" \
        -H "Content-Type: application/json" \
        -d "{
            \"severity\": \"warning\",
            \"message\": \"Kafka remote copy errors: $COPY_ERRORS\",
            \"service\": \"kafka-tiered-storage\"
        }"
fi

if [ "${FETCH_ERRORS:-0}" -gt 0 ]; then
    echo "WARNING: Remote fetch errors detected"
    curl -X POST "$ALERT_ENDPOINT" \
        -H "Content-Type: application/json" \
        -d "{
            \"severity\": \"warning\",
            \"message\": \"Kafka remote fetch errors: $FETCH_ERRORS\",
            \"service\": \"kafka-tiered-storage\"
        }"
fi

# Check topic-level offload status
echo ""
echo "Checking topic tiered storage status..."

TOPICS=$(kafka-topics.sh --bootstrap-server "$BOOTSTRAP_SERVER" --list 2>/dev/null)

for topic in $TOPICS; do
    # Get topic config
    CONFIG=$(kafka-configs.sh --bootstrap-server "$BOOTSTRAP_SERVER" \
        --describe --entity-type topics --entity-name "$topic" 2>/dev/null)

    if echo "$CONFIG" | grep -q "remote.storage.enable=true"; then
        echo "Topic $topic: tiered storage ENABLED"

        # Get storage stats
        STATS=$(kafka-log-dirs.sh --bootstrap-server "$BOOTSTRAP_SERVER" \
            --topic-list "$topic" 2>/dev/null)

        LOCAL_SIZE=$(echo "$STATS" | grep -o '"size":[0-9]*' | head -1 | cut -d: -f2)
        echo "  Local storage: $((LOCAL_SIZE / 1024 / 1024)) MB"
    fi
done

echo ""
echo "Tiered storage health check complete"
```

---

## Production Deployment Architecture

Here is a recommended production architecture for Kafka with tiered storage.

```mermaid
flowchart TB
    subgraph Region["Production Region"]
        subgraph KafkaCluster["Kafka Cluster"]
            subgraph Brokers["Brokers (3 AZs)"]
                B1[Broker 1<br/>AZ-a<br/>NVMe SSD]
                B2[Broker 2<br/>AZ-b<br/>NVMe SSD]
                B3[Broker 3<br/>AZ-c<br/>NVMe SSD]
            end

            subgraph ZK["ZooKeeper / KRaft"]
                Z1[Controller 1]
                Z2[Controller 2]
                Z3[Controller 3]
            end
        end

        subgraph RemoteStorage["Remote Storage"]
            S3[S3 Bucket<br/>Cross-AZ Replication]
        end

        subgraph Monitoring["Monitoring Stack"]
            Prom[Prometheus]
            Graf[Grafana]
            OT[OneUptime<br/>Alerts]
        end
    end

    subgraph DR["DR Region"]
        S3DR[S3 Bucket<br/>Cross-Region Replica]
    end

    B1 --> Z1
    B2 --> Z2
    B3 --> Z3

    B1 -.->|Upload| S3
    B2 -.->|Upload| S3
    B3 -.->|Upload| S3

    S3 -->|Replicate| S3DR

    B1 --> Prom
    B2 --> Prom
    B3 --> Prom
    Prom --> Graf
    Prom --> OT
```

### Kubernetes Deployment

```yaml
# Kafka StatefulSet with tiered storage configuration
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: kafka
  namespace: kafka
spec:
  serviceName: kafka-headless
  replicas: 3
  podManagementPolicy: Parallel
  selector:
    matchLabels:
      app: kafka
  template:
    metadata:
      labels:
        app: kafka
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "7071"
    spec:
      serviceAccountName: kafka-broker
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchLabels:
                  app: kafka
              topologyKey: topology.kubernetes.io/zone
      containers:
        - name: kafka
          image: apache/kafka:3.6.0
          ports:
            - containerPort: 9092
              name: kafka
            - containerPort: 7071
              name: jmx
          env:
            # Enable tiered storage
            - name: KAFKA_REMOTE_LOG_STORAGE_SYSTEM_ENABLE
              value: "true"
            - name: KAFKA_REMOTE_LOG_STORAGE_MANAGER_CLASS_NAME
              value: "org.apache.kafka.tiered.storage.s3.S3RemoteStorageManager"
            - name: KAFKA_REMOTE_LOG_STORAGE_S3_BUCKET_NAME
              valueFrom:
                configMapKeyRef:
                  name: kafka-config
                  key: s3-bucket
            - name: KAFKA_REMOTE_LOG_STORAGE_S3_REGION
              value: "us-east-1"
            # Use IRSA for AWS credentials
            - name: AWS_WEB_IDENTITY_TOKEN_FILE
              value: /var/run/secrets/eks.amazonaws.com/serviceaccount/token
            - name: AWS_ROLE_ARN
              valueFrom:
                configMapKeyRef:
                  name: kafka-config
                  key: aws-role-arn
          resources:
            requests:
              memory: "8Gi"
              cpu: "2"
            limits:
              memory: "16Gi"
              cpu: "4"
          volumeMounts:
            - name: data
              mountPath: /var/kafka/data
            - name: aws-token
              mountPath: /var/run/secrets/eks.amazonaws.com/serviceaccount
              readOnly: true
          livenessProbe:
            tcpSocket:
              port: 9092
            initialDelaySeconds: 60
            periodSeconds: 10
          readinessProbe:
            exec:
              command:
                - /bin/sh
                - -c
                - kafka-broker-api-versions.sh --bootstrap-server localhost:9092
            initialDelaySeconds: 30
            periodSeconds: 10
      volumes:
        - name: aws-token
          projected:
            sources:
              - serviceAccountToken:
                  path: token
                  expirationSeconds: 86400
                  audience: sts.amazonaws.com
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: fast-ssd
        resources:
          requests:
            storage: 500Gi
---
# ServiceAccount with IRSA annotation
apiVersion: v1
kind: ServiceAccount
metadata:
  name: kafka-broker
  namespace: kafka
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::ACCOUNT_ID:role/kafka-tiered-storage-role
```

### Production Configuration Checklist

```properties
# Production-ready broker.conf for tiered storage
# Save this as a reference for production deployments

########################
# Tiered Storage Settings
########################

# Enable tiered storage
remote.log.storage.system.enable=true

# S3 configuration
remote.log.storage.manager.class.name=org.apache.kafka.tiered.storage.s3.S3RemoteStorageManager
remote.log.storage.s3.bucket.name=kafka-tiered-storage-prod
remote.log.storage.s3.region=us-east-1

# Use IAM roles (no hardcoded credentials)
remote.log.storage.s3.credentials.provider=DEFAULT

# Performance tuning for production
# Larger segments = fewer uploads, better efficiency
log.segment.bytes=1073741824

# Time-based segment rolling (1 day max)
log.roll.ms=86400000

# Multipart upload settings
remote.log.storage.s3.multipart.upload.threshold.bytes=104857600
remote.log.storage.s3.multipart.upload.part.size.bytes=10485760

# Connection pool for remote operations
remote.log.storage.s3.max.connections=100

# Read buffer for fetch operations
remote.log.storage.s3.read.buffer.size.bytes=4194304

########################
# Metadata Manager
########################

# Remote log metadata topic configuration
remote.log.metadata.topic.replication.factor=3
remote.log.metadata.topic.num.partitions=50
remote.log.metadata.topic.retention.ms=-1

########################
# Local Retention Defaults
########################

# Default local retention (can be overridden per-topic)
# Keep segments locally for 24 hours after upload
log.local.retention.ms=86400000

# Alternative: size-based local retention
# log.local.retention.bytes=107374182400

########################
# Upload Scheduling
########################

# Interval to check for segments to upload (30 seconds)
remote.log.manager.task.interval.ms=30000

# Maximum concurrent uploads per broker
remote.log.manager.max.thread.pool.size=10

########################
# Reliability Settings
########################

# Retry failed uploads
remote.log.manager.max.copy.retries=5

# Backoff between retries
remote.log.manager.copy.retry.backoff.ms=5000

# Timeout for upload operations (5 minutes)
remote.log.storage.s3.request.timeout.ms=300000
```

---

## Troubleshooting Common Issues

### Upload Failures

```bash
# Check for upload errors in broker logs
grep -i "remote" /var/log/kafka/server.log | grep -i "error"

# Common errors and solutions:

# Error: "Access Denied"
# Solution: Check IAM permissions and bucket policy
aws s3api get-bucket-policy --bucket kafka-tiered-storage-prod

# Error: "Connection timeout"
# Solution: Check VPC endpoints or internet connectivity
aws s3 ls s3://kafka-tiered-storage-prod/ --region us-east-1

# Error: "No space left on device"
# Solution: Local disk full - increase disk or reduce local retention
df -h /var/kafka/data
```

### Slow Upload Performance

```bash
# Check current upload rate
curl -s http://localhost:7071/metrics | grep remote_copy_bytes

# Solutions:
# 1. Increase thread pool size
# remote.log.manager.max.thread.pool.size=20

# 2. Use larger segment sizes for fewer uploads
# log.segment.bytes=2147483648

# 3. Enable S3 Transfer Acceleration
# aws s3api put-bucket-accelerate-configuration \
#     --bucket kafka-tiered-storage-prod \
#     --accelerate-configuration Status=Enabled
```

### High Latency for Historical Reads

```bash
# Monitor remote fetch latency
curl -s http://localhost:7071/metrics | grep remote_fetch

# Solutions:
# 1. Increase read buffer size
# remote.log.storage.s3.read.buffer.size.bytes=8388608

# 2. Consider keeping more data locally
# log.local.retention.ms=172800000  # 2 days

# 3. Enable S3 prefetch/caching at client level

# 4. Use S3 Intelligent-Tiering to avoid retrieval delays
```

### Metadata Issues

```bash
# Check remote log metadata topic
kafka-topics.sh --bootstrap-server localhost:9092 \
    --describe --topic __remote_log_metadata

# Verify metadata consistency
kafka-console-consumer.sh --bootstrap-server localhost:9092 \
    --topic __remote_log_metadata \
    --from-beginning \
    --max-messages 10

# If metadata is corrupted, you may need to rebuild
# WARNING: This is a destructive operation
# kafka-storage.sh format --config /etc/kafka/server.properties --rebuild-metadata
```

---

## Best Practices Summary

### Configuration Best Practices

1. **Size your segments appropriately**: Use 1GB segments for a good balance between upload frequency and recovery time
2. **Set realistic local retention**: Keep enough data locally to handle burst read patterns
3. **Use IAM roles**: Avoid hardcoding credentials in configuration files
4. **Enable encryption**: Use server-side encryption for data at rest

### Operational Best Practices

1. **Monitor proactively**: Set up alerts for upload failures and lag before they impact consumers
2. **Test disaster recovery**: Regularly verify you can read from remote storage
3. **Implement lifecycle policies**: Automatically move data to cheaper storage classes
4. **Plan capacity**: Account for upload bandwidth in your network planning

### Security Best Practices

1. **Least privilege**: Grant only required S3 permissions to Kafka brokers
2. **Network isolation**: Use VPC endpoints to avoid public internet exposure
3. **Encrypt in transit**: Use TLS for all S3 communications
4. **Audit access**: Enable S3 access logging and CloudTrail

---

## Monitor Your Kafka Cluster with OneUptime

Effective tiered storage management requires comprehensive monitoring. [OneUptime](https://oneuptime.com) provides:

- **Real-time metrics** for upload/download operations and storage distribution
- **Intelligent alerting** when upload failures or latency spikes occur
- **Dashboard visualization** for cost tracking and capacity planning
- **Incident management** with automatic correlation of storage issues to application impact

Set up OneUptime to monitor your Kafka cluster and get notified before storage issues impact your applications.

---

## Conclusion

Kafka tiered storage is a game-changing feature that enables cost-effective long-term data retention without sacrificing performance for recent data. Key takeaways:

1. **Plan your tiers**: Define clear boundaries between hot, warm, cold, and archive data based on access patterns
2. **Configure thoughtfully**: Balance local retention against storage costs and read latency requirements
3. **Monitor continuously**: Track upload rates, errors, and costs to optimize your configuration
4. **Automate lifecycle**: Use cloud provider lifecycle policies to automatically move data to cheaper tiers
5. **Test recovery**: Ensure your consumers can read from remote storage when needed

With proper implementation, tiered storage can reduce your Kafka storage costs by 70-90% while maintaining the performance characteristics that make Kafka an excellent choice for event streaming workloads.

---

## Related Resources

- [Apache Kafka Documentation - Tiered Storage](https://kafka.apache.org/documentation/#tieredstorageoverview)
- [KIP-405: Kafka Tiered Storage](https://cwiki.apache.org/confluence/display/KAFKA/KIP-405%3A+Kafka+Tiered+Storage)
- [OneUptime Monitoring](https://oneuptime.com) - Monitor your Kafka clusters
- [AWS S3 Storage Classes](https://aws.amazon.com/s3/storage-classes/)
- [GCS Storage Classes](https://cloud.google.com/storage/docs/storage-classes)
