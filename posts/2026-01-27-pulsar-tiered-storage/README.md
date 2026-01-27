# How to Configure Pulsar Tiered Storage

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Apache Pulsar, Tiered Storage, S3, GCS, Azure Blob, Cost Optimization, Messaging, Streaming, Data Architecture

Description: A comprehensive guide to configuring Apache Pulsar tiered storage with S3, GCS, and Azure Blob Storage, including offload policies, cost optimization strategies, and monitoring best practices.

---

> "The art of storage is not just about where you put data, but knowing when to move it." - Anonymous

Apache Pulsar's tiered storage feature allows you to offload older message data from expensive BookKeeper storage to cheaper cloud object stores like Amazon S3, Google Cloud Storage, or Azure Blob Storage. This architecture enables virtually unlimited storage capacity while maintaining Pulsar's low-latency characteristics for recent data.

This guide covers everything you need to configure and optimize Pulsar tiered storage for production workloads.

---

## Understanding Tiered Storage Architecture

Pulsar's tiered storage works by moving "ledger" segments from BookKeeper to object storage after they meet certain criteria. The process is transparent to consumers, meaning applications can read from both hot (BookKeeper) and cold (object store) tiers seamlessly.

```mermaid
flowchart TB
    subgraph Producers
        P1[Producer 1]
        P2[Producer 2]
        P3[Producer N]
    end

    subgraph Pulsar["Apache Pulsar Cluster"]
        B[Broker]
        subgraph BK["BookKeeper (Hot Tier)"]
            L1[Ledger 1<br/>Recent]
            L2[Ledger 2<br/>Recent]
            L3[Ledger 3<br/>Active]
        end
    end

    subgraph Cold["Cold Tier (Object Storage)"]
        S3[Amazon S3]
        GCS[Google Cloud Storage]
        Azure[Azure Blob Storage]
    end

    subgraph Consumers
        C1[Consumer 1]
        C2[Consumer 2]
    end

    P1 --> B
    P2 --> B
    P3 --> B
    B --> L3
    L3 -.->|Sealed| L2
    L2 -.->|Offloaded| S3
    L1 -.->|Offloaded| GCS
    B --> C1
    B --> C2
    S3 -.->|Read| B
    GCS -.->|Read| B
```

### Key Concepts

- **Ledger**: The basic storage unit in BookKeeper, containing a sequence of messages
- **Offload**: The process of copying ledger data to object storage
- **Offload Threshold**: The point at which Pulsar triggers offloading (by size or time)
- **Managed Ledger**: Pulsar's abstraction over BookKeeper ledgers that handles tiering

---

## Configuring S3 Tiered Storage

Amazon S3 is the most common choice for Pulsar tiered storage. Here's how to configure it.

### Broker Configuration

Add these settings to your `broker.conf` file:

```properties
# Enable tiered storage with S3
# This activates the offload mechanism in the broker
managedLedgerOffloadDriver=aws-s3

# S3 bucket configuration
# Use a dedicated bucket for Pulsar offload data
s3ManagedLedgerOffloadBucket=pulsar-tiered-storage-prod

# AWS region where your bucket is located
# Choose a region close to your Pulsar cluster for lower latency
s3ManagedLedgerOffloadRegion=us-east-1

# Optional: Use a specific S3 endpoint (useful for S3-compatible stores)
# s3ManagedLedgerOffloadServiceEndpoint=https://s3.us-east-1.amazonaws.com

# Authentication options (choose one):

# Option 1: IAM role (recommended for EC2/EKS)
# No additional config needed - uses instance profile

# Option 2: Access keys (for non-AWS deployments)
s3ManagedLedgerOffloadCredentialId=AKIAIOSFODNN7EXAMPLE
s3ManagedLedgerOffloadCredentialSecret=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

# Maximum block size for offloaded data (default: 64MB)
# Larger blocks = fewer API calls but more memory usage
s3ManagedLedgerOffloadMaxBlockSizeInBytes=67108864

# Read buffer size for retrieving offloaded data
# Tune based on your read patterns
s3ManagedLedgerOffloadReadBufferSizeInBytes=1048576
```

