# How to Use Registry Storage Backends with S3 and Azure Blob for Harbor

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Harbor, Object Storage, AWS S3

Description: Learn how to configure Harbor with S3 and Azure Blob Storage backends for scalable, cost-effective container image storage that separates compute from storage.

---

Harbor's architecture separates the registry service from the storage backend, allowing you to choose where container images are stored. While local filesystem storage works for testing, production deployments benefit from object storage like AWS S3 or Azure Blob Storage, which provides durability, scalability, and cost optimization.

## Why Use Object Storage for Harbor

The default filesystem storage backend has limitations that become apparent at scale:

**Limited scalability** - Storage capacity is bound by the volume size attached to the Harbor node.

**No redundancy** - Filesystem storage on a single node creates a single point of failure.

**Backup complexity** - Backing up filesystem storage requires volume snapshots or file copies.

**Cost inefficiency** - Block storage is more expensive per GB than object storage.

Object storage backends solve these issues by providing practically unlimited capacity, built-in replication, automatic durability, and lower costs. The tradeoff is slightly higher latency, which is acceptable for container image pulls.

## Understanding Harbor Storage Architecture

Harbor uses the Docker Registry v2 implementation, which supports pluggable storage drivers. The registry component stores image layers as blobs in the configured backend. Harbor's database tracks metadata (repositories, tags, artifacts), while the storage backend holds the actual layer data.

This separation means you can:
- Scale storage independently of compute
- Use different storage classes for cost optimization
- Replicate storage across regions
- Implement sophisticated backup and recovery strategies

## Configuring Harbor with AWS S3

S3 is the most popular backend for Harbor deployments. The configuration requires an S3 bucket, IAM credentials, and proper Harbor settings.

First, create an S3 bucket:

```bash
# Create S3 bucket for Harbor
aws s3 mb s3://my-harbor-registry --region us-east-1

# Enable versioning for data protection
aws s3api put-bucket-versioning \
  --bucket my-harbor-registry \
  --versioning-configuration Status=Enabled

# Block public access
aws s3api put-public-access-block \
  --bucket my-harbor-registry \
  --public-access-block-configuration \
    BlockPublicAcls=true,\
    IgnorePublicAcls=true,\
    BlockPublicPolicy=true,\
    RestrictPublicBuckets=true
```

Create an IAM policy for Harbor:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::my-harbor-registry",
        "arn:aws:s3:::my-harbor-registry/*"
      ]
    }
  ]
}
```

Create an IAM user and attach the policy:

```bash
# Create IAM user
aws iam create-user --user-name harbor-s3-user

# Attach policy (assuming policy ARN)
aws iam attach-user-policy \
  --user-name harbor-s3-user \
  --policy-arn arn:aws:iam::123456789012:policy/HarborS3Policy

# Create access keys
aws iam create-access-key --user-name harbor-s3-user
```

Save the access key ID and secret access key for Harbor configuration.

## Harbor Helm Chart with S3 Backend

When deploying Harbor via Helm, configure S3 in the values file:

```yaml
# harbor-values.yaml
persistence:
  # Disable local persistent volumes for registry
  enabled: true
  persistentVolumeClaim:
    registry:
      storageClass: ""
      size: 5Gi  # Only needed for cache, not primary storage

# Configure S3 storage
registry:
  relativeurls: false
  storage:
    s3:
      region: us-east-1
      bucket: my-harbor-registry
      accesskey: AKIAIOSFODNN7EXAMPLE
      secretkey: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
      # Optional: use IAM role instead of keys (for EKS)
      # regionendpoint: ""
      encrypt: true
      secure: true
      v4auth: true
      chunksize: 5242880  # 5MB chunks
      rootdirectory: /registry  # Path prefix in bucket

# Enable storage cache for performance
cache:
  enabled: true
  expireHours: 24
```

Deploy Harbor with S3 backend:

```bash
helm repo add harbor https://helm.getharbor.io
helm repo update

helm install harbor harbor/harbor \
  -n harbor --create-namespace \
  -f harbor-values.yaml
```

## Using IAM Roles for EKS (IRSA)

For Harbor running on Amazon EKS, use IAM Roles for Service Accounts (IRSA) instead of hardcoded credentials:

```bash
# Create IAM OIDC provider for cluster
eksctl utils associate-iam-oidc-provider \
  --cluster my-cluster \
  --approve

# Create IAM service account
eksctl create iamserviceaccount \
  --name harbor-registry \
  --namespace harbor \
  --cluster my-cluster \
  --attach-policy-arn arn:aws:iam::123456789012:policy/HarborS3Policy \
  --approve
```

Update the Helm values to use the service account:

```yaml
registry:
  serviceAccountName: harbor-registry
  storage:
    s3:
      region: us-east-1
      bucket: my-harbor-registry
      # No accesskey/secretkey needed with IRSA
      encrypt: true
      secure: true
      v4auth: true
```

## Configuring Harbor with Azure Blob Storage

Azure Blob Storage provides similar benefits to S3 for Harbor deployments on Azure.

Create a storage account and container:

```bash
# Create resource group
az group create --name harbor-rg --location eastus

# Create storage account
az storage account create \
  --name harborregistry \
  --resource-group harbor-rg \
  --location eastus \
  --sku Standard_LRS \
  --kind StorageV2

# Get account key
ACCOUNT_KEY=$(az storage account keys list \
  --resource-group harbor-rg \
  --account-name harborregistry \
  --query '[0].value' -o tsv)

# Create blob container
az storage container create \
  --name registry \
  --account-name harborregistry \
  --account-key $ACCOUNT_KEY
