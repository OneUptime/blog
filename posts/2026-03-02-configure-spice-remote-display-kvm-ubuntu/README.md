# How to Configure SPICE Remote Display for KVM on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, KVM, SPICE, Remote Desktop

Description: Learn how to configure SPICE remote display for KVM virtual machines on Ubuntu, enabling clipboard sharing, USB redirection, and dynamic display resolution.

---

SPICE (Simple Protocol for Independent Computing Environments) is a remote display protocol designed specifically for virtual machines. Unlike VNC, which was designed for remote desktop of physical machines, SPICE integrates tightly with QEMU/KVM and provides features like clipboard integration between host and VM, USB device redirection, audio playback, and dynamic display resolution. For virtual machines with desktop environments, SPICE delivers a substantially better experience than VNC.

## Understanding SPICE Components

A SPICE setup involves:
- **SPICE server:** Built into QEMU, runs on the hypervisor host
- **SPICE client:** Connects to the server, typically `virt-viewer` or `remote-viewer` on the client machine
- **SPICE guest agent:** Runs inside the VM to enable enhanced features (clipboard sync, resolution changes)
- **QXL driver:** Virtual display adapter optimized for SPICE

## Installing Required Packages

On the KVM host:

```bash
sudo apt update
sudo apt install \
  qemu-kvm \
  libvirt-daemon-system \
  spice-server-dev \
  spice-vdagent

# Verify SPICE support in QEMU
qemu-system-x86_64 --display help | grep spice
```

On the client machine (where you connect from):

```bash
sudo apt install virt-viewer remote-viewer spice-client-gtk

# Or on Fedora/RHEL:
# sudo dnf install virt-viewer remote-viewer
```

## Configuring SPICE in a New VM

When creating a VM, specify SPICE display:

```bash
sudo virt-install \
  --name desktop-vm \
  --memory 4096 \
  --vcpus 4 \
  --disk size=50,format=qcow2 \
  --os-variant ubuntu22.04 \
  --graphics spice,listen=127.0.0.1,port=5910,password=your-password \
  --video qxl \
  --channel spicevmc \
  --import
```

## Configuring SPICE on an Existing VM

Edit the VM's XML configuration:

```bash
virsh edit myvm
```

Find and replace the `<graphics>` section (and `<video>` section):

```xml
<!-- SPICE display configuration -->
<graphics type='spice'>
  <!-- Listen on localhost only (use SSH tunnel for remote access) -->
  <listen type='address' address='127.0.0.1'/>

  <!-- Use TLS for direct network connections -->
  <!-- <listen type='address' address='0.0.0.0'/> -->

  <!-- Set a password for connection authentication -->
  <image compression='auto_glz'/>
  <streaming mode='filter'/>
  <clipboard copypaste='yes'/>
  <mouse mode='client'/>
  <filetransfer enable='yes'/>
</graphics>

<!-- QXL video adapter for best SPICE performance -->
<video>
  <model type='qxl'
         ram='65536'      <!-- Frame buffer RAM in KB -->
         vram='65536'     <!-- Video RAM in KB -->
         vgamem='16384'   <!-- VGA memory in KB -->
         heads='1'        <!-- Number of monitors -->
         primary='yes'/>
</video>

<!-- SPICE guest agent channel for clipboard and resolution sync -->
<channel type='spicevmc'>
  <target type='virtio' name='com.redhat.spice.0'/>
</channel>

<!-- USB redirection channels (add more for more USB devices) -->
<redirdev bus='usb' type='spicevmc'/>
<redirdev bus='usb' type='spicevmc'/>
```

After saving, restart the VM:

```bash
virsh destroy myvm
virsh start myvm
```

## Setting a SPICE Password

```bash
# Set password at runtime
virsh qemu-monitor-command myvm --hmp "set_password spice your-password"

# Set password expiration (seconds)
virsh qemu-monitor-command myvm --hmp "expire_password spice 3600"

# Check current SPICE info
virsh qemu-monitor-command myvm --hmp "info spice"
```

## Connecting via SSH Tunnel (Recommended)

For remote access, tunnel SPICE over SSH rather than exposing it directly:

```bash
# On your local machine - create SSH tunnel
ssh -N -L 5910:127.0.0.1:5910 user@kvm-host

# Keep the tunnel open in background
ssh -fN -L 5910:127.0.0.1:5910 user@kvm-host

# Find the SPICE port from virsh
ssh user@kvm-host "virsh domdisplay myvm"
# Output: spice://127.0.0.1:5910

# Connect using remote-viewer
remote-viewer spice://127.0.0.1:5910

# Or using virt-viewer (connects to libvirt directly)
virt-viewer --connect qemu+ssh://user@kvm-host/system myvm
```

## Direct Network Connection with TLS

For connecting without SSH tunnel, configure TLS:

```bash
# Generate TLS certificates
mkdir -p /etc/pki/libvirt-spice

# Create CA key and certificate
openssl genrsa -out /etc/pki/libvirt-spice/ca-key.pem 4096
openssl req -new -x509 \
  -key /etc/pki/libvirt-spice/ca-key.pem \
  -out /etc/pki/libvirt-spice/ca-cert.pem \
  -days 3650 \
  -subj "/CN=SpiceCA"

# Create server key and certificate
openssl genrsa -out /etc/pki/libvirt-spice/server-key.pem 4096
openssl req -new \
  -key /etc/pki/libvirt-spice/server-key.pem \
  -out /tmp/server.csr \
  -subj "/CN=kvm-host.example.com"
openssl x509 -req \
  -in /tmp/server.csr \
  -CA /etc/pki/libvirt-spice/ca-cert.pem \
  -CAkey /etc/pki/libvirt-spice/ca-key.pem \
  -CAcreateserial \
  -out /etc/pki/libvirt-spice/server-cert.pem \
  -days 3650
```

Configure VM XML for TLS:

```xml
<graphics type='spice'>
  <listen type='address' address='0.0.0.0'/>
  <channel name='main' mode='secure'/>
  <channel name='display' mode='secure'/>
  <channel name='inputs' mode='secure'/>
  <channel name='cursor' mode='secure'/>
  <channel name='playback' mode='secure'/>
  <channel name='record' mode='secure'/>
  <channel name='smartcard' mode='secure'/>
  <channel name='usbredir' mode='secure'/>
</graphics>
```

## Installing the SPICE Guest Agent

Inside the Ubuntu VM, install the guest agent for full functionality:

```bash
# Inside the VM
sudo apt update
sudo apt install \
  spice-vdagent \
  spice-vdagentd \
  xserver-xorg-video-qxl

# Enable and start the agent
sudo systemctl enable --now spice-vdagentd

# For GNOME desktops, the agent may already be running
ps aux | grep vdagent
```

The SPICE guest agent enables:
- Clipboard copy/paste between host and VM
- Dynamic desktop resolution (resizes when you resize the window)
- File transfer between host and VM
- Audio support

## Configuring Multi-Monitor Support

For multiple monitors, update the QXL video section:

```xml
<video>
  <model type='qxl'
         ram='131072'
         vram='131072'
         vgamem='16384'
         heads='2'          <!-- Number of heads/monitors -->
         primary='yes'/>
</video>

<!-- Add second graphics head -->
<graphics type='spice'>
  <!-- ... configuration ... -->
</graphics>
```

Inside the VM, configure the second monitor through display settings.

## Audio Configuration

SPICE supports audio passthrough with ICH9 audio:

```xml
<!-- Add audio device to VM -->
<sound model='ich9'>
  <codec type='micro'/>
  <codec type='duplex'/>
</sound>

<!-- ICH9 requires additional configuration -->
<devices>
  ...
  <sound model='ich9'/>
  ...
</devices>
```

```bash
# Enable audio in virt-viewer connection
remote-viewer --spice-audio spice://127.0.0.1:5910
```

## USB Redirection

SPICE USB redirection lets you attach USB devices from your client machine to the VM:

```xml
<!-- Add USB controller (required for USB redirection) -->
<controller type='usb' model='ich9-ehci1'/>

<!-- Add redirection channels (one per USB device you want to redirect) -->
<redirdev bus='usb' type='spicevmc'/>
<redirdev bus='usb' type='spicevmc'/>
<redirdev bus='usb' type='spicevmc'/>
<redirdev bus='usb' type='spicevmc'/>
```

In the `remote-viewer` or `virt-viewer` window, go to File > USB Device Selection to choose which USB devices to redirect to the VM.

## Getting SPICE Connection Information

```bash
# Get SPICE connection URL for a running VM
virsh domdisplay myvm
# Output: spice://127.0.0.1:5910

# Get all display info including ports and TLS
virsh domdisplay myvm --all

# Check SPICE status via QEMU monitor
virsh qemu-monitor-command myvm --hmp "info spice"
```

## Troubleshooting SPICE

**"Connection refused" when connecting:**

```bash
# Check if SPICE is running on the expected port
ss -tlnp | grep 5910

# Verify VM is running with SPICE configured
virsh domdisplay myvm

# Check QEMU process arguments
ps aux | grep qemu | grep spice
```

**Clipboard not working:**

```bash
# Inside VM - check vdagent is running
systemctl status spice-vdagentd

# Restart the agent
sudo systemctl restart spice-vdagentd

# Check if the virtio channel exists
ls /dev/virtio-ports/
# Should contain: com.redhat.spice.0
```

**Display resolution not changing dynamically:**

```bash
# Inside VM - install spice-vdagent if missing
sudo apt install spice-vdagent

# Check X display driver
sudo cat /var/log/Xorg.0.log | grep -i "qxl\|spice"
```

SPICE provides a substantially better VM display experience than VNC, especially when you need to interact with a GUI-based VM regularly. The combination of clipboard sharing, USB redirection, and dynamic resolution makes working in a VM feel close to working on a local machine.
