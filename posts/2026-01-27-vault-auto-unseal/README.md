# How to Configure Vault Auto-Unseal

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: HashiCorp Vault, Auto-Unseal, AWS KMS, Azure Key Vault, GCP Cloud KMS, Transit Auto-Unseal, Security, DevOps, Secrets Management

Description: A comprehensive guide to configuring HashiCorp Vault auto-unseal using AWS KMS, Azure Key Vault, GCP Cloud KMS, and Transit auto-unseal, including migration from Shamir keys and best practices for production deployments.

---

> **Key Insight**: Auto-unseal eliminates the operational burden of manually unsealing Vault after restarts. Instead of requiring multiple key holders to enter their unseal keys, Vault automatically decrypts its master key using a trusted external key management system.

## Understanding Vault Sealing and Unsealing

When Vault starts, it begins in a sealed state. The data stored in Vault is encrypted using an encryption key, which is itself encrypted by the master key. In the traditional Shamir's Secret Sharing approach, the master key is split into multiple shares, and a threshold of these shares must be provided to reconstruct the master key and unseal Vault.

```mermaid
flowchart TB
    subgraph Traditional Shamir Unseal
        V1[Vault Starts Sealed] --> K1[Key Holder 1]
        V1 --> K2[Key Holder 2]
        V1 --> K3[Key Holder 3]
        K1 --> |Share 1| U1[Unseal Process]
        K2 --> |Share 2| U1
        K3 --> |Share 3| U1
        U1 --> V2[Vault Unsealed]
    end

    subgraph Auto-Unseal
        V3[Vault Starts Sealed] --> KMS[External KMS]
        KMS --> |Decrypt Master Key| V4[Vault Unsealed]
    end
```

Auto-unseal delegates the responsibility of securing the master key to a trusted external key management service. This is particularly valuable in:

- **Kubernetes deployments** where pods may restart frequently
- **High availability clusters** where manual intervention is impractical
- **Disaster recovery scenarios** requiring automated failover

## Auto-Unseal with AWS KMS

AWS Key Management Service (KMS) provides a secure and highly available key management solution that integrates seamlessly with Vault.

### Prerequisites

```bash
# Create a KMS key for Vault auto-unseal
# This creates a symmetric key that Vault will use to encrypt/decrypt its master key
aws kms create-key \
  --description "Vault Auto-Unseal Key" \
  --key-usage ENCRYPT_DECRYPT \
  --origin AWS_KMS

# Note the KeyId from the output, you'll need it for Vault configuration
# Example: arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012

# Create an alias for easier management and configuration
aws kms create-alias \
  --alias-name alias/vault-unseal \
  --target-key-id <key-id>
```

### IAM Policy for Vault

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "VaultAutoUnseal",
      "Effect": "Allow",
      "Action": [
        "kms:Encrypt",
        "kms:Decrypt",
        "kms:DescribeKey"
      ],
      "Resource": "arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012"
    }
  ]
}
```

### Vault Configuration

```hcl
# /etc/vault.d/vault.hcl
# Complete Vault configuration with AWS KMS auto-unseal

# Storage backend configuration using integrated Raft storage
storage "raft" {
  # Path where Vault will store its data
  path    = "/opt/vault/data"

  # Unique identifier for this node in the cluster
  node_id = "vault-node-1"
}

# Listener configuration for client connections
listener "tcp" {
  # Listen on all interfaces
  address         = "0.0.0.0:8200"

  # TLS certificate and key for secure communication
  tls_cert_file   = "/opt/vault/tls/vault.crt"
  tls_key_file    = "/opt/vault/tls/vault.key"
}

# AWS KMS auto-unseal configuration
seal "awskms" {
  # The AWS region where the KMS key is located
  region = "us-east-1"

  # The KMS key ID, alias, or full ARN
  # Using an alias is recommended for easier key rotation
  kms_key_id = "alias/vault-unseal"

  # Optional: Use a specific AWS endpoint (useful for VPC endpoints or LocalStack)
  # endpoint = "https://kms.us-east-1.amazonaws.com"
}

