# How to Set Up Mailing Lists with Mailman 3 on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Email, Mailman, Mailing Lists, System Administration

Description: A step-by-step guide to installing and configuring Mailman 3 on Ubuntu for managing email mailing lists, including Postfix integration and web interface setup.

---

Mailman 3 is the current version of the GNU Mailing List Manager. Compared to Mailman 2, it has a significantly redesigned architecture with separate components: Mailman Core (the list management engine), Postorius (a Django-based web admin UI), and HyperKitty (an email archive web application). This post walks through setting up a working Mailman 3 installation on Ubuntu 22.04.

## Architecture Overview

Mailman 3 has three main components:

- **mailman-core** - The backend daemon that handles subscriptions, delivery, bounces
- **postorius** - The web interface for list administrators and subscribers
- **hyperkitty** - The web-based email archive

All three are typically served through a Django project called `mailman-bundler` or via the `mailman3-full` package.

## Installation

```bash
# Update the system
sudo apt update && sudo apt upgrade -y

# Install Mailman 3 with web interface
sudo apt install mailman3-full

# This installs:
# - mailman3 (core)
# - mailman3-web (Postorius + HyperKitty Django app)
# - python3-mailman (Python bindings)
# - Nginx or Apache (depending on what's available)
```

During installation, you'll be asked for:
- The primary domain for the web interface
- Database type (SQLite for testing, PostgreSQL for production)

## Initial Configuration

### Mailman Core Configuration

```bash
# Main configuration file
sudo nano /etc/mailman3/mailman.cfg
```

```ini
[mailman]
# Site-wide list admin address
site_owner: admin@example.com
noreply_address: noreply@example.com

[database]
# SQLite for testing/small installations
class: mailman.database.sqlite.SQLiteDatabase
url: sqlite:////var/lib/mailman3/data/mailman.db

# For PostgreSQL (production recommended):
# class: mailman.database.postgresql.PostgreSQLDatabase
# url: postgresql://mailman:password@localhost/mailmandb

[mta]
# Tell Mailman to use Postfix
incoming: mailman.mta.postfix.LMTP
outgoing: mailman.mta.deliver.deliver
lmtp_host: 127.0.0.1
lmtp_port: 8024

# Generate Postfix transport maps
smtp_host: localhost
smtp_port: 25

[archiver:hyperkitty]
class: mailman_hyperkitty.Archiver
enable: yes
configuration: /etc/mailman3/mailman-hyperkitty.cfg

[webservice]
# REST API for Postorius to communicate with core
admin_user: restadmin
admin_pass: changeme_rest_password
hostname: localhost
port: 8001
```

### HyperKitty Configuration

```bash
sudo nano /etc/mailman3/mailman-hyperkitty.cfg
```

```ini
[general]
base_url: http://localhost/hyperkitty/
api_key: changeme_hyperkitty_api_key
```

### Django Configuration

```bash
sudo nano /etc/mailman3/mailman-web.py
```

Key settings to configure:

```python
# Secret key - MUST be changed
SECRET_KEY = 'your-very-secret-key-change-this-immediately'

# Allowed hostnames
ALLOWED_HOSTS = [
    'lists.example.com',
    'localhost',
    '127.0.0.1',
]

# Database for web components
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': '/var/lib/mailman3/web/mailman-web.db',
    }
}

# For PostgreSQL:
# DATABASES = {
#     'default': {
#         'ENGINE': 'django.db.backends.postgresql_psycopg2',
#         'NAME': 'mailmanweb',
#         'USER': 'mailmanweb',
#         'PASSWORD': 'webpassword',
#         'HOST': 'localhost',
#         'PORT': '5432',
#     }
# }

# Email settings for web app notifications
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'localhost'
EMAIL_PORT = 25

# Hyperkitty API key (must match mailman-hyperkitty.cfg)
MAILMAN_ARCHIVER_KEY = 'changeme_hyperkitty_api_key'

# Site ID
SITE_ID = 1

# Time zone
TIME_ZONE = 'UTC'
```

## Postfix Integration

Mailman 3 receives messages via LMTP. Configure Postfix to deliver to Mailman:

```bash
# Generate Postfix transport maps
sudo mailman aliases

# This creates/updates:
# /var/lib/mailman3/data/postfix_lmtp
# /var/lib/mailman3/data/postfix_domains

# Add to Postfix main.cf
sudo nano /etc/postfix/main.cf
```

```ini
# Add Mailman's transport map
transport_maps = hash:/var/lib/mailman3/data/postfix_lmtp

# Add Mailman's domains as virtual domains
relay_domains = hash:/var/lib/mailman3/data/postfix_domains

# LMTP delivery to Mailman core
mailman_destination_recipient_limit = 1
```

