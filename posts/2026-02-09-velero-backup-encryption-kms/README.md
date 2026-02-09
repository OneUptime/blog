# How to Configure Velero Backup Encryption at Rest Using AWS KMS or Azure Key Vault

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Velero, Kubernetes, Encryption, KMS, Security

Description: Learn how to secure Velero backups with encryption at rest using AWS KMS and Azure Key Vault. Complete guide covering key management, configuration, and compliance requirements.

---

Backup encryption at rest protects sensitive data stored in backup repositories from unauthorized access. While Velero's Restic integration provides client-side encryption, cloud provider key management services offer additional security layers including hardware security modules, audit logging, and centralized key rotation. Implementing encryption with AWS KMS or Azure Key Vault ensures your backup data meets compliance requirements while maintaining the security posture required for production environments.

## Understanding Backup Encryption Architecture

Velero supports multiple encryption approaches depending on your storage backend and requirements. Server-side encryption encrypts data as it writes to object storage, while client-side encryption encrypts data before transmission. Key management services like AWS KMS and Azure Key Vault provide centralized control over encryption keys, enabling automated key rotation, access auditing, and compliance reporting.

For maximum security, combine both approaches using KMS-managed keys for server-side encryption and Restic for client-side encryption, creating defense-in-depth protection for backup data.

## Configuring AWS S3 with KMS Encryption

Enable KMS encryption for S3-backed Velero installations:

```bash
# Create KMS key for Velero backups
aws kms create-key \
  --description "Velero backup encryption key" \
  --key-policy file://kms-key-policy.json

# Create key alias
aws kms create-alias \
  --alias-name alias/velero-backups \
  --target-key-id <key-id>
```

KMS key policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "Enable IAM User Permissions",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::123456789012:root"
      },
      "Action": "kms:*",
      "Resource": "*"
    },
    {
      "Sid": "Allow Velero to use the key",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::123456789012:role/velero"
      },
      "Action": [
        "kms:Decrypt",
        "kms:Encrypt",
        "kms:GenerateDataKey",
        "kms:DescribeKey"
      ],
      "Resource": "*"
    },
    {
      "Sid": "Allow CloudWatch Logs",
      "Effect": "Allow",
      "Principal": {
        "Service": "logs.amazonaws.com"
      },
      "Action": [
        "kms:Decrypt",
        "kms:Encrypt",
        "kms:GenerateDataKey"
      ],
      "Resource": "*"
    }
  ]
}
```

## Installing Velero with S3 KMS Encryption

Install Velero configured for KMS encryption:

```bash
velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.9.0 \
  --bucket velero-encrypted-backups \
  --backup-location-config \
region=us-east-1,\
serverSideEncryption=aws:kms,\
kmsKeyId=alias/velero-backups \
  --use-node-agent \
  --secret-file ./credentials-velero
```

Verify encryption is enabled:

```bash
# Create test backup
velero backup create encrypted-test --include-namespaces default --wait

# Check S3 object encryption
aws s3api head-object \
  --bucket velero-encrypted-backups \
  --key backups/encrypted-test/encrypted-test.tar.gz \
  --query ServerSideEncryption
```

## Configuring Azure Blob Storage with Key Vault

Create Azure Key Vault and encryption key:

```bash
# Create resource group
az group create \
  --name velero-backups-rg \
  --location eastus

# Create Key Vault
az keyvault create \
  --name velero-backup-vault \
  --resource-group velero-backups-rg \
  --location eastus \
  --enable-soft-delete true \
  --enable-purge-protection true

# Create encryption key
az keyvault key create \
  --vault-name velero-backup-vault \
  --name velero-encryption-key \
  --protection software \
  --size 2048
```

Create storage account with customer-managed key:

```bash
# Create storage account
az storage account create \
  --name velerobackupstorage \
  --resource-group velero-backups-rg \
  --location eastus \
  --sku Standard_GRS \
  --kind StorageV2

