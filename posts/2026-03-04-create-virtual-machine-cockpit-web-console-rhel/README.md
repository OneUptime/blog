# How to Create a Virtual Machine Using the Cockpit Web Console on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, KVM, Cockpit, Virtual Machines, Web Console, Virtualization, Linux

Description: Learn how to create and manage virtual machines on RHEL using the Cockpit web console, providing a browser-based interface for KVM virtualization.

---

Cockpit is a web-based administration interface included with RHEL. With the virtualization plugin, you can create and manage KVM virtual machines directly from your browser. This is convenient for administrators who prefer a graphical interface.

## Installing Cockpit with Virtualization Support

```bash
# Install Cockpit and the virtual machines plugin
sudo dnf install -y cockpit cockpit-machines

# Ensure libvirt is installed
sudo dnf install -y libvirt qemu-kvm virt-install

# Start and enable Cockpit
sudo systemctl enable --now cockpit.socket

# Start libvirt
sudo systemctl enable --now libvirtd

# Open the firewall for Cockpit
sudo firewall-cmd --permanent --add-service=cockpit
sudo firewall-cmd --reload
```

## Accessing the Cockpit Web Console

```bash
# Cockpit runs on port 9090
# Open in your browser: https://<server-ip>:9090

# Log in with your RHEL system credentials
# Navigate to "Virtual Machines" in the left menu
```

## Creating a VM Through the Web Console

The steps in the Cockpit UI:

1. Click **Virtual Machines** in the left sidebar
2. Click **Create VM** button
3. Fill in the VM details:
   - **Name**: rhel9-web
   - **Installation type**: Local install media (ISO)
   - **Installation source**: Upload or select an ISO from the storage pool
   - **Operating system**: Red Hat Enterprise Linux 9
   - **Memory**: 2 GiB
   - **Storage**: 20 GiB (creates a qcow2 disk automatically)
4. Click **Create and run**

## Preparing the ISO Image

```bash
# Upload an ISO to the default storage pool
sudo cp /path/to/rhel-9.4-x86_64-dvd.iso /var/lib/libvirt/images/

# Cockpit will detect ISOs in the storage pool directories
# You can also download ISOs directly to the server
sudo curl -o /var/lib/libvirt/images/rhel-9.4-boot.iso \
  https://your-repo/rhel-9.4-x86_64-boot.iso
```

## Managing VMs in Cockpit

Once a VM is created, Cockpit provides:

- **Console access**: Click the VM name, then "Console" tab for VNC access
- **Performance monitoring**: CPU, memory, and disk usage graphs
- **Disk management**: Add, remove, or resize virtual disks
- **Network configuration**: Add or modify network interfaces
- **Snapshots**: Create and manage VM snapshots

## Verifying VMs from the Command Line

```bash
# VMs created in Cockpit are standard libvirt VMs
# You can manage them with virsh as well
sudo virsh list --all

# View VM details
sudo virsh dominfo rhel9-web

# Cockpit and virsh operate on the same libvirt backend
# Changes from either tool are visible in both
```

Cockpit provides a user-friendly way to manage virtualization without memorizing command-line options. It works well for smaller environments. For large-scale VM management, consider using virt-install scripts or Ansible for automation.
