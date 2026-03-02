# How to Configure TFTP Server for Network Boot on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, PXE, TFTP, Server

Description: Set up a TFTP server on Ubuntu to serve boot files for PXE network booting, including tftpd-hpa installation, firewall rules, and boot file placement.

---

TFTP (Trivial File Transfer Protocol) is a simple, lightweight protocol used almost exclusively for network booting. When a machine performs a PXE (Preboot Execution Environment) boot, it first gets an IP address from DHCP, then downloads its bootloader from a TFTP server. Setting up a TFTP server on Ubuntu is straightforward, but the devil is in the details - file permissions, firewall rules, and correct file placement all matter.

## Installing tftpd-hpa

Ubuntu's recommended TFTP server is `tftpd-hpa`, a robust implementation that handles concurrent connections reliably.

```bash
# Update package list and install tftpd-hpa
sudo apt update
sudo apt install tftpd-hpa

# Verify the service is running
sudo systemctl status tftpd-hpa
```

## Configuring tftpd-hpa

The configuration file is at `/etc/default/tftpd-hpa`.

```bash
# View the default configuration
sudo cat /etc/default/tftpd-hpa
```

```bash
# Edit the configuration file
sudo nano /etc/default/tftpd-hpa
```

A typical configuration looks like this:

```bash
# /etc/default/tftpd-hpa

# TFTP server options
TFTP_USERNAME="tftp"
TFTP_DIRECTORY="/var/lib/tftpboot"
TFTP_ADDRESS="0.0.0.0:69"
TFTP_OPTIONS="--secure --create"
```

Key options explained:
- `--secure` - chroots to TFTP_DIRECTORY, improving security
- `--create` - allows file creation (needed for some PXE workflows)
- `TFTP_ADDRESS` - bind to all interfaces on port 69; change to a specific IP if needed

After editing the configuration, restart the service.

```bash
sudo systemctl restart tftpd-hpa
sudo systemctl enable tftpd-hpa
```

## Setting Up the TFTP Root Directory

```bash
# Create the TFTP root directory if it does not exist
sudo mkdir -p /var/lib/tftpboot

# Set correct ownership and permissions
sudo chown -R tftp:tftp /var/lib/tftpboot
sudo chmod -R 755 /var/lib/tftpboot
```

The `tftp` user is created automatically when you install `tftpd-hpa`. Files in this directory must be readable by that user.

## Firewall Configuration

TFTP uses UDP port 69. Open it in UFW.

```bash
# Allow TFTP through UFW
sudo ufw allow 69/udp

# If using iptables directly
sudo iptables -A INPUT -p udp --dport 69 -j ACCEPT
sudo iptables -A INPUT -p udp --sport 69 -j ACCEPT

# Save iptables rules
sudo netfilter-persistent save
```

Note that TFTP uses random high UDP ports for data transfer in some modes. If you have strict firewall rules, you may also need to allow the connection tracking to handle TFTP properly. Most modern kernels include a TFTP connection tracking helper.

```bash
# Load the TFTP connection tracking module
sudo modprobe nf_conntrack_tftp

# Make it persistent
echo 'nf_conntrack_tftp' | sudo tee /etc/modules-load.d/tftp.conf
```

## Installing PXE Boot Files

For BIOS-based PXE booting, install PXELINUX from the syslinux package.

```bash
# Install syslinux and syslinux-efi
sudo apt install syslinux pxelinux syslinux-efi

# Copy the required PXE bootloader files to the TFTP root
sudo cp /usr/lib/PXELINUX/pxelinux.0 /var/lib/tftpboot/
sudo cp /usr/lib/syslinux/modules/bios/ldlinux.c32 /var/lib/tftpboot/
sudo cp /usr/lib/syslinux/modules/bios/libutil.c32 /var/lib/tftpboot/
sudo cp /usr/lib/syslinux/modules/bios/menu.c32 /var/lib/tftpboot/

# For UEFI systems, use the EFI version
sudo cp /usr/lib/syslinux/efi64/syslinux.efi /var/lib/tftpboot/bootx64.efi
sudo cp /usr/lib/syslinux/modules/efi64/ldlinux.e64 /var/lib/tftpboot/

# Fix permissions on all copied files
sudo chown -R tftp:tftp /var/lib/tftpboot/
```

