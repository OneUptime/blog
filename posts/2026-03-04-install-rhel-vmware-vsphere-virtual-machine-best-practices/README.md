# How to Install RHEL as a VMware vSphere Virtual Machine with Best Practices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, VMware, vSphere, Virtualization, Installation, Linux

Description: Install RHEL as a virtual machine on VMware vSphere using best practices for guest OS type, disk controllers, and network adapters for optimal performance.

---

Running RHEL on VMware vSphere is a common deployment model. Following VMware and Red Hat best practices during VM creation ensures you get the best performance and compatibility.

## Create the Virtual Machine in vSphere

1. In the vSphere Client, right-click your host or cluster and select "New Virtual Machine"
2. Choose "Create a new virtual machine"
3. Set the Guest OS Family to "Linux" and Guest OS Version to "Red Hat Enterprise Linux 9 (64-bit)"

This selection ensures vSphere applies the correct default hardware settings.

## Recommended VM Hardware Settings

```
# VM Configuration Best Practices:
CPU:         Allocate based on workload (start with 2-4 vCPUs)
Memory:      Minimum 2 GB, recommended 4 GB or more
Disk:        Use "Thin Provisioning" for development, "Thick Eager Zeroed" for production
Controller:  VMware Paravirtual (PVSCSI) for best disk I/O
Network:     VMXNET3 adapter for best network performance
SCSI Slots:  Place the OS disk on SCSI 0:0
```

## Attach the RHEL ISO

```
# In the VM settings:
1. Add a CD/DVD drive
2. Select "Datastore ISO File"
3. Browse to your uploaded RHEL 9 ISO
4. Check "Connect at power on"
```

## Install RHEL

Power on the VM and open the console. The RHEL Anaconda installer will boot from the ISO.

```bash
# Key installation decisions:
# - Partitioning: Use LVM for flexible disk management
# - Network: Configure the VMXNET3 adapter during install
# - Software: Select "Minimal Install" for servers, add packages later
```

## Post-Installation: Install Open VM Tools

```bash
# Install the open-vm-tools package (preferred over VMware Tools)
sudo dnf install -y open-vm-tools

# Enable and start the service
sudo systemctl enable --now vmtoolsd

# Verify it is running
sudo systemctl status vmtoolsd
```

## Verify Paravirtual Drivers

```bash
# Check that PVSCSI is being used for disk
lsmod | grep vmw_pvscsi

# Check that VMXNET3 is being used for networking
lsmod | grep vmxnet3

# Verify disk controller type
lsscsi
```

## Enable Time Synchronization

```bash
# Configure chrony to sync with the ESXi host or NTP server
sudo tee /etc/chrony.conf > /dev/null << 'EOF'
server ntp.example.com iburst
driftfile /var/lib/chrony/drift
makestep 1.0 3
rtcsync
EOF

sudo systemctl restart chronyd
```

## Register and Update

```bash
# Register with Red Hat
sudo subscription-manager register --username your_username --password your_password
sudo subscription-manager attach --auto

# Update the system
sudo dnf update -y

# Reboot to apply kernel updates
sudo reboot
```

These best practices ensure your RHEL VM runs with optimal paravirtualized drivers and correct guest configuration for VMware vSphere.
