# How to Configure Longhorn Backing Image - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Longhorn, Backing Image, Kubernetes, VM Image, Storage, Template Volumes, SUSE Rancher

Description: Learn how to configure Longhorn backing images to pre-populate volumes with base images such as OS images for virtual machines or base data for stateful applications.

---

Longhorn backing images allow you to create volumes pre-populated with a base image, such as a Linux OS image for a virtual machine (Harvester VMs) or a database seed image. This eliminates the need to manually copy data into new volumes.

---

## What Is a Backing Image?

A Longhorn backing image is an immutable base image stored on Longhorn disks in the cluster. When a volume is created with a backing image, the backing image becomes the initial snapshot, and only changes are stored per-volume.

---

## Step 1: Create a Backing Image from a URL

```yaml
# backing-image-ubuntu.yaml

apiVersion: longhorn.io/v1beta2
kind: BackingImage
metadata:
  name: ubuntu-22-04
  namespace: longhorn-system
spec:
  sourceType: download
  sourceParameters:
    url: "https://cloud-images.ubuntu.com/jammy/current/jammy-server-cloudimg-amd64.img"
  checksum: "<sha512-hex>"  # Optional but recommended
  minNumberOfCopies: 2
  diskSelector: []
  nodeSelector: []
```

```bash
kubectl apply -f backing-image-ubuntu.yaml

# Inspect per-disk download state
kubectl describe backingimage ubuntu-22-04 -n longhorn-system
```

---

## Step 2: Create a Backing Image from a Local File

Upload an image from your local machine:

```bash
# Via the Longhorn UI: Advanced > Backing Images > Create > Upload
# Longhorn backing images support RAW and QCOW2 images (for example, .img or .qcow2).
# For API-driven uploads, create the BackingImage first and then upload the file in a second HTTP request.
```

---

## Step 3: Create a Volume Using a Backing Image

```yaml
# StorageClass using an existing backing image
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: longhorn-ubuntu-vm
provisioner: driver.longhorn.io
parameters:
  numberOfReplicas: "2"
  backingImage: ubuntu-22-04
```

```yaml
# PVC that will be pre-populated with the Ubuntu image
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: ubuntu-vm-disk
  namespace: vms
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: longhorn-ubuntu-vm
  resources:
    requests:
      storage: 20Gi
```

---

## Step 4: Manage Backing Image Copies

```bash
# Inspect per-disk backing image status
kubectl get backingimage ubuntu-22-04 -n longhorn-system \
  -o jsonpath='{.status.diskFileStatusMap}'

# Delete a backing image (only if no volumes are using it)
kubectl delete backingimage ubuntu-22-04 -n longhorn-system
```

---

## Step 5: Backing Image in Harvester

Harvester (Rancher's HCI platform) uses Longhorn backing images behind the scenes for imported VM images. Import images on the Harvester **Images** page, and Harvester handles the BackingImage creation automatically.

---

## Best Practices

- Set `minNumberOfCopies: 2` for production backing images to ensure availability during node failures.
- Use checksums to verify backing image integrity after download.
- Reuse backing images across multiple volumes to reduce storage consumption - the base data is shared via copy-on-write.
- Regularly clean up unused backing images to free storage capacity.
