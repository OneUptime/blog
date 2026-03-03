# How to Set Up S3-Compatible Backup Storage on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, S3, Backup Storage, MinIO, Velero, Object Storage

Description: A practical guide to configuring S3-compatible object storage for Kubernetes backups on Talos Linux clusters using MinIO and other providers.

---

Every backup strategy needs a reliable storage destination. For Kubernetes clusters, S3-compatible object storage has become the standard because it is durable, scalable, and supported by every major backup tool. Whether you use AWS S3, MinIO, Wasabi, Backblaze B2, or DigitalOcean Spaces, the S3 API is the common interface that makes your backup storage interchangeable.

On Talos Linux, where the OS is stateless and ephemeral, storing backups on external object storage is not just convenient - it is essential. If you lose your cluster, the backups need to be somewhere else entirely. This guide covers setting up S3-compatible storage for Kubernetes backups, with specific instructions for both cloud and self-hosted options.

## Choosing Your S3-Compatible Storage

Here is a comparison of popular S3-compatible storage options:

| Provider | Best For | Pricing Model |
|---|---|---|
| AWS S3 | Cloud-native AWS clusters | Per GB stored + transfer |
| MinIO | On-premises / self-hosted | Hardware cost only |
| Wasabi | Cost-effective cloud | Flat per-GB, no egress fees |
| Backblaze B2 | Budget-friendly | Low per-GB, affordable egress |
| DigitalOcean Spaces | DO infrastructure | Simple per-GB pricing |

## Option 1: Setting Up MinIO for On-Premises Storage

MinIO is the most popular self-hosted S3-compatible storage solution. It runs as a container in your Talos Linux cluster or on separate infrastructure.

### Deploying MinIO in the Cluster

```bash
# Add the MinIO Helm repository
helm repo add minio https://charts.min.io/
helm repo update
```

Create a values file for a production MinIO deployment.

```yaml
# minio-values.yaml
mode: distributed
replicas: 4
persistence:
  enabled: true
  size: 100Gi
  storageClass: "local-path"
resources:
  requests:
    cpu: 250m
    memory: 512Mi
  limits:
    cpu: 1000m
    memory: 2Gi
rootUser: "minio-admin"
rootPassword: "minio-secret-key-change-me"
buckets:
  - name: velero-backups
    policy: none
    purge: false
  - name: etcd-backups
    policy: none
    purge: false
users:
  - accessKey: velero
    secretKey: velero-secret-key
    policy: readwrite
service:
  type: ClusterIP
  port: 9000
consoleService:
  type: ClusterIP
  port: 9001
```

```bash
# Install MinIO
helm install minio minio/minio \
  --namespace minio \
  --create-namespace \
  --values minio-values.yaml

# Wait for pods to be ready
kubectl get pods -n minio -w
```

### Deploying MinIO Outside the Cluster

For better separation between backups and the cluster being backed up, deploy MinIO on separate infrastructure. This ensures you can access backups even if the entire Talos cluster is lost.

```bash
# Using Docker on a separate server
docker run -d \
  --name minio \
  -p 9000:9000 \
  -p 9001:9001 \
  -v /data/minio:/data \
  -e MINIO_ROOT_USER=minio-admin \
  -e MINIO_ROOT_PASSWORD=minio-secret-key \
  minio/minio server /data --console-address ":9001"

# Create the backup bucket using the MinIO client
docker run --rm \
  --entrypoint sh \
  minio/mc -c "
    mc alias set local http://minio-host:9000 minio-admin minio-secret-key &&
    mc mb local/velero-backups &&
    mc mb local/etcd-backups
  "
```

## Option 2: Using AWS S3

### Creating an S3 Bucket

