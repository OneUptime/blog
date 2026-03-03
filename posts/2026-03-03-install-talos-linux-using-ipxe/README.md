# How to Install Talos Linux Using iPXE

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, iPXE, Network Boot, Kubernetes, Bare Metal

Description: A detailed guide to deploying Talos Linux on bare metal servers using iPXE for flexible network-based provisioning.

---

iPXE is a modern replacement for the traditional PXE boot firmware. It supports HTTP, HTTPS, iSCSI, and scripting, which makes it far more flexible than legacy PXE. When deploying Talos Linux across bare metal infrastructure, iPXE gives you the control you need to handle diverse hardware configurations and complex network topologies.

This guide walks through setting up iPXE to boot Talos Linux on your bare metal machines.

## iPXE vs Traditional PXE

Traditional PXE relies on TFTP, which is slow and does not support encryption. iPXE improves on this in several ways:

- Downloads boot files over HTTP or HTTPS, which is faster and supports load balancing
- Includes a scripting language for conditional boot logic
- Supports booting from SAN (iSCSI, FCoE)
- Can be embedded in firmware or chainloaded from PXE
- Works with both BIOS and UEFI systems

For Talos Linux deployments, iPXE simplifies the process because you can host all boot assets on a standard web server and use scripts to customize the boot process per machine.

## Prerequisites

You will need:

- A DHCP server
- An HTTP server to host iPXE scripts and Talos Linux assets
- Bare metal machines with PXE-capable NICs
- `talosctl` installed on your workstation
- Optionally, a pre-built iPXE binary (for chainloading)

```bash
# Install talosctl
curl -sL https://talos.dev/install | sh
```

## Step 1: Download Talos Boot Assets

Get the kernel and initramfs from the Talos Linux release:

```bash
# Create a directory for boot assets
mkdir -p /srv/www/talos/v1.9.0

# Download the kernel
wget -O /srv/www/talos/v1.9.0/vmlinuz \
  https://github.com/siderolabs/talos/releases/download/v1.9.0/vmlinuz-amd64

# Download the initramfs
wget -O /srv/www/talos/v1.9.0/initramfs.xz \
  https://github.com/siderolabs/talos/releases/download/v1.9.0/initramfs-amd64.xz
```

## Step 2: Create the iPXE Script

iPXE uses scripts to define the boot process. Create a script that boots Talos Linux:

```bash
# Create the iPXE boot script
cat > /srv/www/talos/boot.ipxe << 'IPXE'
#!ipxe

# Set the base URL for Talos assets
set base-url http://192.168.1.10/talos/v1.9.0

# Display a message during boot
echo Booting Talos Linux v1.9.0...

# Load the kernel with boot parameters
kernel ${base-url}/vmlinuz talos.platform=metal console=ttyS0 console=tty0
initrd ${base-url}/initramfs.xz

# Boot
boot
IPXE
```

Replace `192.168.1.10` with the IP of your HTTP server. This simple script loads the Talos kernel and initramfs, then boots into Talos Linux.

## Step 3: Create Machine-Specific Scripts

For more control, you can create per-machine scripts that apply different configurations:

```bash
# Script for control plane nodes
cat > /srv/www/talos/boot-cp.ipxe << 'IPXE'
#!ipxe

set base-url http://192.168.1.10/talos/v1.9.0

echo Booting Talos Linux - Control Plane Node

kernel ${base-url}/vmlinuz \
  talos.platform=metal \
  talos.config=http://192.168.1.10/talos/configs/controlplane.yaml \
  console=ttyS0 console=tty0
initrd ${base-url}/initramfs.xz
boot
IPXE

# Script for worker nodes
cat > /srv/www/talos/boot-worker.ipxe << 'IPXE'
#!ipxe

set base-url http://192.168.1.10/talos/v1.9.0

echo Booting Talos Linux - Worker Node

kernel ${base-url}/vmlinuz \
  talos.platform=metal \
  talos.config=http://192.168.1.10/talos/configs/worker.yaml \
  console=ttyS0 console=tty0
initrd ${base-url}/initramfs.xz
boot
IPXE
```

The `talos.config` kernel parameter tells Talos where to fetch its machine configuration automatically, so you do not have to apply it manually after boot.

## Step 4: Set Up the HTTP Server

Configure nginx to serve your iPXE scripts and boot assets:

```bash
# Install nginx if not already present
sudo apt-get install nginx

# Configure the server
sudo tee /etc/nginx/sites-available/ipxe << 'NGINX'
server {
    listen 80;
    server_name _;

    root /srv/www;
    autoindex on;

    # Ensure correct MIME types for iPXE
    location ~ \.ipxe$ {
        default_type text/plain;
    }
}
NGINX

sudo ln -s /etc/nginx/sites-available/ipxe /etc/nginx/sites-enabled/
sudo systemctl restart nginx
```

## Step 5: Configure DHCP for iPXE

The DHCP configuration depends on whether your machines have iPXE built into their firmware or if you need to chainload it from PXE.

For machines that need chainloading (most common):

