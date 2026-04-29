# How to Deploy Mailcow via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Mailcow, Email, Self-Hosted, Mail Server

Description: Deploy Mailcow, the full-featured self-hosted email server suite, using Docker and manage it via Portainer for a complete self-hosted mail solution.

## Introduction

Mailcow is a Docker-based mail server suite that includes Postfix, Dovecot, SOGo webmail, antispam, and antivirus - all in one package. This guide shows you how to install Mailcow using its official setup process and then import it into Portainer for ongoing management.

## Prerequisites

- A fresh server with a public IP address
- A fully qualified domain name (FQDN) like `mail.yourdomain.com`
- Docker Engine 24+ with Docker Compose v2 on the host
- Port 25, 80, 110, 143, 443, 465, 587, 993, 995, 4190 available
- At least 6 GB RAM and 1 GB swap (8 GB RAM recommended for 5-10 users)
- Portainer installed and connected to the same Docker host

## Step 1: Configure DNS Records

Before installing, set up these DNS records:

```text
# A record

mail.yourdomain.com  A  your.server.ip

# Client autoconfiguration
autodiscover.yourdomain.com  CNAME  mail.yourdomain.com
autoconfig.yourdomain.com  CNAME  mail.yourdomain.com

# MX record
yourdomain.com  MX  10  mail.yourdomain.com

# PTR record (reverse DNS - set with your server provider)
your.server.ip  PTR  mail.yourdomain.com

# SPF record
yourdomain.com  TXT  "v=spf1 mx ~all"

# DMARC record
_dmarc.yourdomain.com  TXT  "v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com"
```

## Step 2: Install Mailcow

Mailcow's official installation process is:

```bash
# Clone the Mailcow repository
cd /opt
git clone https://github.com/mailcow/mailcow-dockerized
cd mailcow-dockerized

# Run the generate config script
./generate_config.sh
# When prompted, enter your FQDN: mail.yourdomain.com
# Select timezone
```

This creates `/opt/mailcow-dockerized/mailcow.conf` with your configuration.

## Step 3: Review Mailcow's docker-compose.yml

Mailcow ships with a detailed compose file, and `generate_config.sh` creates the `mailcow.conf` file it uses. Key services include:

```yaml
# /opt/mailcow-dockerized/docker-compose.yml (excerpt)
services:
  # SMTP server
  postfix-mailcow:
    image: ghcr.io/mailcow/postfix:3.7.11-2
    # ...

  # IMAP/POP3 server
  dovecot-mailcow:
    image: ghcr.io/mailcow/dovecot:2.3.21.1-2
    # ...

  # Webmail/groupware
  sogo-mailcow:
    image: ghcr.io/mailcow/sogo:5.12.5-3
    # ...

  # Antispam
  rspamd-mailcow:
    image: ghcr.io/mailcow/rspamd:3.14.3-1
    # ...

  # Database
  mysql-mailcow:
    image: mariadb:10.11
    # ...
```

## Step 4: Start Mailcow

```bash
# Pull all images first
docker compose pull

# Start Mailcow
docker compose up -d

# Check all services are healthy
docker compose ps
```

## Step 5: Import Mailcow Stack into Portainer

To manage Mailcow from Portainer:

1. Go to **Stacks** → **Add Stack**
2. For an existing Mailcow installation, use **Web editor** or **Upload** and provide the local `docker-compose.yml` from `/opt/mailcow-dockerized/`
3. Load the values from the generated `/opt/mailcow-dockerized/mailcow.conf` into Portainer's environment variables, or enter them manually

If you prefer **Git Repository**, you can use `https://github.com/mailcow/mailcow-dockerized` with `docker-compose.yml` as the **Compose path**, but you still need to provide the values from `mailcow.conf`; the upstream repository does not contain your generated hostname, passwords, or other local settings.

> **Important**: Mailcow's compose file reads its variables from `mailcow.conf` via the repo's `.env` symlink. Importing only `docker-compose.yml` is not enough.

## Step 6: Access the Mailcow Admin Panel

1. Open `https://mail.yourdomain.com/admin`
2. Log in with `admin` / `moohoo` (default credentials)
3. **Immediately change the admin password**

## Step 7: Add a Mail Domain and Mailbox

In the Mailcow admin panel:
1. **Mail Setup** → **Domains** → **Add Domain**
2. Enter `yourdomain.com` and click **Add**
3. **Mail Setup** → **Mailboxes** → **Add Mailbox**
4. Create `user@yourdomain.com`

## Step 8: Get DKIM Keys

1. In the admin panel, go to **Configuration** → **ARC/DKIM Keys**
2. Copy the TXT record shown for your domain, or generate a key there if one does not already exist
3. Add the displayed TXT record to your DNS

## Monitoring via Portainer

After setup, use Portainer to:
- View logs for each Mailcow container
- Monitor resource usage (CPU/RAM per service)
- Restart individual services (e.g., just Rspamd after config changes)
- Inspect container health checks

## Conclusion

Mailcow provides a production-ready, self-hosted email platform and Portainer makes it easy to monitor and manage the ~18 containers in its default stack. With proper DNS configuration, you'll have a fully functional mail server that rivals hosted email services - all under your control.
