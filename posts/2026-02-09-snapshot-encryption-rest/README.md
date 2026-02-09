# How to Configure Volume Snapshot Encryption at Rest

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Encryption, VolumeSnapshot

Description: Learn how to configure encryption at rest for Kubernetes volume snapshots across different cloud providers, ensuring data security and compliance for backup storage.

---

Encrypting snapshots at rest protects backup data from unauthorized access and meets compliance requirements. Each cloud provider offers different encryption options that integrate with Kubernetes volume snapshots.

## Understanding Snapshot Encryption

Snapshot encryption involves:

1. Encrypting snapshot data using keys from key management services
2. Managing encryption keys securely
3. Configuring CSI drivers with encryption parameters
4. Rotating keys periodically
5. Auditing encryption status
6. Ensuring compliance with regulations

Encryption adds minimal overhead while significantly improving security posture.

## AWS EBS Snapshot Encryption

Configure encrypted snapshots for AWS EBS:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: ebs-encrypted-snapshots
driver: ebs.csi.aws.com
deletionPolicy: Retain
parameters:
  # Enable encryption
  encrypted: "true"

  # Use specific KMS key (optional)
  kmsKeyId: "arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012"

  # Add tags for tracking
  tagSpecification_1: "Name=Encryption|Value=Enabled"
  tagSpecification_2: "Name=KMSKey|Value=prod-backup-key"
  tagSpecification_3: "Name=Compliance|Value=Required"
```

Create encrypted snapshots:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: encrypted-snapshot
  annotations:
    encryption.snapshot.kubernetes.io/enabled: "true"
    encryption.snapshot.kubernetes.io/key-id: "arn:aws:kms:us-east-1:123456789012:key/xxxxx"
spec:
  volumeSnapshotClassName: ebs-encrypted-snapshots
  source:
    persistentVolumeClaimName: postgres-pvc
```

Verify encryption:

```bash
# Get snapshot details
kubectl describe volumesnapshot encrypted-snapshot

# Check AWS console or CLI
SNAPSHOT_ID=$(kubectl get volumesnapshotcontent \
  $(kubectl get volumesnapshot encrypted-snapshot \
    -o jsonpath='{.status.boundVolumeSnapshotContentName}') \
  -o jsonpath='{.status.snapshotHandle}')

aws ec2 describe-snapshots \
  --snapshot-ids $SNAPSHOT_ID \
  --query 'Snapshots[0].{Encrypted:Encrypted,KmsKeyId:KmsKeyId}'
```

## Google Cloud Persistent Disk Encryption

Configure GCP snapshot encryption:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: pd-encrypted-snapshots
driver: pd.csi.storage.gke.io
deletionPolicy: Retain
parameters:
  # Encryption is always enabled in GCP
  # Specify customer-managed encryption key (CMEK)
  disk-encryption-kms-key: "projects/my-project/locations/us-central1/keyRings/my-keyring/cryptoKeys/my-key"

  # Storage location
  storage-locations: us-central1

  # Labels for tracking
  snapshot-labels: |
    encryption=cmek
    compliance=required
```

## Azure Disk Snapshot Encryption

Configure Azure encryption:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: azure-encrypted-snapshots
driver: disk.csi.azure.com
deletionPolicy: Retain
parameters:
  # Resource group for snapshots
  resourceGroup: snapshot-rg

  # Enable incremental snapshots
  incremental: "true"

  # Use customer-managed keys
  diskEncryptionSetID: "/subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.Compute/diskEncryptionSets/<des-name>"

  # Tags
  tags: |
    Encryption=CustomerManaged
    Compliance=Required
```

## Key Rotation Strategy

Implement automatic key rotation:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: rotate-snapshot-encryption-keys
spec:
  schedule: "0 0 1 * *"  # Monthly
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: key-rotator
          restartPolicy: OnFailure
          containers:
          - name: rotate-keys
            image: amazon/aws-cli:latest
            command:
            - /bin/bash
            - -c
            - |
              set -e

              echo "=== Rotating Snapshot Encryption Keys ==="

              # Create new KMS key version
              NEW_KEY=$(aws kms create-key \
                --description "Snapshot encryption key - $(date +%Y-%m)" \
                --query 'KeyMetadata.KeyId' \
                --output text)

              echo "Created new key: $NEW_KEY"

              # Update VolumeSnapshotClass
              kubectl patch volumesnapshotclass ebs-encrypted-snapshots \
                --type='json' \
                -p="[{\"op\": \"replace\", \"path\": \"/parameters/kmsKeyId\", \"value\":\"$NEW_KEY\"}]"

              # Tag old snapshots for re-encryption
              kubectl annotate volumesnapshot --all \
                encryption.snapshot.kubernetes.io/key-rotation-pending=true \
                --overwrite

              echo "✓ Key rotation initiated"
```

## Encryption Status Monitoring

Monitor encryption compliance:

```bash
#!/bin/bash
# check-snapshot-encryption.sh

echo "=== Snapshot Encryption Status ==="
echo

