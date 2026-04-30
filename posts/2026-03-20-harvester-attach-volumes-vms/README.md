# How to Attach Volumes to VMs in Harvester

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Harvester, Kubernetes, Virtualization, HCI, Storage, Volumes, KubeVirt

Description: A guide to attaching existing storage volumes to virtual machines in Harvester, including hot-plug support and multi-disk configurations.

## Introduction

Attaching volumes to VMs in Harvester allows you to add persistent data disks to running or stopped virtual machines. Harvester supports both cold attachment (VM must be stopped) and hot-plug (attach to a running VM) for data disks. This is useful for adding database storage, shared data volumes, or migrating data between VMs.

## Prerequisites

- A running Harvester cluster
- An existing VM (running or stopped)
- A PVC (Persistent Volume Claim) that is not currently attached to another VM

## Method 1: Attach a Volume via the UI

### To a Stopped VM

1. Navigate to **Virtual Machines**
2. Find the stopped VM and click the **⋮** menu
3. Click **Edit Config**
4. Go to the **Volumes** tab
5. Click **Add Volume**
6. Select **Use Existing Volume**
7. Choose the PVC from the dropdown
8. Set the bus type (VirtIO is recommended when the guest has VirtIO drivers installed; use SATA for compatibility if needed)
9. Click **Save**

### Hot-Plug to a Running VM

1. Navigate to **Virtual Machines**
2. Click on the running VM
3. Click the **⋮** menu → **Add Volume**
4. Enter a name and select the existing PVC
5. Click **Apply** - the disk appears in the VM within seconds

## Method 2: Attach via kubectl (Cold Attach)

Stop the VM first, or restart it after applying the updated spec, then edit the VM specification to add a new disk:

```bash
# The VM spec needs both a disk entry and a volume entry

# First, check the current VM spec

kubectl get vm my-database-vm -n default -o yaml

# Apply a patch to add a new data disk
kubectl patch vm my-database-vm -n default --type json \
-p '[
  {
    "op": "add",
    "path": "/spec/template/spec/domain/devices/disks/-",
    "value": {
      "name": "datavolume1",
      "disk": {
        "bus": "virtio"
      }
    }
  },
  {
    "op": "add",
    "path": "/spec/template/spec/volumes/-",
    "value": {
      "name": "datavolume1",
      "persistentVolumeClaim": {
        "claimName": "database-data-500gb"
      }
    }
  }
]'
```

For a VM that hasn't been created yet, include volumes in the initial spec:

```yaml
# vm-with-multiple-disks.yaml
# VM with root disk + two data disks

apiVersion: kubevirt.io/v1
kind: VirtualMachine
metadata:
  name: database-server-01
  namespace: default
spec:
  runStrategy: Always
  template:
    spec:
      domain:
        cpu:
          cores: 8
        resources:
          requests:
            memory: 32Gi
        machine:
          type: q35
        devices:
          disks:
            # Boot disk - OS
            - name: rootdisk
              bootOrder: 1
              disk:
                bus: virtio
            # Data disk 1 - Database files
            - name: dbdata
              disk:
                bus: virtio
            # Data disk 2 - Database logs
            - name: dblogs
              disk:
                bus: virtio
            # Cloud-init disk
            - name: cloudinit
              disk:
                bus: virtio
          interfaces:
            - name: default
              masquerade: {}
      networks:
        - name: default
          pod: {}
      volumes:
        # Boot volume (from image)
        - name: rootdisk
          persistentVolumeClaim:
            claimName: database-server-01-root
        # Data volumes
        - name: dbdata
          persistentVolumeClaim:
            claimName: database-data-500gb
        - name: dblogs
          persistentVolumeClaim:
            claimName: database-logs-100gb
        - name: cloudinit
          cloudInitNoCloud:
            userData: |
              #cloud-config
              # Format and mount data disks on first boot
              runcmd:
                # Format /dev/vdb for database data
                - mkfs.xfs /dev/vdb
                - mkdir -p /var/lib/postgresql/data
                - echo '/dev/vdb /var/lib/postgresql/data xfs defaults 0 2' >> /etc/fstab
                - mount -a
                # Format /dev/vdc for database logs
                - mkfs.xfs /dev/vdc
                - mkdir -p /var/log/postgresql
                - echo '/dev/vdc /var/log/postgresql xfs defaults 0 2' >> /etc/fstab
                - mount -a
```

