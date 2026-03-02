# How to Set Up Ubuntu Server on a DigitalOcean Droplet from Scratch

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, DigitalOcean, Cloud, Server Administration

Description: A complete walkthrough for provisioning a Ubuntu Server droplet on DigitalOcean, covering initial setup, SSH hardening, and basic security configuration.

---

DigitalOcean makes it straightforward to spin up a Ubuntu Server instance, but there are several post-provisioning steps that are easy to miss on a fresh droplet. This post covers the full process from creating the droplet through securing it for production use.

## Creating the Droplet

Log into your DigitalOcean account and navigate to the Droplets section. Click "Create Droplet" and select Ubuntu as the distribution. Choose the latest LTS release (24.04 at the time of writing) for the longest support window.

Pick a region close to your target users. For compute plans, the shared CPU plans work well for most web applications; use dedicated CPU if you need consistent performance for database or compute-heavy workloads.

Under authentication, always choose SSH keys rather than a password. If you have not added your public key yet:

```bash
# Generate a new SSH key pair locally (if you do not have one)
ssh-keygen -t ed25519 -C "your_email@example.com"

# Display your public key to copy into DigitalOcean
cat ~/.ssh/id_ed25519.pub
```

Paste the output into the SSH key field on DigitalOcean. You can add multiple keys here if multiple people need access.

Enable backups if this is a production machine - it adds 20% to the cost but gives you automated weekly snapshots. Once satisfied with the configuration, click "Create Droplet."

## First Connection

Once the droplet is provisioned (usually under a minute), copy the IP address from the DigitalOcean control panel.

```bash
# Connect as root initially
ssh root@your_droplet_ip

# Verify the OS version
lsb_release -a
```

The first order of business is updating the package list and installing any pending security patches:

```bash
apt update && apt upgrade -y

# Reboot if a kernel update was applied
reboot
```

## Creating a Non-Root User

Running everything as root is a security risk. Create a regular user and add it to the sudo group:

```bash
# Create a new user
adduser deploy

# Add to sudo group
usermod -aG sudo deploy

# Switch to the new user to test sudo access
su - deploy
sudo whoami
# Should output: root
```

Copy your SSH key to the new user's authorized_keys:

```bash
# Still as root
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
```

## Hardening SSH

Edit the SSH daemon configuration to disable root login and password authentication:

```bash
nano /etc/ssh/sshd_config
```

Set or confirm these values:

```
# Disable root login entirely
PermitRootLogin no

# Disable password authentication (keys only)
PasswordAuthentication no

# Limit SSH to your specific user
AllowUsers deploy

# Use a non-standard port if you want to reduce noise in logs
Port 2222
```

Restart SSH after making changes:

```bash
systemctl restart sshd
```

Before closing your current session, open a new terminal window and verify you can connect with the new settings:

```bash
ssh -p 2222 deploy@your_droplet_ip
```

## Configuring UFW Firewall

Ubuntu Server ships with UFW (Uncomplicated Firewall). Enable it and open only the ports you need:

```bash
# Allow SSH on the custom port
ufw allow 2222/tcp

# Allow HTTP and HTTPS for web servers
ufw allow 80/tcp
ufw allow 443/tcp

# Enable the firewall
ufw enable

# Check status
ufw status verbose
```

If you changed the SSH port, make absolutely sure to allow the new port before enabling UFW, or you will lock yourself out.

## Setting the Hostname and Timezone

```bash
# Set a meaningful hostname
hostnamectl set-hostname web-prod-01

# List available timezones
timedatectl list-timezones | grep America

# Set the timezone
timedatectl set-timezone America/New_York

# Verify
timedatectl status
```

Update /etc/hosts to reflect the new hostname:

```bash
# Add an entry for the hostname
echo "127.0.1.1 web-prod-01" >> /etc/hosts
```

## Installing Fail2ban

Fail2ban monitors log files and temporarily bans IP addresses that show signs of brute-force behavior:

```bash
apt install fail2ban -y

# Copy the default config to a local override
cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# Edit local config
nano /etc/fail2ban/jail.local
```

Set these values under `[sshd]`:

```ini
[sshd]
enabled = true
port = 2222
maxretry = 3
bantime = 3600
findtime = 600
```

```bash
systemctl enable fail2ban
systemctl start fail2ban

# Check the jail status
fail2ban-client status sshd
```

## Enabling Automatic Security Updates

For servers you do not check daily, unattended-upgrades ensures security patches are applied automatically:

```bash
apt install unattended-upgrades -y

# Configure
dpkg-reconfigure --priority=low unattended-upgrades
```

Edit the configuration to also enable automatic reboots during off-hours if a kernel update requires it:

```bash
nano /etc/apt/apt.conf.d/50unattended-upgrades
```

```
// Automatically reboot at a specific time
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-Time "02:00";
```

## Setting Up a Swap File

DigitalOcean droplets do not have swap by default. Adding swap prevents out-of-memory crashes on smaller plans:

```bash
# Create a 2GB swap file
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile

# Make it persistent across reboots
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# Tune swappiness for servers (lower value = less aggressive swap use)
echo 'vm.swappiness=10' >> /etc/sysctl.conf
sysctl -p
```

## Monitoring with DigitalOcean Metrics

Install the DigitalOcean monitoring agent to get graphs and alerts in the control panel:

```bash
curl -sSL https://repos.insights.digitalocean.com/install.sh | bash

systemctl status do-agent
```

Once installed, you can set CPU, memory, and disk alerts from the Droplet's "Monitoring" tab in the control panel.

## Next Steps

At this point you have a reasonably hardened Ubuntu Server droplet. The next steps depend on what you plan to run - whether that is a web application stack (Nginx/Apache, database, application runtime), a containerized workload with Docker, or something else entirely.

Consider also setting up monitoring with a tool like [OneUptime](https://oneuptime.com/blog/post/2026-03-02-ubuntu-server-digitalocean-droplet-setup/view) to track uptime and performance from an external perspective - this catches issues that internal monitoring can miss, like network problems between your droplet and the outside world.

Regular maintenance habits matter: check `apt list --upgradable` weekly, rotate SSH keys periodically, and review fail2ban logs to understand what traffic is hitting your server.
