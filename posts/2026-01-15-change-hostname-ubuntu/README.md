# How to Change Hostname on Ubuntu Server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Hostname, Server, Configuration, System Administration, Tutorial

Description: Quick guide to changing the hostname on Ubuntu servers using hostnamectl, with tips for cloud instances and cluster environments.

---

The hostname identifies your server on the network and in logs. Whether you're setting up a new server, renaming for organizational purposes, or preparing for clustering, this guide covers all methods to change hostname on Ubuntu.

## Understanding Hostname Types

Ubuntu uses three hostname types:
- **Static**: Stored in `/etc/hostname`, used at boot
- **Transient**: Temporary, set by DHCP or mDNS
- **Pretty**: Human-readable name with special characters

## Check Current Hostname

```bash
# Show all hostname information
hostnamectl

# Just the hostname
hostname

# Fully qualified domain name
hostname -f

# Short hostname
hostname -s
```

## Method 1: Using hostnamectl (Recommended)

The modern, systemd way:

```bash
# Change static hostname
sudo hostnamectl set-hostname new-hostname

# Set with pretty name
sudo hostnamectl set-hostname "My Web Server" --pretty
sudo hostnamectl set-hostname my-web-server --static

# Verify change
hostnamectl
```

The change is immediate and persists across reboots.

## Method 2: Edit Configuration Files

For systems without hostnamectl:

### Edit /etc/hostname

```bash
# Edit hostname file
sudo nano /etc/hostname
```

Replace the contents with your new hostname:
```
new-hostname
```

### Update /etc/hosts

```bash
# Edit hosts file
sudo nano /etc/hosts
```

Update the line with your old hostname:

```
127.0.0.1       localhost
127.0.1.1       new-hostname.example.com new-hostname

# The following lines are desirable for IPv6 capable hosts
::1             localhost ip6-localhost ip6-loopback
```

### Apply Changes

```bash
# Apply the new hostname
sudo hostname new-hostname

# Verify
hostname
```

## Method 3: nmcli (NetworkManager)

If using NetworkManager:

```bash
# Set hostname via NetworkManager
sudo nmcli general hostname new-hostname

# Verify
nmcli general hostname
```

## Hostname Requirements

Valid hostnames must:
- Be 2-63 characters long
- Contain only `a-z`, `0-9`, and `-` (hyphens)
- Start and end with alphanumeric character
- Not have consecutive hyphens

```bash
# Valid hostnames
web-server-01
db-primary
app-production

# Invalid hostnames
-hostname      # starts with hyphen
hostname-      # ends with hyphen
host_name      # underscore not allowed
host..name     # consecutive dots
```

## Setting FQDN (Fully Qualified Domain Name)

For proper FQDN configuration:

```bash
# Set hostname
sudo hostnamectl set-hostname server01

# Configure /etc/hosts
sudo nano /etc/hosts
```

```
127.0.0.1       localhost
127.0.1.1       server01.example.com server01

# Server IP (if static)
192.168.1.100   server01.example.com server01
```

Verify:

```bash
# Check FQDN
hostname -f
# Output: server01.example.com

# Check short name
hostname -s
# Output: server01
```

## Cloud Provider Considerations

### AWS EC2

EC2 instances may reset hostname on reboot:

```bash
# Edit cloud-init config
sudo nano /etc/cloud/cloud.cfg
```

Find and modify:
```yaml
# Change this:
preserve_hostname: false

# To this:
preserve_hostname: true
```

Or set via cloud-init:
```yaml
# In user data
#cloud-config
hostname: my-instance
fqdn: my-instance.example.com
manage_etc_hosts: true
```

### DigitalOcean

```bash
# Set hostname
sudo hostnamectl set-hostname droplet-name

# Update cloud-init
sudo nano /etc/cloud/cloud.cfg
# Set: preserve_hostname: true
```

### Google Cloud

```bash
# Set hostname via gcloud or metadata
sudo hostnamectl set-hostname instance-name

# GCP manages /etc/hosts via google-guest-agent
# Disable if needed:
sudo systemctl stop google-guest-agent
```

