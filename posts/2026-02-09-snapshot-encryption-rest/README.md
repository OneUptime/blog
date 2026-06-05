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

For AWS EBS, snapshot encryption is inherited from the source EBS volume. Configure encryption on the `StorageClass` used by the PVC, then create snapshots with an EBS `VolumeSnapshotClass`:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ebs-encrypted
provisioner: ebs.csi.aws.com
volumeBindingMode: WaitForFirstConsumer
parameters:
  # Enable encryption
  encrypted: "true"

  # Use a specific KMS key (optional)
  kmsKeyId: "arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012"
---
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: ebs-encrypted-snapshots
driver: ebs.csi.aws.com
deletionPolicy: Retain
parameters:
  # Add tags for tracking. Snapshot tags use key=value syntax.
  tagSpecification_1: "Encryption=InheritedFromSourceVolume"
  tagSpecification_2: "KMSKey=prod-backup-key"
  tagSpecification_3: "Compliance=Required"
```

Create PVCs from the encrypted `StorageClass`:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc
spec:
  accessModes:
  - ReadWriteOnce
  storageClassName: ebs-encrypted
  resources:
    requests:
      storage: 100Gi
```

Create snapshots from encrypted PVCs:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: encrypted-snapshot
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

For Google Cloud Persistent Disk, snapshots are encrypted by default. To use a customer-managed encryption key, configure CMEK on the Persistent Disk `StorageClass`; snapshots created from those disks use the disk's encryption configuration.

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: pd-cmek
provisioner: pd.csi.storage.gke.io
volumeBindingMode: WaitForFirstConsumer
parameters:
  # Specify customer-managed encryption key (CMEK)
  disk-encryption-kms-key: "projects/my-project/locations/us-central1/keyRings/my-keyring/cryptoKeys/my-key"
---
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: pd-encrypted-snapshots
driver: pd.csi.storage.gke.io
deletionPolicy: Retain
parameters:
  # Storage location for the snapshot
  storage-locations: us-central1

  # Labels for tracking
  labels: "encryption=cmek,compliance=required"
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

  # Tags
  tags: "Encryption=InheritedFromSourceDisk,Compliance=Required"
```

For Azure Disk, customer-managed keys are configured on the disk `StorageClass` with `diskEncryptionSetID`. The Azure Disk CSI driver's `VolumeSnapshotClass` supports snapshot parameters such as `resourceGroup`, `incremental`, `location`, and `tags`; it does not use `diskEncryptionSetID` as a snapshot parameter.

## Key Rotation Strategy

Implement automatic key rotation for the KMS key itself. For AWS KMS, automatic rotation keeps the same key ID, so you do not need to patch Kubernetes snapshot classes:

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
            env:
            - name: KMS_KEY_ID
              value: "arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012"
            command:
            - /bin/sh
            - -c
            - |
              set -e

              echo "=== Enabling KMS Key Rotation ==="

              aws kms enable-key-rotation --key-id "$KMS_KEY_ID"

              echo "Key rotation is enabled for $KMS_KEY_ID"
```

## Encryption Status Monitoring

Monitor encryption compliance:

```bash
#!/bin/bash
# check-snapshot-encryption.sh

echo "=== Snapshot Encryption Status ==="
echo

# Check AWS EBS snapshots created by Kubernetes
echo "AWS EBS Snapshot Encryption:"
kubectl get volumesnapshot -A -o json | \
  jq -r '.items[] |
    [.metadata.namespace, .metadata.name, .status.boundVolumeSnapshotContentName] |
    @tsv' | \
  while IFS=$'\t' read -r namespace snapshot content; do
    [ -n "$content" ] || continue
    snapshot_id=$(kubectl get volumesnapshotcontent "$content" \
      -o jsonpath='{.status.snapshotHandle}')
    [ -n "$snapshot_id" ] || continue
    aws ec2 describe-snapshots \
      --snapshot-ids "$snapshot_id" \
      --query "Snapshots[0].[SnapshotId,Encrypted,KmsKeyId]" \
      --output text | \
      awk -v ns="$namespace" -v name="$snapshot" '{print ns "/" name "\t" $0}'
  done | column -t -s $'\t'

echo
echo "Snapshots by Encryption Status:"

# Count encrypted vs unencrypted snapshots
TOTAL=0
ENCRYPTED=0

while read -r snapshot_id; do
  [ -n "$snapshot_id" ] || continue
  TOTAL=$((TOTAL + 1))
  IS_ENCRYPTED=$(aws ec2 describe-snapshots \
    --snapshot-ids "$snapshot_id" \
    --query 'Snapshots[0].Encrypted' \
    --output text)
  if [ "$IS_ENCRYPTED" = "True" ]; then
    ENCRYPTED=$((ENCRYPTED + 1))
  fi
done <<EOF
$(kubectl get volumesnapshotcontent -o json | jq -r '.items[].status.snapshotHandle // empty')
EOF

UNENCRYPTED=$((TOTAL - ENCRYPTED))

echo "Encrypted: $ENCRYPTED"
echo "Unencrypted: $UNENCRYPTED"
echo "Total: $TOTAL"

if [ "$UNENCRYPTED" -gt 0 ]; then
  echo
  echo "WARNING: Unencrypted AWS EBS snapshots found. Review the source PVC StorageClass encryption settings."
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
            image: public.ecr.aws/aws-cli/aws-cli:latest
            env:
            - name: SLACK_WEBHOOK
              valueFrom:
                secretKeyRef:
                  name: notification-secrets
                  key: slack-webhook
            command:
            - /bin/sh
            - -c
            - |
              set -e

              yum install -y jq curl
              curl -fsSLo /usr/local/bin/kubectl \
                "https://dl.k8s.io/release/v1.33.0/bin/linux/amd64/kubectl"
              chmod +x /usr/local/bin/kubectl

              echo "=== Encryption Compliance Report ==="
              REPORT_DATE=$(date +%Y-%m-%d)

              # Generate report
              TOTAL=$(kubectl get volumesnapshot -A --no-headers | wc -l)

              ENCRYPTED=0
              for SNAPSHOT_ID in $(kubectl get volumesnapshotcontent -o json | jq -r '.items[].status.snapshotHandle // empty'); do
                IS_ENCRYPTED=$(aws ec2 describe-snapshots \
                  --snapshot-ids "$SNAPSHOT_ID" \
                  --query 'Snapshots[0].Encrypted' \
                  --output text)
                if [ "$IS_ENCRYPTED" = "True" ]; then
                  ENCRYPTED=$((ENCRYPTED + 1))
                fi
              done

              if [ "$TOTAL" -eq 0 ]; then
                COMPLIANCE_RATE=100
              else
                COMPLIANCE_RATE=$(( ENCRYPTED * 100 / TOTAL ))
              fi

              # Generate detailed report
              cat > /tmp/report.txt <<EOF
              Snapshot Encryption Compliance Report
              Date: $REPORT_DATE

              Total Snapshots: $TOTAL
              Encrypted Snapshots: $ENCRYPTED
              Compliance Rate: ${COMPLIANCE_RATE}%

              By Application:
              EOF

              kubectl get volumesnapshot -A -o json | \
                jq -r '.items[] |
                  {
                    app: (.metadata.labels.app // "unknown"),
                    name: (.metadata.namespace + "/" + .metadata.name)
                  }' | \
                jq -s 'group_by(.app) |
                  .[] |
                  {
                    app: .[0].app,
                    total: length
                  }' | \
                jq -r '"\(.app): \(.total) snapshots"' >> /tmp/report.txt

              cat /tmp/report.txt

              # Send to Slack if compliance below threshold
              if [ "$COMPLIANCE_RATE" -lt 100 ]; then
                PAYLOAD=$(jq -n \
                  --arg text "Snapshot Encryption Compliance: ${COMPLIANCE_RATE}%" \
                  --arg report "$(cat /tmp/report.txt)" \
                  '{text: $text, attachments: [{color: "warning", text: $report}]}')

                curl -X POST "$SLACK_WEBHOOK" \
                  -H 'Content-Type: application/json' \
                  -d "$PAYLOAD"
              fi
```

## Cross-Region Encrypted Snapshots

Kubernetes `VolumeSnapshotClass` does not perform cross-region EBS snapshot copies. To replicate encrypted EBS snapshots across regions, use the cloud provider snapshot copy API after the CSI snapshot is ready:

```bash
SNAPSHOT_ID=$(kubectl get volumesnapshotcontent \
  $(kubectl get volumesnapshot encrypted-snapshot \
    -o jsonpath='{.status.boundVolumeSnapshotContentName}') \
  -o jsonpath='{.status.snapshotHandle}')

aws ec2 copy-snapshot \
  --source-region us-east-1 \
  --source-snapshot-id "$SNAPSHOT_ID" \
  --region us-west-2 \
  --encrypted \
  --kms-key-id "arn:aws:kms:us-west-2:123456789012:key/yyyyy"
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