```bash
# ISC DHCP configuration with iPXE chainloading
subnet 192.168.1.0 netmask 255.255.255.0 {
    range 192.168.1.100 192.168.1.200;
    option routers 192.168.1.1;

    # Check if the client is already running iPXE
    if exists user-class and option user-class = "iPXE" {
        # Already iPXE - serve the boot script
        filename "http://192.168.1.10/talos/boot.ipxe";
    } else {
        # Not iPXE yet - chainload iPXE
        next-server 192.168.1.10;
        if option arch = 00:07 or option arch = 00:09 {
            filename "ipxe.efi";  # UEFI
        } else {
            filename "undionly.kpxe";  # BIOS
        }
    }
}
```

For dnsmasq:

```bash
# dnsmasq configuration
dhcp-range=192.168.1.100,192.168.1.200,12h
dhcp-userclass=set:ipxe,iPXE
dhcp-boot=tag:!ipxe,undionly.kpxe,pxeserver,192.168.1.10
dhcp-boot=tag:ipxe,http://192.168.1.10/talos/boot.ipxe
```

## Step 6: Prepare iPXE Chainload Binaries

If your machines do not have iPXE in firmware, download the chainload binaries:

```bash
# Download pre-built iPXE binaries
wget -O /srv/tftp/undionly.kpxe https://boot.ipxe.org/undionly.kpxe
wget -O /srv/tftp/ipxe.efi https://boot.ipxe.org/ipxe.efi
```

Alternatively, build iPXE from source with custom settings:

```bash
# Clone and build iPXE with custom embedded script
git clone https://github.com/ipxe/ipxe.git
cd ipxe/src

# Create an embedded script
cat > embed.ipxe << 'EMBED'
#!ipxe
dhcp
chain http://192.168.1.10/talos/boot.ipxe
EMBED

# Build for BIOS
make bin/undionly.kpxe EMBED=embed.ipxe

# Build for UEFI
make bin-x86_64-efi/ipxe.efi EMBED=embed.ipxe
```

## Step 7: Boot and Configure Machines

Power on your machines. The boot sequence will be:

1. Machine starts PXE boot
2. DHCP assigns IP and points to iPXE chainload binary
3. iPXE loads and requests DHCP again
4. DHCP recognizes iPXE and sends the boot script URL
5. iPXE fetches and executes the boot script
6. Talos Linux kernel and initramfs are loaded
7. Talos Linux boots

If your iPXE scripts include the `talos.config` parameter, the machines will automatically apply their configuration. Otherwise, apply configs manually:

```bash
# Generate cluster config
talosctl gen config ipxe-cluster https://<CONTROL_PLANE_IP>:6443

# Apply to each node
talosctl apply-config --insecure \
  --nodes <NODE_IP> \
  --file controlplane.yaml
```

## Advanced iPXE Scripting

iPXE supports conditional logic, which lets you create sophisticated boot workflows:

```bash
# Advanced boot script with menu and error handling
cat > /srv/www/talos/boot-menu.ipxe << 'IPXE'
#!ipxe

set base-url http://192.168.1.10/talos/v1.9.0

# Retry on failure
:retry
echo Attempting to boot Talos Linux...

kernel ${base-url}/vmlinuz talos.platform=metal || goto failed
initrd ${base-url}/initramfs.xz || goto failed
boot || goto failed

:failed
echo Boot failed. Retrying in 10 seconds...
sleep 10
goto retry
IPXE
```

You can also route machines to different scripts based on their MAC address:

```bash
# Router script that directs machines to role-specific scripts
cat > /srv/www/talos/boot.ipxe << 'IPXE'
#!ipxe

# Route based on MAC address
iseq ${mac} aa:bb:cc:dd:ee:01 && chain boot-cp.ipxe ||
iseq ${mac} aa:bb:cc:dd:ee:02 && chain boot-cp.ipxe ||
iseq ${mac} aa:bb:cc:dd:ee:03 && chain boot-cp.ipxe ||
chain boot-worker.ipxe
IPXE
```

## Bootstrap and Verify

After all machines are booted and configured:

```bash
# Bootstrap the first control plane node
talosctl config endpoint <CP_IP>
talosctl config node <CP_IP>
talosctl bootstrap

# Wait for the cluster to be healthy
talosctl health

# Get kubeconfig
talosctl kubeconfig ./kubeconfig
kubectl --kubeconfig=./kubeconfig get nodes
```

## Troubleshooting

If chainloading fails, capture network traffic to verify DHCP responses:

```bash
sudo tcpdump -i eth0 -vvv port 67 or port 68 or port 69 or port 80
```

If iPXE loads but cannot fetch the boot script, verify HTTP connectivity from the machine's network to your web server. Check firewall rules that might block HTTP traffic.

For UEFI Secure Boot issues, either disable Secure Boot in the BIOS or sign the iPXE binary with your own keys.

## Conclusion

iPXE provides a powerful and flexible way to deploy Talos Linux across bare metal infrastructure. The ability to use HTTP for file transfers, script the boot process, and customize per-machine behavior makes it ideal for environments where you need to manage many servers efficiently. Once the iPXE infrastructure is in place, provisioning a new Talos Linux node is as simple as plugging in a machine and powering it on.