# API address for cluster communication and client redirects
api_addr = "https://vault.example.com:8200"

# Cluster address for node-to-node communication
cluster_addr = "https://vault-node-1.example.com:8201"

# Enable the web UI
ui = true

# Disable memory locking (required for some container environments)
# disable_mlock = true
```

### Environment Variables for AWS Authentication

```bash
# Option 1: Environment variables (suitable for containers)
export AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
export AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
export AWS_REGION="us-east-1"

# Option 2: Using IAM instance profile (recommended for EC2)
# No environment variables needed - Vault will use the instance profile automatically

# Option 3: Using IRSA in Kubernetes (recommended for EKS)
# Configure via service account annotation - see Kubernetes deployment below
```

### Kubernetes Deployment with AWS KMS

```yaml
# vault-deployment-aws.yaml
# Complete Kubernetes deployment for Vault with AWS KMS auto-unseal
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vault
  namespace: vault
spec:
  replicas: 3
  selector:
    matchLabels:
      app: vault
  template:
    metadata:
      labels:
        app: vault
    spec:
      # Service account with IRSA annotation for AWS authentication
      serviceAccountName: vault
      containers:
        - name: vault
          image: hashicorp/vault:1.15
          ports:
            - containerPort: 8200
              name: api
            - containerPort: 8201
              name: cluster
          env:
            # AWS credentials via IRSA (IAM Roles for Service Accounts)
            - name: AWS_ROLE_ARN
              value: "arn:aws:iam::123456789012:role/vault-unseal-role"
            - name: AWS_WEB_IDENTITY_TOKEN_FILE
              value: "/var/run/secrets/eks.amazonaws.com/serviceaccount/token"
          volumeMounts:
            - name: config
              mountPath: /vault/config
            - name: data
              mountPath: /vault/data
            - name: aws-token
              mountPath: /var/run/secrets/eks.amazonaws.com/serviceaccount
              readOnly: true
          args:
            - "server"
            - "-config=/vault/config/vault.hcl"
          # Readiness probe to check if Vault is ready to serve traffic
          readinessProbe:
            httpGet:
              path: /v1/sys/health?standbyok=true
              port: 8200
              scheme: HTTPS
            initialDelaySeconds: 5
            periodSeconds: 10
      volumes:
        - name: config
          configMap:
            name: vault-config
        - name: data
          persistentVolumeClaim:
            claimName: vault-data
        - name: aws-token
          projected:
            sources:
              - serviceAccountToken:
                  path: token
                  audience: sts.amazonaws.com
                  expirationSeconds: 86400
---
# Service account with IRSA annotation
apiVersion: v1
kind: ServiceAccount
metadata:
  name: vault
  namespace: vault
  annotations:
    # EKS IRSA annotation - links this SA to an IAM role
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/vault-unseal-role
```

## Auto-Unseal with Azure Key Vault

Azure Key Vault provides a cloud-hosted key management service that can be used for Vault auto-unseal in Azure environments.

### Prerequisites

```bash
# Create a resource group for Vault resources
az group create \
  --name vault-unseal-rg \
  --location eastus

# Create an Azure Key Vault with premium SKU for HSM-backed keys
az keyvault create \
  --name vault-unseal-kv \
  --resource-group vault-unseal-rg \
  --location eastus \
  --sku premium \
  --enable-soft-delete true \
  --enable-purge-protection true

# Create a key for auto-unseal operations
az keyvault key create \
  --vault-name vault-unseal-kv \
  --name vault-unseal-key \
  --kty RSA \
  --size 2048 \
  --ops wrapKey unwrapKey