```bash
# Create the backup bucket
aws s3 mb s3://talos-cluster-backups --region us-east-1

# Enable versioning for extra protection
aws s3api put-bucket-versioning \
  --bucket talos-cluster-backups \
  --versioning-configuration Status=Enabled

# Set up lifecycle rules for automatic cleanup
aws s3api put-bucket-lifecycle-configuration \
  --bucket talos-cluster-backups \
  --lifecycle-configuration '{
    "Rules": [
      {
        "ID": "Move to IA after 30 days",
        "Status": "Enabled",
        "Filter": {"Prefix": "backups/"},
        "Transitions": [
          {"Days": 30, "StorageClass": "STANDARD_IA"},
          {"Days": 90, "StorageClass": "GLACIER"}
        ],
        "Expiration": {"Days": 365}
      }
    ]
  }'
```

### Creating an IAM Policy

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
        "s3:ListBucket",
        "s3:GetBucketLocation",
        "s3:ListBucketMultipartUploads",
        "s3:AbortMultipartUpload",
        "s3:ListMultipartUploadParts"
      ],
      "Resource": [
        "arn:aws:s3:::talos-cluster-backups",
        "arn:aws:s3:::talos-cluster-backups/*"
      ]
    }
  ]
}
```

```bash
# Create the IAM user and policy
aws iam create-user --user-name velero-backup
aws iam put-user-policy \
  --user-name velero-backup \
  --policy-name velero-backup-policy \
  --policy-document file://velero-policy.json

# Create access keys
aws iam create-access-key --user-name velero-backup
```

## Configuring Velero with S3 Storage

### For AWS S3

```bash
# Create credentials file
cat > credentials-velero <<EOF
[default]
aws_access_key_id=AKIAEXAMPLEACCESSKEY
aws_secret_access_key=wJalrXUtnFEMI/K7MDENG/exampleSecretKey
EOF

# Install Velero
velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.9.0 \
  --bucket talos-cluster-backups \
  --backup-location-config region=us-east-1 \
  --secret-file ./credentials-velero \
  --use-node-agent \
  --default-volumes-to-fs-backup

rm credentials-velero
```

### For MinIO

```bash
# Create credentials file for MinIO
cat > credentials-minio <<EOF
[default]
aws_access_key_id=velero
aws_secret_access_key=velero-secret-key
EOF

# Install Velero pointing to MinIO
velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.9.0 \
  --bucket velero-backups \
  --backup-location-config \
    region=minio,s3ForcePathStyle=true,s3Url=http://minio.minio.svc:9000 \
  --secret-file ./credentials-minio \
  --use-node-agent \
  --default-volumes-to-fs-backup

rm credentials-minio
```

### For External MinIO

```bash
cat > credentials-minio <<EOF
[default]
aws_access_key_id=velero
aws_secret_access_key=velero-secret-key
EOF

velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.9.0 \
  --bucket velero-backups \
  --backup-location-config \
    region=minio,s3ForcePathStyle=true,s3Url=http://minio-host.example.com:9000 \
  --secret-file ./credentials-minio \
  --use-node-agent \
  --default-volumes-to-fs-backup

rm credentials-minio
```

## Configuring Multiple Backup Locations

You can configure Velero with multiple storage locations for redundancy.

```yaml
# secondary-backup-location.yaml
apiVersion: velero.io/v1
kind: BackupStorageLocation
metadata:
  name: secondary-s3
  namespace: velero
spec:
  provider: aws
  default: false
  objectStorage:
    bucket: talos-backup-secondary
    prefix: velero
  config:
    region: eu-west-1
  credential:
    name: secondary-s3-credentials
    key: cloud
```

```bash
# Create the credentials for the secondary location
kubectl create secret generic secondary-s3-credentials \
  --namespace velero \
  --from-file=cloud=credentials-secondary

# Apply the backup location
kubectl apply -f secondary-backup-location.yaml

# Create a backup targeting the secondary location
velero backup create secondary-backup \
  --storage-location secondary-s3 \
  --include-namespaces production
```

## Enabling Server-Side Encryption

### AWS S3 with SSE-S3

```bash
# Configure the backup location with encryption
velero backup-location create encrypted-s3 \
  --provider aws \
  --bucket talos-cluster-backups \
  --config region=us-east-1,serverSideEncryption=AES256

