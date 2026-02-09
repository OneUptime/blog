# How to implement Vault auto-unsealing with cloud KMS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: HashiCorp Vault, Auto-Unseal, AWS KMS, Cloud KMS, Kubernetes

Description: Learn how to configure Vault auto-unsealing using cloud KMS services to eliminate manual unsealing and improve Vault availability in Kubernetes clusters.

---

Vault starts in a sealed state after restarts, requiring manual unsealing with keys. This creates operational challenges, especially in Kubernetes where pods may restart frequently. Auto-unsealing delegates the unsealing process to cloud KMS services, allowing Vault to unseal automatically. This guide shows you how to configure auto-unseal for production Vault deployments.

## Understanding Auto-Unseal

Traditional Vault unsealing requires providing threshold unseal keys to decrypt the master key. Auto-unseal replaces this with a cloud KMS service that holds the encryption key. When Vault starts, it authenticates to the KMS and requests decryption of the master key, automatically unsealing without human intervention.

Auto-unseal reduces operational burden, eliminates unseal key management, enables faster recovery, and improves availability by allowing automatic restarts.

## Configuring AWS KMS Auto-Unseal

Set up auto-unseal using AWS KMS:

```bash
# Create KMS key in AWS
aws kms create-key \
  --description "Vault auto-unseal key" \
  --key-usage ENCRYPT_DECRYPT \
  --query 'KeyMetadata.KeyId' \
  --output text

# Note the key ID: e.g., abcd1234-ef56-gh78-ij90-klmn12345678

# Create alias for easier reference
aws kms create-alias \
  --alias-name alias/vault-unseal \
  --target-key-id abcd1234-ef56-gh78-ij90-klmn12345678

# Grant Vault IAM role access to the key
aws kms create-grant \
  --key-id alias/vault-unseal \
  --grantee-principal arn:aws:iam::123456789012:role/vault-kms-role \
  --operations Decrypt Encrypt DescribeKey
```

## Creating IAM Role for Vault

Configure IAM for Vault pods:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "kms:Decrypt",
        "kms:Encrypt",
        "kms:DescribeKey"
      ],
      "Resource": "arn:aws:kms:us-east-1:123456789012:key/abcd1234-ef56-gh78-ij90-klmn12345678"
    }
  ]
}
```

Attach to Vault service account:

```yaml
# vault-serviceaccount.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: vault
  namespace: vault
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/vault-kms-role
```

## Configuring Vault for AWS KMS

Update Vault configuration to use AWS KMS:

```yaml
# vault-values.yaml for Helm
server:
  extraEnvironmentVars:
    AWS_REGION: us-east-1
    AWS_ROLE_ARN: arn:aws:iam::123456789012:role/vault-kms-role

  ha:
    enabled: true
    replicas: 3
    raft:
      enabled: true
      config: |
        ui = true

        listener "tcp" {
          tls_disable = 1
          address = "[::]:8200"
          cluster_address = "[::]:8201"
        }

        storage "raft" {
          path = "/vault/data"
        }

        seal "awskms" {
          region     = "us-east-1"
          kms_key_id = "alias/vault-unseal"
        }

        service_registration "kubernetes" {}
```

Deploy Vault with auto-unseal:

```bash
helm install vault hashicorp/vault \
  --namespace vault \
  --values vault-values.yaml
```

## Initializing Vault with Auto-Unseal

Initialize Vault once with auto-unseal configured:

```bash
# Initialize (only creates recovery keys, no unseal keys)
kubectl -n vault exec -it vault-0 -- vault operator init \
  -key-shares=5 \
  -key-threshold=3 \
  -recovery-shares=5 \
  -recovery-threshold=3 \
  -format=json > vault-recovery-keys.json

# Store recovery keys securely
cat vault-recovery-keys.json | jq -r '.recovery_keys_b64[]'

# Note: No unsealing required!
# Vault automatically unseals using KMS

# Verify auto-unseal status
kubectl -n vault exec vault-0 -- vault status

# Output shows:
# Sealed: false
# Seal Type: awskms
```

## Configuring Google Cloud KMS

For GCP deployments:

```bash
# Create KMS keyring
gcloud kms keyrings create vault-keyring \
  --location=global

# Create crypto key
gcloud kms keys create vault-unseal \
  --location=global \
  --keyring=vault-keyring \
  --purpose=encryption

