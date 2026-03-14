# How to Configure Network Services for the RHCSA Exam on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, RHCSA, Networking, Nmcli, Firewall, Certification

Description: Practice the network configuration tasks required for the RHCSA exam, including static IP setup with nmcli, hostname changes, and firewall rules.

---

The RHCSA exam requires you to configure network interfaces, set hostnames, and manage firewall rules. All tasks must be done from the command line.

## Set a Static IP Address with nmcli

```bash
# List connections
nmcli connection show

# Configure a static IP on connection "ens192"
sudo nmcli connection modify ens192 \
  ipv4.addresses 192.168.1.100/24 \
  ipv4.gateway 192.168.1.1 \
  ipv4.dns "8.8.8.8 8.8.4.4" \
  ipv4.method manual

# Bring the connection up with the new settings
sudo nmcli connection up ens192

# Verify
ip addr show ens192
nmcli connection show ens192 | grep ipv4
```

## Configure Hostname

```bash
# Set the hostname persistently
sudo hostnamectl set-hostname examhost.example.com

# Verify
hostnamectl

# Also update /etc/hosts for local resolution
echo "192.168.1.100 examhost.example.com examhost" | sudo tee -a /etc/hosts
```

## DNS Resolution

```bash
# Verify DNS is working
dig google.com
nslookup google.com

# If DNS is not resolving, check /etc/resolv.conf
cat /etc/resolv.conf
# It should show your configured DNS servers
```

## Firewall Configuration

```bash
# Check firewall status
sudo firewall-cmd --state

# List current rules
sudo firewall-cmd --list-all

# Allow HTTP and HTTPS
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https

# Allow a custom port
sudo firewall-cmd --permanent --add-port=8080/tcp

# Reload to apply changes
sudo firewall-cmd --reload

# Verify
sudo firewall-cmd --list-all
```

## Add an Additional Network Connection

```bash
# Add a new connection for a second NIC
sudo nmcli connection add \
  con-name "backup-net" \
  type ethernet \
  ifname ens224 \
  ipv4.addresses 10.0.0.100/24 \
  ipv4.method manual \
  autoconnect yes

sudo nmcli connection up backup-net
```

## Test Connectivity

```bash
# Ping the gateway
ping -c 3 192.168.1.1

# Test a remote host
ping -c 3 8.8.8.8

# Test DNS resolution
ping -c 3 google.com
```

On the exam, always verify your changes are persistent across reboots. Use `nmcli` rather than editing files directly, as it is faster and less error-prone.
