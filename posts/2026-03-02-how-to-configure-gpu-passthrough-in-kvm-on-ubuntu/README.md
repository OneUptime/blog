# How to Configure GPU Passthrough in KVM on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, KVM, GPU Passthrough, Virtualization, VFIO

Description: Detailed guide to configuring GPU passthrough in KVM on Ubuntu using VFIO, enabling a virtual machine to have direct exclusive access to a physical GPU for gaming or compute tasks.

---

GPU passthrough lets a KVM virtual machine take exclusive control of a physical GPU, giving it near-native performance. This is commonly used to run Windows gaming VMs on a Linux host, or to isolate GPU compute workloads per VM. The setup requires IOMMU support from your CPU and motherboard, and a willingness to work through a multi-step configuration process.

## Hardware Requirements

- CPU with virtualization and IOMMU support:
  - Intel: VT-x and VT-d
  - AMD: AMD-V and AMD-Vi (IOMMU)
- Motherboard with IOMMU enabled in UEFI
- Two GPUs (one for the host display, one to pass through), OR a CPU with integrated graphics for the host
- The passthrough GPU should ideally be in a separate IOMMU group

## Enabling IOMMU in UEFI

Boot into your UEFI/BIOS and enable:
- For Intel: VT-d (Intel Virtualization Technology for Directed I/O)
- For AMD: IOMMU or AMD-Vi

The exact menu location varies by motherboard manufacturer.

## Enabling IOMMU in the Kernel

After enabling IOMMU in UEFI, enable it in the Linux kernel via the bootloader:

```bash
# Edit GRUB configuration
sudo nano /etc/default/grub
```

Find the `GRUB_CMDLINE_LINUX_DEFAULT` line and add the IOMMU parameter:

```bash
# For Intel:
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash intel_iommu=on iommu=pt"

# For AMD:
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash amd_iommu=on iommu=pt"
```

The `iommu=pt` (passthrough) option improves performance by only enabling IOMMU for devices being passed through.

```bash
# Update GRUB and reboot
sudo update-grub
sudo reboot
```

## Verifying IOMMU is Active

After rebooting, confirm IOMMU is working:

```bash
# Should show IOMMU is enabled
dmesg | grep -i -e DMAR -e IOMMU | head -20

# List IOMMU groups
for d in /sys/kernel/iommu_groups/*/devices/*; do
  n=${d#*/iommu_groups/*}; n=${n%%/*}
  printf 'IOMMU Group %s ' "$n"
  lspci -nns "${d##*/}"
done
```

Find your GPU in this output. For passthrough to work cleanly, your GPU and its audio controller should be in a separate IOMMU group, ideally not sharing a group with critical host devices. Note the GPU's PCI address (e.g., `0000:01:00.0`) and its NVIDIA/AMD audio function (e.g., `0000:01:00.1`).

## Installing KVM and VFIO Tools

```bash
# Install KVM, QEMU, and management tools
sudo apt-get update
sudo apt-get install -y qemu-kvm libvirt-daemon-system libvirt-clients bridge-utils virt-manager

# Add your user to necessary groups
sudo usermod -aG libvirt,kvm $USER

# Start and enable libvirtd
sudo systemctl enable --now libvirtd
```

## Binding the GPU to the VFIO Driver

The GPU must be bound to the VFIO driver instead of the normal NVIDIA/AMD driver before the VM starts. This is the key step that disconnects the GPU from the host.

### Step 1: Get GPU IDs

```bash
# Find GPU vendor and device IDs
lspci -nn | grep -i nvidia
# Example output:
# 01:00.0 VGA compatible controller [0300]: NVIDIA Corporation GA102 [GeForce RTX 3080] [10de:2206]
# 01:00.1 Audio device [0403]: NVIDIA Corporation GA102 High Definition Audio Controller [10de:1aef]
```

The IDs in brackets (`10de:2206` and `10de:1aef`) are what you need.

### Step 2: Load VFIO Modules Early

```bash
# Add VFIO modules to load at boot
echo "vfio
vfio_iommu_type1
vfio_pci
vfio_virqfd" | sudo tee /etc/modules-load.d/vfio.conf
```

### Step 3: Bind GPU to VFIO at Boot

