# How to Use Data Encryption at Rest for StatefulSet Persistent Volumes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Encryption

Description: Secure StatefulSet persistent volumes with encryption at rest using cloud provider encryption, LUKS encryption, and key management systems for compliance and data protection.

---

Encrypting data at rest protects against unauthorized access to physical storage media. For StatefulSets running databases and stateful applications on Kubernetes, encryption at rest is often a compliance requirement. Multiple approaches exist, from cloud provider managed encryption to application-level encryption. This guide covers implementing robust encryption for persistent volumes attached to StatefulSets.

## Understanding Encryption Options

Cloud provider encryption uses managed keys to encrypt volumes transparently. AWS EBS encryption, Google Cloud disk encryption, and Azure disk encryption handle encryption without application changes. This approach is simplest but ties you to the provider's key management.

LUKS (Linux Unified Key Setup) provides block-level encryption at the OS level. You control the keys and encryption happens before data reaches the cloud provider. This offers stronger guarantees but adds operational complexity.

Application-level encryption encrypts data before writing to disk. Some database products support Transparent Data Encryption (TDE); PostgreSQL commonly uses extensions such as pgcrypto for column-level encryption rather than built-in TDE. This provides the strongest protection but requires application support.

## Enabling Cloud Provider Encryption

For AWS EBS volumes with KMS encryption:

```yaml
# aws-encrypted-storage.yaml

apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: encrypted-storage
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  iops: "10000"
  throughput: "500"
  encrypted: "true"
  # Use custom KMS key
  kmsKeyId: "arn:aws:kms:us-east-1:123456789:key/12345678-1234-1234-1234-123456789012"
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
reclaimPolicy: Retain
```

For Google Cloud encrypted disks:

```yaml
# gcp-encrypted-storage.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: encrypted-storage
provisioner: pd.csi.storage.gke.io
parameters:
  type: pd-ssd
  replication-type: regional-pd
  # Use customer-managed encryption key
  disk-encryption-kms-key: "projects/PROJECT_ID/locations/LOCATION/keyRings/KEYRING/cryptoKeys/KEY"
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
```

For Azure encrypted managed disks:

```yaml
# azure-encrypted-storage.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: encrypted-storage
provisioner: disk.csi.azure.com
parameters:
  skuName: Premium_LRS
  # Azure managed disks are encrypted at rest by default.
  # Use a customer-managed key with a Disk Encryption Set.
  diskEncryptionSetID: "/subscriptions/SUBSCRIPTION_ID/resourceGroups/RG_NAME/providers/Microsoft.Compute/diskEncryptionSets/DES_NAME"
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
```

Deploy a StatefulSet with encrypted storage:

```yaml
# postgres-encrypted.yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: database
spec:
  clusterIP: None
  selector:
    app: postgres
  ports:
  - name: postgres
    port: 5432
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: database
spec:
  serviceName: postgres
  replicas: 3
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      securityContext:
        fsGroup: 999
        runAsUser: 999
        runAsNonRoot: true
      containers:
      - name: postgres
        image: postgres:15
        env:
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-password
              key: password
        - name: PGDATA
          value: /var/lib/postgresql/data/pgdata
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
        resources:
          requests:
            cpu: 2
            memory: 4Gi
          limits:
            cpu: 4
            memory: 8Gi
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: encrypted-storage
      resources:
        requests:
          storage: 100Gi
```

Deploy the StatefulSet:

```bash
kubectl create namespace database

# Create password secret
kubectl create secret generic postgres-password \
  -n database \
  --from-literal=password=SecurePassword123!

# Deploy StatefulSet
kubectl apply -f postgres-encrypted.yaml

# Verify volumes are encrypted
kubectl get pvc -n database
kubectl describe pv <pv-name> | grep -i encrypt
```

## Implementing LUKS Encryption

For scenarios requiring OS-level encryption, use a CSI driver or storage operator that implements LUKS during the node staging or publishing path. Do not format a mounted PVC from an init container: Kubernetes mounts PVCs as filesystems by default, raw block access requires `volumeMode: Block` and `volumeDevices`, and dm-crypt mappings created inside one container are not a portable way to provide the filesystem mounted in another container.

```yaml
# luks-encrypted-storage.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: luks-encrypted-storage
provisioner: example.csi.driver
parameters:
  # Driver-specific parameter; verify the exact name in your CSI driver docs.
  encrypted: "true"
  csi.storage.k8s.io/node-stage-secret-name: luks-key
  csi.storage.k8s.io/node-stage-secret-namespace: database
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
```

Create the LUKS key secret:

