# How to Create a Virtual Machine Using the Cockpit Web Console on RHEL 9

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, KVM, Cockpit, Virtualization, Web Console, Linux

Description: Learn how to create and manage KVM virtual machines through the Cockpit web console on RHEL 9 with a graphical browser-based interface.

---

The Cockpit web console on RHEL 9 provides an intuitive browser-based interface for creating and managing KVM virtual machines. It is ideal for administrators who prefer graphical workflows or need to manage VMs remotely without SSH access.

## Installing Cockpit with VM Support

```bash
sudo dnf install cockpit cockpit-machines
sudo systemctl enable --now cockpit.socket
```

Open the firewall:

```bash
sudo firewall-cmd --add-service=cockpit --permanent
sudo firewall-cmd --reload
```

## Accessing Cockpit

Open your browser and navigate to:

```text
https://your-server:9090
```

Log in with your system credentials. Click "Virtual Machines" in the left navigation.

## Creating a New Virtual Machine

1. Click "Create VM" in the Virtual Machines section
2. Fill in the creation form:

**Connection**: System (QEMU/KVM)

**Name**: Enter a unique name for the VM (e.g., `rhel9-web1`)

**Installation type**: Choose one of:
- Download an OS (fetches from a URL)
- Local install media (ISO on the host)
- URL (network installation)
- PXE (network boot)
- Cloud base image

**Operating system**: Select the OS type (e.g., "Red Hat Enterprise Linux 9")

**Memory**: Set the RAM allocation (e.g., 2048 MiB)

**Storage**: Configure the virtual disk size (e.g., 20 GiB)

**Immediately start VM**: Check this to boot after creation

3. Click "Create and run" or "Create"

## Using a Local ISO

1. First, upload or place the ISO on the host:

```bash
sudo cp rhel-9.3-x86_64-dvd.iso /var/lib/libvirt/images/
```

2. In the Cockpit VM creation form:
   - Set "Installation type" to "Local install media"
   - Browse to `/var/lib/libvirt/images/rhel-9.3-x86_64-dvd.iso`
   - Set OS type, memory, and disk size
   - Click "Create and run"

3. The VM console opens in the browser for the installation

## Managing VM Console

After creating the VM, click on its name to see details. Click "Console" to interact with the VM directly in your browser through a VNC or SPICE viewer.

Console options:
- **Graphics console** - VNC in the browser
- **Serial console** - Text-based console

## Modifying VM Settings

Click on a VM name to see its configuration:

### CPU and Memory

- Click the current values next to "Memory" or "vCPUs"
- Modify the values
- Some changes require the VM to be shut down

### Storage

- Go to the "Disks" tab
- Click "Add disk" to attach additional storage
- Choose to create a new disk or use an existing volume

### Network

- Go to the "Network interfaces" tab
- Click "Add network interface"
- Select the network source (NAT, bridge, direct)

## VM Lifecycle Management

From the VM detail page:

- **Run** - Start a stopped VM
- **Shut down** - Graceful shutdown (sends ACPI signal)
- **Force shut down** - Immediate power off
- **Send NMI** - Send Non-Maskable Interrupt
- **Pause/Resume** - Suspend/resume execution
- **Delete** - Remove the VM (with option to delete storage)

## Snapshots

1. Go to the VM detail page
2. Click the "Snapshots" tab
3. Click "Create snapshot"
4. Enter a name and description
5. Click "Create"

To revert to a snapshot, select it and click "Revert."

## Cockpit Advantages

- No CLI knowledge required
- Accessible from any browser
- Built-in VNC console
- Real-time performance monitoring
- Integrates with other Cockpit modules (storage, networking)

## Limitations

Cockpit covers the most common VM operations but does not expose every libvirt feature. For advanced configurations like:

- PCI passthrough
- CPU pinning
- Custom XML modifications
- Complex network topologies

Use `virsh` or `virt-install` from the command line.

## Summary

The Cockpit web console on RHEL 9 makes VM creation and management accessible through a browser. Install `cockpit-machines` to enable the Virtual Machines section, create VMs from ISO or network sources, and manage the full VM lifecycle through the intuitive web interface. For advanced configurations, complement Cockpit with command-line tools like virsh and virt-install.
