# How to Configure Harvester Backup Target

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Harvester, Kubernetes, Virtualization, HCI, Backup, S3, NFS, DR

Description: Learn how to configure external backup targets in Harvester, including S3-compatible object storage and NFS, for VM data protection and disaster recovery.

## Introduction

Configuring a backup target is a critical step in any production Harvester deployment. Without an external backup target, VM backups cannot be created, leaving you with only on-cluster snapshots for data protection. Harvester supports two types of backup targets: S3-compatible object storage (AWS S3, MinIO, Ceph RGW, etc.) and NFS shares. Backup support is currently limited to Longhorn-backed volumes; volumes on external storage cannot be backed up by Harvester. This guide covers setting up both, along with validation and best practices.

## Backup Target Options

| Target Type | Pros | Cons |
|---|---|---|
| S3 (AWS) | Highly durable, scalable, no maintenance | Cost, internet required |
| S3 (MinIO) | On-premises, full control | Self-managed, SPOF risk |
| NFS | Simple, fast, on-premises | SPOF risk, less scalable |

## Step 1: Set Up an S3 Backup Target

### Using AWS S3

```bash
# First, create an S3 bucket for Harvester backups

aws s3 mb s3://my-harvester-backups --region us-east-1

# Create an IAM policy for Harvester backup access
cat > harvester-backup-policy.json << 'EOF'
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
                "s3:ListMultipartUploadParts",
                "s3:AbortMultipartUpload"
            ],
            "Resource": [
                "arn:aws:s3:::my-harvester-backups",
                "arn:aws:s3:::my-harvester-backups/*"
            ]
        }
    ]
}
EOF

aws iam create-policy \
    --policy-name HarvesterBackupPolicy \
    --policy-document file://harvester-backup-policy.json

# Create an IAM user for Harvester
aws iam create-user --user-name harvester-backup

# Attach the policy
aws iam attach-user-policy \
    --user-name harvester-backup \
    --policy-arn arn:aws:iam::ACCOUNT_ID:policy/HarvesterBackupPolicy

# Create access keys
aws iam create-access-key --user-name harvester-backup
# Note the AccessKeyId and SecretAccessKey - you'll need these
```

### Configure in Harvester UI

1. Navigate to **Advanced** → **Settings**
2. Click **Edit** on **Backup Target**
3. Configure:

```text
Type:                   S3
Endpoint:               https://s3.amazonaws.com
Bucket Name:            my-harvester-backups
Region:                 us-east-1
Access Key ID:          AKIAIOSFODNN7EXAMPLE
Secret Access Key:      wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
Virtual Hosted-Style:   Enabled
```

4. Click **Save** and verify the connection

### Configure via kubectl

```yaml
# backup-target-setting.yaml
# Configure S3 as the backup target

apiVersion: harvesterhci.io/v1beta1
kind: Setting
metadata:
  name: backup-target
value: |
  {
    "type": "s3",
    "endpoint": "https://s3.amazonaws.com",
    "bucketName": "my-harvester-backups",
    "bucketRegion": "us-east-1",
    "accessKeyId": "AKIAIOSFODNN7EXAMPLE",
    "secretAccessKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    "virtualHostedStyle": true
  }
```

```bash
kubectl apply -f backup-target-setting.yaml

# Verify the backup target is configured
kubectl get setting backup-target \
    -o jsonpath='{.value}' | jq .
```

## Step 2: Set Up MinIO as an S3-Compatible Target

For on-premises deployments, MinIO provides S3-compatible storage:

```bash
# Deploy MinIO (example using Docker)
docker run -d \
    --name minio \
    -p 9000:9000 \
    -p 9001:9001 \
    -v /data/minio:/data \
    -e MINIO_ROOT_USER=minioadmin \
    -e MINIO_ROOT_PASSWORD='minioadmin123!' \
    quay.io/minio/minio server /data --console-address ":9001"

# Or deploy MinIO in Kubernetes
kubectl apply -f - <<EOF
apiVersion: v1
kind: Namespace
metadata:
  name: minio-system
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: minio-data
  namespace: minio-system
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 50Gi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: minio
  namespace: minio-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: minio
  template:
    metadata:
      labels:
        app: minio
    spec:
      containers:
        - name: minio
          image: quay.io/minio/minio:latest
          args: ["server", "/data", "--console-address", ":9001"]
          env:
            - name: MINIO_ROOT_USER
              value: "minioadmin"
            - name: MINIO_ROOT_PASSWORD
              value: "minioadmin123!"
          ports:
            - containerPort: 9000
            - containerPort: 9001
          volumeMounts:
            - name: data
              mountPath: /data
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: minio-data
---
apiVersion: v1
kind: Service
metadata:
  name: minio
  namespace: minio-system
spec:
  selector:
    app: minio
  ports:
    - name: api
      port: 9000
      targetPort: 9000
    - name: console
      port: 9001
      targetPort: 9001
EOF

# If you used the Kubernetes example, run this in another terminal first
kubectl -n minio-system port-forward svc/minio 9000:9000 9001:9001

# Create a bucket in MinIO
mc alias set myminio http://127.0.0.1:9000 minioadmin 'minioadmin123!'
mc mb myminio/harvester-backups
```

### Configure Harvester to Use MinIO

```yaml
# backup-target-minio.yaml
apiVersion: harvesterhci.io/v1beta1
kind: Setting
metadata:
  name: backup-target
value: |
  {
    "type": "s3",
    "endpoint": "http://192.168.1.50:9000",
    "bucketName": "harvester-backups",
    "bucketRegion": "us-east-1",
    "accessKeyId": "minioadmin",
    "secretAccessKey": "minioadmin123!",
    "virtualHostedStyle": false
  }
```

## Step 3: Set Up NFS Backup Target

```bash
# Longhorn backup targets require NFSv4 support

# On the NFS server, create the export directory
mkdir -p /data/harvester-backups
chown -R nobody:nogroup /data/harvester-backups
chmod 777 /data/harvester-backups

# Configure NFS exports
echo "/data/harvester-backups 192.168.1.0/24(rw,sync,no_subtree_check,no_root_squash)" \
    >> /etc/exports

# Apply the export
exportfs -ra

# Verify the export
showmount -e localhost
```

```yaml
# backup-target-nfs.yaml
apiVersion: harvesterhci.io/v1beta1
kind: Setting
metadata:
  name: backup-target
value: |
  {
    "type": "nfs",
    "endpoint": "nfs://192.168.1.50:/data/harvester-backups"
  }
```

## Step 4: Verify the Backup Target

```bash
# Test the backup target by creating a test backup
kubectl apply -f - <<EOF
apiVersion: harvesterhci.io/v1beta1
kind: VirtualMachineBackup
metadata:
  name: backup-target-test
  namespace: default
spec:
  source:
    apiGroup: kubevirt.io
    kind: VirtualMachine
    name: ubuntu-web-01  # Replace with an existing VM that uses Longhorn-backed volumes
  type: backup
EOF

# Watch the backup progress
kubectl get virtualmachinebackup backup-target-test -n default -w

# Verify backup data in S3
aws s3 ls s3://my-harvester-backups/ --recursive | head

# Or in MinIO
mc ls myminio/harvester-backups/
```

## Step 5: Manage Backup Retention

Do not configure S3 bucket lifecycle rules that delete Harvester backup objects directly. Longhorn manages backup lifecycle in the backup store, and Harvester provides scheduled VM backups with a **Retain** setting to control how many backups are kept.

## Conclusion

Configuring a reliable backup target is non-negotiable for production Harvester deployments. S3-compatible storage offers the best combination of durability, scalability, and operational simplicity - AWS S3 for cloud-connected deployments, MinIO for on-premises. NFS is a viable option for environments with existing NAS infrastructure. Whichever target you choose, verify it works by creating a test backup and performing a test restore before relying on it for production data protection. With the backup target configured, you can enable scheduled backups and sleep soundly knowing your VM data is protected off-cluster.