```

Configure Harbor to use Azure Blob:

```yaml
# harbor-values-azure.yaml
registry:
  storage:
    azure:
      accountname: harborregistry
      accountkey: <storage-account-key>
      container: registry
      realm: core.windows.net
```

Deploy with Azure backend:

```bash
helm install harbor harbor/harbor \
  -n harbor --create-namespace \
  -f harbor-values-azure.yaml
```

## Using Managed Identity on AKS

For AKS clusters, use managed identities instead of storage keys:

```bash
# Create managed identity
az identity create \
  --name harbor-storage-identity \
  --resource-group harbor-rg

# Get identity client ID and resource ID
CLIENT_ID=$(az identity show \
  --name harbor-storage-identity \
  --resource-group harbor-rg \
  --query clientId -o tsv)

IDENTITY_ID=$(az identity show \
  --name harbor-storage-identity \
  --resource-group harbor-rg \
  --query id -o tsv)

# Assign storage permissions
az role assignment create \
  --role "Storage Blob Data Contributor" \
  --assignee $CLIENT_ID \
  --scope /subscriptions/<subscription-id>/resourceGroups/harbor-rg/providers/Microsoft.Storage/storageAccounts/harborregistry

# Enable workload identity on AKS
az aks update \
  --resource-group harbor-rg \
  --name my-aks-cluster \
  --enable-workload-identity \
  --enable-oidc-issuer
```

Update Helm values:

```yaml
registry:
  serviceAccountName: harbor-registry
  podAnnotations:
    azure.workload.identity/client-id: <client-id>
  storage:
    azure:
      accountname: harborregistry
      container: registry
      # No accountkey needed with managed identity
```

## Storage Performance Optimization

Tune storage settings for better performance:

```yaml
registry:
  storage:
    s3:
      # Increase chunk size for larger images
      chunksize: 10485760  # 10MB

      # Use multipart uploads
      multipartcopychunksize: 33554432  # 32MB
      multipartcopymaxconcurrency: 20
      multipartcopythresholdsize: 33554432

      # Enable S3 acceleration if available
      accelerate: true

    cache:
      blobdescriptor: redis

# Enable Redis for metadata caching
redis:
  external:
    enabled: true
    addr: "redis-cluster:6379"
```

## Migrating from Filesystem to Object Storage

To migrate an existing Harbor deployment from filesystem to S3:

```bash
# Export all images from current Harbor
#!/bin/bash
PROJECTS=$(curl -s -u admin:Harbor12345 \
  https://harbor.example.com/api/v2.0/projects | jq -r '.[].name')

for PROJECT in $PROJECTS; do
  REPOS=$(curl -s -u admin:Harbor12345 \
    "https://harbor.example.com/api/v2.0/projects/${PROJECT}/repositories" | \
    jq -r '.[].name')

  for REPO in $REPOS; do
    TAGS=$(curl -s -u admin:Harbor12345 \
      "https://harbor.example.com/api/v2.0/projects/${PROJECT}/repositories/${REPO}/artifacts" | \
      jq -r '.[].tags[].name')

    for TAG in $TAGS; do
      IMAGE="harbor.example.com/${REPO}:${TAG}"
      echo "Pulling ${IMAGE}"
      docker pull $IMAGE
    done
  done
done
```

Deploy new Harbor with S3 backend, then push images:

```bash
# Push to new Harbor with S3
for PROJECT in $PROJECTS; do
  # Create project in new Harbor
  curl -X POST -u admin:Harbor12345 \
    https://new-harbor.example.com/api/v2.0/projects \
    -H "Content-Type: application/json" \
    -d "{\"project_name\":\"${PROJECT}\"}"

  # Tag and push images
  for image in $(docker images --format "{{.Repository}}:{{.Tag}}" | grep harbor.example.com); do
    NEW_IMAGE=$(echo $image | sed 's/harbor.example.com/new-harbor.example.com/')
    docker tag $image $NEW_IMAGE
    docker push $NEW_IMAGE
  done
done
```

## Monitoring Storage Backend

Monitor storage metrics to ensure health:

```bash
# Check S3 bucket size
aws s3 ls s3://my-harbor-registry --recursive --summarize | \
  grep "Total Size"

# Get Azure Blob usage
az storage account show-usage \
  --resource-group harbor-rg \
  --name harborregistry
```

Set up CloudWatch or Azure Monitor alerts for storage capacity and costs.

## Cost Optimization Strategies

**Use lifecycle policies** - Move older image layers to cheaper storage tiers:

```bash
# S3 lifecycle policy
aws s3api put-bucket-lifecycle-configuration \
  --bucket my-harbor-registry \
  --lifecycle-configuration '{
    "Rules": [{
      "Id": "ArchiveOldLayers",
      "Status": "Enabled",
      "Transitions": [{
        "Days": 90,
        "StorageClass": "GLACIER_IR"
      }],
      "NoncurrentVersionTransitions": [{
        "NoncurrentDays": 30,
        "StorageClass": "STANDARD_IA"
      }]
    }]
  }'
```

**Enable compression** - Harbor supports compressed layers, reducing storage costs.

**Implement retention policies** - Delete old image tags automatically to reclaim space.

**Use cross-region replication selectively** - Only replicate critical production images.

## Conclusion

Configuring Harbor with S3 or Azure Blob Storage provides a production-grade foundation for container registries. Object storage backends offer superior scalability, durability, and cost efficiency compared to local filesystems. By leveraging managed identities, tuning performance settings, and implementing lifecycle policies, you can build a registry infrastructure that scales with your organization while controlling costs. This architecture supports multi-region deployments, disaster recovery, and long-term image retention with minimal operational overhead.