## Method 3: Hot-Plug with virtctl

The `virtctl` tool supports hot-plugging volumes to running VMs:

```bash
# Install virtctl (if not already installed)
VERSION=$(kubectl get kubevirt -n harvester-system -o jsonpath='{.items[0].status.observedKubeVirtVersion}')
sudo curl -L -o /usr/local/bin/virtctl \
    https://github.com/kubevirt/kubevirt/releases/download/${VERSION}/virtctl-${VERSION}-linux-amd64
sudo chmod +x /usr/local/bin/virtctl

# The value passed to --volume-name must match an existing PVC or DataVolume name
# In current Harvester releases, hot-plugged volumes use the SCSI bus
# Hot-plug a volume to a running VM
virtctl addvolume my-database-vm \
    --volume-name=extra-storage \
    --bus=scsi \
    --serial=ext1 \
    -n default

# virtctl addvolume persists the attachment by default
# The deprecated --persist flag is no longer needed
```

```bash
# Verify the volume was hot-plugged successfully
kubectl get vmi my-database-vm -n default -o json | jq '.status.volumeStatus'

# Inside the VM, the new disk should appear immediately
# Check for the new device
lsblk
```

## Step: Format and Mount Volumes Inside the VM

After attaching a new empty volume, format and mount it inside the VM:

```bash
# Access the VM console or SSH into it

# List block devices and identify the new disk
# Depending on the disk bus and guest OS, it may appear as /dev/vdb, /dev/sdb, etc.
lsblk

# Replace /dev/DEVICE with the actual device path from lsblk
# Format the new disk (WARNING: this erases all data on the disk)
sudo mkfs.ext4 -L data-disk /dev/DEVICE

# Create a mount point
sudo mkdir -p /mnt/data

# Mount temporarily
sudo mount /dev/DEVICE /mnt/data

# Add to fstab for persistent mounting
echo 'LABEL=data-disk /mnt/data ext4 defaults 0 2' | sudo tee -a /etc/fstab

# Verify fstab entry works
sudo umount /mnt/data
sudo mount -a
df -h /mnt/data
```

## Detaching Volumes

### Via virtctl (Hot Unplug)

```bash
# Hot unplug a volume from a running VM
virtctl removevolume my-database-vm \
    --volume-name=extra-storage \
    -n default
```

### Via kubectl (Cold Detach)

```bash
# Remove the disk from the VM spec by name (replace datavolume1 as needed)
DISK_INDEX=$(kubectl get vm my-database-vm -n default -o json | jq '.spec.template.spec.domain.devices.disks | map(.name) | index("datavolume1")')
VOLUME_INDEX=$(kubectl get vm my-database-vm -n default -o json | jq '.spec.template.spec.volumes | map(.name) | index("datavolume1")')

kubectl patch vm my-database-vm -n default --type json -p="[
  {\"op\": \"remove\", \"path\": \"/spec/template/spec/domain/devices/disks/${DISK_INDEX}\"},
  {\"op\": \"remove\", \"path\": \"/spec/template/spec/volumes/${VOLUME_INDEX}\"}
]"
```

## Troubleshooting Volume Attachment Issues

```bash
# Check VM events for attachment errors
kubectl get events -n default \
    --field-selector involvedObject.name=my-database-vm \
    --sort-by='.lastTimestamp'

# Check if any VM already references the PVC
kubectl get vm -A -o json | jq -r '
  .items[]
  | select(any(.spec.template.spec.volumes[]?; .persistentVolumeClaim?.claimName == "database-data-500gb"))
  | "\(.metadata.namespace)/\(.metadata.name)"'

# Verify the PVC is in Bound state
kubectl get pvc database-data-500gb -n default

# Get the backing PV / Longhorn volume name for the PVC
PV_NAME=$(kubectl get pvc database-data-500gb -n default -o jsonpath='{.spec.volumeName}')
echo "${PV_NAME}"

# Check Longhorn volume is healthy
kubectl get volumes.longhorn.io "${PV_NAME}" -n longhorn-system
```

## Conclusion

Attaching volumes to VMs in Harvester is a flexible operation that supports both pre-planned multi-disk configurations and on-the-fly storage expansion via hot-plug. By separating application data from the OS disk, you make VMs more maintainable - you can recreate or upgrade the OS disk without touching data volumes. Hot-plug support means storage capacity can be increased without scheduling downtime, which is valuable for production database and application servers.