# Enable encryption with Key Vault key
az storage account update \
  --name velerobackupstorage \
  --resource-group velero-backups-rg \
  --encryption-key-source Microsoft.Keyvault \
  --encryption-key-vault https://velero-backup-vault.vault.azure.net/ \
  --encryption-key-name velero-encryption-key
```

## Installing Velero with Azure Key Vault Encryption

Create Azure credentials for Velero:

```bash
# Create service principal
az ad sp create-for-rbac \
  --name velero-backup-sp \
  --role Contributor \
  --scopes /subscriptions/<subscription-id>/resourceGroups/velero-backups-rg

# Grant Key Vault permissions
az keyvault set-policy \
  --name velero-backup-vault \
  --spn <service-principal-app-id> \
  --key-permissions get unwrapKey wrapKey
```

Create credentials file:

```ini
AZURE_SUBSCRIPTION_ID=<subscription-id>
AZURE_TENANT_ID=<tenant-id>
AZURE_CLIENT_ID=<service-principal-app-id>
AZURE_CLIENT_SECRET=<service-principal-password>
AZURE_RESOURCE_GROUP=velero-backups-rg
AZURE_CLOUD_NAME=AzurePublicCloud
```

Install Velero with Azure backend:

```bash
velero install \
  --provider azure \
  --plugins velero/velero-plugin-for-microsoft-azure:v1.9.0 \
  --bucket velero-backups \
  --backup-location-config \
resourceGroup=velero-backups-rg,\
storageAccount=velerobackupstorage \
  --use-node-agent \
  --secret-file ./credentials-azure
```

## Implementing Client-Side Encryption with Restic

Configure Restic encryption for file-level backups:

```bash
# Velero automatically encrypts Restic repositories
# Generate secure repository password
openssl rand -base64 32 > restic-password

# Create secret
kubectl create secret generic restic-repo-credentials \
  --namespace velero \
  --from-file=repository-password=restic-password
```

Velero uses this password to encrypt all Restic backup data before uploading to storage.

## Configuring Encryption for Multi-Cloud Backups

Set up encryption for each cloud provider:

```yaml
---
apiVersion: velero.io/v1
kind: BackupStorageLocation
metadata:
  name: aws-encrypted
  namespace: velero
spec:
  provider: aws
  objectStorage:
    bucket: velero-backups-aws
  config:
    region: us-east-1
    serverSideEncryption: aws:kms
    kmsKeyId: alias/velero-backups-aws

---
apiVersion: velero.io/v1
kind: BackupStorageLocation
metadata:
  name: azure-encrypted
  namespace: velero
spec:
  provider: azure
  objectStorage:
    bucket: velero-backups
  config:
    resourceGroup: velero-backups-rg
    storageAccount: velerobackupstorage
    # Azure automatically uses customer-managed key

---
apiVersion: velero.io/v1
kind: BackupStorageLocation
metadata:
  name: gcp-encrypted
  namespace: velero
spec:
  provider: gcp
  objectStorage:
    bucket: velero-backups-gcp
  config:
    kmsKeyName: projects/my-project/locations/us/keyRings/velero/cryptoKeys/backup-key
```

## Rotating Encryption Keys

Implement key rotation for AWS KMS:

```bash
# Enable automatic key rotation
aws kms enable-key-rotation --key-id <key-id>

# Check rotation status
aws kms get-key-rotation-status --key-id <key-id>

# Manual key rotation (create new key version)
aws kms create-key \
  --description "Velero backup encryption key v2"

# Update key alias to point to new key
aws kms update-alias \
  --alias-name alias/velero-backups \
  --target-key-id <new-key-id>
```

For Azure Key Vault:

```bash
# Create new key version
az keyvault key create \
  --vault-name velero-backup-vault \
  --name velero-encryption-key \
  --protection software

# Azure automatically uses the latest version
```

## Monitoring Encryption Key Usage

Track KMS key usage with CloudWatch:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: kms-monitoring
  namespace: velero
spec:
  groups:
  - name: kms-encryption
    interval: 300s
    rules:
    - alert: KMSKeyUnavailable
      expr: |
        aws_kms_key_state != 1
      labels:
        severity: critical
      annotations:
        summary: "KMS key is not available"
        description: "Encryption key is in disabled or pending deletion state"

    - alert: HighKMSAPIErrors
      expr: |
        rate(aws_kms_api_errors_total[5m]) > 0.1
      labels:
        severity: warning
      annotations:
        summary: "High rate of KMS API errors"
        description: "KMS is experiencing {{ $value }} errors per second"
```

