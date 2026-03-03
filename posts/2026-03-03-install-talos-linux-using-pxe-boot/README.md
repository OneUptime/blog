# How to Install Talos Linux Using PXE Boot

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, PXE Boot, Network Boot, Kubernetes, Bare Metal

Description: Learn how to deploy Talos Linux across multiple machines using PXE boot for scalable bare metal Kubernetes clusters.

---

PXE (Preboot eXecution Environment) booting lets you deploy Talos Linux to machines without physically touching them. Instead of flashing USB drives and walking them to each server, you configure a network boot server that delivers the Talos Linux image to any machine that requests it. This approach is essential when you are managing more than a handful of bare metal nodes.

This guide shows you how to set up PXE boot infrastructure and use it to deploy Talos Linux across your bare metal fleet.

## How PXE Boot Works

The PXE boot process follows these steps:

1. The target machine powers on and its network interface card (NIC) requests an IP address via DHCP
2. The DHCP server responds with an IP address and the location of a boot file
3. The machine downloads the boot file using TFTP
4. The boot file loads the Talos Linux kernel and initramfs
5. Talos Linux starts and waits for configuration

This entire process happens over the network, which means you do not need any local storage media to get Talos running on a machine.

## Prerequisites

You need the following infrastructure:

- A DHCP server you can configure (ISC DHCP, dnsmasq, or similar)
- A TFTP server for serving boot files
- An HTTP server for serving the Talos Linux kernel and initramfs
- One or more bare metal machines with PXE-capable NICs
- `talosctl` on your workstation

```bash
# Install talosctl
curl -sL https://talos.dev/install | sh
```

## Step 1: Download Talos Linux PXE Assets

Talos Linux provides the kernel and initramfs files needed for PXE booting:

```bash
# Create a directory for PXE files
mkdir -p /srv/tftp/talos
mkdir -p /srv/http/talos

# Download the kernel
wget -O /srv/http/talos/vmlinuz \
  https://github.com/siderolabs/talos/releases/download/v1.9.0/vmlinuz-amd64

# Download the initramfs
wget -O /srv/http/talos/initramfs.xz \
  https://github.com/siderolabs/talos/releases/download/v1.9.0/initramfs-amd64.xz
```

## Step 2: Set Up the TFTP Server

Install and configure a TFTP server. We will use `tftpd-hpa` on a Linux server:

```bash
# Install the TFTP server
sudo apt-get install tftpd-hpa

# Configure it
sudo tee /etc/default/tftpd-hpa << 'CONF'
TFTP_USERNAME="tftp"
TFTP_DIRECTORY="/srv/tftp"
TFTP_ADDRESS=":69"
TFTP_OPTIONS="--secure"
CONF

# Restart the service
sudo systemctl restart tftpd-hpa
```

For UEFI PXE boot, you need a PXE bootloader. Download the UEFI PXE boot file from the Talos release:

```bash
# Download the UEFI PXE boot file
wget -O /srv/tftp/talos/snp.efi \
  https://github.com/siderolabs/talos/releases/download/v1.9.0/metal-amd64-pxe.efi
```

For legacy BIOS PXE boot, you will use `pxelinux` or `lpxelinux`:

```bash
# Install syslinux for BIOS PXE support
sudo apt-get install syslinux pxelinux

# Copy the necessary boot files
cp /usr/lib/PXELINUX/pxelinux.0 /srv/tftp/
cp /usr/lib/syslinux/modules/bios/ldlinux.c32 /srv/tftp/

# Create the pxelinux configuration directory
mkdir -p /srv/tftp/pxelinux.cfg
```

## Step 3: Create the PXE Boot Configuration

Create a PXE configuration that tells the bootloader where to find the Talos kernel:

```bash
# For BIOS PXE boot - create the default config
cat > /srv/tftp/pxelinux.cfg/default << 'PXECONFIG'
DEFAULT talos
LABEL talos
  KERNEL http://192.168.1.10/talos/vmlinuz
  INITRD http://192.168.1.10/talos/initramfs.xz
  APPEND talos.platform=metal console=ttyS0 console=tty0
PXECONFIG
```

Replace `192.168.1.10` with the IP address of your HTTP server.

## Step 4: Set Up the HTTP Server

The kernel and initramfs are typically served over HTTP since TFTP is slow for large files:

```bash
# Install nginx
sudo apt-get install nginx

# Create a server block for Talos files
sudo tee /etc/nginx/sites-available/talos << 'NGINX'
server {
    listen 80;
    server_name _;

    location /talos/ {
        alias /srv/http/talos/;
        autoindex on;
    }
}
NGINX

# Enable the site and restart nginx
sudo ln -s /etc/nginx/sites-available/talos /etc/nginx/sites-enabled/
sudo systemctl restart nginx
```