# Create a service principal for Vault authentication
az ad sp create-for-rbac \
  --name vault-unseal-sp \
  --role "Key Vault Crypto User" \
  --scopes /subscriptions/<subscription-id>/resourceGroups/vault-unseal-rg/providers/Microsoft.KeyVault/vaults/vault-unseal-kv
```

### Vault Configuration for Azure

```hcl
# /etc/vault.d/vault.hcl
# Vault configuration with Azure Key Vault auto-unseal

storage "raft" {
  path    = "/opt/vault/data"
  node_id = "vault-node-1"
}

listener "tcp" {
  address         = "0.0.0.0:8200"
  tls_cert_file   = "/opt/vault/tls/vault.crt"
  tls_key_file    = "/opt/vault/tls/vault.key"
}

# Azure Key Vault auto-unseal configuration
seal "azurekeyvault" {
  # Azure AD tenant ID where the service principal exists
  tenant_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

  # The name of the Azure Key Vault (not the full URL)
  vault_name = "vault-unseal-kv"

  # The name of the key within Azure Key Vault
  key_name = "vault-unseal-key"

  # Optional: Specify a specific resource for Azure Government or other clouds
  # resource = "https://vault.azure.net"
}

api_addr = "https://vault.example.com:8200"
cluster_addr = "https://vault-node-1.example.com:8201"
ui = true
```

### Environment Variables for Azure Authentication

```bash
# Service Principal authentication using environment variables
export AZURE_TENANT_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
export AZURE_CLIENT_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
export AZURE_CLIENT_SECRET="your-client-secret"

# Or use Managed Identity (recommended for Azure VMs and AKS)
# No environment variables needed - Vault will automatically use the managed identity
```

### Kubernetes Deployment with Azure Key Vault

```yaml
# vault-deployment-azure.yaml
# Kubernetes deployment for Vault with Azure Key Vault auto-unseal
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vault
  namespace: vault
spec:
  replicas: 3
  selector:
    matchLabels:
      app: vault
  template:
    metadata:
      labels:
        app: vault
        # Enable Azure Workload Identity
        azure.workload.identity/use: "true"
    spec:
      serviceAccountName: vault
      containers:
        - name: vault
          image: hashicorp/vault:1.15
          ports:
            - containerPort: 8200
              name: api
            - containerPort: 8201
              name: cluster
          env:
            # Azure credentials from Kubernetes secret
            - name: AZURE_CLIENT_ID
              valueFrom:
                secretKeyRef:
                  name: vault-azure-creds
                  key: client-id
            - name: AZURE_TENANT_ID
              valueFrom:
                secretKeyRef:
                  name: vault-azure-creds
                  key: tenant-id
            # Client secret for service principal auth
            - name: AZURE_CLIENT_SECRET
              valueFrom:
                secretKeyRef:
                  name: vault-azure-creds
                  key: client-secret
          volumeMounts:
            - name: config
              mountPath: /vault/config
            - name: data
              mountPath: /vault/data
          args:
            - "server"
            - "-config=/vault/config/vault.hcl"
      volumes:
        - name: config
          configMap:
            name: vault-config
        - name: data
          persistentVolumeClaim:
            claimName: vault-data
---
# Secret containing Azure credentials
apiVersion: v1
kind: Secret
metadata:
  name: vault-azure-creds
  namespace: vault
type: Opaque
stringData:
  client-id: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
  tenant-id: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
  client-secret: "your-client-secret"
```

## Auto-Unseal with GCP Cloud KMS

Google Cloud KMS provides a robust key management service that integrates well with Vault for auto-unseal functionality.

### Prerequisites

```bash
# Enable the Cloud KMS API in your project
gcloud services enable cloudkms.googleapis.com

# Create a key ring to organize your keys
gcloud kms keyrings create vault-unseal-keyring \
  --location global

# Create a crypto key for auto-unseal
gcloud kms keys create vault-unseal-key \
  --location global \
  --keyring vault-unseal-keyring \
  --purpose encryption

