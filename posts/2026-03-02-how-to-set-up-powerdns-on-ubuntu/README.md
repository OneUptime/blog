# How to Set Up PowerDNS on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, PowerDNS, DNS, Networking, Self-Hosted

Description: Learn how to install and configure PowerDNS authoritative server on Ubuntu with a MySQL backend, plus PowerDNS-Admin for a web management interface.

---

PowerDNS is a high-performance, authoritative DNS server that can back its zone data with multiple database backends. Unlike BIND, which uses flat zone files, PowerDNS stores DNS data in a relational database, making it much easier to automate and manage programmatically via an API.

This guide sets up PowerDNS with a MySQL backend and the PowerDNS-Admin web interface, giving you a complete DNS management solution.

## What You're Building

- PowerDNS Authoritative Server storing zones in MySQL
- PowerDNS API enabled for automation
- PowerDNS-Admin (web UI) for managing zones through a browser

## Prerequisites

- Ubuntu 22.04 or 24.04
- A server with a public IP address
- Ports 53 (TCP/UDP) open for DNS traffic
- Basic familiarity with DNS concepts (zones, records, NS records)

## Installing MySQL

```bash
sudo apt update
sudo apt install -y mysql-server

# Secure the installation
sudo mysql_secure_installation
```

Create the PowerDNS database and user:

```bash
sudo mysql << 'EOF'
-- Create database and user for PowerDNS
CREATE DATABASE powerdns CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'pdns'@'localhost' IDENTIFIED BY 'StrongPdnsPassword123!';
GRANT ALL PRIVILEGES ON powerdns.* TO 'pdns'@'localhost';
FLUSH PRIVILEGES;
EOF
```

## Installing PowerDNS Authoritative Server

Ubuntu ships an older version of PowerDNS. Use the official PowerDNS repository for the latest version:

```bash
# Add PowerDNS repository
curl -fsSL https://repo.powerdns.com/FD380FBB-pub.asc | \
  sudo gpg --dearmor -o /usr/share/keyrings/powerdns-archive-keyring.gpg

echo "deb [signed-by=/usr/share/keyrings/powerdns-archive-keyring.gpg] \
  http://repo.powerdns.com/ubuntu $(lsb_release -cs)-auth-49 main" | \
  sudo tee /etc/apt/sources.list.d/pdns.list

# Set preferences to use the PowerDNS repo
sudo tee /etc/apt/preferences.d/auth-49 << 'EOF'
Package: auth*
Pin: origin repo.powerdns.com
Pin-Priority: 600
EOF

sudo apt update

# Install PowerDNS and the MySQL backend
sudo apt install -y pdns-server pdns-backend-mysql

# Stop the service before configuring
sudo systemctl stop pdns
```

If systemd-resolved is running on port 53, you need to disable it:

```bash
# Check if something is already using port 53
sudo ss -tulnp | grep ':53'

# Disable systemd-resolved's DNS stub listener
sudo sed -i 's/#DNSStubListener=yes/DNSStubListener=no/' /etc/systemd/resolved.conf
sudo systemctl restart systemd-resolved
```

## Initializing the Database Schema

PowerDNS ships with SQL schema files. Import the MySQL schema:

```bash
# Find the schema file
find /usr/share -name "schema.mysql.sql" 2>/dev/null

# Import it (adjust path if needed)
sudo mysql powerdns < /usr/share/doc/pdns-backend-mysql/schema.mysql.sql
```

## Configuring PowerDNS

```bash
# Back up the default config
sudo cp /etc/powerdns/pdns.conf /etc/powerdns/pdns.conf.bak

# Write the configuration
sudo tee /etc/powerdns/pdns.conf << 'EOF'
# /etc/powerdns/pdns.conf

# Listen on all interfaces on port 53
local-address=0.0.0.0
local-port=53

# MySQL backend configuration
launch=gmysql
gmysql-host=127.0.0.1
gmysql-port=3306
gmysql-dbname=powerdns
gmysql-user=pdns
gmysql-password=StrongPdnsPassword123!
gmysql-dnssec=yes

# API configuration (for PowerDNS-Admin and automation)
api=yes
api-key=your-random-api-key-change-this
webserver=yes
webserver-address=127.0.0.1
webserver-port=8081
webserver-allow-from=127.0.0.1

# Security settings
setuid=pdns
setgid=pdns

# Performance tuning
cache-ttl=20
query-cache-ttl=20
negquery-cache-ttl=60
max-tcp-connections=20

# Logging
loglevel=4
log-dns-queries=no
EOF
```