```bash
# Create the Postfix hash maps
sudo postmap hash:/var/lib/mailman3/data/postfix_lmtp
sudo postmap hash:/var/lib/mailman3/data/postfix_domains

# Reload Postfix
sudo systemctl reload postfix
```

### Set Up Automatic Map Updates

Mailman updates these maps when lists are created/deleted. Configure Postfix to reload automatically:

```bash
sudo nano /etc/mailman3/mailman.cfg
```

```ini
[mta]
# Command to reload Postfix after map changes
postfix_map_cmd: /usr/sbin/postmap
```

## Starting Mailman Services

```bash
# Start Mailman core
sudo systemctl enable --now mailman3

# Initialize the web database
sudo mailman3-web migrate
sudo mailman3-web collectstatic --noinput

# Create a superuser for the web interface
sudo mailman3-web createsuperuser

# Start the web application server
sudo systemctl enable --now mailman3-web
```

## Web Server Configuration (Nginx)

```bash
sudo nano /etc/nginx/sites-available/mailman3
```

```nginx
server {
    listen 80;
    server_name lists.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name lists.example.com;

    ssl_certificate /etc/ssl/certs/lists.example.com.crt;
    ssl_certificate_key /etc/ssl/private/lists.example.com.key;

    # Serve static files directly
    location /static {
        alias /var/lib/mailman3/web/static;
    }

    # Proxy to Mailman web (gunicorn on port 8000)
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/mailman3 /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Creating and Managing Mailing Lists

### Via Command Line

```bash
# Add your domain to Mailman
sudo mailman create --domain lists.example.com

# Create a new mailing list
sudo mailman create --owner admin@example.com announce@lists.example.com

# List all mailing lists
sudo mailman lists

# View list configuration
sudo mailman config list announce@lists.example.com

# Set a configuration value
sudo mailman config set announce@lists.example.com subject_prefix "[Announce]"

# Add subscribers
sudo mailman addmembers --welcome-msg=no announce@lists.example.com << EOF
user1@example.com  User One
user2@example.com  User Two
EOF

# Remove a subscriber
sudo mailman delmembers --file - announce@lists.example.com << EOF
user1@example.com
EOF

# List members
sudo mailman members announce@lists.example.com
```

### Via REST API

Mailman 3 exposes a REST API that Postorius uses. You can interact with it directly:

```bash
# List all mailing lists
curl -u restadmin:changeme_rest_password \
    http://localhost:8001/3.1/lists

# Create a list
curl -u restadmin:changeme_rest_password \
    -X POST \
    -d "fqdn_listname=newlist@lists.example.com" \
    http://localhost:8001/3.1/lists

# Get list configuration
curl -u restadmin:changeme_rest_password \
    http://localhost:8001/3.1/lists/newlist.lists.example.com/config
```

## Managing List Settings

Through Postorius (the web interface) at `https://lists.example.com/postorius/`, you can configure:

- **Subscription policy** - Confirm, moderate, or open
- **Posting policy** - Who can post (subscribers only, anyone, moderated)
- **Digest mode** - Daily digests vs individual messages
- **Subject prefix** - Add `[Listname]` prefix to subjects
- **Reply-To** - Where replies go (list, sender, specific address)
- **Archiving** - Enable/disable HyperKitty archiving

```bash
# Common settings via command line
# Set maximum message size (bytes)
sudo mailman config set mylist@lists.example.com max_message_size 100

# Require approval for non-member posts
sudo mailman config set mylist@lists.example.com default_nonmember_action hold

# Archive messages
sudo mailman config set mylist@lists.example.com archive_policy public
```

## Handling Bounces

Mailman 3 handles bounces automatically. When a member's address bounces repeatedly, Mailman disables delivery or removes them:

```bash
# Check bounce information for a list
curl -u restadmin:password http://localhost:8001/3.1/lists/mylist.lists.example.com/bans

# View bounce info for a member
sudo mailman info user@example.com
```

## Sending to a List

Once configured, send email to the list address:
- **Post to list**: `mylist@lists.example.com`
- **Owner contact**: `mylist-owner@lists.example.com`
- **Request address**: `mylist-request@lists.example.com`
- **Bounces**: `mylist-bounces@lists.example.com`

```bash
# Test sending to the list
echo "Test message to the list" | mail -s "Test" mylist@lists.example.com

# Monitor delivery
sudo tail -f /var/log/mailman3/mailman.log
sudo tail -f /var/log/mail.log
```

Mailman 3's separated architecture is more maintainable than Mailman 2, and the web interface makes administration much more accessible. The main complexity is the Postfix integration - getting the LMTP transport and domain configuration right is essential for messages to flow correctly.