```bash
# Create VFIO configuration with your GPU IDs
echo "options vfio-pci ids=10de:2206,10de:1aef" | sudo tee /etc/modprobe.d/vfio.conf

# If you have an NVIDIA GPU, blacklist the nvidia driver
# so VFIO loads first
echo "softdep nvidia pre: vfio-pci" | sudo tee -a /etc/modprobe.d/vfio.conf

# Rebuild initramfs
sudo update-initramfs -u

sudo reboot
```

### Step 4: Verify VFIO Binding

After reboot:

```bash
# Confirm GPU is bound to vfio-pci
lspci -nnk | grep -A 3 "01:00"
# Should show "Kernel driver in use: vfio-pci"
```

## Creating the VM with GPU Passthrough

Use virt-manager or virsh. With virt-manager:

1. Create a new VM (Windows ISO for gaming, or Linux for compute)
2. In hardware settings, click "Add Hardware" -> "PCI Host Device"
3. Add both the GPU (01:00.0) and its audio controller (01:00.1)
4. Under CPU settings, enable "Copy host CPU configuration" for best performance
5. Set chipset to Q35 and firmware to OVMF (UEFI)

For XML configuration via virsh, the relevant section for GPU passthrough:

```xml
<hostdev mode='subsystem' type='pci' managed='yes'>
  <source>
    <address domain='0x0000' bus='0x01' slot='0x00' function='0x0'/>
  </source>
  <address type='pci' domain='0x0000' bus='0x06' slot='0x00' function='0x0'/>
</hostdev>
<hostdev mode='subsystem' type='pci' managed='yes'>
  <source>
    <address domain='0x0000' bus='0x01' slot='0x00' function='0x1'/>
  </source>
  <address type='pci' domain='0x0000' bus='0x07' slot='0x00' function='0x0'/>
</hostdev>
```

## Handling the NVIDIA Error 43

Windows guests with NVIDIA GPUs often show "Error 43" because the driver detects it's running in a VM. Fix this by hiding the hypervisor:

```bash
# Edit VM XML via virsh
sudo virsh edit your-vm-name
```

Add this in the `<features>` section:

```xml
<features>
  <acpi/>
  <apic/>
  <hyperv>
    <relaxed state='on'/>
    <vapic state='on'/>
    <spinlocks state='on' retries='8191'/>
    <vendor_id state='on' value='randomid'/>
  </hyperv>
  <kvm>
    <hidden state='on'/>
  </kvm>
</features>
```

## Optimizing VM Performance

### CPU Pinning

For reduced latency, pin VM CPUs to specific host cores:

```xml
<vcpu placement='static'>8</vcpu>
<cputune>
  <vcpupin vcpu='0' cpuset='2'/>
  <vcpupin vcpu='1' cpuset='3'/>
  <vcpupin vcpu='2' cpuset='4'/>
  <vcpupin vcpu='3' cpuset='5'/>
  <emulatorpin cpuset='0-1'/>
</cputune>
```

### Huge Pages

Huge pages reduce memory access overhead:

```bash
# Allocate huge pages (adjust for your VM RAM size)
# For 16GB VM: 16384 MB / 2MB = 8192 pages
echo 8192 | sudo tee /proc/sys/vm/nr_hugepages

# Make permanent
echo "vm.nr_hugepages = 8192" | sudo tee -a /etc/sysctl.conf
```

In VM XML:

```xml
<memoryBacking>
  <hugepages/>
</memoryBacking>
```

## Troubleshooting

### VM fails to start: "vfio: error getting device from group"

```bash
# Check the IOMMU group permissions
ls -la /dev/vfio/
# The group file should be owned by root and readable

# Add udev rule if needed
echo 'SUBSYSTEM=="vfio", OWNER="root", GROUP="kvm"' | sudo tee /etc/udev/rules.d/72-vfio.rules
sudo udevadm control --reload-rules
```

### GPU still shows host driver

```bash
# Manually unbind and rebind to vfio-pci
echo "0000:01:00.0" | sudo tee /sys/bus/pci/drivers/nvidia/unbind
echo "vfio-pci" | sudo tee /sys/bus/pci/devices/0000\:01\:00.0/driver_override
echo "0000:01:00.0" | sudo tee /sys/bus/pci/drivers/vfio-pci/bind
```

### Black screen in VM after passing GPU

Connect a physical monitor to the GPU being passed through, or install the display drivers inside the VM over VNC first, then switch to the GPU output. The VM won't output anything until the correct GPU driver is installed inside it.

GPU passthrough, once configured correctly, delivers performance that's within a few percent of bare metal. The initial setup is involved, but the result is a genuinely dual-purpose machine.
