# How to Run TFTP Server in Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, TFTP, Networking, PXE Boot, Network Configuration, File Transfer

Description: Set up a TFTP server in Docker for network booting, firmware upgrades, and configuration file distribution to network devices.

---

TFTP (Trivial File Transfer Protocol) is a simple, connectionless file transfer protocol that network engineers use daily. It handles firmware upgrades on switches and routers, distributes boot images for PXE network booting, backs up device configurations, and transfers files to embedded systems. Despite its simplicity and lack of authentication, TFTP remains essential in network operations because nearly every network device supports it natively.

Running a TFTP server in Docker keeps this utility contained and portable. You can spin it up when needed for a maintenance window and shut it down afterward, or run it continuously for automated configuration management.

## Why TFTP Still Matters

FTP and SCP have largely replaced TFTP for general file transfers, but TFTP occupies a niche that nothing else fills. PXE boot requires TFTP. Most Cisco, Juniper, and Arista devices default to TFTP for firmware and configuration transfers. DHCP option 66 points clients to a TFTP server for boot files. The protocol's simplicity means it works even on devices with minimal network stacks.

## Quick Start

Get a TFTP server running in seconds.

```bash
# Create a directory to serve files from
mkdir -p /opt/tftp-data

# Start a TFTP server using the popular tftpd-hpa image
# UDP port 69 is the standard TFTP port
docker run -d \
  --name tftp-server \
  -p 69:69/udp \
  -v /opt/tftp-data:/var/tftpboot \
  pghalliday/tftp:latest
```

Place any files you want to serve in the /opt/tftp-data directory on the host.

```bash
# Copy a firmware file to the TFTP directory
cp router-firmware-v7.2.bin /opt/tftp-data/

# Copy a network device configuration
cp switch-config.txt /opt/tftp-data/

# Verify the file is accessible
ls -la /opt/tftp-data/
```

## Docker Compose Setup

For a more maintainable deployment, use Docker Compose.

```yaml
# docker-compose.yml - TFTP server for network operations
# Serves files from a local directory over TFTP
version: "3.8"

services:
  tftp:
    image: pghalliday/tftp:latest
    container_name: tftp-server
    restart: unless-stopped
    ports:
      - "69:69/udp"
    volumes:
      # Mount the local directory where you store files to serve
      - ./tftp-data:/var/tftpboot
    networks:
      - tftp-net

networks:
  tftp-net:
    driver: bridge
```

## Building a Custom TFTP Image

If you need more control over the TFTP server configuration, build a custom image.

```dockerfile
# Dockerfile - Custom TFTP server with tftpd-hpa
# Includes write support for receiving files from devices
FROM alpine:3.19

# Install the tftpd-hpa server
RUN apk add --no-cache tftp-hpa

# Create the TFTP root directory
RUN mkdir -p /var/tftpboot && chmod 777 /var/tftpboot

# Expose the standard TFTP port
EXPOSE 69/udp

# Run tftpd-hpa in the foreground
# --foreground keeps the process running for Docker
# --create allows clients to upload new files
# --secure restricts access to the specified directory
CMD ["in.tftpd", "--foreground", "--create", "--secure", "--verbose", "/var/tftpboot"]
```

```bash
# Build the custom TFTP image
docker build -t tftp-custom .

# Run with write support enabled
docker run -d \
  --name tftp-server \
  -p 69:69/udp \
  -v /opt/tftp-data:/var/tftpboot \
  tftp-custom
```

## TFTP with PXE Boot

A common use case is combining TFTP with DHCP for PXE network booting. This Docker Compose file runs both services together.

```yaml
# docker-compose.yml - PXE Boot stack with DHCP and TFTP
# Enables network booting of servers and workstations
version: "3.8"

services:
  tftp:
    image: pghalliday/tftp:latest
    container_name: pxe-tftp
    restart: unless-stopped
    ports:
      - "69:69/udp"
    volumes:
      - ./pxe-boot:/var/tftpboot
    networks:
      pxe-net:
        ipv4_address: 192.168.100.2

  # dnsmasq provides both DHCP and additional TFTP if needed
  dnsmasq:
    image: jpillora/dnsmasq:latest
    container_name: pxe-dhcp
    restart: unless-stopped
    ports:
      - "67:67/udp"
      - "53:53/udp"
    volumes:
      - ./dnsmasq.conf:/etc/dnsmasq.conf:ro
    cap_add:
      - NET_ADMIN
    network_mode: host

networks:
  pxe-net:
    driver: bridge
    ipam:
      config:
        - subnet: 192.168.100.0/24
```

Create the dnsmasq configuration for PXE.

```bash
# dnsmasq.conf - DHCP and PXE boot configuration
# Tells clients where to find the TFTP server and boot file

# DHCP settings
dhcp-range=192.168.100.50,192.168.100.150,12h
dhcp-option=option:router,192.168.100.1
dhcp-option=option:dns-server,8.8.8.8,8.8.4.4

# PXE boot settings
# Option 66 specifies the TFTP server address
dhcp-boot=pxelinux.0,pxeserver,192.168.100.2
enable-tftp=false

# Log DHCP transactions for debugging
log-dhcp
```

Set up the PXE boot files directory structure.

