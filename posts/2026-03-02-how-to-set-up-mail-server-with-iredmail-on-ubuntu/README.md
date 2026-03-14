# How to Set Up Mail Server with iRedMail on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Email, Mail Server, IRedMail, System Administration

Description: A complete guide to setting up a full-featured mail server on Ubuntu using iRedMail, including prerequisites, DNS configuration, and post-installation steps.

---

iRedMail is an open-source mail server solution that installs and configures Postfix, Dovecot, SpamAssassin, ClamAV, and a web-based admin panel in a single automated script. Instead of spending days manually configuring each component, iRedMail handles the integration and leaves you with a working mail server in about an hour.

## Server Requirements

Before starting, your server must meet these requirements:

- **Ubuntu 22.04 or 24.04 LTS** (fresh installation recommended)
- **Minimum 4GB RAM** (8GB recommended if ClamAV is enabled)
- **Minimum 40GB disk** for the OS and mail storage
- **A fully qualified domain name (FQDN)** that resolves to the server's IP
- **Ports 25, 587, 993, 995, 80, 443** open in your firewall

## DNS Prerequisites

These DNS records must be configured before installation:

```text
# A record - server hostname resolves to your IP
mail.example.com.  IN  A  203.0.113.1

# MX record - email for example.com goes to mail.example.com
example.com.       IN  MX  10  mail.example.com.

# PTR record (reverse DNS) - set with your hosting provider
# 1.113.0.203.in-addr.arpa  IN  PTR  mail.example.com.

# SPF record - authorize your server to send email
example.com.       IN  TXT  "v=spf1 ip4:203.0.113.1 -all"
```

PTR (reverse DNS) records are critical. Many receiving mail servers reject email from IPs without a matching PTR record.

## Pre-Installation Setup

```bash
# Update the system
sudo apt update && sudo apt upgrade -y

# Set the hostname
sudo hostnamectl set-hostname mail.example.com

# Update /etc/hosts
sudo nano /etc/hosts
```

```text
127.0.0.1   localhost
203.0.113.1  mail.example.com mail
```

```bash
# Verify hostname
hostname
hostname -f  # Should output: mail.example.com
```

## Installing iRedMail

```bash
# Download iRedMail (check https://www.iredmail.org/download.html for the latest version)
wget https://github.com/iredmail/iRedMail/archive/refs/tags/1.7.0.tar.gz
tar -xzf 1.7.0.tar.gz
cd iRedMail-1.7.0

# Make the installer executable
chmod +x iRedMail.sh

# Run the installer
sudo bash iRedMail.sh
```

The installer presents a series of configuration prompts:

### Installation Choices

1. **Storage path** - Where to store mailboxes (default `/var/vmail`)

2. **Web server** - Choose Nginx or Apache

3. **Database** - Choose MariaDB, PostgreSQL, or OpenLDAP
   - MariaDB is the most common choice for smaller deployments
   - OpenLDAP is better if you're integrating with an existing directory

4. **Primary domain** - Enter your mail domain (e.g., `example.com`)

5. **Admin password** - Strong password for `postmaster@example.com`

6. **Optional components**:
   - SOGo Groupware (calendar, contacts, webmail) - recommended
   - Roundcube webmail - lightweight alternative
   - netdata monitoring
   - iRedAPD (Postfix policy daemon)
   - Fail2Ban

After answering the prompts, the installer runs for 10-20 minutes, installing and configuring everything.

## Post-Installation Steps

After the installer completes:

```bash
# Reboot as recommended
sudo reboot

# After reboot, check all services
sudo systemctl status postfix
sudo systemctl status dovecot
sudo systemctl status nginx    # or apache2
sudo systemctl status clamav-daemon
sudo systemctl status amavis
sudo systemctl status iredapd
```

## Accessing the Admin Panel

iRedMail installs a web admin panel at `https://mail.example.com/iredadmin/`

Default credentials:
- Username: `postmaster@example.com`
- Password: The password you set during installation

The admin panel lets you:
- Create and manage email domains
- Create and manage mailboxes
- View mail queue
- Configure spam filtering settings
- Manage aliases and mailing lists

## Adding Email Accounts

Via the admin panel:
1. Go to "Add" -> "User"
2. Fill in the username, password, storage quota
3. Click "Add"

Via command line:

```bash
# iRedMail provides a script for adding users from the command line
# For MariaDB-based installations:
sudo mysql -u root vmail << 'EOF'
INSERT INTO mailbox (username, password, name, maildir, quota, domain, active)
VALUES (
    'user@example.com',
    ENCRYPT('userpassword'),
    'User Name',
    'example.com/u/user/',
    1024,
    'example.com',
    1
);
EOF
```