### IAM Policy for S3 Access

Create an IAM policy with minimal required permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PulsarTieredStorageAccess",
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:ListBucket",
                "s3:GetBucketLocation",
                "s3:AbortMultipartUpload",
                "s3:ListMultipartUploadParts"
            ],
            "Resource": [
                "arn:aws:s3:::pulsar-tiered-storage-prod",
                "arn:aws:s3:::pulsar-tiered-storage-prod/*"
            ]
        }
    ]
}
```

### S3 Bucket Configuration

Configure your S3 bucket with appropriate settings:

```bash
# Create the bucket with versioning disabled (Pulsar manages its own versions)
aws s3api create-bucket \
    --bucket pulsar-tiered-storage-prod \
    --region us-east-1

# Enable server-side encryption by default
aws s3api put-bucket-encryption \
    --bucket pulsar-tiered-storage-prod \
    --server-side-encryption-configuration '{
        "Rules": [{
            "ApplyServerSideEncryptionByDefault": {
                "SSEAlgorithm": "aws:kms",
                "KMSMasterKeyID": "alias/pulsar-tiered-storage"
            },
            "BucketKeyEnabled": true
        }]
    }'

# Block public access
aws s3api put-public-access-block \
    --bucket pulsar-tiered-storage-prod \
    --public-access-block-configuration '{
        "BlockPublicAcls": true,
        "IgnorePublicAcls": true,
        "BlockPublicPolicy": true,
        "RestrictPublicBuckets": true
    }'
```

---

## Configuring Google Cloud Storage

For GCP deployments, configure GCS as your offload target.

### Broker Configuration

```properties
# Enable GCS offloader
managedLedgerOffloadDriver=google-cloud-storage

# GCS bucket name
gcsManagedLedgerOffloadBucket=pulsar-tiered-storage-prod

# GCS region (optional, defaults to us-multi-region)
gcsManagedLedgerOffloadRegion=us-central1

# Service account credentials (JSON key file path)
# For GKE with Workload Identity, this can be omitted
gcsManagedLedgerOffloadServiceAccountKeyFile=/etc/pulsar/gcs-credentials.json

# Block size for offloaded segments
gcsManagedLedgerOffloadMaxBlockSizeInBytes=67108864

# Read buffer size
gcsManagedLedgerOffloadReadBufferSizeInBytes=1048576
```

### GCS IAM Configuration

Create a service account with Storage Object Admin role:

```bash
# Create service account for Pulsar
gcloud iam service-accounts create pulsar-tiered-storage \
    --display-name="Pulsar Tiered Storage"

# Grant storage permissions on the bucket
gsutil iam ch \
    serviceAccount:pulsar-tiered-storage@PROJECT_ID.iam.gserviceaccount.com:objectAdmin \
    gs://pulsar-tiered-storage-prod

# Create and download key (for non-GKE deployments)
gcloud iam service-accounts keys create /etc/pulsar/gcs-credentials.json \
    --iam-account=pulsar-tiered-storage@PROJECT_ID.iam.gserviceaccount.com
```

### GKE Workload Identity Setup

For GKE deployments, use Workload Identity instead of key files:

```yaml
# Kubernetes ServiceAccount with GCS access
apiVersion: v1
kind: ServiceAccount
metadata:
  name: pulsar-broker
  namespace: pulsar
  annotations:
    # Link to GCP service account
    iam.gke.io/gcp-service-account: pulsar-tiered-storage@PROJECT_ID.iam.gserviceaccount.com
```

```bash
# Bind the Kubernetes SA to the GCP SA
gcloud iam service-accounts add-iam-policy-binding \
    pulsar-tiered-storage@PROJECT_ID.iam.gserviceaccount.com \
    --role roles/iam.workloadIdentityUser \
    --member "serviceAccount:PROJECT_ID.svc.id.goog[pulsar/pulsar-broker]"
```

---

## Configuring Azure Blob Storage

For Azure deployments, use Azure Blob Storage as your cold tier.

### Broker Configuration

```properties
# Enable Azure Blob offloader
managedLedgerOffloadDriver=azureblob