## Creating PXE Boot Menus

Create the configuration directory and a basic boot menu.

```bash
# Create pxelinux.cfg directory
sudo mkdir -p /var/lib/tftpboot/pxelinux.cfg

# Create the default boot menu
sudo nano /var/lib/tftpboot/pxelinux.cfg/default
```

```ini
# /var/lib/tftpboot/pxelinux.cfg/default
DEFAULT menu.c32
PROMPT 0
TIMEOUT 300
ONTIMEOUT local

MENU TITLE PXE Boot Menu

LABEL local
  MENU LABEL Boot from local disk
  LOCALBOOT 0

LABEL ubuntu-install
  MENU LABEL Install Ubuntu 24.04 LTS
  KERNEL ubuntu/24.04/vmlinuz
  APPEND initrd=ubuntu/24.04/initrd auto=true priority=critical --
```

## Serving Ubuntu Installation Files

For network installation, you need the kernel and initrd from the Ubuntu installer.

```bash
# Create a directory for Ubuntu files
sudo mkdir -p /var/lib/tftpboot/ubuntu/24.04

# Mount the Ubuntu ISO (or download the files directly)
sudo mount -o loop /path/to/ubuntu-24.04-server.iso /mnt

# Copy the kernel and initrd
sudo cp /mnt/casper/vmlinuz /var/lib/tftpboot/ubuntu/24.04/
sudo cp /mnt/casper/initrd /var/lib/tftpboot/ubuntu/24.04/

# Unmount the ISO
sudo umount /mnt

# Fix permissions
sudo chown -R tftp:tftp /var/lib/tftpboot/
```

## Configuring DHCP to Point to the TFTP Server

TFTP alone is not sufficient for PXE - the DHCP server must tell clients where to find the TFTP server and what file to request. If you are using ISC DHCP:

```bash
# Edit your DHCP server configuration
sudo nano /etc/dhcp/dhcpd.conf
```

```bash
# Add to your subnet declaration in dhcpd.conf
subnet 192.168.1.0 netmask 255.255.255.0 {
  range 192.168.1.100 192.168.1.200;
  option routers 192.168.1.1;
  option domain-name-servers 8.8.8.8;

  # TFTP server configuration
  next-server 192.168.1.10;  # IP of your TFTP server
  filename "pxelinux.0";     # Boot file for BIOS clients

  # For UEFI clients, use class-based configuration
  class "pxeclients" {
    match if substring (option vendor-class-identifier, 0, 9) = "PXEClient";
    if option arch = 00:07 {
      # UEFI x86-64
      filename "bootx64.efi";
    } else {
      # Legacy BIOS
      filename "pxelinux.0";
    }
  }
}
```

## Testing the TFTP Server

Test the TFTP server from another machine on the same network.

```bash
# Install TFTP client on the test machine
sudo apt install tftp-hpa

# Test downloading a file from the TFTP server
tftp 192.168.1.10
# At the tftp> prompt:
# get pxelinux.0
# quit

# Or use tftp directly
tftp -v 192.168.1.10 -c get pxelinux.0
```

## Monitoring TFTP Activity

```bash
# Watch the systemd journal for TFTP requests
sudo journalctl -u tftpd-hpa -f

# Or check syslog
sudo tail -f /var/log/syslog | grep tftp

# Check that the service is listening on port 69
sudo ss -ulnp | grep :69
```

## Troubleshooting

```bash
# If clients cannot connect, check that the service is bound correctly
sudo ss -ulnp | grep tftpd

# Verify file permissions (world-readable is required)
ls -la /var/lib/tftpboot/

# Test locally using loopback
tftp localhost -c get pxelinux.0

# Check SELinux/AppArmor if files are readable but transfer fails
sudo aa-status | grep tftpd
```

A correctly configured TFTP server is the foundation of any PXE boot infrastructure. Combined with DHCP and either PXELINUX or iPXE, it enables fully automated provisioning of physical and virtual machines on the network.
