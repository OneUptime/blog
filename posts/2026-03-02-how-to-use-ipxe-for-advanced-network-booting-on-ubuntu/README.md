# How to Use iPXE for Advanced Network Booting on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, IPXE, PXE, Server

Description: Configure iPXE for advanced network booting on Ubuntu, including HTTP boot, menu scripting, and chainloading from traditional PXE environments.

---

iPXE is an open-source network boot firmware that goes well beyond traditional PXE. While standard PXE can only boot from TFTP, iPXE supports HTTP, HTTPS, iSCSI, AoE, and FCoE. It also includes a scripting language that allows you to build dynamic boot menus, authenticate users, and chain-load different operating systems based on hardware properties. If you are managing more than a handful of machines, iPXE is worth the additional setup time.

## iPXE vs Traditional PXE

Traditional PXE uses TFTP exclusively, which is slow and lacks encryption. iPXE adds:
- HTTP/HTTPS boot (much faster, supports encryption)
- Dynamic menu scripting
- SAN (iSCSI, AoE, FCoE) boot support
- VLAN support
- DNS resolution
- Conditional logic based on hardware properties

## Installing iPXE

```bash
# Install the pre-built iPXE binaries
sudo apt update
sudo apt install ipxe

# The binaries are installed to /usr/lib/ipxe/
ls /usr/lib/ipxe/
```

Key files installed:
- `ipxe.pxe` - iPXE chainloader for legacy BIOS PXE
- `undionly.kpxe` - iPXE using the NIC's UNDI driver (more compatible)
- `ipxe.efi` - iPXE for UEFI systems
- `snponly.efi` - iPXE using SNP driver for UEFI

## Setting Up TFTP to Serve iPXE

The typical deployment model: PXE client boots, DHCP points to TFTP, TFTP serves iPXE, iPXE takes over and loads via HTTP.

```bash
# Ensure tftpd-hpa is installed and configured
sudo apt install tftpd-hpa

# Create TFTP root
sudo mkdir -p /var/lib/tftpboot

# Copy iPXE bootloaders
sudo cp /usr/lib/ipxe/undionly.kpxe /var/lib/tftpboot/
sudo cp /usr/lib/ipxe/ipxe.efi /var/lib/tftpboot/

# Fix permissions
sudo chown -R tftp:tftp /var/lib/tftpboot/
sudo chmod -R 755 /var/lib/tftpboot/
```

Configure DHCP to serve `undionly.kpxe` for BIOS clients and `ipxe.efi` for UEFI clients.

```bash
# In /etc/dhcp/dhcpd.conf - serve iPXE to PXE clients
# but serve the iPXE script to clients already running iPXE

if exists user-class and option user-class = "iPXE" {
  # Client is already running iPXE, send it the boot script
  filename "http://192.168.1.10/ipxe/boot.ipxe";
} else {
  # Regular PXE client - chainload into iPXE
  next-server 192.168.1.10;
  if option arch = 00:07 {
    filename "ipxe.efi";
  } else {
    filename "undionly.kpxe";
  }
}
```

## Writing iPXE Boot Scripts

iPXE scripts use a simple scripting language. Create boot menus served via HTTP.

```bash
# Install a web server to serve iPXE scripts and boot files
sudo apt install nginx

# Create a directory for iPXE files
sudo mkdir -p /var/www/html/ipxe
```

Create the main boot script.

```bash
sudo nano /var/www/html/ipxe/boot.ipxe
```

```bash
#!ipxe
# Main iPXE boot script

# Show a menu
:start
menu iPXE Boot Menu
item --gap -- ---- Operating Systems ----
item ubuntu-live   Boot Ubuntu 24.04 Live
item ubuntu-install Install Ubuntu 24.04
item --gap -- ---- Utilities ----
item memtest       Memory Test (memtest86+)
item shell         iPXE Shell
item --gap -- ---- Local ----
item local         Boot from local disk
choose --timeout 30000 --default local target && goto ${target}

:ubuntu-live
set base-url http://192.168.1.10/boot/ubuntu
kernel ${base-url}/vmlinuz
initrd ${base-url}/initrd.img
imgargs vmlinuz boot=casper ip=dhcp url=http://192.168.1.10/boot/ubuntu/ubuntu-24.04-desktop.iso ---
boot || goto failed

:ubuntu-install
set base-url http://192.168.1.10/boot/ubuntu
kernel ${base-url}/vmlinuz
initrd ${base-url}/initrd
imgargs vmlinuz auto=true url=http://192.168.1.10/preseed/ubuntu.cfg priority=critical --
boot || goto failed

:memtest
kernel http://192.168.1.10/boot/memtest86+.bin
boot || goto failed

:shell
echo Dropping to iPXE shell
shell

:local
echo Booting from local disk
exit 0

:failed
echo Boot failed
prompt Press any key to return to menu
goto start
```

