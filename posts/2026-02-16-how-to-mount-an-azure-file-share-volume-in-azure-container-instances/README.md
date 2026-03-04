# How to Mount an Azure File Share Volume in Azure Container Instances

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Container Instances, Azure Files, Volumes, Storage, Containers, Cloud Computing

Description: How to mount Azure File Share volumes in Azure Container Instances for persistent storage that survives container restarts and redeployments.

---

Containers are ephemeral by design. When a container in Azure Container Instances (ACI) stops or restarts, any data written to the local filesystem disappears. That is fine for stateless workloads, but many applications need persistent storage - databases that need their data directories, applications that write log files, or batch jobs that need to share files between containers.

Azure File Shares provide a simple way to add persistent storage to your ACI containers. You mount an Azure Files share into your container like a local directory, and the data persists independently of the container lifecycle.

## How It Works

Azure Files is a managed file share service that supports the SMB and NFS protocols. When you mount an Azure File Share in ACI, the container runtime mounts the share into the container's filesystem at the path you specify. Multiple containers can mount the same share, which makes it useful for sharing data between containers in a group or even between separate container groups.

The key characteristics:

- Data persists after container stops, restarts, or deletion
- Multiple containers can read and write to the same share simultaneously
- Performance depends on the storage account tier (Standard or Premium)
- Billed based on the amount of data stored and the number of transactions

## Prerequisites

You need:

- An Azure Storage Account
- An Azure File Share created in that storage account
- The storage account name and access key
- Azure CLI installed

## Step 1: Create the Storage Account and File Share

If you do not have them yet:

```bash
# Create a storage account
az storage account create \
    --name mystorageaccount \
    --resource-group my-resource-group \
    --location eastus \
    --sku Standard_LRS

# Get the storage account key (you will need this for mounting)
STORAGE_KEY=$(az storage account keys list \
    --account-name mystorageaccount \
    --resource-group my-resource-group \
    --query "[0].value" \
    --output tsv)

# Create a file share
az storage share create \
    --name myfileshare \
    --account-name mystorageaccount \
    --account-key $STORAGE_KEY \
    --quota 10
```

The `--quota` flag sets the maximum size of the share in GB.

## Step 2: Deploy a Container with the Volume Mount

### Using Azure CLI

```bash
# Create a container instance with an Azure Files mount
az container create \
    --resource-group my-resource-group \
    --name my-container \
    --image nginx:latest \
    --cpu 1 \
    --memory 1.5 \
    --ports 80 \
    --ip-address Public \
    --azure-file-volume-account-name mystorageaccount \
    --azure-file-volume-account-key $STORAGE_KEY \
    --azure-file-volume-share-name myfileshare \
    --azure-file-volume-mount-path /mnt/data
```

This mounts the `myfileshare` file share at `/mnt/data` inside the container. Any files written to `/mnt/data` will be stored in Azure Files and persist across container restarts.

### Using YAML

For more control, especially with multi-container groups, use a YAML file:

```yaml
# container-with-volume.yaml - Container with Azure Files mount
apiVersion: '2021-09-01'
location: eastus
name: my-container-with-storage
properties:
  containers:
    - name: app
      properties:
        image: myregistry.azurecr.io/data-app:latest
        resources:
          requests:
            cpu: 1.0
            memoryInGb: 2.0
        ports:
          - port: 8080
            protocol: TCP
        # Mount the volume into the container
        volumeMounts:
          - name: data-volume
            mountPath: /app/data
            readOnly: false
        environmentVariables:
          - name: DATA_PATH
            value: '/app/data'

  # Define the volumes at the container group level
  volumes:
    - name: data-volume
      azureFile:
        shareName: myfileshare
        storageAccountName: mystorageaccount
        storageAccountKey: 'your-storage-key-here'

  osType: Linux
  ipAddress:
    type: Public
    ports:
      - port: 8080
        protocol: TCP
type: Microsoft.ContainerInstance/containerGroups
```

Deploy it:

```bash
az container create \
    --resource-group my-resource-group \
    --file container-with-volume.yaml
```

## Mounting Multiple Volumes

You can mount multiple file shares in the same container or across multiple containers:

```yaml
# multi-volume.yaml - Multiple volume mounts
apiVersion: '2021-09-01'
location: eastus
name: multi-volume-app
properties:
  containers:
    - name: app
      properties:
        image: myregistry.azurecr.io/app:latest
        resources:
          requests:
            cpu: 1.0
            memoryInGb: 2.0
        # Mount multiple volumes at different paths
        volumeMounts:
          - name: app-data
            mountPath: /app/data
            readOnly: false
          - name: app-logs
            mountPath: /app/logs
            readOnly: false
          - name: app-config
            mountPath: /app/config
            readOnly: true

    # A sidecar container that processes log files
    - name: log-processor
      properties:
        image: myregistry.azurecr.io/log-processor:latest
        resources:
          requests:
            cpu: 0.5
            memoryInGb: 0.5
        # This container can also mount the logs volume
        volumeMounts:
          - name: app-logs
            mountPath: /logs
            readOnly: true

  volumes:
    # Each volume points to a different file share
    - name: app-data
      azureFile:
        shareName: app-data-share
        storageAccountName: mystorageaccount
        storageAccountKey: 'storage-key-here'
    - name: app-logs
      azureFile:
        shareName: app-logs-share
        storageAccountName: mystorageaccount
        storageAccountKey: 'storage-key-here'
    # Config volume uses secrets instead of Azure Files
    - name: app-config
      secret:
        config.json: 'eyJkYXRhYmFzZSI6ICJteWRiLmRhdGFiYXNlLndpbmRvd3MubmV0In0='
type: Microsoft.ContainerInstance/containerGroups
```

In this example, the `app` container has three mounts: data, logs, and config. The `log-processor` sidecar container also mounts the logs volume (read-only) so it can process log files that the main app writes.

## Read-Only Mounts

If a container only needs to read data from the share, mount it as read-only:

```yaml
volumeMounts:
  - name: shared-data
    mountPath: /data
    readOnly: true
```

This is a good practice for:
- Configuration files that should not be modified by the container
- Shared datasets that multiple containers read
- Security - preventing a compromised container from modifying shared data

## Populating the File Share Before Container Start

Sometimes you need files in the share before the container starts. You can upload files using the Azure CLI:

```bash
# Upload a single file to the share
az storage file upload \
    --share-name myfileshare \
    --source ./local-file.txt \
    --path remote-file.txt \
    --account-name mystorageaccount \
    --account-key $STORAGE_KEY

# Upload an entire directory
az storage file upload-batch \
    --destination myfileshare \
    --source ./local-directory \
    --account-name mystorageaccount \
    --account-key $STORAGE_KEY

# Create a directory in the share
az storage directory create \
    --share-name myfileshare \
    --name subdirectory \
    --account-name mystorageaccount \
    --account-key $STORAGE_KEY
```

## Performance Considerations

Azure Files performance varies by tier:

- **Standard (HDD)** - Good for general-purpose workloads. Expect around 60 MB/s throughput for a single share.
- **Premium (SSD)** - Better for I/O-intensive workloads. Throughput scales with the provisioned share size.

For containers that do heavy I/O, the Standard tier might become a bottleneck. Things to watch for:

- High latency on file operations
- Throttling when too many operations hit the share
- Slow startup if the container needs to read a lot of data at boot

If you are seeing performance issues, consider:

1. Moving to Premium Azure Files
2. Reducing the number of small I/O operations (batch reads/writes)
3. Caching frequently accessed data in the container's local filesystem

## Securing the Storage Connection

Storing the storage account key directly in the YAML file is not ideal for production. Here are better approaches:

### Using Azure Key Vault

Store the storage key in Key Vault and reference it during deployment:

```bash
# Store the storage key in Key Vault
az keyvault secret set \
    --vault-name my-vault \
    --name storage-key \
    --value "$STORAGE_KEY"

# Retrieve it during deployment
STORAGE_KEY=$(az keyvault secret show \
    --vault-name my-vault \
    --name storage-key \
    --query value -o tsv)

# Use it in the deployment command
az container create \
    --resource-group my-resource-group \
    --name my-container \
    --image nginx:latest \
    --azure-file-volume-account-name mystorageaccount \
    --azure-file-volume-account-key $STORAGE_KEY \
    --azure-file-volume-share-name myfileshare \
    --azure-file-volume-mount-path /mnt/data
```

### Using Service Endpoints

Restrict access to the storage account to only allow traffic from specific virtual networks. This adds network-level security on top of the account key.

## Verifying the Mount

After deploying, verify that the volume is mounted correctly:

```bash
# Execute a command in the container to check the mount
az container exec \
    --resource-group my-resource-group \
    --name my-container \
    --container-name app \
    --exec-command "/bin/sh -c 'df -h /app/data && ls -la /app/data'"

# Write a test file
az container exec \
    --resource-group my-resource-group \
    --name my-container \
    --container-name app \
    --exec-command "/bin/sh -c 'echo hello > /app/data/test.txt'"

# Verify the file exists in Azure Files
az storage file list \
    --share-name myfileshare \
    --account-name mystorageaccount \
    --account-key $STORAGE_KEY \
    --output table
```

## Summary

Azure File Shares provide a straightforward way to add persistent storage to Azure Container Instances. Mount a share, write data, and it survives container restarts, redeployments, and even deletion. Use multiple volumes for different purposes (data, logs, config), mount them read-only where appropriate, and consider the performance tier based on your workload. For most containerized workloads on ACI, Azure Files is the simplest path to persistent storage.