# Or use SSE-KMS
velero backup-location create encrypted-kms \
  --provider aws \
  --bucket talos-cluster-backups \
  --config region=us-east-1,serverSideEncryption=aws:kms,kmsKeyId=your-kms-key-id
```

### MinIO with Encryption

```bash
# Enable encryption on MinIO using the mc client
mc encrypt set sse-s3 local/velero-backups
```

## Monitoring Storage Health

Create a monitoring job that checks storage availability and usage.

```yaml
# storage-health-check.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: backup-storage-health
  namespace: velero
spec:
  schedule: "*/30 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: health-check
              image: amazon/aws-cli:latest
              command:
                - /bin/sh
                - -c
                - |
                  echo "=== Backup Storage Health Check ==="
                  echo "Timestamp: $(date)"

                  # Check if the bucket is accessible
                  aws s3 ls s3://talos-cluster-backups/ \
                    --endpoint-url "${S3_ENDPOINT}" \
                    --region minio 2>&1

                  if [ $? -eq 0 ]; then
                    echo "Storage: HEALTHY"
                  else
                    echo "Storage: UNREACHABLE"
                    exit 1
                  fi

                  # Check total backup size
                  TOTAL_SIZE=$(aws s3 ls s3://talos-cluster-backups/ \
                    --endpoint-url "${S3_ENDPOINT}" \
                    --region minio \
                    --recursive \
                    --summarize | grep "Total Size" | awk '{print $3, $4}')

                  echo "Total backup size: ${TOTAL_SIZE}"

                  # Count backup objects
                  OBJECT_COUNT=$(aws s3 ls s3://talos-cluster-backups/ \
                    --endpoint-url "${S3_ENDPOINT}" \
                    --region minio \
                    --recursive \
                    --summarize | grep "Total Objects" | awk '{print $3}')

                  echo "Total objects: ${OBJECT_COUNT}"
              env:
                - name: S3_ENDPOINT
                  value: "http://minio.minio.svc:9000"
                - name: AWS_ACCESS_KEY_ID
                  valueFrom:
                    secretKeyRef:
                      name: velero
                      key: aws-access-key-id
                - name: AWS_SECRET_ACCESS_KEY
                  valueFrom:
                    secretKeyRef:
                      name: velero
                      key: aws-secret-access-key
          restartPolicy: OnFailure
```

## Data Replication for Disaster Recovery

For critical environments, replicate backup data to a secondary location.

```bash
# Using MinIO's built-in replication
mc replicate add local/velero-backups \
  --remote-bucket velero-backups-replica \
  --remote-target secondary

# Or use aws s3 sync for cross-region replication
aws s3 sync s3://talos-cluster-backups s3://talos-cluster-backups-dr \
  --source-region us-east-1 \
  --region eu-west-1
```

## Immutable Backups with Object Lock

Protect backups from accidental or malicious deletion using S3 Object Lock.

```bash
# Create a bucket with Object Lock enabled
aws s3api create-bucket \
  --bucket talos-immutable-backups \
  --region us-east-1 \
  --object-lock-enabled-for-bucket

# Set a default retention policy
aws s3api put-object-lock-configuration \
  --bucket talos-immutable-backups \
  --object-lock-configuration '{
    "ObjectLockEnabled": "Enabled",
    "Rule": {
      "DefaultRetention": {
        "Mode": "COMPLIANCE",
        "Days": 30
      }
    }
  }'
```

With Object Lock in COMPLIANCE mode, no one can delete the backups until the retention period expires, not even the root account.

## Wrapping Up

S3-compatible storage is the backbone of any Kubernetes backup strategy on Talos Linux. Whether you choose AWS S3 for cloud convenience, MinIO for on-premises control, or a cost-effective provider like Wasabi, the setup process follows the same patterns. The critical decisions are: where to host your storage (outside the cluster being backed up), whether to enable encryption, and how to handle replication for disaster recovery. With proper S3 storage in place, your Velero backups have a reliable, durable home that persists independently of your Talos Linux cluster.
