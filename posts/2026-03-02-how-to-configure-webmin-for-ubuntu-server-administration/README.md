# How to Configure Webmin for Ubuntu Server Administration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Webmin, Web Administration, Server Management, GUI

Description: A complete guide to installing, securing, and using Webmin on Ubuntu for web-based server administration, covering installation, SSL setup, and key administrative features.

---

Webmin is a web-based system administration interface for Unix-like systems. It lets you manage users, packages, services, disk quotas, cron jobs, firewalls, and more through a browser instead of the command line. It is not a replacement for knowing the command line, but it is genuinely useful for tasks that would otherwise require remembering complex syntax or navigating multiple config files.

## Installing Webmin

The Webmin team maintains their own APT repository. Installing from there ensures you get updates through the normal `apt upgrade` process.

```bash
# Install prerequisites
sudo apt update
sudo apt install -y apt-transport-https software-properties-common curl

# Download and add the Webmin GPG key
curl -fsSL https://download.webmin.com/jcameron-key.asc | \
    sudo gpg --dearmor -o /usr/share/keyrings/webmin.gpg

# Add the Webmin repository
echo "deb [signed-by=/usr/share/keyrings/webmin.gpg] https://download.webmin.com/download/repository sarge contrib" | \
    sudo tee /etc/apt/sources.list.d/webmin.list

# Update and install
sudo apt update
sudo apt install -y webmin

# Check service status
sudo systemctl status webmin
```

Webmin starts automatically on port 10000 using HTTPS with a self-signed certificate.

## Firewall Configuration

Open port 10000 for Webmin access:

```bash
# Using UFW
sudo ufw allow 10000/tcp

# Restrict to specific IP (recommended)
sudo ufw allow from 192.168.1.0/24 to any port 10000 proto tcp

# Reload firewall
sudo ufw reload
```

Access Webmin at: `https://your-server-ip:10000`

Log in with your root credentials or any user in the sudo group.

## Configuring SSL with a Real Certificate

The default self-signed certificate triggers browser warnings. Replace it with a proper certificate.

### Using Let's Encrypt

If your server has a domain name with DNS pointing to it:

```bash
# Install certbot
sudo apt install -y certbot

# Obtain certificate (stop any service using port 80 first)
sudo certbot certonly --standalone -d webmin.yourdomain.com

# Certificates are at:
# /etc/letsencrypt/live/webmin.yourdomain.com/fullchain.pem
# /etc/letsencrypt/live/webmin.yourdomain.com/privkey.pem
```

Configure Webmin to use the certificate via the web interface:

1. Webmin > Webmin Configuration > SSL Encryption
2. Set "Private key file" to `/etc/letsencrypt/live/webmin.yourdomain.com/privkey.pem`
3. Set "Certificate file" to `/etc/letsencrypt/live/webmin.yourdomain.com/fullchain.pem`
4. Click Save

Or configure directly in the config file:

```bash
# /etc/webmin/miniserv.conf
sudo tee -a /etc/webmin/miniserv.conf <<EOF
keyfile=/etc/letsencrypt/live/webmin.yourdomain.com/privkey.pem
certfile=/etc/letsencrypt/live/webmin.yourdomain.com/fullchain.pem
EOF

sudo systemctl restart webmin
```

Auto-renew the certificate and restart Webmin:

```bash
# Add to certbot renew hook
sudo tee /etc/letsencrypt/renewal-hooks/deploy/webmin.sh <<'EOF'
#!/bin/bash
systemctl restart webmin
EOF

sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/webmin.sh
```

## Security Hardening

### Change the Default Port

```bash
# Edit miniserv.conf to change port
sudo sed -i 's/^port=10000/port=12345/' /etc/webmin/miniserv.conf
sudo systemctl restart webmin
sudo ufw allow 12345/tcp
sudo ufw delete allow 10000/tcp
```

### Restrict to Specific IPs

In Webmin: Webmin > Webmin Configuration > IP Access Control

Or edit `/etc/webmin/miniserv.conf`:

```ini
# Allow only specific IPs
allow=192.168.1.100 10.0.0.0/8 127.0.0.1
```

### Enable Two-Factor Authentication

Webmin supports TOTP (Google Authenticator compatible):

1. Webmin > Webmin > Two-Factor Authentication
2. Enable two-factor for your account
3. Scan the QR code with your authenticator app

### Session Timeout

```bash
# Set session timeout in Webmin configuration
# Webmin > Webmin Configuration > Authentication
# Set "Session lifetime" to 900 (15 minutes)
```

## Key Administrative Features

### Package Management

Webmin > Software Packages provides a GUI for:
- Searching and installing packages
- Viewing installed packages
- Applying updates
- Managing APT repositories

For bulk updates:

```bash
# Still fastest from command line
sudo apt update && sudo apt upgrade -y
```

### User Account Management

Webmin > System > Users and Groups:
- Create and delete users
- Set passwords and shells
- Manage group membership
- Set quotas

Creating a user through Webmin handles all the details (home directory, permissions, shadow entries) correctly.

### Scheduled Jobs (Cron)

Webmin > System > Scheduled Cron Jobs:
- View all cron jobs across all users
- Create new jobs with a form instead of remembering crontab syntax
- Enable/disable jobs without deleting them

### Disk Quotas

Webmin > System > Disk Quotas:
- Enable quotas on filesystems
- Set per-user and per-group quotas
- View current usage vs limits

This requires the filesystem to be mounted with quota options, which Webmin can configure.

### Firewall (UFW / iptables)

Webmin > Networking > Linux Firewall for iptables management, or install the Webmin UFW module:

```bash
# The UFW module may not be installed by default
# Check available modules
sudo /usr/share/webmin/install-module.pl /path/to/module.wbm.gz
```

### File Manager

Webmin > Others > File Manager provides a web-based file browser. Useful for:
- Editing config files on remote servers without SCP/SFTP
- Viewing directory contents
- Changing file permissions

### System Logs

Webmin > System > System Logs gives you a web interface for viewing logs, with filtering options. It tails logs in real-time which is handy for watching service startups.

## Installing Additional Modules

Webmin's functionality is extended through modules:

```bash
# List installed modules
ls /usr/share/webmin/

# Install a third-party module
wget https://example.com/module.wbm.gz
sudo /usr/share/webmin/install-module.pl module.wbm.gz
```

Popular modules:
- **Virtualmin** - Web hosting control panel (complete hosting stack)
- **Usermin** - Per-user interface (email, files, passwords)
- Various CMS and database management modules

## Monitoring Webmin

```bash
# Check Webmin service status
sudo systemctl status webmin

# View Webmin access logs
sudo tail -f /var/webmin/miniserv.log

# View Webmin error logs
sudo tail -f /var/webmin/miniserv.error

# Check which user accessed what
sudo grep "Successful login" /var/webmin/miniserv.log | tail -20
```

## Keeping Webmin Updated

```bash
# Webmin updates come through APT like any other package
sudo apt update
sudo apt upgrade webmin

# Check current version
dpkg -l webmin | awk '/^ii/ {print $3}'
```

## When Not to Use Webmin

Webmin is a tool, not a solution. A few cautions:

- Do not use Webmin as a substitute for understanding how Linux configuration works. When Webmin writes a config file, you should be able to read and understand that file.
- Large teams should use proper configuration management (Ansible, Salt, Puppet) rather than Webmin for consistency across many servers.
- Webmin running on a public IP is an attack surface. Keep it firewalled to trusted IPs, use strong authentication, and keep it updated.

That said, for small teams and individual servers where the overhead of a full CM system is not warranted, Webmin provides a practical administration interface that can save time on repetitive tasks.