# Azure storage account name
managedLedgerOffloadBucket=pulsartieredstorage

# Container name within the storage account
azureBlobStorageContainer=pulsar-offload

# Authentication (choose one method):

# Option 1: Account key
azureBlobStorageAccountKey=BASE64_ENCODED_ACCOUNT_KEY

# Option 2: SAS token
# azureBlobStorageSasToken=?sv=2021-06-08&ss=b&srt=sco&sp=rwdlacitfx...

# Option 3: Managed Identity (recommended for Azure VMs/AKS)
# azureBlobStorageUseManagedIdentity=true

# Block and buffer sizes
azureBlobStorageMaxBlockSizeInBytes=67108864
azureBlobStorageReadBufferSizeInBytes=1048576

# Azure endpoint (optional, for sovereign clouds)
# azureBlobStorageEndpoint=https://pulsartieredstorage.blob.core.windows.net
```

### Azure Storage Account Setup

```bash
# Create resource group
az group create \
    --name pulsar-storage-rg \
    --location eastus

# Create storage account with appropriate tier
az storage account create \
    --name pulsartieredstorage \
    --resource-group pulsar-storage-rg \
    --location eastus \
    --sku Standard_LRS \
    --kind StorageV2 \
    --access-tier Cool \
    --min-tls-version TLS1_2

# Create container
az storage container create \
    --name pulsar-offload \
    --account-name pulsartieredstorage \
    --auth-mode login

# Enable soft delete for data protection
az storage blob service-properties delete-policy update \
    --account-name pulsartieredstorage \
    --enable true \
    --days-retained 7
```

### AKS Managed Identity Setup

```yaml
# Pod identity binding for AKS
apiVersion: aadpodidentity.k8s.io/v1
kind: AzureIdentity
metadata:
  name: pulsar-blob-identity
  namespace: pulsar
spec:
  type: 0  # User-assigned managed identity
  resourceID: /subscriptions/SUB_ID/resourcegroups/pulsar-storage-rg/providers/Microsoft.ManagedIdentity/userAssignedIdentities/pulsar-offload-identity
  clientID: CLIENT_ID_OF_MANAGED_IDENTITY
---
apiVersion: aadpodidentity.k8s.io/v1
kind: AzureIdentityBinding
metadata:
  name: pulsar-blob-identity-binding
  namespace: pulsar
spec:
  azureIdentity: pulsar-blob-identity
  selector: pulsar-broker
```

---

## Configuring Offload Policies

Offload policies determine when data moves from BookKeeper to object storage. Configure these carefully to balance cost and performance.

### Size-Based Offload Policy

The most common approach - offload when topic storage exceeds a threshold:

```bash
# Set offload threshold at namespace level (10GB)
# Data older than this threshold will be offloaded
bin/pulsar-admin namespaces set-offload-threshold \
    --size 10G \
    tenant/namespace

# Verify the configuration
bin/pulsar-admin namespaces policies tenant/namespace
```

### Time-Based Offload Policy

Offload data older than a specific duration:

```bash
# Offload data older than 1 hour
# Useful for time-series data with predictable access patterns
bin/pulsar-admin namespaces set-offload-threshold \
    --time 1h \
    tenant/namespace

# Combine with size threshold for hybrid approach
bin/pulsar-admin namespaces set-offload-threshold \
    --size 5G \
    --time 2h \
    tenant/namespace
```

### Per-Topic Offload Configuration

Override namespace defaults for specific topics:

```bash
# Set offload policy for a specific topic
bin/pulsar-admin topics set-offload-policies \
    persistent://tenant/namespace/high-volume-topic \
    --driver aws-s3 \
    --bucket pulsar-high-volume-offload \
    --region us-east-1 \
    --offloadThresholdInBytes 1073741824 \
    --offloadDeletionLagInMillis 14400000  # 4 hours

# Check current offload status
bin/pulsar-admin topics offload-status \
    persistent://tenant/namespace/high-volume-topic