## Embedding Boot Scripts in iPXE Binary

For environments where you cannot control DHCP, embed a boot script directly into the iPXE binary. This requires building iPXE from source.

```bash
# Install build dependencies
sudo apt install build-essential liblzma-dev

# Get the iPXE source
git clone https://github.com/ipxe/ipxe.git
cd ipxe/src

# Create an embedded script
cat > /tmp/boot.ipxe << 'EOF'
#!ipxe
dhcp
chain http://192.168.1.10/ipxe/boot.ipxe || shell
EOF

# Build iPXE with the embedded script
make bin/undionly.kpxe EMBED=/tmp/boot.ipxe

# The built binary is in bin/undionly.kpxe
sudo cp bin/undionly.kpxe /var/lib/tftpboot/
```

## Using iPXE with HTTP Instead of TFTP

For faster boot times, serve files directly over HTTP.

```bash
# Nginx configuration for serving boot files
sudo nano /etc/nginx/sites-available/ipxe-boot
```

```nginx
# /etc/nginx/sites-available/ipxe-boot
server {
    listen 80;
    server_name 192.168.1.10;
    root /var/www/html;

    # Serve iPXE scripts and boot files
    location /ipxe/ {
        autoindex on;
        default_type application/octet-stream;
    }

    location /boot/ {
        autoindex on;
        default_type application/octet-stream;
    }

    # Set correct MIME type for iPXE scripts
    types {
        text/plain ipxe;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/ipxe-boot /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## Serving Ubuntu Installation via HTTP

HTTP boot is significantly faster than TFTP for large files.

```bash
# Create boot file directories
sudo mkdir -p /var/www/html/boot/ubuntu

# Copy kernel and initrd from Ubuntu ISO
sudo mount -o loop /path/to/ubuntu-24.04-server.iso /mnt
sudo cp /mnt/casper/vmlinuz /var/www/html/boot/ubuntu/
sudo cp /mnt/casper/initrd /var/www/html/boot/ubuntu/
sudo umount /mnt

# Set correct permissions
sudo chown -R www-data:www-data /var/www/html/boot/
```

## Advanced iPXE Features

### Hardware-Based Boot Selection

```bash
#!ipxe
# Boot different OS based on manufacturer
iseq ${manufacturer} Dell Inc. && goto dell-boot ||
iseq ${manufacturer} HP && goto hp-boot ||
goto default-boot

:dell-boot
echo Booting Dell-specific image
chain http://192.168.1.10/ipxe/dell.ipxe

:hp-boot
echo Booting HP-specific image
chain http://192.168.1.10/ipxe/hp.ipxe

:default-boot
chain http://192.168.1.10/ipxe/boot.ipxe
```

### MAC Address-Based Configuration

```bash
#!ipxe
# Use MAC address to select configuration
chain http://192.168.1.10/ipxe/hosts/${mac}.ipxe || chain http://192.168.1.10/ipxe/boot.ipxe
```

## Troubleshooting iPXE

```bash
# Monitor DHCP and TFTP activity
sudo journalctl -u tftpd-hpa -f &
sudo journalctl -u nginx -f &

# Test HTTP serving
curl -I http://192.168.1.10/ipxe/boot.ipxe

# Test TFTP file serving
tftp 192.168.1.10 -c get undionly.kpxe

# Check iPXE chainload by looking at serial console output
# iPXE prints detailed status during boot
```

## Troubleshooting Firewall

```bash
# Allow TFTP
sudo ufw allow 69/udp

# Allow HTTP for boot file serving
sudo ufw allow 80/tcp

# Allow HTTPS if using encrypted boot
sudo ufw allow 443/tcp
```

iPXE's combination of HTTP boot speed, scriptability, and wide hardware support makes it the preferred choice for production PXE infrastructure. Once set up, adding new boot targets is as simple as adding entries to the boot script - no TFTP file management needed.
