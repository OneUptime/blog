# How to Deploy a Django Application on Ubuntu with Nginx and Gunicorn

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Django, Gunicorn, NGINX, Python

Description: Deploy a production-ready Django application on Ubuntu using Gunicorn as the WSGI server and Nginx as the reverse proxy, with systemd service management.

---

Running Django's built-in development server in production is not suitable - it handles one request at a time and is not hardened for public traffic. Gunicorn (Green Unicorn) is a production WSGI server that spawns multiple worker processes to handle concurrent requests. Nginx sits in front as a reverse proxy, serving static files directly and forwarding dynamic requests to Gunicorn.

## Prerequisites

- Ubuntu 22.04 or 24.04
- Root or sudo access
- A domain name (optional but recommended for HTTPS)
- Your Django project code available on the server

## Setting Up Python Environment

```bash
# Install Python and pip
sudo apt update
sudo apt install -y python3 python3-pip python3-venv

# Create a dedicated user for the application
sudo useradd -m -d /opt/myapp -s /bin/bash myapp

# Switch to the application user
sudo -u myapp -s

# Create a virtual environment
python3 -m venv /opt/myapp/venv

# Activate the virtual environment
source /opt/myapp/venv/bin/activate

# Install Django, Gunicorn, and any other requirements
pip install django gunicorn psycopg2-binary

# Or install from your project's requirements file
# pip install -r /opt/myapp/myproject/requirements.txt

# Exit back to sudo user
exit
```

## Deploying Application Code

```bash
# Create the application directory
sudo mkdir -p /opt/myapp/myproject
sudo chown myapp:myapp /opt/myapp/myproject

# Copy or clone your project code
# (Assuming the code is already on the server)
sudo -u myapp git clone https://github.com/yourorg/myproject.git /opt/myapp/myproject

# Set up environment variables file
sudo -u myapp tee /opt/myapp/.env > /dev/null <<'EOF'
DJANGO_SECRET_KEY=your-long-random-secret-key-here
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
DATABASE_URL=postgresql://dbuser:password@localhost:5432/mydb
STATIC_ROOT=/opt/myapp/static
MEDIA_ROOT=/opt/myapp/media
EOF

sudo chmod 600 /opt/myapp/.env
```

## Configuring Django for Production

```python
# In your settings.py, ensure these production settings are configured:

# settings.py
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY')
DEBUG = os.environ.get('DJANGO_DEBUG', 'False') == 'True'
ALLOWED_HOSTS = os.environ.get('DJANGO_ALLOWED_HOSTS', '').split(',')

# Static files
STATIC_URL = '/static/'
STATIC_ROOT = os.environ.get('STATIC_ROOT', '/opt/myapp/static')

# Media files
MEDIA_URL = '/media/'
MEDIA_ROOT = os.environ.get('MEDIA_ROOT', '/opt/myapp/media')

# Security settings for production
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
```

```bash
# Run Django management commands as the app user
sudo -u myapp bash -c "
source /opt/myapp/venv/bin/activate
cd /opt/myapp/myproject
export \$(cat /opt/myapp/.env | xargs)

# Collect static files
python manage.py collectstatic --noinput

# Run database migrations
python manage.py migrate

# Create a superuser (interactive)
# python manage.py createsuperuser
"

# Create media directory
sudo mkdir -p /opt/myapp/media
sudo chown myapp:www-data /opt/myapp/media
sudo chmod 750 /opt/myapp/media
```

## Testing Gunicorn Manually

Before setting up systemd, verify Gunicorn runs correctly:

```bash
sudo -u myapp bash -c "
source /opt/myapp/venv/bin/activate
cd /opt/myapp/myproject
export \$(cat /opt/myapp/.env | xargs)

# Test with 3 workers, binding to a Unix socket
gunicorn \
    --workers 3 \
    --bind unix:/opt/myapp/gunicorn.sock \
    --log-level debug \
    myproject.wsgi:application
"
# Press Ctrl+C to stop after verifying it starts without errors
```

## Creating a systemd Service for Gunicorn

