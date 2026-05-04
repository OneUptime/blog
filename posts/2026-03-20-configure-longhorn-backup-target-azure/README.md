# How to Configure Longhorn Backup Target to Azure Blob

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Longhorn, Kubernetes, Storage, Backup, Azure, Cloud

Description: Configure Longhorn to use Azure Blob Storage as a backup target for storing Kubernetes volume backups in Microsoft Azure.

## Introduction

Azure Blob Storage provides a scalable, cost-effective, and highly durable object storage service that works well as a Longhorn backup target. This is the preferred choice for Kubernetes clusters running on Azure Kubernetes Service (AKS) or in environments already using the Azure ecosystem. This guide covers the complete setup from creating Azure resources to configuring Longhorn.

## Prerequisites

- Longhorn installed on your cluster
- An active Azure subscription
- Azure CLI (`az`) installed and authenticated
- Network access from cluster nodes to Azure Blob endpoints

## Step 1: Create Azure Resources

### Create a Resource Group (if needed)

```bash
# Create a dedicated resource group for Longhorn backups

az group create \
  --name longhorn-backup-rg \
  --location eastus
```

### Create a Storage Account

```bash
# Create a storage account for Longhorn backups
# Storage account names must be globally unique, lowercase, 3-24 characters
az storage account create \
  --name longhornbackup$RANDOM \
  --resource-group longhorn-backup-rg \
  --location eastus \
  --sku Standard_LRS \
  --kind StorageV2 \
  --access-tier Hot \
  --https-only true

# Store the storage account name for later
STORAGE_ACCOUNT_NAME=$(az storage account list \
  --resource-group longhorn-backup-rg \
  --query "[0].name" -o tsv)
echo "Storage account: $STORAGE_ACCOUNT_NAME"
```

### Create a Blob Container

```bash
# Get the storage account connection string
STORAGE_CONNECTION_STRING=$(az storage account show-connection-string \
  --name $STORAGE_ACCOUNT_NAME \
  --resource-group longhorn-backup-rg \
  --query connectionString -o tsv)

# Create the container for Longhorn backups
az storage container create \
  --name longhorn-backups \
  --connection-string "$STORAGE_CONNECTION_STRING"
```

### Get Storage Account Access Key

```bash
# Retrieve the storage account access key
STORAGE_ACCOUNT_KEY=$(az storage account keys list \
  --account-name $STORAGE_ACCOUNT_NAME \
  --resource-group longhorn-backup-rg \
  --query "[0].value" -o tsv)

echo "Account: $STORAGE_ACCOUNT_NAME"
echo "Key: $STORAGE_ACCOUNT_KEY"
```

## Step 2: Create Kubernetes Secret

```bash
# Create a secret with Azure credentials for Longhorn
kubectl create secret generic longhorn-backup-azure \
  -n longhorn-system \
  --from-literal=AZBLOB_ACCOUNT_NAME="$STORAGE_ACCOUNT_NAME" \
  --from-literal=AZBLOB_ACCOUNT_KEY="$STORAGE_ACCOUNT_KEY"
```

Using a YAML file:

```yaml
# longhorn-azure-secret.yaml - Azure Blob Storage credentials
apiVersion: v1
kind: Secret
metadata:
  name: longhorn-backup-azure
  namespace: longhorn-system
type: Opaque
stringData:
  # Azure Storage Account name
  AZBLOB_ACCOUNT_NAME: "longhornbackup12345"
  # Azure Storage Account access key
  AZBLOB_ACCOUNT_KEY: "your-storage-account-key=="
```

```bash
kubectl apply -f longhorn-azure-secret.yaml
```

## Step 3: Configure Longhorn Backup Target

### Via kubectl

```bash
# Set the Azure Blob backup target
# Format: azblob://container-name@core.windows.net/
kubectl patch settings.longhorn.io backup-target \
  -n longhorn-system \
  --type merge \
  -p '{"value": "azblob://longhorn-backups@core.windows.net/"}'

# Set the credentials secret
kubectl patch settings.longhorn.io backup-target-credential-secret \
  -n longhorn-system \
  --type merge \
  -p '{"value": "longhorn-backup-azure"}'
```