```bash
# Generate a strong encryption key
openssl rand -base64 32 > luks-key.txt

# Create secret
kubectl create secret generic luks-key \
  -n database \
  --from-file=luks-key=luks-key.txt

# Securely delete the key file
shred -vfz -n 10 luks-key.txt
```

## Using Vault for Key Management

Integrate with HashiCorp Vault for centralized key management:

```yaml
# vault-key-management.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: postgres-sa
  namespace: database
---
apiVersion: v1
kind: Service
metadata:
  name: postgres-vault
  namespace: database
spec:
  clusterIP: None
  selector:
    app: postgres-vault
  ports:
  - name: postgres
    port: 5432
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres-vault
  namespace: database
spec:
  serviceName: postgres-vault
  replicas: 1
  selector:
    matchLabels:
      app: postgres-vault
  template:
    metadata:
      labels:
        app: postgres-vault
      annotations:
        vault.hashicorp.com/agent-inject: "true"
        vault.hashicorp.com/role: "postgres-role"
        vault.hashicorp.com/agent-inject-secret-encryption-key: "secret/data/postgres/encryption-key"
        vault.hashicorp.com/agent-inject-template-encryption-key: |
          {{ with secret "secret/data/postgres/encryption-key" }}
          {{ .Data.data.key }}
          {{ end }}
    spec:
      serviceAccountName: postgres-sa
      containers:
      - name: postgres
        image: postgres:15
        env:
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-password
              key: password
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: encrypted-storage
      resources:
        requests:
          storage: 100Gi
```

## Implementing Application-Level Encryption

For PostgreSQL with pgcrypto extension:

```sql
-- Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create table with encrypted columns
CREATE TABLE sensitive_data (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255),
    -- Encrypt sensitive fields
    email_encrypted BYTEA,
    ssn_encrypted BYTEA,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert encrypted data
INSERT INTO sensitive_data (username, email_encrypted, ssn_encrypted)
VALUES (
    'john_doe',
    pgp_sym_encrypt('john@example.com', 'encryption_key'),
    pgp_sym_encrypt('123-45-6789', 'encryption_key')
);

-- Query encrypted data
SELECT
    id,
    username,
    pgp_sym_decrypt(email_encrypted, 'encryption_key') AS email,
    pgp_sym_decrypt(ssn_encrypted, 'encryption_key') AS ssn
FROM sensitive_data;
```

Store encryption keys in Kubernetes secrets:

```yaml
# app-encryption-key.yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-encryption-key
  namespace: database
type: Opaque
stringData:
  encryption-key: "your-strong-encryption-key-here"
```

## Monitoring Encryption Status

Create a monitoring job to verify encryption:

```yaml
# encryption-check-job.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: encryption-checker
  namespace: database
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: encryption-checker
rules:
- apiGroups: [""]
  resources: ["persistentvolumes"]
  verbs: ["get", "list"]
- apiGroups: ["storage.k8s.io"]
  resources: ["storageclasses"]
  verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: encryption-checker
subjects:
- kind: ServiceAccount
  name: encryption-checker
  namespace: database
roleRef:
  kind: ClusterRole
  name: encryption-checker
  apiGroup: rbac.authorization.k8s.io
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: encryption-check
  namespace: database
spec:
  schedule: "0 */6 * * *"  # Every 6 hours
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: encryption-checker
          containers:
          - name: checker
            image: your-registry/aws-kubectl-jq:latest
            command:
            - sh
            - -c
            - |
              ENCRYPTED_STORAGE_CLASSES=$(kubectl get storageclass -o json | \
                jq -c '[.items[] | select((.parameters.encrypted // "") == "true" or (.parameters["disk-encryption-kms-key"] // "") != "" or (.parameters.diskEncryptionSetID // "") != "") | .metadata.name]')

              # Check PVs that use encrypted storage classes
              kubectl get pv -o json | \
                jq -r --argjson encrypted "$ENCRYPTED_STORAGE_CLASSES" '.items[] | select(.spec.storageClassName as $sc | $encrypted | index($sc)) | .metadata.name' | \
                while read pv; do
                  echo "Checking $pv..."
                  kubectl describe pv $pv
                done

              # For AWS EBS volumes
              VOLUME_IDS=$(kubectl get pv -o json | \
                jq -r '.items[] | select(.spec.csi.driver=="ebs.csi.aws.com") | .spec.csi.volumeHandle | split("/") | last')

              for vol in $VOLUME_IDS; do
                ENCRYPTED=$(aws ec2 describe-volumes \
                  --volume-ids $vol \
                  --query 'Volumes[0].Encrypted' \
                  --output text)
                if [ "$ENCRYPTED" != "True" ]; then
                  echo "ALERT: Volume $vol is not encrypted!"
                fi
              done
          restartPolicy: OnFailure
```