```

### Manual Offload Trigger

Force immediate offload for specific topics:

```bash
# Trigger manual offload up to a specific message ID
bin/pulsar-admin topics offload \
    persistent://tenant/namespace/topic-name \
    --message-id 1234:5678

# Trigger offload of all eligible data
bin/pulsar-admin topics offload \
    persistent://tenant/namespace/topic-name
```

---

## Cost Optimization Strategies

Tiered storage can significantly reduce costs when configured properly. Here's a comprehensive strategy.

```mermaid
flowchart LR
    subgraph Hot["Hot Tier (BookKeeper)"]
        H1[Last 1 hour<br/>High I/O SSDs<br/>$$$]
    end

    subgraph Warm["Warm Tier (S3 Standard)"]
        W1[1 hour - 7 days<br/>Frequent Access<br/>$$]
    end

    subgraph Cold["Cold Tier (S3 IA/Glacier IR)"]
        C1[7 - 30 days<br/>Infrequent Access<br/>$]
    end

    subgraph Archive["Archive Tier (Glacier)"]
        A1[30+ days<br/>Rare Access<br/>cents]
    end

    Hot -->|Offload| Warm
    Warm -->|Lifecycle| Cold
    Cold -->|Lifecycle| Archive
```

### S3 Lifecycle Policies

Configure S3 lifecycle rules to move data to cheaper storage classes:

```json
{
    "Rules": [
        {
            "ID": "PulsarTieredStorageLifecycle",
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
    --bucket pulsar-tiered-storage-prod \
    --lifecycle-configuration file://lifecycle-policy.json
```

### GCS Lifecycle Configuration

```json
{
    "lifecycle": {
        "rule": [
            {
                "action": {
                    "type": "SetStorageClass",
                    "storageClass": "NEARLINE"
                },
                "condition": {
                    "age": 7
                }
            },
            {
                "action": {
                    "type": "SetStorageClass",
                    "storageClass": "COLDLINE"
                },
                "condition": {
                    "age": 30
                }
            },
            {
                "action": {
                    "type": "SetStorageClass",
                    "storageClass": "ARCHIVE"
                },
                "condition": {
                    "age": 90
                }
            },
            {
                "action": {
                    "type": "Delete"
                },
                "condition": {
                    "age": 2555
                }
            }
        ]
    }
}
```

### Cost Estimation Formula

Calculate your expected costs with this approach:

```python
# Cost estimation for Pulsar tiered storage
# This script helps estimate monthly costs based on your usage patterns

def estimate_monthly_cost(
    daily_ingestion_gb: float,      # GB of data ingested per day
    hot_retention_hours: int,        # Hours to keep in BookKeeper
    warm_retention_days: int,        # Days in S3 Standard
    cold_retention_days: int,        # Days in S3 Standard-IA
    archive_retention_days: int,     # Days in Glacier
    read_ratio: float = 0.1,         # % of data read from cold storage
    s3_standard_per_gb: float = 0.023,
    s3_ia_per_gb: float = 0.0125,
    glacier_per_gb: float = 0.004,
    bookkeeper_per_gb: float = 0.10  # SSD-backed storage
) -> dict:
    """
    Estimate monthly costs for Pulsar tiered storage.

    Returns breakdown by storage tier and total monthly cost.
    """
    # Calculate data volume in each tier
    hot_data_gb = daily_ingestion_gb * (hot_retention_hours / 24)
    warm_data_gb = daily_ingestion_gb * warm_retention_days
    cold_data_gb = daily_ingestion_gb * cold_retention_days
    archive_data_gb = daily_ingestion_gb * archive_retention_days

    # Storage costs
    hot_cost = hot_data_gb * bookkeeper_per_gb
    warm_cost = warm_data_gb * s3_standard_per_gb
    cold_cost = cold_data_gb * s3_ia_per_gb
    archive_cost = archive_data_gb * glacier_per_gb

    # API and retrieval costs (estimated)
    # PUT requests for offload (~$0.005 per 1000 requests)
    offload_requests = (daily_ingestion_gb * 30) / 0.064  # 64MB blocks
    put_cost = (offload_requests / 1000) * 0.005

    # GET requests for reads (~$0.0004 per 1000 requests)
    read_data_gb = (warm_data_gb + cold_data_gb) * read_ratio
    get_requests = (read_data_gb * 1024) / 64  # 64MB reads
    get_cost = (get_requests / 1000) * 0.0004

    # Data retrieval costs for IA/Glacier
    ia_retrieval = cold_data_gb * read_ratio * 0.01

    total = hot_cost + warm_cost + cold_cost + archive_cost + put_cost + get_cost + ia_retrieval

    return {
        "hot_tier_cost": round(hot_cost, 2),
        "warm_tier_cost": round(warm_cost, 2),
        "cold_tier_cost": round(cold_cost, 2),
        "archive_tier_cost": round(archive_cost, 2),
        "api_costs": round(put_cost + get_cost, 2),
        "retrieval_costs": round(ia_retrieval, 2),
        "total_monthly_cost": round(total, 2),
        "total_storage_gb": round(hot_data_gb + warm_data_gb + cold_data_gb + archive_data_gb, 2)
    }

# Example: 100GB/day ingestion with tiered retention
result = estimate_monthly_cost(
    daily_ingestion_gb=100,
    hot_retention_hours=4,
    warm_retention_days=7,
    cold_retention_days=23,
    archive_retention_days=60
)

print(f"Monthly cost breakdown: {result}")
# Output shows significant savings vs. keeping all data in hot tier
```

### Compression Configuration

Enable compression to reduce storage costs further:

```properties
# broker.conf - Enable compression for offloaded data
managedLedgerOffloadAutoTriggerSizeThresholdBytes=10737418240

# LZ4 offers good balance of speed and compression
# Options: LZ4, ZLIB, ZSTD, SNAPPY
managedLedgerOffloadCompressionType=LZ4

# For archival workloads, ZSTD provides better compression
# managedLedgerOffloadCompressionType=ZSTD
```

---

## Monitoring Tiered Storage

Proper monitoring is essential for tiered storage operations. Here's what to track.

### Key Metrics to Monitor

```yaml
# Prometheus scrape config for Pulsar metrics
scrape_configs:
  - job_name: 'pulsar-broker'
    static_configs:
      - targets: ['pulsar-broker:8080']
    metrics_path: /metrics
```

### Critical Metrics

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `pulsar_storage_offloaded_size` | Total bytes offloaded | N/A (track trend) |
| `pulsar_storage_backlog_size` | Unacked message size | > 80% of quota |
| `pulsar_offload_error_total` | Offload failures | > 0 |
| `pulsar_offload_rate` | Offload throughput | < expected rate |
| `pulsar_read_from_offloaded` | Reads from cold storage | Unexpected spikes |

### Grafana Dashboard Query Examples

```promql
# Offload rate over time (bytes per minute)
rate(pulsar_storage_offloaded_size[5m]) * 60

# Percentage of reads from offloaded storage
sum(rate(pulsar_read_from_offloaded_total[5m]))
/
sum(rate(pulsar_read_total[5m])) * 100

# Offload errors by topic
sum by (topic) (increase(pulsar_offload_error_total[1h]))

# Storage distribution (hot vs cold)
# Hot storage
sum(pulsar_storage_size) - sum(pulsar_storage_offloaded_size)
# Cold storage
sum(pulsar_storage_offloaded_size)
```

### Offload Status Monitoring Script

```bash
#!/bin/bash
# Script to monitor offload status across all topics
# Run periodically via cron or as a Kubernetes CronJob

PULSAR_ADMIN="/opt/pulsar/bin/pulsar-admin"
ALERT_THRESHOLD_GB=100

# Get all namespaces
namespaces=$($PULSAR_ADMIN namespaces list public)

for ns in $namespaces; do
    # Get topics in namespace
    topics=$($PULSAR_ADMIN topics list $ns)

    for topic in $topics; do
        # Get offload status
        status=$($PULSAR_ADMIN topics offload-status $topic 2>/dev/null)

        # Get storage stats
        stats=$($PULSAR_ADMIN topics stats $topic 2>/dev/null)

        # Extract storage size (requires jq)
        storage_bytes=$(echo "$stats" | jq -r '.storageSize // 0')
        storage_gb=$(echo "scale=2; $storage_bytes / 1073741824" | bc)

        # Alert if storage exceeds threshold and offload not running
        if (( $(echo "$storage_gb > $ALERT_THRESHOLD_GB" | bc -l) )); then
            if [[ "$status" != *"RUNNING"* ]]; then
                echo "WARNING: $topic has ${storage_gb}GB but offload is not running"
                # Send alert to monitoring system
                curl -X POST "https://oneuptime.com/api/alert" \
                    -H "Content-Type: application/json" \
                    -d "{\"topic\": \"$topic\", \"storage_gb\": $storage_gb}"
            fi
        fi
    done
done
```

---

## Production Best Practices

### Deployment Architecture

```mermaid
flowchart TB
    subgraph Region1["Region: US-East"]
        subgraph PulsarCluster["Pulsar Cluster"]
            B1[Broker 1]
            B2[Broker 2]
            B3[Broker 3]
        end

        subgraph BookKeeper["BookKeeper (Hot)"]
            BK1[Bookie 1<br/>NVMe SSD]
            BK2[Bookie 2<br/>NVMe SSD]
            BK3[Bookie 3<br/>NVMe SSD]
        end
    end

    subgraph ObjectStorage["Object Storage (Cold)"]
        S3_Primary[S3 us-east-1<br/>Primary]
        S3_Replica[S3 us-west-2<br/>Cross-Region Replica]
    end

    subgraph Monitoring["Monitoring"]
        OT[OneUptime<br/>Alerts & Dashboards]
        Prom[Prometheus]
    end

    B1 --> BK1
    B2 --> BK2
    B3 --> BK3

    BK1 -.->|Offload| S3_Primary
    BK2 -.->|Offload| S3_Primary
    BK3 -.->|Offload| S3_Primary

    S3_Primary -->|Replicate| S3_Replica

    B1 --> Prom
    B2 --> Prom
    B3 --> Prom
    Prom --> OT
```

### Configuration Checklist

```yaml
# production-broker.conf best practices
# Save this as a reference for production deployments

# 1. Offload driver configuration
managedLedgerOffloadDriver: aws-s3
s3ManagedLedgerOffloadBucket: pulsar-prod-offload
s3ManagedLedgerOffloadRegion: us-east-1

# 2. Performance tuning
# Larger blocks = fewer API calls, better throughput
s3ManagedLedgerOffloadMaxBlockSizeInBytes: 134217728  # 128MB

# Buffer size for reads - tune based on consumer patterns
s3ManagedLedgerOffloadReadBufferSizeInBytes: 4194304  # 4MB

# 3. Offload thresholds
# Size-based: offload when topic exceeds this size
managedLedgerOffloadAutoTriggerSizeThresholdBytes: 10737418240  # 10GB

# Time-based: check for offload-eligible data this often
managedLedgerOffloadRunFrequencySecs: 300  # 5 minutes

# 4. Deletion lag - keep in BookKeeper after offload for safety
managedLedgerOffloadDeletionLagMs: 14400000  # 4 hours

# 5. Concurrency limits
# Max concurrent offload operations per broker
managedLedgerOffloadMaxConcurrentOffloads: 2

# 6. Compression
managedLedgerOffloadCompressionType: LZ4

# 7. Memory limits for offload operations
managedLedgerOffloadMaxMemory: 1073741824  # 1GB
```

### Kubernetes Deployment

```yaml
# Pulsar broker deployment with tiered storage
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: pulsar-broker
  namespace: pulsar
spec:
  replicas: 3
  selector:
    matchLabels:
      app: pulsar-broker
  template:
    metadata:
      labels:
        app: pulsar-broker
      annotations:
        # Enable Prometheus scraping
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
    spec:
      serviceAccountName: pulsar-broker
      containers:
        - name: broker
          image: apachepulsar/pulsar:3.2.0
          ports:
            - containerPort: 6650
              name: pulsar
            - containerPort: 8080
              name: http
          env:
            # S3 configuration via environment variables
            - name: PULSAR_PREFIX_managedLedgerOffloadDriver
              value: "aws-s3"
            - name: PULSAR_PREFIX_s3ManagedLedgerOffloadBucket
              valueFrom:
                configMapKeyRef:
                  name: pulsar-config
                  key: s3-bucket
            - name: PULSAR_PREFIX_s3ManagedLedgerOffloadRegion
              value: "us-east-1"
            # Use IRSA for AWS credentials (no keys in env)
          resources:
            requests:
              memory: "4Gi"
              cpu: "2"
            limits:
              memory: "8Gi"
              cpu: "4"
          # Offload operations need adequate memory
          volumeMounts:
            - name: pulsar-data
              mountPath: /pulsar/data
            - name: config
              mountPath: /pulsar/conf/broker.conf
              subPath: broker.conf
      volumes:
        - name: config
          configMap:
            name: pulsar-broker-config
  volumeClaimTemplates:
    - metadata:
        name: pulsar-data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: fast-ssd
        resources:
          requests:
            storage: 100Gi
```

---

## Troubleshooting Common Issues

### Offload Failures

```bash
# Check offload status for a topic
bin/pulsar-admin topics offload-status \
    persistent://tenant/namespace/topic

# Common error: "Offload failed: Access Denied"
# Solution: Check IAM permissions and bucket policy

# Common error: "Offload failed: Connection timeout"
# Solution: Check network connectivity and VPC endpoints

# View broker logs for detailed errors
kubectl logs pulsar-broker-0 -n pulsar | grep -i offload
```

### Slow Offload Performance

```bash
# Check current offload rate
curl -s http://localhost:8080/metrics | grep pulsar_offload

# Increase concurrency if CPU/network permits
# In broker.conf:
# managedLedgerOffloadMaxConcurrentOffloads=4

# Increase block size for better throughput (trade-off: more memory)
# s3ManagedLedgerOffloadMaxBlockSizeInBytes=134217728
```

### High Read Latency from Cold Storage

```bash
# Monitor cold storage reads
curl -s http://localhost:8080/metrics | grep read_from_offloaded

# Solutions:
# 1. Increase read buffer size
# 2. Enable S3 Transfer Acceleration
# 3. Move frequently accessed data to hotter tier
# 4. Use S3 Intelligent-Tiering for unpredictable access patterns
```

---

## Monitor Your Pulsar Cluster with OneUptime

Effective tiered storage management requires comprehensive monitoring. [OneUptime](https://oneuptime.com) provides:

- **Real-time metrics** for offload operations and storage distribution
- **Intelligent alerting** when offload failures or storage thresholds are breached
- **Dashboard visualization** for cost tracking and capacity planning
- **Incident management** with automatic correlation of storage issues to application impact

Set up OneUptime to monitor your Pulsar cluster and get notified before storage issues impact your applications.

---

## Conclusion

Pulsar tiered storage is a powerful feature that enables cost-effective long-term message retention without sacrificing performance for recent data. Key takeaways:

1. **Choose the right cloud provider** based on where your Pulsar cluster runs
2. **Configure offload policies** that match your data access patterns
3. **Implement lifecycle rules** to automatically move data to cheaper storage classes
4. **Monitor offload operations** to catch failures early
5. **Test recovery scenarios** to ensure you can read from cold storage when needed

With proper configuration, tiered storage can reduce your Pulsar storage costs by 70-90% while maintaining the performance characteristics that make Pulsar an excellent choice for streaming workloads.

---

## Related Resources

- [Apache Pulsar Official Documentation](https://pulsar.apache.org/docs/tiered-storage-overview/)
- [OneUptime Monitoring](https://oneuptime.com) - Monitor your Pulsar clusters
- [AWS S3 Storage Classes](https://aws.amazon.com/s3/storage-classes/)
- [GCS Storage Classes](https://cloud.google.com/storage/docs/storage-classes)