Enable CloudWatch logging for KMS:

```bash
# Create CloudWatch log group
aws logs create-log-group --log-group-name /aws/kms/velero-backups

# Enable KMS logging
aws kms put-key-policy \
  --key-id <key-id> \
  --policy-name default \
  --policy file://kms-logging-policy.json
```

## Auditing Encryption Key Access

Review key access logs:

```bash
# Query CloudTrail for KMS operations
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=ResourceName,AttributeValue=<key-id> \
  --max-results 50 \
  --query 'Events[*].[EventTime,Username,EventName]' \
  --output table

# Get key usage statistics
aws kms get-key-policy \
  --key-id <key-id> \
  --policy-name default
```

For Azure Key Vault:

```bash
# Enable diagnostic logging
az monitor diagnostic-settings create \
  --name velero-kv-diagnostics \
  --resource /subscriptions/<subscription-id>/resourceGroups/velero-backups-rg/providers/Microsoft.KeyVault/vaults/velero-backup-vault \
  --logs '[{"category": "AuditEvent", "enabled": true}]' \
  --workspace <log-analytics-workspace-id>

# Query key access
az monitor activity-log list \
  --resource-group velero-backups-rg \
  --offset 7d \
  --query "[?contains(resourceId, 'velero-backup-vault')]"
```

## Testing Encrypted Backup Restoration

Verify encrypted backups can be restored:

```bash
# Create encrypted backup
velero backup create encryption-test \
  --include-namespaces default \
  --storage-location aws-encrypted \
  --wait

# Verify encryption
aws s3api head-object \
  --bucket velero-backups-aws \
  --key backups/encryption-test/encryption-test.tar.gz

# Perform restore
velero restore create --from-backup encryption-test --wait

# Verify restoration succeeded
kubectl get all -n default
```

## Implementing Compliance Requirements

Configure encryption to meet compliance standards:

```yaml
apiVersion: velero.io/v1
kind: BackupStorageLocation
metadata:
  name: compliance-backup
  namespace: velero
  annotations:
    compliance.example.com/standard: "PCI-DSS"
    compliance.example.com/encryption: "AES-256"
spec:
  provider: aws
  objectStorage:
    bucket: velero-compliance-backups
  config:
    region: us-east-1
    # Use FIPS-validated encryption
    serverSideEncryption: aws:kms
    kmsKeyId: alias/pci-compliant-key
    # Enable bucket versioning
    enableBucketVersioning: "true"
```

## Handling Key Deletion and Recovery

Protect against accidental key deletion:

```bash
# AWS: Schedule key deletion (cannot delete immediately)
aws kms schedule-key-deletion \
  --key-id <key-id> \
  --pending-window-in-days 30

# Cancel deletion if needed
aws kms cancel-key-deletion --key-id <key-id>

# Azure: Key Vault soft delete and purge protection
az keyvault update \
  --name velero-backup-vault \
  --enable-soft-delete true \
  --enable-purge-protection true

# Recover deleted key
az keyvault key recover \
  --vault-name velero-backup-vault \
  --name velero-encryption-key
```

## Conclusion

Configuring Velero backup encryption at rest using cloud provider KMS services provides enterprise-grade security for sensitive backup data. Implement server-side encryption with AWS KMS or Azure Key Vault for centralized key management, enable automatic key rotation to maintain security posture, and configure comprehensive audit logging for compliance reporting. Combine server-side encryption with Restic's client-side encryption for defense-in-depth protection, monitor key usage and access patterns, and regularly test encrypted backup restoration to ensure disaster recovery capabilities remain intact. Proper encryption configuration protects backup data from unauthorized access while maintaining the operational flexibility required for production disaster recovery operations.
