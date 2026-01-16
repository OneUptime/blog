# How to Set Up a TFTP Server on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, TFTP, Server, Networking, File Transfer, Tutorial

Description: Complete guide to installing and configuring a TFTP server on Ubuntu for network device configuration and file transfers.

---

TFTP (Trivial File Transfer Protocol) is a simple file transfer protocol used for network device configuration, firmware updates, and PXE boot environments. Unlike FTP, TFTP has no authentication, making it suitable for automated tasks. This guide covers TFTP server setup on Ubuntu.

## Use Cases

- Network device configuration backup
- Router/switch firmware updates
- PXE boot file serving
- VoIP phone provisioning
- Embedded system updates

## Prerequisites

- Ubuntu 18.04 or later
- Root or sudo access
- Firewall access on UDP port 69

## Install TFTP Server

### Using tftpd-hpa (Recommended)

```bash
# Update packages
sudo apt update

# Install tftpd-hpa
sudo apt install tftpd-hpa -y
```

### Using atftpd (Alternative)

```bash
# Install atftpd
sudo apt install atftpd -y
```

## Configure tftpd-hpa

### Main Configuration

```bash
sudo nano /etc/default/tftpd-hpa
```

```bash
# TFTP server configuration
TFTP_USERNAME="tftp"
TFTP_DIRECTORY="/srv/tftp"
TFTP_ADDRESS=":69"
TFTP_OPTIONS="--secure --create --verbose"
```

### Configuration Options

| Option | Description |
|--------|-------------|
| `--secure` | Change root to TFTP directory |
| `--create` | Allow file creation (uploads) |
| `--verbose` | Enable verbose logging |
| `--permissive` | Allow any file to be read/written |
| `--timeout N` | Set timeout in seconds |

### Create TFTP Directory

```bash
# Create directory
sudo mkdir -p /srv/tftp

# Set ownership
sudo chown tftp:tftp /srv/tftp

# Set permissions
sudo chmod 755 /srv/tftp
```

### Start TFTP Server

```bash
# Restart service
sudo systemctl restart tftpd-hpa

# Enable on boot
sudo systemctl enable tftpd-hpa

# Check status
sudo systemctl status tftpd-hpa
```

## Configure atftpd (Alternative)

### Edit Configuration

```bash
sudo nano /etc/default/atftpd
```

```bash
USE_INETD=false
OPTIONS="--tftpd-timeout 300 --retry-timeout 5 --maxthread 100 --verbose=5 --daemon /srv/tftp"
```

### Create Directory

```bash
sudo mkdir -p /srv/tftp
sudo chown nobody:nogroup /srv/tftp
sudo chmod 777 /srv/tftp
```

### Start atftpd

```bash
sudo systemctl restart atftpd
sudo systemctl enable atftpd
```

## Allow File Uploads

### Configure Write Access

For tftpd-hpa to accept uploads:

```bash
# Edit configuration
sudo nano /etc/default/tftpd-hpa
```

```bash
TFTP_OPTIONS="--secure --create --verbose"
```

### Pre-create Files for Upload

Some TFTP servers require files to exist before upload:

```bash
# Create empty file
sudo touch /srv/tftp/config.txt
sudo chmod 666 /srv/tftp/config.txt
```

### Alternative: Use --permissive

```bash
TFTP_OPTIONS="--secure --create --permissive --verbose"
```

## Firewall Configuration

### Using UFW

```bash
# Allow TFTP
sudo ufw allow 69/udp

# Verify rule
sudo ufw status
```

### Using iptables

```bash
# Allow TFTP
sudo iptables -A INPUT -p udp --dport 69 -j ACCEPT

# Save rules
sudo iptables-save | sudo tee /etc/iptables/rules.v4
```

## Test TFTP Server

### Install TFTP Client

```bash
sudo apt install tftp-hpa -y
```

### Test Download

```bash
# Create test file
echo "Hello TFTP" | sudo tee /srv/tftp/test.txt

# Download file
cd /tmp
tftp localhost
> get test.txt
> quit

# Verify
cat test.txt
```

### Test Upload

```bash
# Create local file
echo "Upload test" > /tmp/upload.txt

# Upload file
tftp localhost
> put upload.txt
> quit

# Verify on server
cat /srv/tftp/upload.txt
```

### Test from Remote Machine

```bash
# Download
tftp 192.168.1.10 -c get test.txt

# Upload
tftp 192.168.1.10 -c put upload.txt
```

## Network Device Configuration

### Cisco Router Example

```
! Save configuration to TFTP
copy running-config tftp:
! Enter TFTP server IP: 192.168.1.10
! Enter filename: router-config.txt

! Restore configuration from TFTP
copy tftp: running-config
! Enter TFTP server IP: 192.168.1.10
! Enter filename: router-config.txt
```

