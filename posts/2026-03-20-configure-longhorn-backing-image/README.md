# How to Configure Longhorn Backing Image

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Longhorn, Kubernetes, Storage, Backing Image, VM, Configuration

Description: Learn how to configure and use Longhorn Backing Images to pre-populate volumes with base images for virtual machines or golden image deployments.

## Introduction

Longhorn Backing Images allow you to create volumes that are pre-populated with data from an existing image file. This is particularly useful for virtual machine (VM) deployments (such as with KubeVirt) where VMs need to be created from a base OS image, or for golden image scenarios where multiple volumes should start with the same initial data.

## What is a Backing Image?

A Backing Image is an image file (typically a raw disk image or QCOW2 file) stored in Longhorn that can be used as the base data source for new volumes. When a volume is created from a backing image:
1. The backing image data is copied to the new volume
2. The volume starts with the image's data already present
3. Changes are stored in the volume (the backing image is read-only)

## Use Cases

- **KubeVirt VMs**: Create VM disks from OS images
- **Golden images**: Deploy pre-configured application environments
- **Rapid provisioning**: Faster than copying data manually

## Creating a Backing Image

### Method 1: From a URL

```yaml
# backing-image-ubuntu.yaml - Ubuntu cloud image as backing image

apiVersion: longhorn.io/v1beta2
kind: BackingImage
metadata:
  name: ubuntu-22.04-cloud
  namespace: longhorn-system
spec:
  # Source type can be: download, export-from-volume, upload
  sourceType: download
  sourceParameters:
    # URL to download the base image from
    url: "https://cloud-images.ubuntu.com/jammy/current/jammy-server-cloudimg-amd64.img"
  # Expected checksum for verification
  checksum: ""  # Optional: SHA512 checksum for verification
```

```bash
kubectl apply -f backing-image-ubuntu.yaml

# Monitor the download progress
kubectl get backingimages.longhorn.io -n longhorn-system
kubectl describe backingimage.longhorn.io ubuntu-22.04-cloud -n longhorn-system
```

### Method 2: Via Longhorn UI

1. Open the Longhorn UI
2. Navigate to **Backing Image**
3. Click **Create Backing Image**
4. Fill in:
   - **Name**: `ubuntu-22.04-cloud`
   - **Source Type**: URL
   - **URL**: `https://cloud-images.ubuntu.com/jammy/current/jammy-server-cloudimg-amd64.img`
5. Click **OK**

### Method 3: From an Existing Volume

```yaml
# backing-image-from-volume.yaml - Create backing image from an existing volume
apiVersion: longhorn.io/v1beta2
kind: BackingImage
metadata:
  name: app-golden-image
  namespace: longhorn-system
spec:
  sourceType: export-from-volume
  sourceParameters:
    # The Longhorn volume to create the backing image from
    volume-name: "my-configured-volume"
    # Export the snapshot at this name
    snapshot-name: "golden-snapshot"
```

```bash
kubectl apply -f backing-image-from-volume.yaml
```

## Creating a Volume from a Backing Image

### Via StorageClass

```yaml
# storageclass-with-backing-image.yaml - StorageClass that uses a backing image
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: longhorn-ubuntu-vm
provisioner: driver.longhorn.io
allowVolumeExpansion: true
parameters:
  numberOfReplicas: "3"
  fsType: "ext4"
  # Reference the backing image to use for new volumes
  backingImageName: "ubuntu-22.04-cloud"
  # Minimum disk space needed (must be >= image size)
  backingImageDataSourceType: "download"
  backingImageDataSourceParameters: ""
```

```bash
kubectl apply -f storageclass-with-backing-image.yaml
```

Create a PVC using this StorageClass:

```yaml
# pvc-vm-disk.yaml - VM disk PVC pre-populated with Ubuntu image
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: ubuntu-vm-disk
  namespace: default
spec:
  accessModes:
    - ReadWriteMany   # VMs often use RWX
  storageClassName: longhorn-ubuntu-vm
  resources:
    requests:
      # Must be >= the backing image size
      storage: 20Gi
```

```bash
kubectl apply -f pvc-vm-disk.yaml
kubectl get pvc ubuntu-vm-disk -w
```

### Directly in Volume Spec

```yaml
# longhorn-volume-with-backing-image.yaml
apiVersion: longhorn.io/v1beta2
kind: Volume
metadata:
  name: vm-disk-1
  namespace: longhorn-system
spec:
  size: "21474836480"   # 20 GiB
  numberOfReplicas: 2
  # Reference the backing image
  backingImage: ubuntu-22.04-cloud
  accessMode: rwx
```

```bash
kubectl apply -f longhorn-volume-with-backing-image.yaml
```

## Listing and Managing Backing Images

```bash
# List all backing images
kubectl get backingimages.longhorn.io -n longhorn-system

# Check backing image download status and disk copies
kubectl describe backingimage.longhorn.io ubuntu-22.04-cloud -n longhorn-system

# Check which disks have copies of the backing image
kubectl get backingimages.longhorn.io ubuntu-22.04-cloud \
  -n longhorn-system -o yaml | grep -A 10 "diskFileStatusMap:"
```

## Backing Image Cleanup

Longhorn manages disk copies of backing images automatically, ensuring each node that needs it has a local copy. Configure how long Longhorn waits before cleaning up an unused backing image file from a disk (in minutes):

```bash
# Wait 60 minutes after a backing image is no longer used by any replica
# on a disk before deleting the local copy
kubectl patch settings.longhorn.io backing-image-cleanup-wait-interval \
  -n longhorn-system \
  --type merge \
  -p '{"value": "60"}'
```

To configure the default minimum number of disk copies Longhorn maintains for each backing image, use:

```bash
# Maintain at least 1 copy of each backing image across the cluster
kubectl patch settings.longhorn.io default-min-number-of-backing-image-copies \
  -n longhorn-system \
  --type merge \
  -p '{"value": "1"}'
```

## Deleting a Backing Image

```bash
# Check if any volumes are using the backing image
kubectl get volumes.longhorn.io -n longhorn-system \
  -o json | \
  jq -r '.items[] | select(.spec.backingImage != "") | "\(.metadata.name): \(.spec.backingImage)"'

# Only delete if no volumes are using it
kubectl delete backingimage.longhorn.io ubuntu-22.04-cloud -n longhorn-system
```

## Using Backing Images with KubeVirt

```yaml
# kubevirt-vm.yaml - KubeVirt VM using Longhorn backing image
apiVersion: kubevirt.io/v1
kind: VirtualMachine
metadata:
  name: ubuntu-vm
  namespace: default
spec:
  running: true
  template:
    spec:
      domain:
        devices:
          disks:
            - name: rootdisk
              disk:
                bus: virtio
        resources:
          requests:
            memory: "2Gi"
      volumes:
        - name: rootdisk
          persistentVolumeClaim:
            # PVC pre-populated with Ubuntu image via Longhorn backing image
            claimName: ubuntu-vm-disk
```

## Conclusion

Longhorn Backing Images provide an efficient way to create pre-populated volumes from base images. This is especially valuable for VM deployments with KubeVirt where every VM needs to start from an OS image, or for golden image deployments where multiple services start from a common baseline. The Longhorn backing image system handles distribution and caching of image data across nodes, ensuring fast volume creation times regardless of cluster size.
