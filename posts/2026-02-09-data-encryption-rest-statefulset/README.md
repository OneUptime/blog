# How to Implement Data Encryption at Rest for StatefulSet Persistent Volumes on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Encryption

Description: Secure StatefulSet persistent volumes with encryption at rest using cloud provider encryption, LUKS encryption, and key management systems for compliance and data protection.

---

Encrypting data at rest protects against unauthorized access to physical storage media. For StatefulSets running databases and stateful applications on Kubernetes, encryption at rest is often a compliance requirement. Multiple approaches exist, from cloud provider managed encryption to application-level encryption. This guide covers implementing robust encryption for persistent volumes attached to StatefulSets.

## Understanding Encryption Options

Cloud provider encryption uses managed keys to encrypt volumes transparently. AWS EBS encryption, Google Cloud disk encryption, and Azure disk encryption handle encryption without application changes. This approach is simplest but ties you to the provider's key management.

LUKS (Linux Unified Key Setup) provides block-level encryption at the OS level. You control the keys and encryption happens before data reaches the cloud provider. This offers stronger guarantees but adds operational complexity.

Application-level encryption encrypts data before writing to disk. Databases like PostgreSQL support Transparent Data Encryption (TDE). This provides the strongest protection but requires application support.

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
  # Enable encryption at rest
  encrypted: "true"
  # Use customer-managed key
  diskEncryptionSetID: "/subscriptions/SUBSCRIPTION_ID/resourceGroups/RG_NAME/providers/Microsoft.Compute/diskEncryptionSets/DES_NAME"
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
```

Deploy a StatefulSet with encrypted storage:

```yaml
# postgres-encrypted.yaml
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

For scenarios requiring OS-level encryption, use LUKS with init containers:

```yaml
# postgres-luks-encrypted.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres-luks
  namespace: database
spec:
  serviceName: postgres-luks
  replicas: 1
  selector:
    matchLabels:
      app: postgres-luks
  template:
    metadata:
      labels:
        app: postgres-luks
    spec:
      securityContext:
        fsGroup: 999
      initContainers:
      # Setup LUKS encryption
      - name: setup-luks
        image: ubuntu:22.04
        securityContext:
          privileged: true
        command:
        - sh
        - -c
        - |
          set -e

          # Install cryptsetup
          apt-get update && apt-get install -y cryptsetup

          # Check if already encrypted
          if cryptsetup isLuks /dev/nvme1n1; then
            echo "Volume already encrypted"
          else
            echo "Setting up LUKS encryption..."

            # Get encryption key from secret
            LUKS_KEY=$(cat /secrets/luks-key)

            # Format with LUKS
            echo -n "$LUKS_KEY" | cryptsetup luksFormat \
              --type luks2 \
              --cipher aes-xts-plain64 \
              --key-size 512 \
              --hash sha256 \
              --pbkdf argon2id \
              /dev/nvme1n1 -

            echo "LUKS encryption setup complete"
          fi

          # Open encrypted volume
          LUKS_KEY=$(cat /secrets/luks-key)
          echo -n "$LUKS_KEY" | cryptsetup open /dev/nvme1n1 pgdata -

          # Create filesystem if needed
          if ! blkid /dev/mapper/pgdata; then
            mkfs.ext4 /dev/mapper/pgdata
          fi

          # Mount encrypted volume
          mkdir -p /mnt/encrypted
          mount /dev/mapper/pgdata /mnt/encrypted

          # Set permissions
          chown -R 999:999 /mnt/encrypted

        volumeMounts:
        - name: secrets
          mountPath: /secrets
          readOnly: true
        - name: raw-volume
          mountPath: /dev/nvme1n1

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
        - name: encrypted-data
          mountPath: /var/lib/postgresql/data

      volumes:
      - name: secrets
        secret:
          secretName: luks-key
      - name: raw-volume
        persistentVolumeClaim:
          claimName: postgres-raw-volume
      - name: encrypted-data
        hostPath:
          path: /mnt/encrypted
          type: Directory

  volumeClaimTemplates:
  - metadata:
      name: postgres-raw-volume
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 100Gi
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
kind: ConfigMap
metadata:
  name: vault-agent-config
  namespace: database
data:
  vault-agent-config.hcl: |
    exit_after_auth = true

    auto_auth {
      method "kubernetes" {
        mount_path = "auth/kubernetes"
        config = {
          role = "postgres-role"
        }
      }

      sink "file" {
        config = {
          path = "/vault/secrets/encryption-key"
        }
      }
    }

    template {
      destination = "/vault/secrets/encryption-key"
      contents = <<EOT
{{ with secret "secret/data/postgres/encryption-key" }}{{ .Data.data.key }}{{ end }}
EOT
    }
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
        - name: vault-secrets
          mountPath: /vault/secrets
        - name: data
          mountPath: /var/lib/postgresql/data
      volumes:
      - name: vault-secrets
        emptyDir:
          medium: Memory
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
            image: amazon/aws-cli:latest
            command:
            - sh
            - -c
            - |
              # Check all PVs are encrypted
              kubectl get pv -o json | \
                jq -r '.items[] | select(.spec.storageClassName=="encrypted-storage") | .metadata.name' | \
                while read pv; do
                  echo "Checking $pv..."
                  kubectl describe pv $pv | grep -i encrypt || echo "WARNING: $pv may not be encrypted!"
                done

              # For AWS EBS volumes
              VOLUME_IDS=$(kubectl get pv -o json | \
                jq -r '.items[].spec.awsElasticBlockStore.volumeID' | \
                sed 's|aws://[^/]*/||')

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

Implement key rotation for compliance:

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
kubectl get storageclass -o json | \
  jq -r '.items[] | select(.parameters.encrypted=="true") | .metadata.name'

echo ""

# Check PVCs using encrypted storage
echo "PVCs with Encrypted Storage:"
kubectl get pvc --all-namespaces -o json | \
  jq -r '.items[] | select(.spec.storageClassName | contains("encrypted")) | "\(.metadata.namespace)/\(.metadata.name)"'

echo ""

# Generate metrics
TOTAL_PVCS=$(kubectl get pvc --all-namespaces -o json | jq '.items | length')
ENCRYPTED_PVCS=$(kubectl get pvc --all-namespaces -o json | \
  jq '[.items[] | select(.spec.storageClassName | contains("encrypted"))] | length')

echo "Total PVCs: $TOTAL_PVCS"
echo "Encrypted PVCs: $ENCRYPTED_PVCS"
echo "Encryption Rate: $(( ENCRYPTED_PVCS * 100 / TOTAL_PVCS ))%"
```

## Conclusion

Implementing encryption at rest for StatefulSet persistent volumes protects sensitive data from unauthorized access. Cloud provider encryption offers the simplest approach with minimal operational overhead, while LUKS provides stronger guarantees at the cost of complexity. Application-level encryption offers the most control but requires application support. By properly configuring storage classes with encryption, managing keys securely through systems like Vault, and regularly testing recovery procedures, you ensure data remains protected while meeting compliance requirements. Monitor encryption status continuously and implement key rotation to maintain long-term security.