# Check VolumeSnapshotClass encryption settings
echo "VolumeSnapshotClass Encryption:"
kubectl get volumesnapshotclass -o json | \
  jq -r '.items[] |
    {
      name: .metadata.name,
      driver: .driver,
      encrypted: .parameters.encrypted // "not specified"
    } |
    "\(.name)\t\(.driver)\t\(.encrypted)"' | \
  column -t -s $'\t'

echo
echo "Snapshots by Encryption Status:"

# Count encrypted vs unencrypted snapshots
ENCRYPTED=$(kubectl get volumesnapshot -o json | \
  jq '[.items[] |
    select(.metadata.annotations."encryption.snapshot.kubernetes.io/enabled" == "true")] |
    length')

TOTAL=$(kubectl get volumesnapshot --no-headers | wc -l)
UNENCRYPTED=$((TOTAL - ENCRYPTED))

echo "Encrypted: $ENCRYPTED"
echo "Unencrypted: $UNENCRYPTED"
echo "Total: $TOTAL"

if [ $UNENCRYPTED -gt 0 ]; then
  echo
  echo "WARNING: Unencrypted snapshots found:"
  kubectl get volumesnapshot -o json | \
    jq -r '.items[] |
      select(.metadata.annotations."encryption.snapshot.kubernetes.io/enabled" != "true") |
      .metadata.name'
fi
```

## Compliance Reporting

Generate encryption compliance reports:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: encryption-compliance-report
spec:
  schedule: "0 0 * * 1"  # Weekly
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: compliance-reporter
          restartPolicy: OnFailure
          containers:
          - name: reporter
            image: bitnami/kubectl:latest
            env:
            - name: SLACK_WEBHOOK
              valueFrom:
                secretKeyRef:
                  name: notification-secrets
                  key: slack-webhook
            command:
            - /bin/bash
            - -c
            - |
              set -e

              echo "=== Encryption Compliance Report ==="
              REPORT_DATE=$(date +%Y-%m-%d)

              # Generate report
              TOTAL=$(kubectl get volumesnapshot --no-headers | wc -l)

              ENCRYPTED=$(kubectl get volumesnapshot -o json | \
                jq '[.items[] |
                  select(.metadata.annotations."encryption.snapshot.kubernetes.io/enabled" == "true")] |
                  length')

              COMPLIANCE_RATE=$(( ENCRYPTED * 100 / TOTAL ))

              # Generate detailed report
              cat > /tmp/report.txt <<EOF
              Snapshot Encryption Compliance Report
              Date: $REPORT_DATE

              Total Snapshots: $TOTAL
              Encrypted Snapshots: $ENCRYPTED
              Compliance Rate: ${COMPLIANCE_RATE}%

              By Application:
              EOF

              kubectl get volumesnapshot -o json | \
                jq -r '.items[] |
                  {
                    app: .metadata.labels.app,
                    encrypted: (.metadata.annotations."encryption.snapshot.kubernetes.io/enabled" == "true")
                  }' | \
                jq -s 'group_by(.app) |
                  .[] |
                  {
                    app: .[0].app,
                    total: length,
                    encrypted: ([.[] | select(.encrypted == true)] | length)
                  }' | \
                jq -r '"\(.app): \(.encrypted)/\(.total) encrypted"' >> /tmp/report.txt

              cat /tmp/report.txt

              # Send to Slack if compliance below threshold
              if [ $COMPLIANCE_RATE -lt 100 ]; then
                curl -X POST $SLACK_WEBHOOK \
                  -H 'Content-Type: application/json' \
                  -d "{
                    \"text\": \"⚠️ Snapshot Encryption Compliance: ${COMPLIANCE_RATE}%\",
                    \"attachments\": [{
                      \"color\": \"warning\",
                      \"text\": \"$(cat /tmp/report.txt)\"
                    }]
                  }"
              fi
```

## Cross-Region Encrypted Snapshots

Replicate encrypted snapshots across regions:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: cross-region-encrypted
driver: ebs.csi.aws.com
deletionPolicy: Retain
parameters:
  encrypted: "true"
  kmsKeyId: "arn:aws:kms:us-east-1:123456789012:key/xxxxx"

  # Copy to multiple regions with separate keys
  copySnapshotToRegion: "us-west-2,eu-west-1"

  # Specify destination region keys (if different)
  destinationKmsKeyId-us-west-2: "arn:aws:kms:us-west-2:123456789012:key/yyyyy"
  destinationKmsKeyId-eu-west-1: "arn:aws:kms:eu-west-1:123456789012:key/zzzzz"
```

## Best Practices

1. **Always encrypt production snapshots** for security
2. **Use customer-managed keys** for better control
3. **Implement key rotation** regularly
4. **Monitor encryption compliance** continuously
5. **Document key management procedures** clearly
6. **Test encrypted snapshot restores** regularly
7. **Audit encryption settings** periodically
8. **Align with compliance requirements** (GDPR, HIPAA, etc.)

Proper snapshot encryption protects backup data at rest and ensures compliance with security regulations. Implementation varies by cloud provider but the principles remain consistent across platforms.
