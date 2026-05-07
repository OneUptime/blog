# How to Back Up Rancher to S3

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Backup, S3

Description: Learn how to configure the Rancher Backup Operator to store backups in Amazon S3 for durable, off-cluster storage.

Storing Rancher backups on the same cluster they protect defeats the purpose of disaster recovery. Amazon S3 provides highly durable, off-site storage for your Rancher backups. This guide walks you through configuring the Rancher Backup Operator to store backups in an S3 bucket.

## Prerequisites

- A supported Rancher version with the Backup Operator installed
- An AWS account with S3 access
- An S3 bucket created for Rancher backups
- AWS access key and secret key with appropriate permissions
- kubectl access with cluster admin privileges

## Step 1: Create an S3 Bucket

If you have not already created a bucket, do so using the AWS CLI:

```bash
aws s3 mb s3://rancher-backups-production --region us-east-1
```

Enable versioning on the bucket for additional protection:

```bash
aws s3api put-bucket-versioning \
  --bucket rancher-backups-production \
  --versioning-configuration Status=Enabled
```

## Step 2: Create an IAM Policy

Create an IAM policy that grants the minimum required permissions for the Backup Operator. Save the following as `rancher-backup-policy.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::rancher-backups-production"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:PutObjectAcl"
      ],
      "Resource": [
        "arn:aws:s3:::rancher-backups-production/*"
      ]
    }
  ]
}
```

Create the policy and an IAM user:

```bash
aws iam create-policy \
  --policy-name RancherBackupPolicy \
  --policy-document file://rancher-backup-policy.json

aws iam create-user --user-name rancher-backup-user

aws iam attach-user-policy \
  --user-name rancher-backup-user \
  --policy-arn arn:aws:iam::YOUR_ACCOUNT_ID:policy/RancherBackupPolicy

aws iam create-access-key --user-name rancher-backup-user
```

Save the access key and secret key from the output.

## Step 3: Create the Credentials Secret

Store the AWS credentials as a Kubernetes secret:

```bash
kubectl create secret generic s3-creds \
  -n cattle-resources-system \
  --from-literal=accessKey=AKIAIOSFODNN7EXAMPLE \
  --from-literal=secretKey=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

## Step 4: Create a Backup with S3 Storage

Create a Backup resource that references S3 as the storage location. Save the following as `backup-s3.yaml`:

```yaml
apiVersion: resources.cattle.io/v1
kind: Backup
metadata:
  name: rancher-backup-s3
spec:
  resourceSetName: rancher-resource-set-full
  retentionCount: 10
  storageLocation:
    s3:
      bucketName: rancher-backups-production
      folder: backups
      endpoint: s3.us-east-1.amazonaws.com
      region: us-east-1
      credentialSecretName: s3-creds
      credentialSecretNamespace: cattle-resources-system
```

Apply the backup:

```bash
kubectl apply -f backup-s3.yaml
```

## Step 5: Create a Scheduled Backup to S3

For automated backups, add a cron schedule:

```yaml
apiVersion: resources.cattle.io/v1
kind: Backup
metadata:
  name: rancher-scheduled-s3-backup
spec:
  resourceSetName: rancher-resource-set-full
  retentionCount: 30
  schedule: "0 2 * * *"
  storageLocation:
    s3:
      bucketName: rancher-backups-production
      folder: daily
      endpoint: s3.us-east-1.amazonaws.com
      region: us-east-1
      credentialSecretName: s3-creds
      credentialSecretNamespace: cattle-resources-system
```

## Step 6: Verify the Backup in S3

Check the backup status in Kubernetes:

```bash
kubectl get backups.resources.cattle.io rancher-backup-s3 -o yaml
```

Verify the file exists in S3:

```bash
aws s3 ls s3://rancher-backups-production/backups/
```

You should see the backup tarball listed.

## Step 7: Configure S3 Bucket Lifecycle Rules

To complement the operator's retention policy, set up S3 lifecycle rules to automatically transition old backups to cheaper storage classes:

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket rancher-backups-production \
  --lifecycle-configuration '{
    "Rules": [
      {
        "ID": "TransitionToIA",
        "Status": "Enabled",
        "Filter": {"Prefix": "backups/"},
        "Transitions": [
          {
            "Days": 30,
            "StorageClass": "STANDARD_IA"
          },
          {
            "Days": 90,
            "StorageClass": "GLACIER"
          }
        ]
      }
    ]
  }'
```

## Step 8: Enable Server-Side Encryption

For additional security, enable default encryption on the S3 bucket:

```bash
aws s3api put-bucket-encryption \
  --bucket rancher-backups-production \
  --server-side-encryption-configuration '{
    "Rules": [
      {
        "ApplyServerSideEncryptionByDefault": {
          "SSEAlgorithm": "aws:kms",
          "KMSMasterKeyID": "your-kms-key-arn"
        }
      }
    ]
  }'
```

If you use SSE-KMS, the IAM user or role that Rancher uses for S3 access must also be allowed to use that KMS key in both IAM and the KMS key policy, including `kms:GenerateDataKey` and `kms:Decrypt`.

## Using S3-Compatible Storage

The Backup Operator works with any S3-compatible storage, not just AWS S3. You can use services like MinIO, DigitalOcean Spaces, or Wasabi by changing the `endpoint` field:

```yaml
storageLocation:
  s3:
    bucketName: rancher-backups
    endpoint: nyc3.digitaloceanspaces.com
    region: nyc3
    credentialSecretName: spaces-creds
    credentialSecretNamespace: cattle-resources-system
```

## Troubleshooting

### Access Denied Errors

Verify the IAM policy is correctly attached and the credentials secret has the right values:

```bash
kubectl get secret s3-creds -n cattle-resources-system -o yaml
```

### Endpoint Errors

For non-AWS S3 services, make sure the endpoint URL does not include the protocol prefix. Use `s3.us-east-1.amazonaws.com` not `https://s3.us-east-1.amazonaws.com`.

### Region Mismatch

The region in the Backup resource must match the region where the bucket was created.

## Conclusion

Storing Rancher backups in S3 provides reliable, durable off-cluster storage that protects your management server configuration against cluster failures. With IAM policies for least-privilege access, encryption, and lifecycle rules for cost management, you have a production-ready backup solution for Rancher.