## Updating Related Services

After changing hostname, update services that reference it:

### Postfix

```bash
# Update Postfix hostname
sudo nano /etc/postfix/main.cf
# Update: myhostname = new-hostname.example.com

sudo systemctl restart postfix
```

### Apache

```bash
# Update Apache ServerName
sudo nano /etc/apache2/apache2.conf
# Add/update: ServerName new-hostname.example.com

sudo systemctl restart apache2
```

### Nginx

```bash
# Update Nginx server_name in virtual hosts
sudo nano /etc/nginx/sites-available/default
# Update: server_name new-hostname.example.com;

sudo systemctl restart nginx
```

### SSL Certificates

If using SSL certificates with the old hostname:
- Generate new certificates with the new hostname
- Update certificate paths in web server configs
- Consider wildcard certificates for flexibility

## Hostname in Cluster Environments

For Kubernetes, Docker Swarm, or other clusters:

### Update All Hosts Files

On each node:
```bash
# Edit hosts file with all cluster nodes
sudo nano /etc/hosts
```

```
# Cluster nodes
192.168.1.10    node1.cluster.local node1
192.168.1.11    node2.cluster.local node2
192.168.1.12    node3.cluster.local node3
```

### DNS Considerations

For clusters, prefer DNS over hosts file entries:
- Set up internal DNS server
- Use service discovery (Consul, etcd)
- Configure DNS search domains

## Scripting Hostname Changes

Automated hostname setup script:

```bash
#!/bin/bash
# Script to change hostname on Ubuntu

NEW_HOSTNAME=$1

if [ -z "$NEW_HOSTNAME" ]; then
    echo "Usage: $0 <new-hostname>"
    exit 1
fi

# Validate hostname
if [[ ! "$NEW_HOSTNAME" =~ ^[a-z0-9][a-z0-9-]*[a-z0-9]$ ]]; then
    echo "Invalid hostname. Use only lowercase letters, numbers, and hyphens."
    exit 1
fi

# Get old hostname
OLD_HOSTNAME=$(hostname)

# Set new hostname
sudo hostnamectl set-hostname "$NEW_HOSTNAME"

# Update /etc/hosts
sudo sed -i "s/$OLD_HOSTNAME/$NEW_HOSTNAME/g" /etc/hosts

# Verify
echo "Hostname changed from '$OLD_HOSTNAME' to '$NEW_HOSTNAME'"
hostnamectl

echo "You may need to log out and back in for shell prompt to update."
```

Usage:
```bash
chmod +x change-hostname.sh
sudo ./change-hostname.sh new-server-name
```

## Troubleshooting

### Hostname Reverts After Reboot

```bash
# Check cloud-init settings
cat /etc/cloud/cloud.cfg | grep preserve_hostname

# Set to true
sudo sed -i 's/preserve_hostname: false/preserve_hostname: true/' /etc/cloud/cloud.cfg
```

### "sudo: unable to resolve host"

```bash
# Add hostname to /etc/hosts
echo "127.0.1.1 $(hostname)" | sudo tee -a /etc/hosts
```

### Shell Prompt Not Updating

```bash
# Log out and back in, or start new shell
exec bash

# Or source profile
source ~/.bashrc
```

### Services Failing After Hostname Change

```bash
# Check for hardcoded hostnames
grep -r "old-hostname" /etc/

# Restart affected services
sudo systemctl restart service-name
```

## Best Practices

1. **Use descriptive names**: `web-prod-01` instead of `server1`
2. **Include environment**: `app-staging-02`, `db-production-01`
3. **Include role**: `nginx-lb-01`, `postgres-primary`
4. **Follow naming convention**: Be consistent across infrastructure
5. **Document changes**: Keep infrastructure documentation updated
6. **Update DNS**: Ensure DNS records match new hostnames
7. **Update monitoring**: Update dashboards and alerts with new names

---

Changing hostname is straightforward on Ubuntu, but remember to update all services and configurations that reference it. For cloud environments, ensure cloud-init is configured to preserve your custom hostname. A well-chosen hostname makes system administration and troubleshooting significantly easier.
