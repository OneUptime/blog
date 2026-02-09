# How to Implement Kubernetes Secrets Backup and Restore Using Velero

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Velero, Security, Secrets Management

Description: Learn how to safely implement Kubernetes Secrets backup and restore using Velero, balancing disaster recovery requirements with security best practices for sensitive credential management.

---

Kubernetes Secrets store sensitive data like passwords, API keys, and certificates. Losing these during a disaster makes recovery impossible, even if you restore all other resources. However, backing up secrets introduces security risks. Velero provides mechanisms to backup secrets while maintaining security through encryption and access controls.

## The Secrets Backup Challenge

Backing up secrets creates security concerns:

- Backup storage becomes a high-value target for attackers
- Multiple copies of secrets increase exposure surface
- Long-term retention of secrets may violate security policies
- Backup access requires elevated privileges

Despite these risks, not backing up secrets makes disaster recovery impossible. The solution is to backup secrets with appropriate security controls.

## Basic Secrets Backup

By default, Velero backs up secrets along with other resources:

```bash
# Backup includes secrets by default
velero backup create full-backup \
  --include-namespaces production
```

Check that secrets are included:

```bash
velero backup describe full-backup --details | grep -i secret
```

You should see Secret resources in the backup.

## Excluding Secrets from Backups

If you manage secrets externally (like HashiCorp Vault or AWS Secrets Manager), exclude them from backups:

```bash
# Backup without secrets
velero backup create no-secrets \
  --include-namespaces production \
  --exclude-resources secrets

# Or use a schedule
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: production-no-secrets
  namespace: velero
spec:
  schedule: "0 2 * * *"
  template:
    includedNamespaces:
    - production
    excludedResources:
    - secrets
    ttl: 168h0m0s
```

## Selective Secrets Backup

Backup only specific secrets using labels:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: database-password
  namespace: production
  labels:
    backup: include
    tier: critical
type: Opaque
data:
  password: cGFzc3dvcmQxMjM=
---
apiVersion: v1
kind: Secret
metadata:
  name: temp-token
  namespace: production
  labels:
    backup: exclude
type: Opaque
data:
  token: dGVtcC10b2tlbg==
```

Backup only labeled secrets:

```bash
# Backup secrets with backup=include label
velero backup create critical-secrets \
  --include-resources secrets \
  --selector backup=include
```

Or exclude certain secrets:

```yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: secrets-backup
  namespace: velero
spec:
  schedule: "0 3 * * *"
  template:
    includedResources:
    - secrets
    labelSelector:
      matchExpressions:
      - key: backup
        operator: NotIn
        values:
        - exclude
    ttl: 72h0m0s  # Shorter retention for secrets
```

## Encrypting Secrets in Backups

Ensure secrets in backups are encrypted at rest. Use S3 server-side encryption with KMS:

```yaml
apiVersion: velero.io/v1
kind: BackupStorageLocation
metadata:
  name: encrypted-storage
  namespace: velero
spec:
  provider: aws
  objectStorage:
    bucket: velero-encrypted-backups
  config:
    region: us-east-1
    kmsKeyId: alias/velero-secrets-key
    serverSideEncryption: aws:kms
```

Create a dedicated KMS key for secrets backups:

```bash
# Create KMS key
aws kms create-key \
  --description "Velero secrets backup encryption" \
  --key-usage ENCRYPT_DECRYPT

# Create alias
aws kms create-alias \
  --alias-name alias/velero-secrets-key \
  --target-key-id <key-id>

# Set key policy with strict access
aws kms put-key-policy \
  --key-id alias/velero-secrets-key \
  --policy-name default \
  --policy file://secrets-key-policy.json
