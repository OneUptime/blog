# How to Configure VMXNET3 and PVSCSI Drivers for RHEL in VMware

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, VMware, VMXNET3, PVSCSI, Paravirtual, Performance, Linux

Description: Configure VMXNET3 network and PVSCSI storage paravirtual drivers on RHEL VMs in VMware to maximize I/O throughput and reduce CPU overhead.

---

VMware provides paravirtual drivers that outperform emulated hardware. VMXNET3 is the paravirtual network adapter and PVSCSI is the paravirtual SCSI controller. Both are included in the RHEL kernel and should be used for all production VMware VMs.

## Check Current Drivers

```bash
# Check the network adapter type
lspci | grep -i ethernet
# VMXNET3 shows as: "VMware VMXNET3"

# Check if vmxnet3 module is loaded
lsmod | grep vmxnet3

# Check the storage controller
lspci | grep -i scsi
# PVSCSI shows as: "VMware PVSCSI"

# Check if vmw_pvscsi module is loaded
lsmod | grep vmw_pvscsi
```

## Switch to VMXNET3 (If Using E1000)

If your VM was created with the default E1000 adapter, switch to VMXNET3:

1. Shut down the VM
2. In vSphere, edit VM settings
3. Remove the existing E1000 network adapter
4. Add a new adapter and select "VMXNET3"
5. Reconnect to the same port group
6. Power on the VM

```bash
# After boot, verify the new adapter
ip link show
ethtool -i ens192
# Driver should show: vmxnet3
```

## Tune VMXNET3 for High Throughput

```bash
# Increase the ring buffer size for better throughput
sudo ethtool -G ens192 rx 4096 tx 4096

# Enable TCP Segmentation Offload (should be on by default)
sudo ethtool -K ens192 tso on

# Enable Generic Receive Offload
sudo ethtool -K ens192 gro on

# Verify offload settings
ethtool -k ens192 | grep -E "tcp-segmentation|generic-receive"

# Make ring buffer changes persistent via NetworkManager
sudo nmcli connection modify ens192 ethtool.ring-rx 4096 ethtool.ring-tx 4096
```

## Switch to PVSCSI (If Using LSI Logic)

1. Add a new SCSI controller of type "VMware Paravirtual" in VM settings
2. Add a new disk attached to the PVSCSI controller
3. Boot the VM and verify the new controller is detected

```bash
# Verify PVSCSI is loaded
lsmod | grep vmw_pvscsi

# List SCSI devices and their controllers
lsscsi -v

# Check I/O scheduler (mq-deadline or none is recommended for PVSCSI)
cat /sys/block/sda/queue/scheduler
```

## Migrating the Boot Disk to PVSCSI

Migrating the OS disk to PVSCSI requires care to avoid an unbootable VM.

```bash
# Ensure the vmw_pvscsi module is in the initramfs
sudo lsinitrd /boot/initramfs-$(uname -r).img | grep pvscsi

# If not present, add it
sudo dracut --add-drivers vmw_pvscsi -f /boot/initramfs-$(uname -r).img $(uname -r)

# Verify it was added
sudo lsinitrd /boot/initramfs-$(uname -r).img | grep pvscsi
```

Then power off the VM, change the SCSI controller type to "VMware Paravirtual" in vSphere settings, and boot.

## Tune PVSCSI Queue Depth

```bash
# Check the current queue depth
cat /sys/module/vmw_pvscsi/parameters/cmd_per_lun

# Increase the queue depth for database workloads
echo 64 | sudo tee /sys/module/vmw_pvscsi/parameters/cmd_per_lun

# Make persistent via modprobe configuration
echo "options vmw_pvscsi cmd_per_lun=64" | sudo tee /etc/modprobe.d/pvscsi.conf

# Rebuild initramfs to include the new setting
sudo dracut -f
```

Using VMXNET3 and PVSCSI together provides the best possible I/O performance for RHEL VMs running on VMware.
