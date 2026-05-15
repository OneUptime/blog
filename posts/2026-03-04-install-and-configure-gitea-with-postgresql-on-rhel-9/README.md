# How to Install and Configure Gitea with PostgreSQL on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Git, Database, Linux

Description: Step-by-step guide on install and configure gitea with postgresql using Red Hat Enterprise Linux 9.

---

Gitea with PostgreSQL can be installed and configured on RHEL to provide robust functionality for your infrastructure. This guide walks through the installation, basic configuration, and verification steps.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session
- A server hostname or IP address for the Gitea web interface

## Step 1: Install Required Packages

```bash
# Update the system first
sudo dnf update -y

# Install PostgreSQL, Git, and download tools
sudo dnf install -y git wget curl gnupg2 postgresql-server postgresql
sudo postgresql-setup --initdb
sudo systemctl enable --now postgresql.service

# Create a dedicated system user for Gitea
sudo groupadd --system git
sudo useradd --system --shell /bin/bash --comment 'Git Version Control' \
  --gid git --home-dir /home/git --create-home git

# Download and install the Gitea binary
GITEA_VERSION=1.26.1
wget -O gitea "https://dl.gitea.com/gitea/${GITEA_VERSION}/gitea-${GITEA_VERSION}-linux-amd64"
wget -O gitea.asc "https://dl.gitea.com/gitea/${GITEA_VERSION}/gitea-${GITEA_VERSION}-linux-amd64.asc"
gpg --keyserver hkps://keys.openpgp.org --recv 7C9E68152594688862D62AF62D9AE806EC1592E2
gpg --verify gitea.asc gitea
sudo install -m 755 gitea /usr/local/bin/gitea

# Create Gitea directories
sudo mkdir -p /var/lib/gitea/{custom,data,log}
sudo chown -R git:git /var/lib/gitea/
sudo chmod -R 750 /var/lib/gitea/
sudo mkdir -p /etc/gitea
sudo chown root:git /etc/gitea
sudo chmod 770 /etc/gitea
```

## Step 2: Configure the Service

Edit the configuration file to match your environment:

```bash
# Set a strong database password before running these commands
GITEA_DB_PASSWORD='replace-this-password'

# Configure PostgreSQL password authentication for the Gitea database
echo "password_encryption = scram-sha-256" | sudo tee -a /var/lib/pgsql/data/postgresql.conf
sudo sed -i "1ihost    giteadb    gitea    127.0.0.1/32    scram-sha-256" /var/lib/pgsql/data/pg_hba.conf
sudo systemctl restart postgresql.service

# Create the PostgreSQL role and database for Gitea
sudo -u postgres psql <<EOF
CREATE ROLE gitea WITH LOGIN PASSWORD '${GITEA_DB_PASSWORD}';
CREATE DATABASE giteadb WITH OWNER gitea TEMPLATE template0 ENCODING UTF8;
EOF

# Generate Gitea secrets
SECRET_KEY=$(sudo -u git /usr/local/bin/gitea generate secret SECRET_KEY)
INTERNAL_TOKEN=$(sudo -u git /usr/local/bin/gitea generate secret INTERNAL_TOKEN)

# Create the Gitea configuration file
sudo tee /etc/gitea/app.ini >/dev/null <<EOF
APP_NAME = Gitea
RUN_USER = git
WORK_PATH = /var/lib/gitea

[database]
DB_TYPE = postgres
HOST = 127.0.0.1:5432
NAME = giteadb
USER = gitea
PASSWD = ${GITEA_DB_PASSWORD}
SSL_MODE = disable

[repository]
ROOT = /var/lib/gitea/data/gitea-repositories

[server]
DOMAIN = localhost
HTTP_PORT = 3000
ROOT_URL = http://localhost:3000/
DISABLE_SSH = false
SSH_DOMAIN = localhost

[security]
INSTALL_LOCK = true
SECRET_KEY = ${SECRET_KEY}
INTERNAL_TOKEN = ${INTERNAL_TOKEN}

[log]
MODE = file
LEVEL = info
ROOT_PATH = /var/lib/gitea/log
EOF

sudo chown root:git /etc/gitea/app.ini
sudo chmod 640 /etc/gitea/app.ini
```

Adjust the settings according to your requirements. Key parameters to configure include `ROOT_URL`, `DOMAIN`, `SSH_DOMAIN`, database credentials, and logging options.

```bash
# Create the systemd service file
sudo tee /etc/systemd/system/gitea.service >/dev/null <<'EOF'
[Unit]
Description=Gitea (Git with a cup of tea)
After=network.target postgresql.service
Wants=postgresql.service

[Service]
RestartSec=2s
Type=simple
User=git
Group=git
WorkingDirectory=/var/lib/gitea/
ExecStart=/usr/local/bin/gitea web --config /etc/gitea/app.ini
Restart=always
Environment=USER=git HOME=/home/git GITEA_WORK_DIR=/var/lib/gitea

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
```

## Step 3: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable gitea.service

# Start the service
sudo systemctl start gitea.service

# Check the status
sudo systemctl status gitea.service
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the service status
sudo systemctl status gitea.service

# Review recent logs
journalctl -u gitea.service --no-pager -n 20

# Test the web interface locally
curl -I http://localhost:3000/
```

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u gitea.service -e --no-pager`.
- If Gitea cannot connect to PostgreSQL, confirm that `/var/lib/pgsql/data/pg_hba.conf` contains the `giteadb` rule before broader matching rules.
- Ensure all required packages are installed: `rpm -qa | grep -E 'git|postgresql|wget|curl|gnupg2'`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