## Step 5: Configure DHCP for PXE

Your DHCP server needs to tell machines where to find the PXE bootloader. Here is an example using ISC DHCP:

```bash
# Edit /etc/dhcp/dhcpd.conf
subnet 192.168.1.0 netmask 255.255.255.0 {
    range 192.168.1.100 192.168.1.200;
    option routers 192.168.1.1;
    option domain-name-servers 192.168.1.1;

    # PXE boot options
    next-server 192.168.1.10;  # TFTP server IP

    # For BIOS clients
    if option arch = 00:00 {
        filename "pxelinux.0";
    }

    # For UEFI clients
    if option arch = 00:07 or option arch = 00:09 {
        filename "talos/snp.efi";
    }
}
```

If you use dnsmasq, the configuration is simpler:

```bash
# dnsmasq PXE configuration
dhcp-range=192.168.1.100,192.168.1.200,12h
dhcp-boot=pxelinux.0,pxeserver,192.168.1.10

# For UEFI clients
dhcp-match=set:efi-x86_64,option:client-arch,7
dhcp-match=set:efi-x86_64,option:client-arch,9
dhcp-boot=tag:efi-x86_64,talos/snp.efi
```

## Step 6: Boot Your Machines

Power on your bare metal machines and make sure they are set to PXE boot. Most servers have this enabled by default. For desktop hardware, you may need to enable it in the BIOS.

Each machine will:

1. Get an IP address from DHCP
2. Download the PXE bootloader from TFTP
3. Load the Talos Linux kernel and initramfs from HTTP
4. Boot into Talos Linux maintenance mode

Watch the console output on each machine to confirm successful boot and note the assigned IP addresses.

## Step 7: Apply Talos Configuration

Once the machines are booted, apply the Talos configuration to each one:

```bash
# Generate cluster configuration
talosctl gen config pxe-cluster https://<CONTROL_PLANE_IP>:6443

# Apply control plane config to designated nodes
talosctl apply-config --insecure \
  --nodes <NODE1_IP> \
  --file controlplane.yaml

# Apply worker config to remaining nodes
talosctl apply-config --insecure \
  --nodes <NODE2_IP> \
  --file worker.yaml
```

When you apply the configuration, Talos will install itself to the local disk and reboot. After the reboot, the machines will run from local storage.

## Step 8: Bootstrap the Cluster

```bash
# Configure talosctl
talosctl config endpoint <CONTROL_PLANE_IP>
talosctl config node <CONTROL_PLANE_IP>

# Bootstrap
talosctl bootstrap

# Check health
talosctl health

# Get kubeconfig
talosctl kubeconfig ./kubeconfig
kubectl --kubeconfig=./kubeconfig get nodes
```

## Automating Large-Scale Deployments

For large fleets, you can automate the configuration step by serving machine configs over HTTP and telling Talos where to find them:

```bash
# Add a kernel parameter pointing to the machine config
# In your PXE configuration:
APPEND talos.platform=metal talos.config=http://192.168.1.10/talos/configs/controlplane.yaml
```

You can serve different configurations to different machines based on their MAC addresses or IP ranges by setting up multiple PXE config files:

```bash
# Per-MAC-address PXE configuration
# File: /srv/tftp/pxelinux.cfg/01-aa-bb-cc-dd-ee-ff
DEFAULT talos
LABEL talos
  KERNEL http://192.168.1.10/talos/vmlinuz
  INITRD http://192.168.1.10/talos/initramfs.xz
  APPEND talos.platform=metal talos.config=http://192.168.1.10/talos/configs/cp-01.yaml
```

## Troubleshooting

If machines are not PXE booting, check that the DHCP server is responding with the correct `next-server` and `filename` options. Use `tcpdump` to capture DHCP traffic:

```bash
# Monitor DHCP traffic
sudo tcpdump -i eth0 port 67 or port 68 -vvv
```

If the bootloader loads but fails to fetch the kernel, verify that your HTTP server is accessible from the machine's network and that the file paths are correct.

For UEFI machines that fail to boot, make sure you are using the correct EFI bootloader file and that Secure Boot is disabled (unless you have configured Talos Linux keys).

## Conclusion

PXE booting Talos Linux removes the manual work of provisioning bare metal Kubernetes nodes. Once your PXE infrastructure is in place, deploying new nodes is as simple as powering on a machine and applying a configuration file. This approach scales well from a handful of NUCs in a home lab to hundreds of servers in a data center, and the consistent, automated deployment process means every node starts from the same known-good state.
