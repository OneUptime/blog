# How to Set Up Elemental with USB Boot

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elemental, USB Boot, Edge, Kubernetes, Provisioning

Description: Create bootable USB drives with Elemental registration images for provisioning bare metal nodes without network boot infrastructure.

## Introduction

USB boot is the simplest provisioning method for Elemental, requiring no special network boot infrastructure. You create a bootable USB drive from an Elemental seed image, insert it into a machine, boot, and the machine provisions itself automatically. This approach is ideal for remote sites, retail locations, or any environment without PXE infrastructure.

## Prerequisites

- A USB drive (8 GB or larger)
- `kubectl` access to a Rancher management cluster with OS Manager installed
- Target machines with TPM 2.0, or `config.elemental.registration.emulate-tpm: true` for systems without TPM
- Network connectivity from the target machine to Rancher during registration
- `wget`
- `dd` utility (Linux/macOS) or Rufus (Windows)

## Step 1: Create the MachineRegistration

```yaml
# registration.yaml
apiVersion: elemental.cattle.io/v1beta1
kind: MachineRegistration
metadata:
  name: my-nodes
  namespace: fleet-default
spec:
  config:
    cloud-config:
      users:
        - name: root
          passwd: "$6$rounds=4096$salt$hashedpassword"
          ssh_authorized_keys:
            - "ssh-rsa AAAAB3... admin@example.com"
    elemental:
      install:
        device: /dev/sda
        reboot: true
        debug: false
```

```bash
kubectl apply -f registration.yaml

kubectl get machineregistration my-nodes \
  -n fleet-default \
  -o jsonpath='{.status.registrationURL}{"\n"}'
```

## Step 2: Create the SeedImage Resources

### Build ISO for USB

```yaml
# seedimage-iso.yaml
apiVersion: elemental.cattle.io/v1beta1
kind: SeedImage
metadata:
  name: elemental-usb-iso
  namespace: fleet-default
spec:
  type: iso
  baseImage: registry.suse.com/suse/sl-micro/6.0/baremetal-iso-image:2.1.1-3.36
  registrationRef:
    apiVersion: elemental.cattle.io/v1beta1
    kind: MachineRegistration
    name: my-nodes
    namespace: fleet-default
```

### Build Raw Disk Image (Better for USB)

```yaml
# seedimage-raw.yaml
apiVersion: elemental.cattle.io/v1beta1
kind: SeedImage
metadata:
  name: elemental-usb-raw
  namespace: fleet-default
spec:
  type: raw
  baseImage: registry.suse.com/suse/sl-micro/6.0/baremetal-os-container:2.1.1-3.29
  registrationRef:
    apiVersion: elemental.cattle.io/v1beta1
    kind: MachineRegistration
    name: my-nodes
    namespace: fleet-default
```

## Step 3: Build the USB Image

### Build ISO for USB

```bash
kubectl apply -f seedimage-iso.yaml

kubectl wait --for=condition=ready pod \
  -n fleet-default elemental-usb-iso

# If Rancher uses a self-signed certificate, add --no-check-certificate to wget
wget \
  "$(kubectl get seedimage elemental-usb-iso \
    -n fleet-default \
    -o jsonpath='{.status.downloadURL}')" \
  -O elemental-usb.iso

ls -lh elemental-usb.iso
```

### Build Raw Disk Image (Better for USB)

```bash
kubectl apply -f seedimage-raw.yaml

kubectl wait --for=condition=ready pod \
  -n fleet-default elemental-usb-raw

# If Rancher uses a self-signed certificate, add --no-check-certificate to wget
wget \
  "$(kubectl get seedimage elemental-usb-raw \
    -n fleet-default \
    -o jsonpath='{.status.downloadURL}')" \
  -O elemental-usb.raw
```

## Step 4: Write to USB Drive

### On Linux

```bash
# Find the USB device
lsblk

# Write raw disk image to USB (CAUTION: verify the device path!)
sudo dd if=elemental-usb.raw of=/dev/sdX bs=4M status=progress conv=fsync

# Or write the ISO seed image instead
sudo dd if=elemental-usb.iso of=/dev/sdX bs=4M status=progress conv=fsync

# Sync and eject
sync
sudo eject /dev/sdX
```

### On macOS

```bash
# Find USB device
diskutil list

# Unmount (but don't eject)
diskutil unmountDisk /dev/diskX

# Write raw disk image (note: rdisk for faster writes)
sudo dd if=elemental-usb.raw of=/dev/rdiskX bs=4m

# Or write the ISO seed image instead
sudo dd if=elemental-usb.iso of=/dev/rdiskX bs=4m

# Eject
diskutil eject /dev/diskX
```

### On Windows (Using Rufus or dd)

```powershell
# Using dd for Windows
.\dd.exe if=elemental-usb.raw of=\\.\PhysicalDriveX bs=4M

# Or use Rufus (GUI tool):
# 1. Open Rufus
# 2. Select USB drive
# 3. Select elemental-usb.iso
# 4. Use DD Image mode
# 5. Click START
```

## Step 5: Boot the Machine

1. Insert the USB drive into the target machine
2. Enter BIOS/UEFI settings (usually F2, F10, F12, or Del) and ensure the machine is set to boot with UEFI
3. Set USB as the first boot device
4. Save and reboot
5. The machine boots the Elemental seed image, installs to /dev/sda, and reboots
6. After reboot, the machine registers with Rancher

## Step 6: Monitor Registration

```bash
# Watch for the machine to appear in inventory
kubectl get machineinventories -n fleet-default --watch

# Once registered, verify the machine
kubectl describe machineinventory -n fleet-default <machine-name>
```

## Creating Multiple USB Drives

For large deployments, create multiple identical USB drives:

```bash
# Write to multiple USB drives in parallel
for device in /dev/sdb /dev/sdc /dev/sdd; do
  sudo dd if=elemental-usb.raw of=$device bs=4M status=progress conv=fsync &
done

# Wait for all to complete
wait
echo "All USB drives written"
```

## Conclusion

USB boot provides a simple, reliable provisioning method for Elemental nodes that doesn't require any network boot infrastructure. By creating standardized USB seed images tied to a `MachineRegistration`, field technicians can provision nodes at remote locations with just a USB drive and no PXE setup. Once the USB is inserted and the machine boots, the entire provisioning process is automated.