```

Key policy for secrets:

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
      "Sid": "Allow Velero to encrypt",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::ACCOUNT_ID:role/velero-role"
      },
      "Action": [
        "kms:Decrypt",
        "kms:Encrypt",
        "kms:GenerateDataKey"
      ],
      "Resource": "*"
    },
    {
      "Sid": "Require encryption context",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "kms:Decrypt",
      "Resource": "*",
      "Condition": {
        "Null": {
          "kms:EncryptionContext:velero-backup": "true"
        }
      }
    }
  ]
}
```

## Implementing Secrets Rotation After Restore

Automatically rotate secrets after restore for security:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: post-restore-secret-rotation
  namespace: velero
data:
  rotate-secrets.sh: |
    #!/bin/bash
    # Rotate secrets after restore

    NAMESPACE=$1

    # Get all secrets
    kubectl get secrets -n $NAMESPACE -o json | \
      jq -r '.items[] | select(.metadata.labels.rotate == "true") | .metadata.name' | \
      while read secret; do
        echo "Rotating secret: $secret"

        # Call secret rotation service
        curl -X POST https://secret-rotation.internal/rotate \
          -H "Content-Type: application/json" \
          -d "{\"namespace\":\"$NAMESPACE\",\"secret\":\"$secret\"}"
      done
```

Use as a restore hook:

```yaml
apiVersion: velero.io/v1
kind: Restore
metadata:
  name: production-restore
  namespace: velero
spec:
  backupName: production-backup-20260209
  hooks:
    resources:
    - name: rotate-secrets
      includedNamespaces:
      - production
      postHooks:
      - exec:
          container: kubectl
          command:
          - /scripts/rotate-secrets.sh
          - production
```

## Restoring Secrets Selectively

Restore only secrets that haven't been manually recreated:

```bash
# List existing secrets
kubectl get secrets -n production -o jsonpath='{.items[*].metadata.name}' > existing-secrets.txt

# Create restore excluding existing secrets
velero restore create selective-secrets \
  --from-backup production-backup \
  --include-resources secrets \
  --include-namespaces production \
  --existing-resource-policy update
```

Or use a script for more control:

```bash
#!/bin/bash
# selective-secret-restore.sh

BACKUP_NAME=$1
TARGET_NAMESPACE=$2

# Get secrets from backup
velero backup describe $BACKUP_NAME --details | \
  grep "secrets" | \
  awk '{print $1}' | \
  while read secret; do
    # Check if secret exists
    if ! kubectl get secret $secret -n $TARGET_NAMESPACE &>/dev/null; then
      echo "Restoring secret: $secret"

      # Restore only this secret
      velero restore create restore-$secret-$(date +%s) \
        --from-backup $BACKUP_NAME \
        --include-resources secrets \
        --selector metadata.name=$secret
    else
      echo "Skipping existing secret: $secret"
    fi
  done
```

## Auditing Secrets Access in Backups

Track who accesses backup secrets:

```bash
# Enable CloudTrail for S3 bucket
aws cloudtrail create-trail \
  --name velero-secrets-audit \
  --s3-bucket-name velero-audit-logs

# Configure event selectors for data events
aws cloudtrail put-event-selectors \
  --trail-name velero-secrets-audit \
  --event-selectors '[{
    "ReadWriteType": "All",
    "IncludeManagementEvents": false,
    "DataResources": [{
      "Type": "AWS::S3::Object",
      "Values": ["arn:aws:s3:::velero-encrypted-backups/*"]
    }]
  }]'

# Start logging
aws cloudtrail start-logging --name velero-secrets-audit
```

Create CloudWatch alarms for suspicious access:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: secrets-access-alarm
data:
  alarm.json: |
    {
      "AlarmName": "velero-secrets-unauthorized-access",
      "MetricName": "UnauthorizedAPICallsCount",
      "Namespace": "CloudTrail",
      "Statistic": "Sum",
      "Period": 300,
      "EvaluationPeriods": 1,
      "Threshold": 1,
      "ComparisonOperator": "GreaterThanThreshold",
      "AlarmActions": ["arn:aws:sns:us-east-1:ACCOUNT_ID:security-alerts"]
    }
```