## SSL/TLS Certificate Setup

iRedMail generates a self-signed certificate. For production, replace it with a Let's Encrypt certificate:

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot certonly --nginx -d mail.example.com

# iRedMail stores SSL config in these files:
# Nginx: /etc/nginx/templates/ssl.tmpl
# Postfix: /etc/postfix/main.cf (smtpd_tls_cert_file / smtpd_tls_key_file)
# Dovecot: /etc/dovecot/dovecot.conf (ssl_cert / ssl_key)

# Update Postfix
sudo postconf -e "smtpd_tls_cert_file = /etc/letsencrypt/live/mail.example.com/fullchain.pem"
sudo postconf -e "smtpd_tls_key_file = /etc/letsencrypt/live/mail.example.com/privkey.pem"

# Update Dovecot
sudo nano /etc/dovecot/dovecot.conf
# ssl_cert = </etc/letsencrypt/live/mail.example.com/fullchain.pem
# ssl_key = </etc/letsencrypt/live/mail.example.com/privkey.pem

# Update Nginx
sudo nano /etc/nginx/templates/ssl.tmpl
# ssl_certificate /etc/letsencrypt/live/mail.example.com/fullchain.pem;
# ssl_certificate_key /etc/letsencrypt/live/mail.example.com/privkey.pem;

# Restart services
sudo systemctl restart postfix dovecot nginx

# Auto-renewal hook to restart services
sudo nano /etc/letsencrypt/renewal-hooks/deploy/restart-mail.sh
```

```bash
#!/bin/bash
systemctl restart postfix dovecot nginx
```

```bash
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/restart-mail.sh
```

## Configuring DKIM

iRedMail configures DKIM automatically using amavisd-new. Get your DKIM public key to add to DNS:

```bash
# Find the DKIM key
sudo amavisd-new showkeys

# Or look in the configuration
sudo cat /etc/amavis/conf.d/50-user | grep dkim_key

# The output shows your DNS TXT record
# Add it to your DNS:
# dkim._domainkey.example.com  IN  TXT  "v=DKIM1; k=rsa; p=MIGfMA0G..."
```

## Configuring DMARC

Add a DMARC record to your DNS after DKIM is working:

```text
# Start with monitoring mode (p=none) to see what fails without blocking
_dmarc.example.com.  IN  TXT  "v=DMARC1; p=none; rua=mailto:dmarc@example.com; ruf=mailto:dmarc@example.com; fo=1"

# After reviewing reports, move to quarantine or reject
# v=DMARC1; p=quarantine; pct=100; rua=mailto:dmarc@example.com
```

## Testing the Mail Server

```bash
# Test sending mail via SMTP
sudo apt install swaks
swaks --to recipient@gmail.com \
      --from postmaster@example.com \
      --server mail.example.com:587 \
      --auth PLAIN \
      --auth-user postmaster@example.com \
      --auth-password yourpassword \
      --tls

# Check mail queue
sudo postqueue -p

# Check mail logs
sudo tail -f /var/log/mail.log

# Test receiving (check if port 25 is open and not blocked by ISP)
nc -zv mail.example.com 25
```

## Checking Deliverability

Use these tools to verify your configuration after DNS propagation:

- **mail-tester.com** - Sends a score based on SPF, DKIM, DMARC, IP reputation
- **mxtoolbox.com** - Check MX records, blacklists, reverse DNS
- **dmarcanalyzer.com** - Analyze DMARC reports

```bash
# Check if your IP is on any blacklists
sudo apt install dnsutils
host -t txt 1.113.0.203.zen.spamhaus.org
# Should return NXDOMAIN if not listed

# Verify SPF
host -t txt example.com | grep spf

# Verify MX
host -t mx example.com
```

## Basic Maintenance

```bash
# View recent mail activity
sudo tail -100 /var/log/mail.log

# Check the mail queue
sudo postqueue -p

# Flush the mail queue (force delivery attempt)
sudo postqueue -f

# Delete all queued messages (use carefully)
sudo postsuper -d ALL

# Check disk usage by domain
sudo du -sh /var/vmail/example.com/

# Update spam databases
sudo sa-update
sudo freshclam
```

iRedMail reduces a complex multi-component installation to a guided setup, but understanding the individual components - Postfix, Dovecot, amavisd-new, SpamAssassin - is still important for troubleshooting. The `/var/log/mail.log` file is your primary diagnostic tool for any delivery or authentication issues.