# Create a service account for Vault
gcloud iam service-accounts create vault-unseal-sa \
  --display-name "Vault Auto-Unseal Service Account"

# Grant the service account permission to use the key
gcloud kms keys add-iam-policy-binding vault-unseal-key \
  --location global \
  --keyring vault-unseal-keyring \
  --member "serviceAccount:vault-unseal-sa@PROJECT_ID.iam.gserviceaccount.com" \
  --role "roles/cloudkms.cryptoKeyEncrypterDecrypter"

# Create and download a service account key (for non-GCE environments)
gcloud iam service-accounts keys create vault-sa-key.json \
  --iam-account vault-unseal-sa@PROJECT_ID.iam.gserviceaccount.com
```

### Vault Configuration for GCP

```hcl
# /etc/vault.d/vault.hcl
# Vault configuration with GCP Cloud KMS auto-unseal

storage "raft" {
  path    = "/opt/vault/data"
  node_id = "vault-node-1"
}

listener "tcp" {
  address         = "0.0.0.0:8200"
  tls_cert_file   = "/opt/vault/tls/vault.crt"
  tls_key_file    = "/opt/vault/tls/vault.key"
}

# GCP Cloud KMS auto-unseal configuration
seal "gcpckms" {
  # GCP project ID containing the KMS resources
  project = "my-gcp-project"

  # The region where the key ring is located
  region = "global"

  # The name of the key ring
  key_ring = "vault-unseal-keyring"

  # The name of the crypto key
  crypto_key = "vault-unseal-key"
}

api_addr = "https://vault.example.com:8200"
cluster_addr = "https://vault-node-1.example.com:8201"
ui = true
```

### Environment Variables for GCP Authentication

```bash
# Option 1: Service account key file (for non-GCE environments)
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/vault-sa-key.json"

# Option 2: Using default application credentials (GCE, GKE)
# No environment variables needed - Vault will use the instance/workload identity

# Option 3: Using Workload Identity in GKE (recommended)
# Configure via Kubernetes service account annotation
```

### Kubernetes Deployment with GCP Cloud KMS

```yaml
# vault-deployment-gcp.yaml
# Kubernetes deployment for Vault with GCP Cloud KMS auto-unseal
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vault
  namespace: vault
spec:
  replicas: 3
  selector:
    matchLabels:
      app: vault
  template:
    metadata:
      labels:
        app: vault
    spec:
      serviceAccountName: vault
      containers:
        - name: vault
          image: hashicorp/vault:1.15
          ports:
            - containerPort: 8200
              name: api
            - containerPort: 8201
              name: cluster
          volumeMounts:
            - name: config
              mountPath: /vault/config
            - name: data
              mountPath: /vault/data
          args:
            - "server"
            - "-config=/vault/config/vault.hcl"
          # Health checks for Kubernetes
          livenessProbe:
            httpGet:
              path: /v1/sys/health?standbyok=true&uninitcode=200&sealedcode=200
              port: 8200
              scheme: HTTPS
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /v1/sys/health?standbyok=true
              port: 8200
              scheme: HTTPS
            initialDelaySeconds: 5
            periodSeconds: 10
      volumes:
        - name: config
          configMap:
            name: vault-config
        - name: data
          persistentVolumeClaim:
            claimName: vault-data
---
# Service account with Workload Identity annotation for GKE
apiVersion: v1
kind: ServiceAccount
metadata:
  name: vault
  namespace: vault
  annotations:
    # GKE Workload Identity - links Kubernetes SA to GCP SA
    iam.gke.io/gcp-service-account: vault-unseal-sa@PROJECT_ID.iam.gserviceaccount.com