## Using External Secrets Operators

Integrate with external secret managers instead of backing up secrets directly:

```yaml
# External Secrets Operator configuration
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secrets-manager
  namespace: production
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        jwt:
          serviceAccountRef:
            name: external-secrets
---
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-password
  namespace: production
  labels:
    backup: exclude  # Don't backup, it's external
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: database-password
    creationPolicy: Owner
  data:
  - secretKey: password
    remoteRef:
      key: production/database/password
```

Backup only the ExternalSecret definitions:

```bash
# Backup ExternalSecret resources (not actual secrets)
velero backup create external-secrets-config \
  --include-resources externalsecrets.external-secrets.io \
  --exclude-resources secrets
```

## Implementing Secret Backup Policies

Create organizational policies for secret backups:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: secret-backup-policy
  namespace: velero
data:
  policy.yaml: |
    # Secret Backup Policy
    rules:
      # Critical secrets - encrypted backups only
      - selector:
          labels:
            sensitivity: critical
        requirements:
          - encryption: required
          - retention: 7d
          - access: restricted

      # Standard secrets - encrypted with longer retention
      - selector:
          labels:
            sensitivity: standard
        requirements:
          - encryption: required
          - retention: 30d

      # Exclude temporary secrets
      - selector:
          labels:
            temporary: true
        action: exclude

      # Rotate on restore
      - selector:
          annotations:
            rotate-on-restore: true
        hooks:
          post-restore:
            - rotate-secret
```

## Testing Secret Restore

Verify secrets restore correctly:

```bash
#!/bin/bash
# test-secret-restore.sh

# Create test secret
kubectl create secret generic test-secret \
  --from-literal=key1=value1 \
  --from-literal=key2=value2 \
  -n default \
  --dry-run=client -o yaml | kubectl apply -f -

# Backup
velero backup create secret-test-backup \
  --include-namespaces default \
  --include-resources secrets \
  --wait

# Delete secret
kubectl delete secret test-secret -n default

# Restore
velero restore create secret-test-restore \
  --from-backup secret-test-backup \
  --wait

# Verify
if kubectl get secret test-secret -n default &>/dev/null; then
  echo "✓ Secret restored successfully"

  # Verify values
  RESTORED_VALUE=$(kubectl get secret test-secret -n default -o jsonpath='{.data.key1}' | base64 -d)
  if [ "$RESTORED_VALUE" == "value1" ]; then
    echo "✓ Secret values correct"
  else
    echo "✗ Secret values incorrect"
  fi
else
  echo "✗ Secret restore failed"
fi

# Cleanup
kubectl delete secret test-secret -n default
velero backup delete secret-test-backup --confirm
velero restore delete secret-test-restore --confirm
```

## Secrets Backup Best Practices

Follow these practices for secure secret backups:

1. **Always encrypt**: Use KMS encryption for backup storage
2. **Short retention**: Keep secret backups only as long as necessary
3. **Access control**: Restrict who can access backup storage
4. **Audit logging**: Track all access to backup secrets
5. **Rotation**: Rotate secrets after restore operations
6. **External management**: Prefer external secret managers when possible
7. **Selective backup**: Backup only necessary secrets
8. **Test regularly**: Verify secret restore procedures work

## Conclusion

Backing up Kubernetes Secrets with Velero requires balancing disaster recovery needs with security requirements. Implement encryption, access controls, and audit logging to protect secrets in backups. Use selective backup strategies to minimize exposure, and integrate with external secret managers for enhanced security.

Always encrypt secrets in backups using KMS, implement short retention periods for secret-containing backups, and audit all access to backup storage. Test your secret restore procedures regularly to ensure they work when needed, and implement secret rotation as part of your restore process.

Remember that secrets in backups are only as secure as your backup storage. Treat backup storage with the same security rigor you apply to your production environment.