### Cisco Switch Firmware Update

```
! Download new firmware
copy tftp: flash:
! Enter TFTP server IP: 192.168.1.10
! Enter filename: c2960-lanbasek9-mz.152-7.E2.bin
```

## Structured Directory Layout

```bash
# Create organized directory structure
sudo mkdir -p /srv/tftp/{configs,firmware,images}
sudo chown -R tftp:tftp /srv/tftp
sudo chmod -R 755 /srv/tftp
```

```
/srv/tftp/
├── configs/
│   ├── router/
│   ├── switch/
│   └── firewall/
├── firmware/
│   ├── cisco/
│   ├── juniper/
│   └── hp/
└── images/
    └── pxe/
```

## Logging

### Enable Verbose Logging

```bash
sudo nano /etc/default/tftpd-hpa
```

```bash
TFTP_OPTIONS="--secure --create --verbose --verbosity 5"
```

### View Logs

```bash
# View systemd journal
sudo journalctl -u tftpd-hpa -f

# Or check syslog
sudo tail -f /var/log/syslog | grep tftp
```

### Configure rsyslog for TFTP

```bash
sudo nano /etc/rsyslog.d/tftpd.conf
```

```
# Log TFTP to separate file
if $programname == 'tftpd' then /var/log/tftpd.log
& stop
```

```bash
sudo systemctl restart rsyslog
```

## Security Considerations

### Restrict to Specific Networks

```bash
# UFW example
sudo ufw allow from 192.168.1.0/24 to any port 69 proto udp

# iptables example
sudo iptables -A INPUT -p udp -s 192.168.1.0/24 --dport 69 -j ACCEPT
sudo iptables -A INPUT -p udp --dport 69 -j DROP
```

### Limit File Access

```bash
# Use --secure to chroot
# Only files in TFTP_DIRECTORY are accessible
TFTP_OPTIONS="--secure"
```

### Read-Only Mode

```bash
# Remove --create for read-only
TFTP_OPTIONS="--secure --verbose"
```

## Running in xinetd

### Install xinetd

```bash
sudo apt install xinetd -y
```

### Configure TFTP Service

```bash
sudo nano /etc/xinetd.d/tftp
```

```
service tftp
{
    socket_type     = dgram
    protocol        = udp
    wait            = yes
    user            = root
    server          = /usr/sbin/in.tftpd
    server_args     = -s /srv/tftp -c
    disable         = no
    per_source      = 11
    cps             = 100 2
    flags           = IPv4
}
```

```bash
# Disable standalone service
sudo systemctl stop tftpd-hpa
sudo systemctl disable tftpd-hpa

# Restart xinetd
sudo systemctl restart xinetd
```

## Docker TFTP Server

```dockerfile
# Dockerfile
FROM ubuntu:22.04
RUN apt-get update && apt-get install -y tftpd-hpa
RUN mkdir -p /srv/tftp && chown tftp:tftp /srv/tftp
EXPOSE 69/udp
CMD ["/usr/sbin/in.tftpd", "-L", "-s", "/srv/tftp"]
```

```bash
# Build and run
docker build -t tftp-server .
docker run -d -p 69:69/udp -v /data/tftp:/srv/tftp tftp-server
```

## Troubleshooting

### Service Won't Start

```bash
# Check for errors
sudo systemctl status tftpd-hpa

# Check journal
sudo journalctl -u tftpd-hpa -n 50

# Verify directory exists
ls -la /srv/tftp
```

### Connection Refused

```bash
# Check if service is listening
sudo ss -ulnp | grep :69

# Check firewall
sudo ufw status

# Test locally first
tftp localhost
```

### Permission Denied

```bash
# Check directory permissions
ls -la /srv/tftp

# Fix permissions
sudo chown -R tftp:tftp /srv/tftp
sudo chmod -R 755 /srv/tftp

# For uploads, ensure file exists with write permission
sudo touch /srv/tftp/filename
sudo chmod 666 /srv/tftp/filename
```

### File Not Found

```bash
# Verify file exists in TFTP directory
ls -la /srv/tftp/

# Check you're using correct path
# With --secure, paths are relative to TFTP_DIRECTORY
```

### Transfer Timeout

```bash
# Check network connectivity
ping tftp-server-ip

# Check for firewall blocking
sudo tcpdump -i any port 69 -n

# Increase timeout
TFTP_OPTIONS="--secure --timeout 60"
```

---

TFTP is essential for network device management and automated provisioning. Its simplicity makes it ideal for firmware updates and configuration backup. For monitoring your network infrastructure and TFTP services, consider using OneUptime for comprehensive service monitoring and alerting.