```

## Transit Auto-Unseal

Transit auto-unseal uses another Vault cluster's Transit secrets engine to provide the encryption/decryption capability. This is useful when you want to avoid cloud vendor lock-in or when running Vault in an air-gapped environment.

```mermaid
flowchart LR
    subgraph Primary Vault Cluster
        PV[Primary Vault] --> TE[Transit Engine]
        TE --> TK[Transit Key]
    end

    subgraph Secondary Vault Cluster
        SV[Secondary Vault] --> |Encrypt/Decrypt Master Key| TE
    end

    style PV fill:#7B68EE
    style SV fill:#20B2AA
```

### Configure the Primary Vault (Transit Provider)

```bash
# On the primary Vault cluster that will provide transit services
# Enable the Transit secrets engine
vault secrets enable transit

# Create a key specifically for auto-unseal operations
# The key type defaults to aes256-gcm96 which is suitable for auto-unseal
vault write -f transit/keys/autounseal

# Create a policy that grants only the minimum required permissions
vault policy write autounseal - <<EOF
# Allow encrypting data with the autounseal key
path "transit/encrypt/autounseal" {
  capabilities = ["update"]
}

# Allow decrypting data with the autounseal key
path "transit/decrypt/autounseal" {
  capabilities = ["update"]
}
EOF

# Create a token for the secondary Vault to use
# This token should be orphan (no parent), renewable, and have a long period
vault token create \
  -policy="autounseal" \
  -period="24h" \
  -orphan \
  -display-name="vault-autounseal-token"
```

### Configure the Secondary Vault

```hcl
# /etc/vault.d/vault.hcl (Secondary Vault)
# Configuration for a Vault instance that uses transit auto-unseal

storage "raft" {
  path    = "/opt/vault/data"
  node_id = "secondary-vault-1"
}

listener "tcp" {
  address         = "0.0.0.0:8200"
  tls_cert_file   = "/opt/vault/tls/vault.crt"
  tls_key_file    = "/opt/vault/tls/vault.key"
}

# Transit auto-unseal configuration
seal "transit" {
  # Address of the primary Vault cluster providing transit services
  address = "https://primary-vault.example.com:8200"

  # Token with permissions to use the transit key
  # Better practice: use VAULT_TRANSIT_SEAL_TOKEN environment variable
  token = "hvs.CAESIXXXXXXXXXXXXXXXXXXXXXXXXXX"

  # TLS configuration for connecting to primary Vault
  tls_ca_cert = "/opt/vault/tls/primary-vault-ca.crt"

  # Optionally skip TLS verification (NOT recommended for production)
  # tls_skip_verify = false

  # Transit secrets engine mount path (default is "transit")
  mount_path = "transit"

  # Name of the transit key to use
  key_name = "autounseal"

  # Namespace if using Vault Enterprise (optional)
  # namespace = "admin"

  # Disable token renewal (not recommended)
  # disable_renewal = false
}

api_addr = "https://secondary-vault.example.com:8200"
cluster_addr = "https://secondary-vault-1.example.com:8201"
ui = true
```

### Token Renewal for Transit Auto-Unseal

The transit token needs to be renewed periodically. Here's a script to automate this:

```bash
#!/bin/bash
# transit-token-renew.sh
# Run this script periodically via cron to renew the transit token

set -e

VAULT_ADDR="https://primary-vault.example.com:8200"
VAULT_TOKEN="${VAULT_TRANSIT_SEAL_TOKEN}"

# Check if token is set
if [ -z "$VAULT_TOKEN" ]; then
  echo "Error: VAULT_TRANSIT_SEAL_TOKEN is not set"
  exit 1
fi

# Renew the token
echo "Renewing transit auto-unseal token..."
RESPONSE=$(curl -s \
  --header "X-Vault-Token: $VAULT_TOKEN" \
  --request POST \
  "$VAULT_ADDR/v1/auth/token/renew-self")

# Check for errors
if echo "$RESPONSE" | jq -e '.errors' > /dev/null 2>&1; then
  echo "Error renewing token: $(echo $RESPONSE | jq -r '.errors[]')"
  exit 1
fi