### Via Longhorn UI

1. Navigate to **Setting** → **General**
2. Find **Backup Target**
3. Enter: `azblob://longhorn-backups@core.windows.net/`
4. Find **Backup Target Credential Secret**
5. Enter: `longhorn-backup-azure`
6. Click **Save**

## Granting RBAC Access (AKS)

Longhorn's Azure Blob backup driver currently authenticates only with a Shared Key (`AZBLOB_ACCOUNT_KEY`); native Azure Managed Identity / Workload Identity support for the backup target is not available in current releases (it is tracked as an open feature request). The account key created in Step 1 is therefore required even on AKS. You can still grant data-plane RBAC roles to operators or other workloads that interact with the same storage account:

```bash
# Grant Storage Blob Data Contributor on the storage account (e.g. to an operator principal)
az role assignment create \
  --assignee <principal-or-managed-identity-client-id> \
  --role "Storage Blob Data Contributor" \
  --scope "/subscriptions/<sub-id>/resourceGroups/longhorn-backup-rg/providers/Microsoft.Storage/storageAccounts/$STORAGE_ACCOUNT_NAME"
```

## Verify the Backup Target

```bash
# Check the backup target settings
kubectl get settings.longhorn.io backup-target -n longhorn-system -o yaml
kubectl get settings.longhorn.io backup-target-credential-secret -n longhorn-system -o yaml

# Verify connection by checking backup volumes
kubectl get backupvolumes.longhorn.io -n longhorn-system
```

Navigate to the Longhorn UI → **Backup** to confirm the connection is successful.

## Create a Test Backup

```bash
# Trigger a manual backup from the Longhorn UI
# Volume → three-dot menu → Create Backup

# Verify the backup object was created in Azure Blob
az storage blob list \
  --container-name longhorn-backups \
  --account-name "$STORAGE_ACCOUNT_NAME" \
  --account-key "$STORAGE_ACCOUNT_KEY" \
  --prefix "backupstore/volumes/" \
  --output table
```

## Configure Recurring Backups

```yaml
# recurring-azure-backup.yaml - Automated backup to Azure Blob
apiVersion: longhorn.io/v1beta2
kind: RecurringJob
metadata:
  name: daily-azure-backup
  namespace: longhorn-system
spec:
  cron: "0 2 * * *"    # Daily at 2 AM
  task: "backup"
  retain: 30           # Keep 30 days of backups
  concurrency: 2
```

```bash
kubectl apply -f recurring-azure-backup.yaml
```

## Set Up Azure Blob Lifecycle Management

Configure automatic tiering and expiration for cost optimization:

```bash
# Create lifecycle policy JSON
cat > blob-lifecycle.json << 'EOF'
{
  "rules": [
    {
      "name": "move-to-cool-after-30-days",
      "enabled": true,
      "type": "Lifecycle",
      "definition": {
        "actions": {
          "baseBlob": {
            "tierToCool": {"daysAfterModificationGreaterThan": 30},
            "tierToArchive": {"daysAfterModificationGreaterThan": 90},
            "delete": {"daysAfterModificationGreaterThan": 365}
          }
        },
        "filters": {
          "blobTypes": ["blockBlob"],
          "prefixMatch": ["backupstore/"]
        }
      }
    }
  ]
}
EOF

# Apply the lifecycle policy
az storage account management-policy create \
  --account-name "$STORAGE_ACCOUNT_NAME" \
  --resource-group longhorn-backup-rg \
  --policy @blob-lifecycle.json
```

## Conclusion

Azure Blob Storage provides a highly available and cost-effective backup target for Longhorn. Storage account access keys must be stored as a Kubernetes secret since the backup driver currently relies on Shared Key authentication. By combining recurring backup jobs with Azure's built-in lifecycle management policies, you can automate both the backup process and long-term cost optimization.
