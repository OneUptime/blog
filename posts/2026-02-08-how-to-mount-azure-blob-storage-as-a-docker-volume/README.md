# How to Mount Azure Blob Storage as a Docker Volume

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Azure, Blob Storage, Volumes, Cloud, DevOps, Containers

Description: Learn how to mount Azure Blob Storage containers as Docker volumes using blobfuse, volume plugins, and Azure Files integration.

---

Azure Blob Storage is Microsoft's object storage service, similar to AWS S3. Mounting it as a Docker volume lets your containers read and write to blob storage as if it were a local filesystem. This is useful for sharing large datasets between containers, storing uploads and media files, or connecting containers to existing data stored in Azure. This guide covers multiple approaches, from simple blobfuse mounts to Azure's native volume drivers.

## Prerequisites

You need an Azure account with a storage account created. Gather these credentials:

- Storage account name
- Storage account key or SAS token
- Container name (Azure Blob container, not Docker container)

Get your storage account key:

```bash
# List storage account keys using Azure CLI
az storage account keys list \
  --account-name mystorageaccount \
  --resource-group myresourcegroup \
  --output table
```

## Method 1: Using blobfuse2 Inside a Container

blobfuse2 is Microsoft's official FUSE driver for Azure Blob Storage. You can run it inside a Docker container to mount blob storage.

Create a Dockerfile with blobfuse2:

```dockerfile
# Dockerfile.blobfuse - Container with Azure Blob Storage mounted
FROM ubuntu:22.04

# Install blobfuse2 dependencies
RUN apt-get update && apt-get install -y \
    wget \
    apt-transport-https \
    lsb-release \
    gnupg \
    fuse3 \
    && rm -rf /var/lib/apt/lists/*

# Install blobfuse2 from Microsoft's repository
RUN wget https://packages.microsoft.com/config/ubuntu/22.04/packages-microsoft-prod.deb && \
    dpkg -i packages-microsoft-prod.deb && \
    apt-get update && \
    apt-get install -y blobfuse2 && \
    rm packages-microsoft-prod.deb

# Create mount point and cache directories
RUN mkdir -p /mnt/blobstorage /tmp/blobfuse-cache

# Copy the configuration file
COPY blobfuse-config.yaml /etc/blobfuse-config.yaml

CMD ["blobfuse2", "mount", "/mnt/blobstorage", "--config-file=/etc/blobfuse-config.yaml", "--foreground"]
```

Create the blobfuse2 configuration file:

```yaml
# blobfuse-config.yaml - blobfuse2 configuration
allow-other: true

logging:
  type: syslog
  level: log_warning

components:
  - libfuse
  - file_cache
  - attr_cache
  - azstorage

libfuse:
  attribute-expiration-sec: 120
  entry-expiration-sec: 120

file_cache:
  path: /tmp/blobfuse-cache
  timeout-sec: 120
  max-size-mb: 4096

attr_cache:
  timeout-sec: 7200

azstorage:
  type: block
  account-name: mystorageaccount
  account-key: YOUR_STORAGE_ACCOUNT_KEY
  container: mycontainer
  endpoint: https://mystorageaccount.blob.core.windows.net
```

Build and run:

```bash
# Build the blobfuse container
docker build -t blobfuse-mount -f Dockerfile.blobfuse .

# Run with required privileges for FUSE mounts
docker run -d \
  --name blob-mount \
  --cap-add SYS_ADMIN \
  --device /dev/fuse \
  --security-opt apparmor:unconfined \
  blobfuse-mount
```

Access the mounted blob storage:

```bash
# List files in the mounted blob storage
docker exec blob-mount ls -la /mnt/blobstorage

# Write a file to blob storage
docker exec blob-mount sh -c 'echo "Hello Azure" > /mnt/blobstorage/test.txt'
```

## Method 2: Using Azure Files (SMB)

Azure Files provides SMB file shares that can be mounted directly using Docker's built-in CIFS driver. This is often simpler than blobfuse.

Create an Azure file share:

```bash
# Create an Azure file share
az storage share create \
  --name myfileshare \
  --account-name mystorageaccount \
  --account-key YOUR_KEY \
  --quota 100
```

Mount it as a Docker volume:

```bash
# Create a Docker volume backed by Azure Files (SMB)
docker volume create \
  --driver local \
  --opt type=cifs \
  --opt device=//mystorageaccount.file.core.windows.net/myfileshare \
  --opt o=vers=3.0,username=mystorageaccount,password=YOUR_KEY,dir_mode=0777,file_mode=0777,serverino \
  azure-files
```

Use the volume in a container:

```bash
# Run a container with the Azure Files volume
docker run -d \
  --name app \
  -v azure-files:/data \
  my-app
```

Docker Compose version:

```yaml
# docker-compose.yml with Azure Files volume
services:
  app:
    image: my-app:latest
    volumes:
      - azure-files:/app/data

volumes:
  azure-files:
    driver: local
    driver_opts:
      type: cifs
      device: "//mystorageaccount.file.core.windows.net/myfileshare"
      o: "vers=3.0,username=mystorageaccount,password=YOUR_KEY,dir_mode=0777,file_mode=0777,serverino"
```

## Method 3: Shared Volume with blobfuse2 Sidecar

A cleaner architecture uses a sidecar container that handles the blobfuse mount and shares it with your application container:

```yaml
# docker-compose.yml with blobfuse sidecar
services:
  blob-mount:
    build:
      context: .
      dockerfile: Dockerfile.blobfuse
    cap_add:
      - SYS_ADMIN
    devices:
      - /dev/fuse
    security_opt:
      - apparmor:unconfined
    volumes:
      - blob-data:/mnt/blobstorage:shared

  app:
    image: my-app:latest
    volumes:
      - blob-data:/data
    depends_on:
      - blob-mount

volumes:
  blob-data:
    driver: local
```

The `:shared` mount propagation flag ensures the FUSE mount inside the sidecar is visible to other containers using the same volume.

## Method 4: Using the Azure Blob Storage CSI Driver (Kubernetes-style)

For Docker hosts running on Azure VMs, you can use Azure's managed identity and the Azure Volume Driver plugin:

```bash
# Install the Azure file volume driver plugin
docker plugin install --alias azure --grant-all-permissions \
  docker4x/cloudstor:latest \
  CLOUD_PLATFORM=AZURE \
  AZURE_STORAGE_ACCOUNT_KEY="YOUR_KEY" \
  AZURE_STORAGE_ACCOUNT="mystorageaccount"
```

Create a volume:

```bash
# Create a volume using the Azure driver
docker volume create \
  --driver azure \
  --name azure-blob-vol \
  --opt share=myfileshare
```

## Securely Managing Credentials

Hardcoding storage account keys in configuration files is bad practice. Here are better approaches.

### Using Environment Variables

```bash
# Pass credentials as environment variables
docker run -d \
  --name blob-mount \
  --cap-add SYS_ADMIN \
  --device /dev/fuse \
  -e AZURE_STORAGE_ACCOUNT=mystorageaccount \
  -e AZURE_STORAGE_KEY=YOUR_KEY \
  blobfuse-mount
```

Update the blobfuse config to use environment variables:

```yaml
# blobfuse-config.yaml using environment variables
azstorage:
  type: block
  account-name: ${AZURE_STORAGE_ACCOUNT}
  account-key: ${AZURE_STORAGE_KEY}
  container: mycontainer
```

### Using Azure Managed Identity

On Azure VMs with a managed identity assigned, blobfuse2 can authenticate without keys:

```yaml
# blobfuse-config.yaml using managed identity
azstorage:
  type: block
  account-name: mystorageaccount
  container: mycontainer
  mode: msi
```

### Using Docker Secrets

In Docker Swarm, use secrets for credentials:

```bash
# Create a secret for the storage key
echo "YOUR_KEY" | docker secret create azure_storage_key -

# Reference it in a Swarm service
docker service create \
  --name app \
  --secret azure_storage_key \
  my-app
```

## Performance Tuning

Azure Blob Storage has different performance characteristics than local disk. Here are ways to optimize:

```yaml
# blobfuse-config.yaml tuned for performance
file_cache:
  path: /tmp/blobfuse-cache
  timeout-sec: 300
  # Larger cache reduces round trips to Azure
  max-size-mb: 8192

# Enable streaming for large files
stream:
  block-size-mb: 8
  max-buffers: 16
  buffer-size-mb: 16

# Use SSD-backed local storage for the cache
# Mount a fast local drive at /tmp/blobfuse-cache
```

Use SSD storage for the blobfuse cache directory:

```yaml
# docker-compose.yml with fast cache storage
services:
  blob-mount:
    build:
      context: .
      dockerfile: Dockerfile.blobfuse
    volumes:
      - blob-data:/mnt/blobstorage:shared
      - /dev/shm:/tmp/blobfuse-cache
    cap_add:
      - SYS_ADMIN
    devices:
      - /dev/fuse
```

Using `/dev/shm` (shared memory) as the cache location puts the cache in RAM, which provides the best performance for read-heavy workloads.

## Health Checking the Mount

Add a health check to detect when the blob mount goes stale:

```yaml
services:
  blob-mount:
    build:
      context: .
      dockerfile: Dockerfile.blobfuse
    healthcheck:
      # Verify the mount is responsive
      test: ["CMD", "ls", "/mnt/blobstorage"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped
```

## Common Issues and Solutions

**Permission denied when accessing mounted files:**

```bash
# Run blobfuse with allow-other to permit access from other users/containers
# Ensure /etc/fuse.conf has user_allow_other uncommented
docker exec blob-mount sh -c "echo 'user_allow_other' >> /etc/fuse.conf"
```

**Mount point appears empty:**

Check that the Azure container (blob container) exists and has files:

```bash
# List blobs in the Azure container
az storage blob list \
  --container-name mycontainer \
  --account-name mystorageaccount \
  --account-key YOUR_KEY \
  --output table
```

**Slow performance on small file operations:**

Small file operations are inherently slow on object storage. Increase the attribute cache timeout:

```yaml
attr_cache:
  timeout-sec: 7200
```

**Connection timeouts:**

Verify the Docker host can reach Azure Blob Storage:

```bash
# Test connectivity to Azure Blob Storage endpoint
curl -I https://mystorageaccount.blob.core.windows.net/
```

## Summary

Mounting Azure Blob Storage as a Docker volume bridges the gap between containerized applications and Azure's object storage. Azure Files with SMB is the simplest approach, using Docker's built-in CIFS driver with no plugins needed. blobfuse2 gives you direct access to blob containers with configurable caching. For production, use managed identities instead of storage keys, tune the cache for your workload, and add health checks to detect stale mounts. Whichever method you choose, treat the blob mount as network storage and design your application to handle the latency that comes with it.