# Display token TTL
TTL=$(echo "$RESPONSE" | jq -r '.auth.lease_duration')
echo "Token renewed successfully. TTL: ${TTL}s"
```

## Migration from Shamir to Auto-Unseal

Migrating an existing Vault cluster from Shamir's Secret Sharing to auto-unseal requires careful planning and execution.

```mermaid
flowchart TB
    A[1. Backup Vault Data] --> B[2. Update Configuration]
    B --> C[3. Stop Vault]
    C --> D[4. Start Vault with -migrate Flag]
    D --> E[5. Provide Shamir Keys]
    E --> F[6. Vault Migrates to Auto-Unseal]
    F --> G[7. Verify Auto-Unseal Works]
    G --> H[8. Store Recovery Keys]
    H --> I[9. Restart Vault Normally]

    style A fill:#FFD700
    style F fill:#32CD32
    style H fill:#FF6347
```

### Step 1: Backup Your Data

```bash
# CRITICAL: Always backup before migration
# Create a snapshot of the current Vault data
vault operator raft snapshot save vault-backup-$(date +%Y%m%d-%H%M%S).snap

# Verify the snapshot is valid
vault operator raft snapshot inspect vault-backup-*.snap

# Store the backup securely in multiple locations
# Also backup your configuration files
cp /etc/vault.d/vault.hcl /etc/vault.d/vault.hcl.pre-migration
```

### Step 2: Update the Configuration

```hcl
# /etc/vault.d/vault.hcl
# Add the seal stanza for your chosen KMS provider while keeping everything else

storage "raft" {
  path    = "/opt/vault/data"
  node_id = "vault-node-1"
}

listener "tcp" {
  address         = "0.0.0.0:8200"
  tls_cert_file   = "/opt/vault/tls/vault.crt"
  tls_key_file    = "/opt/vault/tls/vault.key"
}

# ADD your chosen auto-unseal configuration
# Example: AWS KMS
seal "awskms" {
  region     = "us-east-1"
  kms_key_id = "alias/vault-unseal"
}

api_addr = "https://vault.example.com:8200"
cluster_addr = "https://vault-node-1.example.com:8201"
ui = true
```

### Step 3: Perform the Migration

```bash
# Stop the Vault service gracefully
sudo systemctl stop vault

# Verify Vault has stopped
ps aux | grep vault

# Start Vault with the -migrate flag
# This tells Vault to migrate from Shamir to auto-unseal
vault server -config=/etc/vault.d/vault.hcl -migrate

# In a separate terminal, unseal Vault with the existing Shamir keys
# You need to provide the threshold number of keys
vault operator unseal <shamir-key-1>
vault operator unseal <shamir-key-2>
vault operator unseal <shamir-key-3>

# Vault will output recovery keys after migration completes
# CRITICAL: Store these recovery keys securely!
# Recovery Key 1: xxxxx
# Recovery Key 2: xxxxx
# Recovery Key 3: xxxxx
# Recovery Key 4: xxxxx
# Recovery Key 5: xxxxx

# The migration is complete when you see:
# "seal migration complete"
```

### Step 4: Verify the Migration

```bash
# Check Vault status - should show the new seal type
vault status

# Expected output should include:
# Seal Type: awskms (or your chosen provider)
# Sealed: false

# Verify you can still access all your data
vault secrets list
vault kv list secret/

# Test that auto-unseal works by restarting Vault
sudo systemctl restart vault

# Vault should come up unsealed automatically
vault status
```

### Step 5: Update All Cluster Nodes

For multi-node clusters, each node needs to be updated:

```bash
# For each additional node in the cluster:

# 1. Update the configuration file with the same seal stanza
scp /etc/vault.d/vault.hcl node2:/etc/vault.d/vault.hcl

# 2. Stop the follower node
ssh node2 "sudo systemctl stop vault"

# 3. Start the follower node (no -migrate flag needed for followers)
ssh node2 "sudo systemctl start vault"