# Grant Vault service account access
gcloud kms keys add-iam-policy-binding vault-unseal \
  --location=global \
  --keyring=vault-keyring \
  --member=serviceAccount:vault@project-id.iam.gserviceaccount.com \
  --role=roles/cloudkms.cryptoKeyEncrypterDecrypter
```

Vault configuration for GCP KMS:

```hcl
seal "gcpckms" {
  project     = "my-project"
  region      = "global"
  key_ring    = "vault-keyring"
  crypto_key  = "vault-unseal"
}
```

## Configuring Azure Key Vault

For Azure deployments:

```bash
# Create Key Vault
az keyvault create \
  --name vault-unseal-kv \
  --resource-group vault-rg \
  --location eastus

# Create key
az keyvault key create \
  --vault-name vault-unseal-kv \
  --name vault-unseal-key \
  --protection software

# Grant Vault managed identity access
az keyvault set-policy \
  --name vault-unseal-kv \
  --object-id <vault-managed-identity-id> \
  --key-permissions encrypt decrypt
```

Vault configuration for Azure:

```hcl
seal "azurekeyvault" {
  tenant_id      = "tenant-uuid"
  vault_name     = "vault-unseal-kv"
  key_name       = "vault-unseal-key"
}
```

## Testing Auto-Unseal

Verify automatic unsealing works:

```bash
# Delete a Vault pod to force restart
kubectl -n vault delete pod vault-0

# Watch pod restart
kubectl -n vault get pods -w

# Once running, check seal status (should be unsealed)
kubectl -n vault exec vault-0 -- vault status

# Output should show:
# Sealed: false
# No manual unsealing required!
```

## Migrating from Shamir to Auto-Unseal

Migrate existing Vault to auto-unseal:

```bash
# Step 1: Configure auto-unseal in Vault config
# Add seal "awskms" block while keeping existing data

# Step 2: Update Vault deployment
helm upgrade vault hashicorp/vault \
  --namespace vault \
  --values vault-values-with-autounseal.yaml

# Step 3: Migrate seal
kubectl -n vault exec -it vault-0 -- vault operator unseal-migrate \
  -type=awskms

# Provide your existing unseal keys when prompted

# Step 4: Restart Vault pods
kubectl -n vault rollout restart statefulset vault

# Verify migration
kubectl -n vault exec vault-0 -- vault status
# Seal Type should now show: awskms
```

## Handling Recovery Operations

Use recovery keys for emergency operations:

```bash
# Generate root token using recovery keys
kubectl -n vault exec -it vault-0 -- vault operator generate-root \
  -init -recovery-key

# Follow prompts and provide recovery key shares

# Rekey recovery keys if compromised
kubectl -n vault exec -it vault-0 -- vault operator rekey \
  -target=recovery \
  -init \
  -key-shares=5 \
  -key-threshold=3

# Provide recovery key shares to complete rekey
```

## Monitoring Auto-Unseal

Track auto-unseal operations:

```bash
# Enable audit logging
kubectl -n vault exec vault-0 -- vault audit enable file \
  file_path=/vault/logs/audit.log

# Monitor seal status
kubectl -n vault exec vault-0 -- vault status -format=json | \
  jq '{sealed: .sealed, seal_type: .seal_type, recovery_seal: .recovery_seal}'

# Check KMS metrics (AWS example)
aws cloudwatch get-metric-statistics \
  --namespace AWS/KMS \
  --metric-name Decrypt \
  --dimensions Name=KeyId,Value=abcd1234-ef56-gh78-ij90-klmn12345678 \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

## Best Practices

Always store recovery keys securely in a separate location from Vault. Test auto-unseal by deliberately restarting Vault pods. Monitor KMS service health and set up alerting. Use separate KMS keys for different Vault clusters. Implement KMS key rotation policies per compliance requirements. Configure appropriate IAM permissions following least privilege. Test disaster recovery procedures with auto-unseal. Document recovery key locations for emergency access.

Auto-unsealing with cloud KMS eliminates the operational burden of manual unsealing while improving Vault availability. By delegating key management to proven cloud services, you reduce the risk of losing unseal keys and enable truly automated Vault operations. This is essential for running Vault reliably in dynamic Kubernetes environments where pods restart frequently.
