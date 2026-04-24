# How to Configure Volume Drivers in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Volumes, Storage, DevOps

Description: Learn how to configure and use different Docker volume drivers in Portainer for local, NFS, cloud, and distributed storage backends.

## Introduction

Docker's volume driver system allows you to use different storage backends for container volumes - from local filesystem to NFS, cloud storage (AWS EBS, Azure File), and distributed storage systems (Ceph, GlusterFS). Portainer exposes volume driver configuration when creating volumes, giving you flexibility to connect containers to any storage system.

## Prerequisites

- Portainer installed with a connected Docker environment
- Appropriate volume driver plugin installed (for non-local drivers)

## Built-in Volume Drivers

### local Driver (Default)

The default driver stores volumes on the local host filesystem:

```yaml
volumes:
  mydata:
    driver: local  # Optional - local is the default

  # Local driver with custom options (creates a bind mount-backed volume)
  config_data:
    driver: local
    driver_opts:
      type: none       # Don't create a filesystem
      o: bind          # Bind mount mode
      device: /host/path/to/data  # Host directory
```

### local Driver with NFS

```yaml
volumes:
  nfs_data:
    driver: local
    driver_opts:
      type: nfs
      o: "addr=192.168.1.10,rw,nfsvers=4"
      device: ":/exports/data"
```

### local Driver with CIFS/SMB

```yaml
volumes:
  smb_data:
    driver: local
    driver_opts:
      type: cifs
      o: "addr=server,username=user,password=pass,vers=3.0"
      device: "//server/share"
```

### local Driver with tmpfs (Memory)

```yaml
# tmpfs: in-memory storage (non-persistent)
volumes:
  cache:
    driver: local
    driver_opts:
      type: tmpfs
      device: tmpfs
      o: "size=256m"  # Max 256 MB
```

## Installing Third-Party Volume Driver Plugins

For cloud and distributed storage, install driver plugins:

```bash
# AWS EBS driver:
docker plugin install --grant-all-permissions rexray/ebs:latest \
  EBS_ACCESSKEY=AKIAXXXXXXXX \
  EBS_SECRETKEY=xxxxxxxxxx \
  EBS_REGION=us-east-1

# Azure Unmanaged Disk driver:
docker plugin install --grant-all-permissions rexray/azureud:latest \
  AZUREUD_CLIENTID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx \
  AZUREUD_CLIENTSECRET=xxxxxxxxxx \
  AZUREUD_RESOURCEGROUP=my-resource-group \
  AZUREUD_STORAGEACCESSKEY=xxxxxxxxxx \
  AZUREUD_STORAGEACCOUNT=mystorageaccount \
  AZUREUD_SUBSCRIPTIONID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx \
  AZUREUD_TENANTID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# GlusterFS driver example:
docker plugin install --alias glusterfs --grant-all-permissions \
  trajano/glusterfs-volume-plugin:v2.0.3

# List installed plugins:
docker plugin ls
```

## Step 1: Configure Volume Driver in Portainer

1. Navigate to **Volumes > Add volume**.
2. Enter a volume name.
3. Under **Driver**, select from installed drivers.
4. Under **Driver options**, enter key-value pairs for plugin-backed drivers. For `local` NFS/CIFS volumes, Portainer provides dedicated NFS/CIFS fields.

```text
Name:    ebs-production-data
Driver:  rexray/ebs
Options:
  size: 100     (100 GB EBS volume)
  volumetype: gp3
  iops: 3000
```

## Step 2: AWS EBS Volume Driver

For containerized applications on EC2:

```bash
# Install REX-Ray EBS plugin:
docker plugin install --grant-all-permissions rexray/ebs:latest \
  EBS_ACCESSKEY=${AWS_ACCESS_KEY} \
  EBS_SECRETKEY=${AWS_SECRET_KEY} \
  EBS_REGION=us-east-1
```

```yaml
# docker-compose.yml with EBS volumes:
volumes:
  db_data:
    driver: rexray/ebs
    driver_opts:
      size: "50"         # 50 GB EBS volume
      volumetype: "gp3"  # General Purpose SSD
      iops: "3000"
      encrypted: "true"
```