# 4. Verify the node rejoined the cluster
vault operator raft list-peers

# Repeat for all follower nodes
```

### Migration Rollback (If Needed)

```bash
# If something goes wrong during migration, restore from backup

# 1. Stop Vault
sudo systemctl stop vault

# 2. Remove the seal stanza from configuration
# Restore the original configuration
cp /etc/vault.d/vault.hcl.pre-migration /etc/vault.d/vault.hcl

# 3. Restore the data directory from backup
sudo rm -rf /opt/vault/data
vault operator raft snapshot restore vault-backup-*.snap

# 4. Start Vault with original Shamir configuration
sudo systemctl start vault

# 5. Unseal with original Shamir keys
vault operator unseal <shamir-key-1>
vault operator unseal <shamir-key-2>
vault operator unseal <shamir-key-3>
```

## Recovery Keys

When using auto-unseal, the traditional unseal keys are replaced with recovery keys. Understanding recovery keys is essential for emergency operations.

### What Recovery Keys Are Used For

- **Generating a new root token** when the original is lost
- **Rekeying the recovery keys** to change holders or threshold
- **Seal migration** to change the auto-unseal provider
- **Emergency sealing** if Vault needs to be taken offline

### Working with Recovery Keys

```bash
# During initialization with auto-unseal enabled
# Vault generates recovery keys instead of unseal keys
vault operator init -recovery-shares=5 -recovery-threshold=3

# Output will include recovery keys:
# Recovery Key 1: 4PHxU7WqM...
# Recovery Key 2: Xz9pXE2vK...
# Recovery Key 3: 7KjLmN3pQ...
# Recovery Key 4: Rst5YwX8z...
# Recovery Key 5: AbC9dEfGh...
# Initial Root Token: hvs.xxxxx

# Rekey recovery keys if needed (e.g., to change holders)
vault operator rekey -target=recovery -init -key-shares=5 -key-threshold=3

# Provide current recovery keys to perform the rekey
vault operator rekey -target=recovery <current-recovery-key-1>
vault operator rekey -target=recovery <current-recovery-key-2>
vault operator rekey -target=recovery <current-recovery-key-3>

# New recovery keys will be generated
```

### Generate Root Token with Recovery Keys

```bash
# Start root token generation process
vault operator generate-root -init

# Output includes a nonce and OTP
# Nonce: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
# OTP: xxxxxxxxxxxxxxxxxxxxxxxx

# Provide recovery keys (threshold required)
vault operator generate-root \
  -nonce="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" \
  "recovery-key-1"

vault operator generate-root \
  -nonce="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" \
  "recovery-key-2"

vault operator generate-root \
  -nonce="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" \
  "recovery-key-3"

# Final command returns encoded token
# Decode it with the OTP
vault operator generate-root \
  -decode="encoded-token" \
  -otp="xxxxxxxxxxxxxxxxxxxxxxxx"

# This returns the new root token
```

## Best Practices Summary

### Security Best Practices

| Practice | Description |
|----------|-------------|
| Use IAM roles/managed identities | Avoid static credentials; use instance profiles, IRSA, or workload identity |
| Restrict KMS key permissions | Only allow Vault service accounts to use the unseal key |
| Enable key rotation | Configure automatic key rotation on your KMS (annually minimum) |
| Secure recovery keys | Distribute among trusted operators; use M-of-N secret sharing |
| Enable audit logging | Log all KMS operations for compliance and forensics |
| Use TLS everywhere | Encrypt all communication between Vault and KMS |

### Operational Best Practices

| Practice | Description |
|----------|-------------|
| Test in staging first | Always validate auto-unseal in non-production environments |
| Monitor seal status | Set up alerts for unexpected seal events |
| Document procedures | Create runbooks for common operations and disaster recovery |
| Regular backup verification | Test restoring from backups monthly |
| Plan for KMS unavailability | Have procedures for manual intervention if KMS fails |

### Monitoring Configuration

```yaml
# Prometheus alerting rules for Vault seal status
groups:
  - name: vault-seal-alerts
    rules:
      # Alert when Vault becomes sealed
      - alert: VaultSealed
        expr: vault_core_unsealed == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Vault is sealed"
          description: "Vault instance {{ $labels.instance }} is sealed and cannot serve requests."

      # Alert on auto-unseal errors
      - alert: VaultAutoUnsealError
        expr: increase(vault_seal_unwrap_error[5m]) > 0
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "Vault auto-unseal errors detected"
          description: "Vault is experiencing errors communicating with the KMS provider."

      # Alert if Vault has been sealed for extended period
      - alert: VaultSealedExtended
        expr: vault_core_unsealed == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Vault has been sealed for over 5 minutes"
          description: "Vault auto-unseal may have failed. Check KMS connectivity and credentials."
