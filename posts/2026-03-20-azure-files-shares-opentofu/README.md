# How to Create Azure Files Shares with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, Azure Files, Storage, Infrastructure as Code, DevOps

Description: Learn how to provision Azure Files storage accounts and file shares using OpenTofu for persistent, cloud-managed SMB storage.

---

Azure Files provides fully managed cloud file shares accessible via the SMB and NFS protocols. OpenTofu lets you define storage accounts and file shares as code for consistent, reproducible deployments.

---

## Create a Storage Account

```hcl
resource "azurerm_resource_group" "storage" {
  name     = "storage-rg"
  location = "eastus"
}

resource "azurerm_storage_account" "files" {
  name                     = "myfilesstorage"
  resource_group_name      = azurerm_resource_group.storage.name
  location                 = azurerm_resource_group.storage.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  account_kind             = "StorageV2"
}
```

---

## Create an Azure File Share

```hcl
resource "azurerm_storage_share" "data" {
  name               = "app-data"
  storage_account_id = azurerm_storage_account.files.id
  quota              = 100  # GB
}
```

---

## Create a Share with Specific Access Tier

```hcl
resource "azurerm_storage_share" "hot" {
  name               = "hot-data"
  storage_account_id = azurerm_storage_account.files.id
  quota              = 500
  access_tier        = "Hot"
}
```

---

## Mount the Share from Linux

```bash
# Get the storage account key

STORAGE_KEY=$(az storage account keys list \
  --account-name myfilesstorage \
  --resource-group storage-rg \
  --query '[0].value' -o tsv)

# Create the mount point
sudo mkdir -p /mnt/azure-files

# Mount via SMB
sudo mount -t cifs \
  //myfilesstorage.file.core.windows.net/app-data \
  /mnt/azure-files \
  -o username=myfilesstorage,password=${STORAGE_KEY},vers=3.0
```

---

## Use as a Kubernetes Persistent Volume

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  annotations:
    pv.kubernetes.io/provisioned-by: file.csi.azure.com
  name: azure-files-pv
spec:
  capacity:
    storage: 100Gi
  accessModes:
    - ReadWriteMany
  persistentVolumeReclaimPolicy: Retain
  storageClassName: azurefile-csi
  csi:
    driver: file.csi.azure.com
    volumeHandle: "storage-rg#myfilesstorage#app-data"
    volumeAttributes:
      shareName: app-data
    nodeStageSecretRef:
      name: azure-files-secret
      namespace: default
```

---

## Summary

Use `azurerm_storage_account` and `azurerm_storage_share` to declare Azure Files storage in OpenTofu. Set the quota in GB and access tier to match your workload requirements. Mount shares from Linux with `cifs` or consume them through the Azure Files CSI driver in Kubernetes for shared storage across pods.