Start and enable PowerDNS:

```bash
sudo systemctl enable pdns
sudo systemctl start pdns
sudo systemctl status pdns
```

Test that DNS is responding:

```bash
# Test with a query (will return SERVFAIL since no zones exist yet)
dig @127.0.0.1 example.com

# Check the API is working
curl -H 'X-API-Key: your-random-api-key-change-this' \
  http://127.0.0.1:8081/api/v1/servers/localhost | python3 -m json.tool
```

## Adding Your First Zone via API

Create a zone using the API:

```bash
curl -s -X POST \
  -H 'X-API-Key: your-random-api-key-change-this' \
  -H 'Content-Type: application/json' \
  http://127.0.0.1:8081/api/v1/servers/localhost/zones \
  --data '{
    "name": "example.com.",
    "kind": "Native",
    "nameservers": ["ns1.example.com.", "ns2.example.com."]
  }' | python3 -m json.tool
```

Add records to the zone:

```bash
# Add an A record
curl -s -X PATCH \
  -H 'X-API-Key: your-random-api-key-change-this' \
  -H 'Content-Type: application/json' \
  http://127.0.0.1:8081/api/v1/servers/localhost/zones/example.com. \
  --data '{
    "rrsets": [{
      "name": "www.example.com.",
      "type": "A",
      "ttl": 300,
      "changetype": "REPLACE",
      "records": [{
        "content": "203.0.113.10",
        "disabled": false
      }]
    }]
  }'
```

## Installing PowerDNS-Admin (Web Interface)

PowerDNS-Admin provides a web GUI for managing zones:

```bash
# Install dependencies
sudo apt install -y python3 python3-pip python3-venv \
  libmariadb-dev libsasl2-dev libldap2-dev \
  libssl-dev libxml2-dev libxslt1-dev \
  nodejs npm

# Clone PowerDNS-Admin
sudo git clone https://github.com/PowerDNS-Admin/PowerDNS-Admin.git /opt/powerdns-admin
cd /opt/powerdns-admin

# Create and activate virtual environment
sudo python3 -m venv /opt/powerdns-admin/venv
sudo /opt/powerdns-admin/venv/bin/pip install -r requirements.txt

# Create the configuration
sudo cp /opt/powerdns-admin/configs/development.py /opt/powerdns-admin/configs/production.py
sudo nano /opt/powerdns-admin/configs/production.py
```

Key configuration options in `production.py`:

```python
# Database connection
SQLA_DB_USER = 'pdnsadmin'
SQLA_DB_PASSWORD = 'AdminDbPassword!'
SQLA_DB_HOST = '127.0.0.1'
SQLA_DB_NAME = 'powerdns_admin'

# Secret key for sessions
SECRET_KEY = 'your-very-long-random-secret-key'

# PowerDNS API
PDNS_STATS_URL = 'http://127.0.0.1:8081/'
PDNS_API_KEY = 'your-random-api-key-change-this'
PDNS_VERSION = '4.9.0'
```

Initialize the database:

```bash
cd /opt/powerdns-admin
sudo bash -c "source venv/bin/activate && \
  FLASK_APP=powerdnsadmin/__init__.py \
  FLASK_CONF=../configs/production.py \
  flask db upgrade"
```

Create a systemd service for PowerDNS-Admin:

```ini
# /etc/systemd/system/powerdns-admin.service
[Unit]
Description=PowerDNS-Admin
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/opt/powerdns-admin
Environment="FLASK_CONF=../configs/production.py"
ExecStart=/opt/powerdns-admin/venv/bin/gunicorn \
  --workers 4 \
  --bind 127.0.0.1:9191 \
  "powerdnsadmin:create_app()"
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable powerdns-admin
sudo systemctl start powerdns-admin
```

## Nginx Reverse Proxy for PowerDNS-Admin

```nginx
# /etc/nginx/sites-available/dns-admin.example.com
server {
    listen 443 ssl http2;
    server_name dns-admin.example.com;

    ssl_certificate /etc/letsencrypt/live/dns-admin.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dns-admin.example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:9191;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Monitoring PowerDNS

Monitor your DNS server's availability and query response times with [OneUptime](https://oneuptime.com). For a production DNS server, any downtime means your domains stop resolving, so proactive alerting is essential.
