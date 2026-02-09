# How to Configure Velero Server-Side Encryption for Backup Data in S3

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Velero, Security, AWS S3, Encryption

Description: Learn how to configure Velero with server-side encryption for backup data in S3, protecting your Kubernetes backups at rest using AWS KMS, S3-managed keys, or customer-provided encryption keys.

---

Kubernetes backups contain sensitive data including application configurations, secrets, and persistent volume contents. Storing this data unencrypted in object storage creates security risks and may violate compliance requirements. Server-side encryption ensures your Velero backups remain protected at rest in S3.

## Understanding S3 Server-Side Encryption Options

AWS S3 offers three server-side encryption methods for Velero backups:

**SSE-S3**: S3-managed encryption keys. Simplest option with no additional configuration required beyond enabling it.

**SSE-KMS**: AWS Key Management Service encryption. Provides encryption key rotation, access logging, and fine-grained access control.

**SSE-C**: Customer-provided encryption keys. You manage the encryption keys entirely, giving maximum control but requiring key management infrastructure.

For most Velero deployments, SSE-KMS provides the best balance of security and manageability.

## Configuring SSE-S3 Encryption

The simplest encryption method uses S3-managed keys. Enable it on your Velero backup bucket:

```bash
# Enable default encryption on S3 bucket
aws s3api put-bucket-encryption \
  --bucket velero-backups \
  --server-side-encryption-configuration '{
    "Rules": [
      {
        "ApplyServerSideEncryptionByDefault": {
          "SSEAlgorithm": "AES256"
        }
      }
    ]
  }'
```

Configure Velero to use this encrypted bucket:

```yaml
apiVersion: velero.io/v1
kind: BackupStorageLocation
metadata:
  name: default
  namespace: velero
spec:
  provider: aws
  objectStorage:
    bucket: velero-backups
  config:
    region: us-east-1
```

Velero automatically uses the bucket's default encryption. No additional Velero configuration is needed.

## Configuring SSE-KMS Encryption

For enhanced security and compliance, use KMS-managed encryption keys.

First, create a KMS key for Velero backups:

```bash
# Create KMS key
aws kms create-key \
  --description "Velero backup encryption key" \
  --key-usage ENCRYPT_DECRYPT \
  --origin AWS_KMS

# Note the KeyId from output, then create an alias
aws kms create-alias \
  --alias-name alias/velero-backups \
  --target-key-id <key-id>
```

Create a key policy that allows Velero to use the key:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "Enable IAM User Permissions",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::ACCOUNT_ID:root"
      },
      "Action": "kms:*",
      "Resource": "*"
    },
    {
      "Sid": "Allow Velero to use the key",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::ACCOUNT_ID:role/velero-role"
      },
      "Action": [
        "kms:Decrypt",
        "kms:Encrypt",
        "kms:GenerateDataKey",
        "kms:DescribeKey"
      ],
      "Resource": "*"
    }
  ]
}
```

Apply the policy:

```bash
aws kms put-key-policy \
  --key-id alias/velero-backups \
  --policy-name default \
  --policy file://kms-policy.json
```

Configure S3 bucket to use KMS encryption:

```bash
aws s3api put-bucket-encryption \
  --bucket velero-backups \
  --server-side-encryption-configuration '{
    "Rules": [
      {
        "ApplyServerSideEncryptionByDefault": {
          "SSEAlgorithm": "aws:kms",
          "KMSMasterKeyID": "arn:aws:kms:us-east-1:ACCOUNT_ID:key/KEY_ID"
        },
        "BucketKeyEnabled": true
      }
    ]
  }'
```

Update Velero's IAM policy to include KMS permissions:

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
        "arn:aws:s3:::velero-backups/*",
        "arn:aws:s3:::velero-backups"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "kms:Decrypt",
        "kms:Encrypt",
        "kms:GenerateDataKey",
        "kms:DescribeKey"
      ],
      "Resource": "arn:aws:kms:us-east-1:ACCOUNT_ID:key/KEY_ID"
    }
  ]
}
```

## Configuring Velero with KMS Encryption

Update your Velero BackupStorageLocation to specify KMS encryption:

```yaml
apiVersion: velero.io/v1
kind: BackupStorageLocation
metadata:
  name: default
  namespace: velero
spec:
  provider: aws
  objectStorage:
    bucket: velero-backups
  config:
    region: us-east-1
    kmsKeyId: alias/velero-backups
    serverSideEncryption: aws:kms
```

Restart Velero to apply the changes:

```bash
kubectl rollout restart deployment velero -n velero
```

## Using IRSA with KMS Encryption

For EKS clusters, use IAM Roles for Service Accounts (IRSA) for more secure credential management:

```bash
# Create IAM policy
aws iam create-policy \
  --policy-name VeleroKMSPolicy \
  --policy-document file://velero-kms-policy.json

# Create IRSA
eksctl create iamserviceaccount \
  --cluster my-cluster \
  --name velero \
  --namespace velero \
  --attach-policy-arn arn:aws:iam::ACCOUNT_ID:policy/VeleroKMSPolicy \
  --attach-policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess \
  --approve
```

