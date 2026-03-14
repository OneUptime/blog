# How to Set Up FTP Passive Mode Through a Firewall on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, FTP, Firewall, Networking, Vsftpd

Description: Configure vsftpd in passive mode on RHEL and open the necessary firewall ports so FTP clients can connect through firewalls and NAT gateways.

---

FTP active mode often fails when clients sit behind NAT or firewalls. Passive mode solves this by having the server open a range of ports for data connections. Here is how to configure vsftpd with passive mode on RHEL and allow it through firewalld.

## Install and Enable vsftpd

```bash
# Install vsftpd
sudo dnf install -y vsftpd

# Enable and start the service
sudo systemctl enable --now vsftpd
```

## Configure Passive Mode

Edit the vsftpd configuration file:

```bash
sudo vi /etc/vsftpd/vsftpd.conf
```

Add or modify these directives:

```text
# Enable passive mode
pasv_enable=YES

# Define the passive port range (choose a range that suits your environment)
pasv_min_port=30000
pasv_max_port=30100

# Set the external IP address if behind NAT
# Replace with your server's public IP
pasv_address=203.0.113.10

# Keep other useful settings
anonymous_enable=NO
local_enable=YES
write_enable=YES
chroot_local_user=YES
allow_writeable_chroot=YES
```

Restart vsftpd to apply changes:

```bash
sudo systemctl restart vsftpd
```

## Open Firewall Ports

Open both the FTP control port and the passive data port range:

```bash
# Allow the FTP service (port 21)
sudo firewall-cmd --permanent --add-service=ftp

# Allow the passive port range
sudo firewall-cmd --permanent --add-port=30000-30100/tcp

# Reload the firewall
sudo firewall-cmd --reload

# Verify the rules
sudo firewall-cmd --list-all
```

## Load the FTP Connection Tracking Module

The kernel needs the `nf_conntrack_ftp` module to track FTP connections:

```bash
# Load the module
sudo modprobe nf_conntrack_ftp

# Make it persistent across reboots
echo "nf_conntrack_ftp" | sudo tee /etc/modules-load.d/nf_conntrack_ftp.conf
```

## SELinux Configuration

If SELinux is enforcing, allow FTP to use the passive port range:

```bash
# Allow FTP to bind to the passive port range
sudo setsebool -P ftpd_use_passive_mode on

# If using non-standard ports, set the SELinux port context
sudo semanage port -a -t ftp_port_t -p tcp 30000-30100
```

## Test the Connection

From a client machine, verify passive mode works:

```bash
# Use the lftp client for testing
lftp -u username 203.0.113.10
# Inside lftp, run:
# set ftp:passive-mode yes
# ls
```

This configuration allows FTP clients behind firewalls and NAT to connect to your RHEL server reliably using passive mode.
