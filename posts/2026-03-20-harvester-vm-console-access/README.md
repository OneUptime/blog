# How to Access VM Console in Harvester - Access

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Harvester, Kubernetes, Virtualization, HCI, Console, VNC, virtctl

Description: Learn how to access virtual machine consoles in Harvester using the web-based VNC console, virtctl, and serial console methods.

## Introduction

Console access to VMs in Harvester is essential for troubleshooting boot issues, fixing network misconfigurations, and accessing VMs when SSH is unavailable. Harvester provides VNC and serial console access in the UI, while KubeVirt's `virtctl` adds command-line serial and VNC access. This guide covers the main access methods and the guest configuration that makes serial console recovery reliable.

## Method 1: Web VNC Console via UI

The simplest way to access a VM console is through the Harvester web interface:

1. Navigate to **Virtual Machines**
2. Click on the VM name to open its details
3. Click the **Console** button (VNC icon) in the top right
4. A VNC console window opens directly in your browser

**Features:**
- Full graphical display support
- Copy/paste integration (limited by browser security)
- Resolution auto-adjustment
- Works without installing any additional tools

**Limitations:**
- Performance depends on browser and network latency
- May require desktop environments for graphical VMs

## Method 2: virtctl Console Access

The `virtctl` tool provides console access from the command line:

### Install virtctl

```bash
# Get the KubeVirt version running in your cluster

KUBEVIRT_VERSION=$(kubectl get kubevirt -n harvester-system \
    -o jsonpath='{.items[0].status.observedKubeVirtVersion}')

echo "KubeVirt version: ${KUBEVIRT_VERSION}"

# Download virtctl for Linux
curl -L -o /usr/local/bin/virtctl \
    "https://github.com/kubevirt/kubevirt/releases/download/${KUBEVIRT_VERSION}/virtctl-${KUBEVIRT_VERSION}-linux-amd64"
chmod +x /usr/local/bin/virtctl

# Or for macOS
curl -L -o /usr/local/bin/virtctl \
    "https://github.com/kubevirt/kubevirt/releases/download/${KUBEVIRT_VERSION}/virtctl-${KUBEVIRT_VERSION}-darwin-amd64"
chmod +x /usr/local/bin/virtctl

# Verify installation
virtctl version --client
```

### Access the Serial Console

```bash
# Connect to a VM's serial console
# This is useful for text-based/server VMs
virtctl console ubuntu-web-01 -n default

# Press Ctrl+] to exit the console

# Access console with a specific kubeconfig
virtctl console ubuntu-web-01 -n default \
    --kubeconfig /path/to/kubeconfig
```

### Access the VNC Console via virtctl

```bash
# Open the graphical console with remote-viewer
virtctl vnc ubuntu-web-01 -n default

# Start only the local VNC proxy and print the local port
virtctl vnc ubuntu-web-01 -n default --proxy-only

# Bind the local VNC proxy to a specific port for your VNC client
virtctl vnc ubuntu-web-01 -n default --proxy-only --port 5900
```

## Method 3: Serial Console Configuration for Linux VMs

For reliable console access, configure the VM to output to the serial console:

### Cloud-Init Configuration (Debian/Ubuntu-style guests)

```yaml
#cloud-config
# Enable serial console for emergency access
# This allows virtctl console to work even if the network is down

bootcmd:
  # Enable serial console in GRUB
  - sed -i 's/GRUB_CMDLINE_LINUX=""/GRUB_CMDLINE_LINUX="console=ttyS0,115200n8 console=tty0"/' /etc/default/grub
  - update-grub

# Configure getty on serial port
runcmd:
  - systemctl enable --now serial-getty@ttyS0.service
```

### VM Spec with Serial Console Enabled

```yaml
# vm-with-serial-console.yaml
apiVersion: kubevirt.io/v1
kind: VirtualMachine
metadata:
  name: ubuntu-console-vm
  namespace: default
spec:
  running: true
  template:
    spec:
      domain:
        cpu:
          cores: 2
        resources:
          requests:
            memory: 4Gi
        machine:
          type: q35
        devices:
          # KubeVirt auto-attaches a serial console by default; set it
          # explicitly if you want the requirement captured in the manifest.
          autoattachSerialConsole: true
          disks:
            - name: rootdisk
              bootOrder: 1
              disk:
                bus: virtio
            - name: cloudinit
              disk:
                bus: virtio
          interfaces:
            - name: default
              masquerade: {}
      networks:
        - name: default
          pod: {}
      volumes:
        - name: rootdisk
          persistentVolumeClaim:
            claimName: ubuntu-console-vm-root
        - name: cloudinit
          cloudInitNoCloud:
            userData: |
              #cloud-config
              # Configure serial console
              runcmd:
                - systemctl enable --now serial-getty@ttyS0.service
```

## Method 4: Remote Console Access via virtctl VNC Proxy

Access the graphical console from your own VNC client using `virtctl`'s built-in proxy:

```bash
# Start a local VNC proxy on port 5900
virtctl vnc ubuntu-web-01 -n default --proxy-only --port 5900

# Connect using your VNC client
# On Linux: vncviewer localhost:5900
# On macOS: open vnc://localhost:5900
# Or use any VNC client pointed at localhost:5900
```

## Emergency Console Access (Troubleshooting)

### When the VM Won't Boot

```bash
# Connect to console immediately after starting the VM to catch boot errors
virtctl start problem-vm -n default

# Immediately attach to console
virtctl console problem-vm -n default

# If the guest is configured for serial console output, you'll see
# the GRUB menu and boot process
# Press 'e' in GRUB to edit boot parameters
# Add: systemd.unit=rescue.target or init=/bin/bash for recovery mode
```

### Reset a Forgotten Root Password

```bash
# Connect to console when VM boots
virtctl console ubuntu-vm -n default

# In GRUB, press 'e' to edit the boot entry
# Find the 'linux' line and add at the end:
# init=/bin/bash

# After booting:
# Mount the filesystem as read-write
mount -o remount,rw /

# Reset the password
passwd ubuntu

# Restart cleanly
exec /sbin/init
```

## Guest Agent Information and SSH Access via virtctl

For VMs with the qemu-guest-agent installed, you can query guest OS information. If SSH is configured on the guest, `virtctl ssh` can also run commands over SSH:

```bash
# Check if guest agent is running
virtctl guestosinfo ubuntu-web-01 -n default

# Execute a command over SSH
virtctl ssh ubuntu@vm/ubuntu-web-01/default --command "uptime"

# Get VM filesystem info
virtctl fslist ubuntu-web-01 -n default

# Get VM user list
virtctl userlist ubuntu-web-01 -n default
```

## Best Practices

```bash
# 1. Always configure serial console in your VM images
# Add to cloud-init base template:
runcmd:
  - systemctl enable --now serial-getty@ttyS0.service

# 2. Keep GRUB timeout accessible (don't set to 0)
# Allow enough time to interrupt boot for recovery

# 3. Document the console access password
# In production, store in a password manager or vault

# 4. Test console access after VM creation
# Before relying on a VM for production use, verify console works:
virtctl console new-vm -n default
```

## Conclusion

Console access in Harvester covers the full spectrum from convenient web-based GUI access to low-level serial console for emergency recovery. The web VNC console is ideal for day-to-day interactive use, while `virtctl console` is invaluable for headless access and troubleshooting. Configuring serial console output in your VM images ensures you always have a recovery path even when the network or OS is broken. Make console access configuration a standard part of your VM image build process.