## Rotating Encryption Keys

For AWS EBS, create replacement volumes encrypted with the new key as part of a controlled storage migration:

```bash
#!/bin/bash
# rotate-encryption-key.sh

set -e

OLD_KEY_ID="old-key-id"
NEW_KEY_ID="new-key-id"

# For AWS EBS volumes
for vol in $(aws ec2 describe-volumes \
  --filters "Name=encrypted,Values=true" "Name=kms-key-id,Values=$OLD_KEY_ID" \
  --query 'Volumes[].VolumeId' \
  --output text); do

  echo "Creating snapshot of $vol..."
  SNAPSHOT=$(aws ec2 create-snapshot \
    --volume-id $vol \
    --description "Before key rotation" \
    --output text \
    --query 'SnapshotId')

  # Wait for snapshot to complete
  aws ec2 wait snapshot-completed --snapshot-ids $SNAPSHOT

  # Create new volume with new key
  NEW_VOL=$(aws ec2 create-volume \
    --snapshot-id $SNAPSHOT \
    --availability-zone us-east-1a \
    --encrypted \
    --kms-key-id $NEW_KEY_ID \
    --output text \
    --query 'VolumeId')

  echo "Created new volume $NEW_VOL with new encryption key"
done
```

## Best Practices

Follow these guidelines:

1. **Use cloud provider encryption by default** - Simplest and most reliable
2. **Store keys securely** - Use key management systems like Vault or cloud KMS
3. **Rotate keys regularly** - Implement automated key rotation
4. **Encrypt backups** - Ensure backup storage is also encrypted
5. **Test recovery procedures** - Verify you can restore encrypted data
6. **Document key locations** - Maintain secure documentation of key storage
7. **Implement access controls** - Restrict who can access encryption keys
8. **Monitor encryption status** - Alert on unencrypted volumes
9. **Comply with regulations** - Meet industry-specific requirements (PCI DSS, HIPAA)
10. **Layer security** - Combine multiple encryption approaches

## Compliance and Auditing

Generate compliance reports:

```bash
#!/bin/bash
# encryption-compliance-report.sh

echo "=== Encryption Compliance Report ==="
echo "Generated: $(date)"
echo ""

# Check storage classes
echo "Encrypted Storage Classes:"
ENCRYPTED_STORAGE_CLASSES_JSON=$(kubectl get storageclass -o json | \
  jq -c '[.items[] | select((.parameters.encrypted // "") == "true" or (.parameters["disk-encryption-kms-key"] // "") != "" or (.parameters.diskEncryptionSetID // "") != "") | .metadata.name]')
echo "$ENCRYPTED_STORAGE_CLASSES_JSON" | jq -r '.[]'

echo ""

# Check PVCs using encrypted storage
echo "PVCs with Encrypted Storage:"
kubectl get pvc --all-namespaces -o json | \
  jq -r --argjson encrypted "$ENCRYPTED_STORAGE_CLASSES_JSON" '.items[] | select(.spec.storageClassName as $sc | $encrypted | index($sc)) | "\(.metadata.namespace)/\(.metadata.name)"'

echo ""

# Generate metrics
TOTAL_PVCS=$(kubectl get pvc --all-namespaces -o json | jq '.items | length')
ENCRYPTED_PVCS=$(kubectl get pvc --all-namespaces -o json | \
  jq --argjson encrypted "$ENCRYPTED_STORAGE_CLASSES_JSON" '[.items[] | select(.spec.storageClassName as $sc | $encrypted | index($sc))] | length')

echo "Total PVCs: $TOTAL_PVCS"
echo "Encrypted PVCs: $ENCRYPTED_PVCS"
if [ "$TOTAL_PVCS" -gt 0 ]; then
  echo "Encryption Rate: $(( ENCRYPTED_PVCS * 100 / TOTAL_PVCS ))%"
else
  echo "Encryption Rate: N/A"
fi
```

## Conclusion

Implementing encryption at rest for StatefulSet persistent volumes protects sensitive data from unauthorized access. Cloud provider encryption offers the simplest approach with minimal operational overhead, while LUKS provides stronger guarantees at the cost of complexity. Application-level encryption offers the most control but requires application support. By properly configuring storage classes with encryption, managing keys securely through systems like Vault, and regularly testing recovery procedures, you ensure data remains protected while meeting compliance requirements. Monitor encryption status continuously and implement key rotation to maintain long-term security.
