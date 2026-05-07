# How to Encrypt Rancher Backups

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Backup, Encryption

Description: Learn how to encrypt Rancher backups at rest using the Backup Operator's built-in encryption support with custom encryption keys.

Rancher backups contain sensitive configuration data including cluster credentials, authentication settings, and API tokens. Encrypting your backups ensures that this data remains protected even if the backup storage is compromised. This guide covers configuring encryption for Rancher backups.

## Prerequisites

- Rancher with the Backup Operator installed
- kubectl access with cluster admin privileges
- OpenSSL or a similar tool for generating encryption keys

## Step 1: Generate an Encryption Key

Create a strong encryption key using OpenSSL:

```bash
openssl rand -base64 32 > encryption-key.txt
```

This generates a 256-bit key encoded in base64.

## Step 2: Create an Encryption Config Secret

The Backup Operator uses a Kubernetes `EncryptionConfiguration` for backup encryption. Create the encryption configuration file:

```yaml
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources:
      - secrets
    providers:
      - aesgcm:
          keys:
            - name: key1
              secret: YOUR_BASE64_ENCODED_KEY
      - identity: {}
```

Replace `YOUR_BASE64_ENCODED_KEY` with the contents of `encryption-key.txt`.

Create the secret containing this configuration:

```bash
kubectl create secret generic rancher-backup-encryption \
  -n cattle-resources-system \
  --from-file=encryption-provider-config.yaml=encryption-config.yaml
```

## Step 3: Create an Encrypted Backup

Reference the encryption secret in your Backup resource:

```yaml
apiVersion: resources.cattle.io/v1
kind: Backup
metadata:
  name: rancher-encrypted-backup
spec:
  resourceSetName: rancher-resource-set-full
  retentionCount: 10
  encryptionConfigSecretName: rancher-backup-encryption
```

Apply the backup:

```bash
kubectl apply -f encrypted-backup.yaml
```

## Step 4: Create Encrypted Scheduled Backups

Combine encryption with scheduled backups and external storage:

```yaml
apiVersion: resources.cattle.io/v1
kind: Backup
metadata:
  name: rancher-encrypted-daily-backup
spec:
  resourceSetName: rancher-resource-set-full
  retentionCount: 30
  schedule: "0 2 * * *"
  encryptionConfigSecretName: rancher-backup-encryption
  storageLocation:
    s3:
      bucketName: rancher-backups
      folder: encrypted-daily
      endpoint: s3.amazonaws.com
      region: us-east-1
      credentialSecretName: s3-creds
      credentialSecretNamespace: cattle-resources-system
```

## Step 5: Verify Encryption

Check that the backup was created with encryption:

```bash
kubectl get backup rancher-encrypted-daily-backup -o jsonpath='{.status.filename}{"\n"}'
```

The backup should complete successfully, and the filename should end with `.enc`. To verify the encrypted content, download that exact backup file and inspect one of the Secret entries inside it:

```bash
BACKUP_FILE=$(kubectl get backup rancher-encrypted-daily-backup -o jsonpath='{.status.filename}')
aws s3 cp "s3://rancher-backups/encrypted-daily/${BACKUP_FILE}" .
tar -tzf "${BACKUP_FILE}" | head
SECRET_FILE=$(tar -tzf "${BACKUP_FILE}" | grep '^secrets\.#v1/' | head -n1)
tar -xOf "${BACKUP_FILE}" "${SECRET_FILE}"
```

The archive remains a valid gzip-compressed tar file, but encrypted Secret entries will appear as a quoted encrypted blob instead of a normal Secret manifest.

## Step 6: Restore an Encrypted Backup

When restoring an encrypted backup, you must provide the same encryption secret and the exact backup filename, including the `.enc` suffix. Create the Restore resource:

```yaml
apiVersion: resources.cattle.io/v1
kind: Restore
metadata:
  name: rancher-encrypted-restore
spec:
  backupFilename: rancher-encrypted-daily-backup-<uid>-<timestamp>.tar.gz.enc
  encryptionConfigSecretName: rancher-backup-encryption
  storageLocation:
    s3:
      bucketName: rancher-backups
      folder: encrypted-daily
      endpoint: s3.amazonaws.com
      region: us-east-1
      credentialSecretName: s3-creds
      credentialSecretNamespace: cattle-resources-system
```

If you do not provide the encryption secret, the restore will fail.

## Step 7: Rotate Encryption Keys

Periodically rotating your encryption keys is a best practice. To rotate:

1. Generate a new key:

```bash
openssl rand -base64 32 > new-encryption-key.txt
```

2. Update the encryption configuration with both old and new keys (new key first):

```yaml
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources:
      - secrets
    providers:
      - aesgcm:
          keys:
            - name: key2
              secret: NEW_BASE64_ENCODED_KEY
            - name: key1
              secret: OLD_BASE64_ENCODED_KEY
      - identity: {}
```

3. Update the Kubernetes secret:

```bash
kubectl create secret generic rancher-backup-encryption \
  -n cattle-resources-system \
  --from-file=encryption-provider-config.yaml=updated-encryption-config.yaml \
  --dry-run=client -o yaml | kubectl apply -f -
```

New backups will use the new key. The old key is retained so that older backups can still be restored.

## Step 8: Secure the Encryption Key

The encryption key itself must be stored securely. Consider the following practices:

- Store a copy of the encryption key in a separate, secure location (e.g., a hardware security module or a secrets vault).
- Never store the encryption key in the same location as the backups.
- If you run the Backup Operator with a custom least-privilege service account, use RBAC to scope access to the encryption secret in Kubernetes.
- Document which key version was used for which backups.

For a custom least-privilege deployment, you can scope access to the secret like this:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: backup-encryption-access
  namespace: cattle-resources-system
rules:
- apiGroups: [""]
  resources: ["secrets"]
  resourceNames: ["rancher-backup-encryption"]
  verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: backup-operator-encryption-access
  namespace: cattle-resources-system
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: backup-encryption-access
subjects:
- kind: ServiceAccount
  name: rancher-backup
  namespace: cattle-resources-system
```

## Troubleshooting

### Restore Fails with Decryption Error

Ensure you are using the exact same encryption secret that was used when the backup was created. Check key names and values carefully.

### Backup Fails with Encryption Error

Verify the encryption configuration format is correct and the secret exists:

```bash
kubectl get secret rancher-backup-encryption -n cattle-resources-system
```

### Lost Encryption Key

If you lose the encryption key, encrypted backups cannot be restored. This is why securely storing the key separately from the backups is critical.

## Conclusion

Encrypting Rancher backups adds an essential layer of security to your disaster recovery strategy. By generating encryption keys, referencing them in your Backup resources, and following key management best practices, you ensure that your Rancher configuration data remains protected at rest regardless of where the backup files are stored.
