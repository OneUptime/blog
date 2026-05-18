# How to Set Up Mailing Lists with Mailman 3 on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Email, Mailman, Mailing List, System Administration

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

[archiver.hyperkitty]
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

Mailman regenerates these maps and runs `postmap` on them automatically when lists are created or deleted (Postfix re-reads hash maps on the fly, so no `postfix reload` is needed). The command Mailman invokes is the `postmap_command` option, which lives in the `[postfix]` section of the Postfix configuration file referenced by `[mta] configuration:` in `mailman.cfg`. The bundled `mailman.config.postfix` module (used by default when `[mta] configuration:` is unset, and shipped with `mailman3-full`) already sets this to `/usr/sbin/postmap`, which is correct on Ubuntu, so no override is normally needed. To override it, create your own Postfix config file and point `[mta]` at it:

```ini
# /etc/mailman3/postfix.cfg
[postfix]
postmap_command: /usr/sbin/postmap
transport_file_type: hash
```

```ini
# /etc/mailman3/mailman.cfg
[mta]
configuration: /etc/mailman3/postfix.cfg
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
# Create a new mailing list. The -d/--domain flag is a boolean toggle that
# auto-creates the domain if it doesn't already exist (use -D to disable).
sudo mailman create -d --owner admin@example.com announce@lists.example.com

# List all mailing lists
sudo mailman lists

# The mailman CLI has no "config" subcommand for editing list settings -
# use Postorius or the REST API (see the REST API section below) to read
# or update fields like subject_prefix.

# Add subscribers. FILENAME is a required positional argument and "-" reads
# from stdin. Lines must be RFC 822 addresses (angle-bracket or comment form).
sudo mailman addmembers --no-welcome-msg - announce@lists.example.com << EOF
User One <user1@example.com>
User Two <user2@example.com>
EOF

# Remove subscribers. The list is selected with -l/--list (not a positional
# argument), and --file - reads addresses from stdin.
sudo mailman delmembers -l announce@lists.example.com --file - << EOF
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
# List settings are edited via Postorius or the REST API. PATCH the list's
# /config endpoint with the fields you want to change. The list_id in the
# URL is the fully-qualified list name with "@" replaced by ".".

# Set maximum message size (in KB)
curl -u restadmin:changeme_rest_password \
    -X PATCH \
    -d "max_message_size=100" \
    http://localhost:8001/3.1/lists/mylist.lists.example.com/config

# Require approval for non-member posts
curl -u restadmin:changeme_rest_password \
    -X PATCH \
    -d "default_nonmember_action=hold" \
    http://localhost:8001/3.1/lists/mylist.lists.example.com/config

# Archive messages
curl -u restadmin:changeme_rest_password \
    -X PATCH \
    -d "archive_policy=public" \
    http://localhost:8001/3.1/lists/mylist.lists.example.com/config
```

## Handling Bounces

Mailman 3 handles bounces automatically. When a member's address bounces repeatedly, Mailman disables delivery or removes them. Per-member bounce state lives on the membership record:

```bash
# Inspect a single membership (the member_id comes from
# /3.1/lists/<list_id>/roster/member) - the response includes
# bounce_score and last_bounce_received.
curl -u restadmin:changeme_rest_password \
    http://localhost:8001/3.1/members/<member_id>

# List addresses that are banned from a list (separate from bounce state)
curl -u restadmin:changeme_rest_password \
    http://localhost:8001/3.1/lists/mylist.lists.example.com/bans

# Show information about this Mailman instance (mailman info takes no
# positional arguments - it does not look up a user)
sudo mailman info
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
