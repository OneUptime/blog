# How to Connect to Virtual Machines Using virt-viewer and VNC on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, KVM, virt-viewer, VNC, Virtual Machines, Virtualization, Linux

Description: Learn how to connect to KVM virtual machine consoles on RHEL using virt-viewer, VNC clients, and serial console for graphical and text-based access.

---

Accessing a virtual machine's display is essential for installation, troubleshooting, and administration. RHEL provides several methods: virt-viewer for SPICE/VNC, direct VNC clients, and serial console for headless VMs.

## Using virt-viewer

virt-viewer is the recommended tool for connecting to VM displays:

```bash
# Install virt-viewer
sudo dnf install -y virt-viewer

# Connect to a running VM by name
virt-viewer rhel9-vm

# Connect to a VM on a remote host
virt-viewer --connect qemu+ssh://root@hypervisor.example.com/system rhel9-vm

# Wait for a VM to start, then connect
virt-viewer --wait rhel9-vm
```

## Checking VM Graphics Configuration

```bash
# View the graphics configuration of a VM
sudo virsh dumpxml rhel9-vm | grep -A5 '<graphics'

# Example output:
# <graphics type='vnc' port='5900' autoport='yes' listen='127.0.0.1'/>

# Find the VNC port assigned to a VM
sudo virsh vncdisplay rhel9-vm
# Output: :0 (which means port 5900)
```

## Connecting with a VNC Client

```bash
# If VNC is configured, connect using any VNC client
# First, check the VNC port
sudo virsh vncdisplay rhel9-vm

# Connect from a remote machine (requires SSH tunnel if listening on localhost)
ssh -L 5900:127.0.0.1:5900 root@hypervisor.example.com

# Then connect your VNC client to localhost:5900
```

## Configuring VNC to Listen on All Interfaces

```bash
# Edit the VM configuration to allow remote VNC connections
sudo virsh edit rhel9-vm

# Change the graphics line to:
# <graphics type='vnc' port='-1' autoport='yes' listen='0.0.0.0'>
#   <listen type='address' address='0.0.0.0'/>
# </graphics>

# Open the firewall for VNC
sudo firewall-cmd --permanent --add-port=5900-5910/tcp
sudo firewall-cmd --reload
```

## Using the Serial Console

For headless VMs without a graphical display:

```bash
# Connect to a VM's serial console
sudo virsh console rhel9-vm

# To exit the serial console, press: Ctrl+]

# The VM must be configured with a serial console device
# Check with:
sudo virsh dumpxml rhel9-vm | grep -A3 '<console'
```

## Adding a Serial Console to an Existing VM

```bash
# If the VM does not have a serial console, shut it down and add one
sudo virsh shutdown rhel9-vm

# Edit the VM XML and add inside <devices>:
# <serial type='pty'>
#   <target port='0'/>
# </serial>
# <console type='pty'>
#   <target type='serial' port='0'/>
# </console>

# The guest OS also needs to enable the serial console:
# systemctl enable serial-getty@ttyS0.service
```

Use virt-viewer for day-to-day console access, VNC for remote connections, and serial console for headless or emergency access. For production VMs, SSH is typically the primary access method once the OS is installed.