## Step 3: Azure Storage Options

```bash
# Install Azure unmanaged disk plugin:
docker plugin install --grant-all-permissions rexray/azureud:latest \
  AZUREUD_CLIENTID=${AZURE_CLIENT_ID} \
  AZUREUD_CLIENTSECRET=${AZURE_CLIENT_SECRET} \
  AZUREUD_RESOURCEGROUP=${AZURE_RESOURCE_GROUP} \
  AZUREUD_STORAGEACCESSKEY=${AZURE_STORAGE_KEY} \
  AZUREUD_STORAGEACCOUNT=${AZURE_STORAGE_ACCOUNT} \
  AZUREUD_SUBSCRIPTIONID=${AZURE_SUBSCRIPTION_ID} \
  AZUREUD_TENANTID=${AZURE_TENANT_ID}
```

Or use Azure Files directly with CIFS:

```yaml
volumes:
  azure_files:
    driver: local
    driver_opts:
      type: cifs
      o: "addr=${STORAGE_ACCOUNT}.file.core.windows.net,username=${STORAGE_ACCOUNT},password=${STORAGE_KEY},vers=3.0,serverino"
      device: "//${STORAGE_ACCOUNT}.file.core.windows.net/${SHARE_NAME}"
```

## Step 4: GlusterFS Volume Driver

For distributed storage across multiple hosts:

```bash
# Install GlusterFS plugin (aliased as glusterfs):
docker plugin install --alias glusterfs --grant-all-permissions \
  trajano/glusterfs-volume-plugin:v2.0.3
```

```yaml
volumes:
  gluster_data:
    driver: glusterfs
    driver_opts:
      servers: "gluster1,gluster2,gluster3"
    name: "gv0/data"
```

## Step 5: Portworx Volume Driver

For enterprise container storage:

```yaml
volumes:
  px_database:
    driver: pxd
    driver_opts:
      size: "50G"
      repl: "3"        # Replicate across 3 nodes
      priority_io: "high"
      label: "env=production"
```

## Step 6: Volume Driver in Portainer UI

When creating a volume in Portainer:

1. Navigate to **Volumes > Add volume**.
2. **Driver** dropdown includes `local` and any installed volume driver plugins.
3. Select the desired driver.
4. For `local` NFS/CIFS volumes, use the built-in NFS/CIFS fields. For plugin-backed drivers, add driver options as key-value pairs.
5. Create the volume.

## Step 7: Verify Driver Installation

```bash
# List all installed volume driver plugins:
docker plugin ls

# Example output (the built-in local driver is not listed here):
ID            NAME                  DESCRIPTION                      ENABLED
abc123        rexray/ebs:latest     REX-Ray for Amazon EBS           true

# Test a driver:
docker volume create --driver rexray/ebs --opt size=1 test-ebs-volume
docker volume inspect test-ebs-volume
docker volume rm test-ebs-volume
```

## Step 8: Volume Driver Selection Guide

```text
Use Case                    → Recommended Driver
Single host, local data     → local (default)
Multiple hosts, shared data → NFS (local with NFS opts)
Windows/SMB file shares     → local with CIFS opts
AWS EC2, persistent         → rexray/ebs or rexray/efs
Azure VMs                   → local with CIFS opts (Azure Files) or rexray/azureud
GCP                         → rexray/gcepd
Distributed block storage   → rexray/rbd or pxd
Edge devices                → local (simple, reliable)
Development                 → local or tmpfs (fast)
```

## Conclusion

Docker volume drivers in Portainer unlock a wide range of storage backends for containers. Start with the built-in `local` driver (which supports NFS, CIFS, and tmpfs via options), and use third-party plugins for cloud-native block storage like EBS or drivers such as `pxd`, while services like Azure Files can be mounted with the `local` driver over CIFS. Choosing the right driver for your infrastructure ensures containers have access to the right storage with appropriate performance, durability, and sharing characteristics.