Update Velero to use the service account:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: velero
  namespace: velero
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::ACCOUNT_ID:role/velero-role
```

## Enabling Bucket Key for Cost Optimization

S3 Bucket Keys reduce KMS costs by decreasing the number of API calls:

```bash
aws s3api put-bucket-encryption \
  --bucket velero-backups \
  --server-side-encryption-configuration '{
    "Rules": [
      {
        "ApplyServerSideEncryptionByDefault": {
          "SSEAlgorithm": "aws:kms",
          "KMSMasterKeyID": "alias/velero-backups"
        },
        "BucketKeyEnabled": true
      }
    ]
  }'
```

This can reduce KMS costs by up to 99% for high-volume backup operations.

## Verifying Encryption Configuration

Check that backups are encrypted:

```bash
# Create a test backup
velero backup create encryption-test --include-namespaces default

# Wait for completion
velero backup describe encryption-test

# Check S3 object encryption
aws s3api head-object \
  --bucket velero-backups \
  --key backups/encryption-test/encryption-test.tar.gz \
  --query 'ServerSideEncryption'
```

The output should show "aws:kms" for KMS-encrypted objects or "AES256" for S3-managed encryption.

## Rotating KMS Keys

Implement key rotation for enhanced security:

```bash
# Enable automatic key rotation
aws kms enable-key-rotation \
  --key-id alias/velero-backups

# Check rotation status
aws kms get-key-rotation-status \
  --key-id alias/velero-backups
```

AWS automatically rotates the key material annually. Old backups remain accessible using the previous key version.

## Cross-Account KMS Access

For centralized backup management, configure cross-account KMS access:

```json
{
  "Sid": "Allow cross-account access",
  "Effect": "Allow",
  "Principal": {
    "AWS": "arn:aws:iam::BACKUP_ACCOUNT_ID:role/velero-role"
  },
  "Action": [
    "kms:Decrypt",
    "kms:DescribeKey"
  ],
  "Resource": "*",
  "Condition": {
    "StringEquals": {
      "kms:ViaService": "s3.us-east-1.amazonaws.com"
    }
  }
}
```

## Monitoring KMS Usage

Track KMS API usage for backup operations:

```bash
# CloudWatch Insights query for KMS usage
aws logs start-query \
  --log-group-name /aws/kms/velero-backups \
  --start-time $(date -u -d '1 hour ago' +%s) \
  --end-time $(date -u +%s) \
  --query-string 'fields @timestamp, eventName, userAgent
    | filter eventName like /Encrypt|Decrypt|GenerateDataKey/
    | stats count() by eventName'
```

Create CloudWatch alarms for KMS errors:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kms-alarm
data:
  alarm.json: |
    {
      "AlarmName": "velero-kms-errors",
      "MetricName": "UserErrorCount",
      "Namespace": "AWS/KMS",
      "Statistic": "Sum",
      "Period": 300,
      "EvaluationPeriods": 1,
      "Threshold": 5,
      "ComparisonOperator": "GreaterThanThreshold"
    }
```

## Compliance and Audit Logging

Enable CloudTrail logging for KMS key usage:

```bash
# Create CloudTrail for KMS events
aws cloudtrail create-trail \
  --name velero-kms-audit \
  --s3-bucket-name velero-audit-logs \
  --include-global-service-events \
  --is-multi-region-trail

# Enable logging
aws cloudtrail start-logging \
  --name velero-kms-audit

# Add event selectors for KMS
aws cloudtrail put-event-selectors \
  --trail-name velero-kms-audit \
  --event-selectors '[{
    "ReadWriteType": "All",
    "IncludeManagementEvents": true,
    "DataResources": [{
      "Type": "AWS::KMS::Key",
      "Values": ["arn:aws:kms:us-east-1:ACCOUNT_ID:key/*"]
    }]
  }]'
```

## Troubleshooting Encryption Issues

Common encryption problems and solutions:

**Error**: Access denied when writing backups
**Solution**: Verify IAM role has kms:GenerateDataKey permission

**Error**: Unable to read old backups after key rotation
**Solution**: Check that IAM role has kms:Decrypt on all key versions

**Error**: High KMS costs
**Solution**: Enable S3 Bucket Keys to reduce API calls

```bash
# Debug encryption issues
kubectl logs -n velero deployment/velero | grep -i kms

# Verify IAM role permissions
aws iam simulate-principal-policy \
  --policy-source-arn arn:aws:iam::ACCOUNT_ID:role/velero-role \
  --action-names kms:Encrypt kms:Decrypt kms:GenerateDataKey \
  --resource-arns arn:aws:kms:us-east-1:ACCOUNT_ID:key/KEY_ID
```

## Conclusion

Server-side encryption protects your Velero backups at rest in S3. Start with SSE-S3 for simplicity, then move to SSE-KMS when you need enhanced security, compliance logging, or access control. Enable automatic key rotation and monitor KMS usage to maintain security over time.

Always test backup and restore operations after configuring encryption to ensure your disaster recovery procedures work with encrypted data. Document your encryption configuration and key management procedures in your disaster recovery runbooks.