```bash
sudo tee /etc/systemd/system/gunicorn.service > /dev/null <<'EOF'
[Unit]
Description=Gunicorn WSGI server for Django
After=network.target

[Service]
Type=notify

# Run as the application user
User=myapp
Group=www-data

# Working directory
WorkingDirectory=/opt/myapp/myproject

# Load environment variables
EnvironmentFile=/opt/myapp/.env

# The command to start Gunicorn
# Adjust workers based on CPU cores: 2*CPUs + 1 is a common formula
ExecStart=/opt/myapp/venv/bin/gunicorn \
    --workers 5 \
    --bind unix:/opt/myapp/gunicorn.sock \
    --timeout 120 \
    --access-logfile /var/log/gunicorn/access.log \
    --error-logfile /var/log/gunicorn/error.log \
    --log-level warning \
    myproject.wsgi:application

# Graceful reload on SIGHUP
ExecReload=/bin/kill -s HUP $MAINPID

# Allow process to write to the socket
RuntimeDirectory=gunicorn
RuntimeDirectoryMode=755

# Restart policy
Restart=on-failure
RestartSec=5s

# Resource limits
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF

# Create log directory
sudo mkdir -p /var/log/gunicorn
sudo chown myapp:myapp /var/log/gunicorn

sudo systemctl daemon-reload
sudo systemctl start gunicorn
sudo systemctl enable gunicorn

sudo systemctl status gunicorn
```

## Configuring Nginx

```bash
# Install Nginx
sudo apt install -y nginx

# Create a server configuration for the application
sudo tee /etc/nginx/sites-available/myapp > /dev/null <<'EOF'
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL certificate (from Let's Encrypt or similar)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000" always;

    # Client max body size (for file uploads)
    client_max_body_size 50M;

    # Serve static files directly (bypasses Gunicorn entirely)
    location /static/ {
        alias /opt/myapp/static/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Serve media files directly
    location /media/ {
        alias /opt/myapp/media/;
        expires 7d;
    }

    # Forward all other requests to Gunicorn
    location / {
        proxy_pass http://unix:/opt/myapp/gunicorn.sock;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }

    # Access log
    access_log /var/log/nginx/myapp_access.log;
    error_log /var/log/nginx/myapp_error.log;
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/myapp /etc/nginx/sites-enabled/

# Disable the default site
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration syntax
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

## Setting Up SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain a certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Certbot modifies the Nginx config automatically
# Enable auto-renewal
sudo systemctl enable certbot.timer
sudo certbot renew --dry-run
```

## Deployment Workflow for Updates

```bash
# Create a deployment script
sudo tee /usr/local/sbin/deploy-myapp.sh > /dev/null <<'EOF'
#!/bin/bash
set -e

APP_USER=myapp
APP_DIR=/opt/myapp/myproject
VENV=/opt/myapp/venv

echo "Pulling latest code..."
sudo -u $APP_USER git -C $APP_DIR pull

echo "Installing/updating dependencies..."
sudo -u $APP_USER $VENV/bin/pip install -r $APP_DIR/requirements.txt --quiet

echo "Running migrations..."
sudo -u $APP_USER bash -c "
source $VENV/bin/activate
cd $APP_DIR
export \$(cat /opt/myapp/.env | xargs)
python manage.py migrate --noinput
python manage.py collectstatic --noinput
"

echo "Reloading Gunicorn..."
sudo systemctl reload gunicorn

echo "Deployment complete."
EOF

sudo chmod +x /usr/local/sbin/deploy-myapp.sh
```

## Monitoring

```bash
# Check Gunicorn status
sudo systemctl status gunicorn

# View Gunicorn logs
sudo tail -f /var/log/gunicorn/error.log

# Check Nginx error log
sudo tail -f /var/log/nginx/myapp_error.log

# Monitor active connections
ss -tnp | grep gunicorn

# Check worker processes
ps aux | grep gunicorn
```

The combination of Gunicorn behind Nginx is the most widely used Django production stack. Nginx efficiently handles slow clients and serves static files at the OS level, while Gunicorn focuses on running Python code. This separation keeps the Python processes from blocking on slow network I/O.
