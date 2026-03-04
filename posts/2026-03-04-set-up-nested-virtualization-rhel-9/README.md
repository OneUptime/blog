# How to Set Up Nested Virtualization on RHEL 9

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, KVM, Nested Virtualization, Virtualization, Linux

Description: Learn how to enable and configure nested virtualization on RHEL 9 to run virtual machines inside virtual machines for testing and development.

---

Nested virtualization allows you to run a hypervisor inside a virtual machine, enabling VMs within VMs. On RHEL 9, this is useful for testing virtualization setups, training environments, and development workflows where you need to simulate a multi-host virtualization infrastructure without physical hardware.

## Checking Nested Virtualization Support

For Intel:

```bash
cat /sys/module/kvm_intel/parameters/nested
```

For AMD:

```bash
cat /sys/module/kvm_amd/parameters/nested
```

Output of `Y` or `1` means nested virtualization is enabled.

## Enabling Nested Virtualization

### For Intel CPUs

```bash
sudo modprobe -r kvm_intel
sudo modprobe kvm_intel nested=1
```

Make it persistent:

```bash
echo "options kvm_intel nested=1" | sudo tee /etc/modprobe.d/kvm_nested.conf
```

### For AMD CPUs

```bash
sudo modprobe -r kvm_amd
sudo modprobe kvm_amd nested=1
```

Make it persistent:

```bash
echo "options kvm_amd nested=1" | sudo tee /etc/modprobe.d/kvm_nested.conf
```

Note: You must shut down all VMs before reloading the KVM modules.

## Configuring the L1 Guest (First-Level VM)

The L1 guest must expose CPU virtualization features to the L2 guest:

### Using host-passthrough CPU Mode

```bash
sudo virsh edit l1-vm
```

Set:

```xml
<cpu mode='host-passthrough' check='none'/>
```

Or with virt-install:

```bash
sudo virt-install --cpu host-passthrough ...
```

### Using host-model

```xml
<cpu mode='host-model' check='none'/>
```

This copies the host CPU model to the guest.

## Verifying Inside the L1 Guest

Inside the first-level VM, check for virtualization support:

```bash
grep -cE 'vmx|svm' /proc/cpuinfo
```

If this returns a non-zero number, nested virtualization is working.

Run the validation check:

```bash
virt-host-validate
```

## Installing KVM in the L1 Guest

Inside the L1 guest, install KVM:

```bash
sudo dnf install qemu-kvm libvirt virt-install
sudo systemctl enable --now libvirtd
```

Now you can create L2 VMs (VMs inside VMs).

## Performance Considerations

Nested virtualization has performance overhead:

- CPU: 10-20% overhead per nesting level
- Memory: Additional overhead for nested page tables
- I/O: Noticeably slower disk and network I/O

Nested virtualization is intended for development and testing, not production workloads.

## Common Use Cases

- Testing Kubernetes or OpenShift on virtual infrastructure
- Training environments for virtualization courses
- Developing automation for VM provisioning
- Testing live migration workflows
- CI/CD pipelines that test VM-based deployments

## Summary

Nested virtualization on RHEL 9 enables running hypervisors inside VMs by enabling the nested parameter in the KVM module and using host-passthrough CPU mode. While not suitable for production due to performance overhead, it is invaluable for testing, training, and development of virtualization infrastructure.
