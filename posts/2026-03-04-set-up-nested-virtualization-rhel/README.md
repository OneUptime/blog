# How to Set Up Nested Virtualization on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, KVM, Nested Virtualization, Virtualization, Linux

Description: Learn how to enable nested virtualization on RHEL, allowing you to run virtual machines inside virtual machines for testing and development purposes.

---

Nested virtualization lets you run a hypervisor inside a virtual machine, creating VMs within VMs. This is useful for testing virtualization setups, training environments, and CI/CD pipelines that need to build VM images. Performance is reduced compared to bare-metal virtualization, so it is best suited for non-production workloads.

## Checking if Nested Virtualization is Enabled

```bash
# For Intel CPUs
cat /sys/module/kvm_intel/parameters/nested
# Y = enabled, N = disabled

# For AMD CPUs
cat /sys/module/kvm_amd/parameters/nested
# 1 = enabled, 0 = disabled
```

## Enabling Nested Virtualization

```bash
# Shut down all running VMs first
sudo virsh list --name | xargs -I{} sudo virsh shutdown {}

# Unload and reload the KVM module with nesting enabled
# For Intel:
sudo modprobe -r kvm_intel
sudo modprobe kvm_intel nested=1

# For AMD:
sudo modprobe -r kvm_amd
sudo modprobe kvm_amd nested=1

# Verify it is now enabled
cat /sys/module/kvm_intel/parameters/nested
```

## Making it Persistent Across Reboots

```bash
# Create a modprobe configuration file
# For Intel:
echo "options kvm_intel nested=1" | sudo tee /etc/modprobe.d/kvm-nested.conf

# For AMD:
echo "options kvm_amd nested=1" | sudo tee /etc/modprobe.d/kvm-nested.conf
```

## Configuring the Guest VM for Nested Virtualization

The guest VM needs to see virtualization extensions. Configure the CPU model:

```bash
# Edit the guest VM that will act as a nested hypervisor
sudo virsh edit rhel9-hypervisor

# Set the CPU mode to host-passthrough to expose VMX/SVM to the guest:
# <cpu mode='host-passthrough' check='none'>
#   <cache mode='passthrough'/>
# </cpu>

# Or use host-model for better migration compatibility:
# <cpu mode='host-model'/>
```

## Installing KVM Inside the Guest

```bash
# Inside the guest VM (L1), install KVM
sudo dnf group install -y "Virtualization Host"
sudo systemctl enable --now libvirtd

# Verify hardware virtualization is visible
grep -E '(vmx|svm)' /proc/cpuinfo

# Check KVM modules
lsmod | grep kvm

# Validate the nested hypervisor
sudo virt-host-validate
```

## Creating a Nested VM

```bash
# Inside the L1 guest, create a VM (L2) as usual
sudo virt-install \
  --name nested-vm \
  --memory 1024 \
  --vcpus 1 \
  --disk size=10 \
  --cdrom /var/lib/libvirt/images/rhel-9.4-boot.iso \
  --os-variant rhel9.4 \
  --network network=default \
  --graphics vnc
```

## Performance Considerations

```bash
# Check CPU overhead from nested virtualization
# Inside the L2 guest
cat /proc/cpuinfo | grep "model name"

# Nested VMs have higher latency for VM exits
# Expect 20-40% performance reduction compared to L1 guests
```

Nested virtualization should not be used for production workloads. It adds significant overhead to every privileged operation in the L2 guest. Use it for testing, development, and training scenarios where convenience outweighs performance.