```bash
# Download PXE boot files (using syslinux for this example)
mkdir -p pxe-boot/pxelinux.cfg

# Download the PXE bootloader
wget https://mirrors.edge.kernel.org/pub/linux/utils/boot/syslinux/syslinux-6.03.tar.xz
tar xf syslinux-6.03.tar.xz
cp syslinux-6.03/bios/core/pxelinux.0 pxe-boot/
cp syslinux-6.03/bios/com32/elflink/ldlinux/ldlinux.c32 pxe-boot/
cp syslinux-6.03/bios/com32/menu/menu.c32 pxe-boot/

# Create the PXE boot menu
cat > pxe-boot/pxelinux.cfg/default << 'EOF'
DEFAULT menu.c32
PROMPT 0
TIMEOUT 300
MENU TITLE PXE Boot Menu

LABEL linux-install
    MENU LABEL Install Ubuntu 22.04
    KERNEL ubuntu/vmlinuz
    APPEND initrd=ubuntu/initrd root=/dev/ram0 ramdisk_size=1500000

LABEL local
    MENU LABEL Boot from local disk
    LOCALBOOT 0
EOF
```

## Transferring Files to Network Devices

Use TFTP to push firmware and configurations to network equipment.

```bash
# Upload a firmware image to a Cisco switch (from the switch CLI)
# switch# copy tftp://192.168.1.5/ios-image.bin flash:

# Back up a switch configuration to the TFTP server
# switch# copy running-config tftp://192.168.1.5/switch-backup.cfg

# From a Linux host, use the tftp client to test transfers
# Install the client if needed
apt-get install -y tftp-hpa  # Debian/Ubuntu
# or
yum install -y tftp          # RHEL/CentOS

# Download a file from the TFTP server
tftp 192.168.1.5 -c get switch-backup.cfg

# Upload a file to the TFTP server (requires write mode enabled)
tftp 192.168.1.5 -c put new-firmware.bin
```

## Organizing the TFTP Directory

Keep your TFTP directory organized for different use cases.

```bash
# Create a structured directory for different file types
mkdir -p /opt/tftp-data/{firmware,configs,pxe,backups}

# Typical directory structure
# /opt/tftp-data/
# ├── firmware/
# │   ├── cisco-ios-17.3.bin
# │   ├── junos-21.4.img
# │   └── arista-eos-4.29.swi
# ├── configs/
# │   ├── core-switch.cfg
# │   └── edge-router.cfg
# ├── pxe/
# │   ├── pxelinux.0
# │   └── pxelinux.cfg/
# └── backups/
#     └── (device configs backed up via TFTP)

# Set permissions so TFTP can read and write
chmod -R 777 /opt/tftp-data/
```

## Automated Configuration Backup

Create a cron job that triggers network devices to back up their configurations to the TFTP server.

```bash
#!/bin/bash
# backup-configs.sh - Trigger SNMP-based config backups to TFTP
# Uses SNMP to tell Cisco devices to copy their running config to TFTP

TFTP_SERVER="192.168.1.5"
COMMUNITY="private"

# List of devices to back up
DEVICES=("192.168.1.1" "192.168.1.2" "192.168.1.3")

for DEVICE in "${DEVICES[@]}"; do
    HOSTNAME=$(snmpget -v2c -c public $DEVICE sysName.0 -Oqv 2>/dev/null | tr -d '"')
    FILENAME="backups/${HOSTNAME}-$(date +%Y%m%d).cfg"

    echo "Backing up $DEVICE ($HOSTNAME) to $FILENAME"

    # Trigger a config copy via SNMP (Cisco IOS specific)
    snmpset -v2c -c $COMMUNITY $DEVICE \
        1.3.6.1.4.1.9.9.96.1.1.1.1.2.111 i 1 \
        1.3.6.1.4.1.9.9.96.1.1.1.1.3.111 i 4 \
        1.3.6.1.4.1.9.9.96.1.1.1.1.4.111 i 1 \
        1.3.6.1.4.1.9.9.96.1.1.1.1.5.111 s "$FILENAME" \
        1.3.6.1.4.1.9.9.96.1.1.1.1.6.111 a $TFTP_SERVER \
        1.3.6.1.4.1.9.9.96.1.1.1.1.14.111 i 1

    sleep 5
done

echo "Backup complete. Files saved to /opt/tftp-data/backups/"
```

## Security Considerations

TFTP has no built-in authentication or encryption. Keep these points in mind for any deployment. Never expose the TFTP port to the internet. Use firewall rules to restrict access to known management IPs only. Run the container with read-only access unless devices need to write back to it. Place the TFTP server on a dedicated management VLAN separate from user traffic. Monitor the TFTP directory for unexpected file uploads. Consider shutting down the TFTP container when it is not actively needed.

```bash
# Restrict TFTP access using iptables on the Docker host
iptables -A INPUT -p udp --dport 69 -s 192.168.1.0/24 -j ACCEPT
iptables -A INPUT -p udp --dport 69 -j DROP
```

## Health Monitoring

Monitor the TFTP server to make sure it is available when needed.

```yaml
    # Basic health check for the TFTP container
    healthcheck:
      test: ["CMD", "pgrep", "tftpd"]
      interval: 30s
      timeout: 5s
      retries: 3
```

A TFTP server in Docker is a lightweight, portable tool for network operations. Whether you are upgrading firmware, booting servers over the network, or backing up device configurations, Docker makes it easy to run TFTP exactly when and where you need it.