```

### Complete Kubernetes Example with All Best Practices

```yaml
# vault-production.yaml
# Production-ready Vault deployment with auto-unseal
apiVersion: v1
kind: ConfigMap
metadata:
  name: vault-config
  namespace: vault
data:
  vault.hcl: |
    # Auto-unseal with AWS KMS
    seal "awskms" {
      region     = "us-east-1"
      kms_key_id = "alias/vault-unseal"
    }

    storage "raft" {
      path = "/vault/data"
      retry_join {
        leader_api_addr = "https://vault-0.vault-internal:8200"
      }
      retry_join {
        leader_api_addr = "https://vault-1.vault-internal:8200"
      }
      retry_join {
        leader_api_addr = "https://vault-2.vault-internal:8200"
      }
    }

    listener "tcp" {
      address = "0.0.0.0:8200"
      cluster_address = "0.0.0.0:8201"
      tls_cert_file = "/vault/tls/tls.crt"
      tls_key_file = "/vault/tls/tls.key"
    }

    # Kubernetes service registration for discovery
    service_registration "kubernetes" {}

    # Enable telemetry for monitoring
    telemetry {
      prometheus_retention_time = "30s"
      disable_hostname = true
    }

    ui = true
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: vault
  namespace: vault
spec:
  serviceName: vault-internal
  replicas: 3
  selector:
    matchLabels:
      app: vault
  template:
    metadata:
      labels:
        app: vault
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8200"
    spec:
      serviceAccountName: vault
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
      containers:
        - name: vault
          image: hashicorp/vault:1.15
          ports:
            - containerPort: 8200
              name: api
            - containerPort: 8201
              name: cluster
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          volumeMounts:
            - name: config
              mountPath: /vault/config
            - name: data
              mountPath: /vault/data
            - name: tls
              mountPath: /vault/tls
          args:
            - "server"
            - "-config=/vault/config/vault.hcl"
          livenessProbe:
            httpGet:
              path: /v1/sys/health?standbyok=true&uninitcode=200&sealedcode=200
              port: 8200
              scheme: HTTPS
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /v1/sys/health?standbyok=true
              port: 8200
              scheme: HTTPS
            initialDelaySeconds: 5
            periodSeconds: 10
      volumes:
        - name: config
          configMap:
            name: vault-config
        - name: tls
          secret:
            secretName: vault-tls
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 10Gi
```

---

Auto-unseal transforms Vault from a system requiring manual intervention to a truly automated secrets management solution. By delegating seal management to a trusted KMS provider, you gain the operational simplicity needed for modern cloud-native deployments while maintaining the security guarantees Vault provides. Choose the seal type that matches your infrastructure, implement proper access controls on your KMS keys, and always maintain secure custody of your recovery keys.

For monitoring your Vault infrastructure and getting alerts when auto-unseal fails or your cluster needs attention, check out [OneUptime](https://oneuptime.com) - a comprehensive observability platform that helps you monitor your entire infrastructure stack including HashiCorp Vault deployments.
