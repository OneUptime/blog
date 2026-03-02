# How to Deploy a Flask Application on Ubuntu with Nginx and uWSGI

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Flask, uWSGI, Nginx, Python

Description: Deploy a production Flask application on Ubuntu using uWSGI as the application server and Nginx as the reverse proxy, with systemd socket activation for reliability.

---

Flask's built-in development server is single-threaded and not designed for production traffic. uWSGI is a high-performance application server that can host Flask applications via the WSGI interface. It supports multiple worker processes, thread control, request queuing, and health monitoring. Combined with Nginx as a reverse proxy, this stack handles production workloads reliably.

## Prerequisites

- Ubuntu 22.04 or 24.04
- Sudo access
- Flask application code ready to deploy
- A domain name (optional but recommended)

## Setting Up the Application User and Environment

```bash
# Install Python, pip, and venv
sudo apt update
sudo apt install -y python3 python3-pip python3-venv

# Create a dedicated system user for the application
sudo useradd -r -m -d /opt/flaskapp -s /bin/bash flaskapp

# Set up the virtual environment as the app user
sudo -u flaskapp python3 -m venv /opt/flaskapp/venv

# Install Flask and uWSGI in the virtual environment
sudo -u flaskapp /opt/flaskapp/venv/bin/pip install flask uwsgi
```

## Preparing the Flask Application

A minimal Flask application for this walkthrough:

```python
# /opt/flaskapp/myapp/app.py
from flask import Flask
import os

app = Flask(__name__)

@app.route('/')
def index():
    return '<h1>Flask Application Running</h1>', 200

@app.route('/health')
def health():
    return {'status': 'ok'}, 200

if __name__ == '__main__':
    app.run()
```

```bash
# Create the application directory
sudo mkdir -p /opt/flaskapp/myapp
sudo chown flaskapp:flaskapp /opt/flaskapp/myapp

# Copy your application files
# sudo -u flaskapp git clone https://github.com/yourorg/myapp.git /opt/flaskapp/myapp

# Install application dependencies
sudo -u flaskapp /opt/flaskapp/venv/bin/pip install -r /opt/flaskapp/myapp/requirements.txt

# Create environment file
sudo tee /opt/flaskapp/.env > /dev/null <<'EOF'
FLASK_ENV=production
FLASK_SECRET_KEY=your-random-secret-key-here
DATABASE_URL=postgresql://dbuser:pass@localhost:5432/mydb
EOF
sudo chmod 600 /opt/flaskapp/.env
sudo chown flaskapp:flaskapp /opt/flaskapp/.env
```

## Creating the uWSGI Configuration

uWSGI supports both command-line arguments and .ini configuration files. The .ini format is cleaner for production:

```bash
sudo -u flaskapp tee /opt/flaskapp/uwsgi.ini > /dev/null <<'EOF'
[uwsgi]
# Flask application entry point
# module = <python_module>:<callable>
module = app:app

# Run as master process (enables management features)
master = true

# Number of worker processes (2*CPUs + 1 is a common starting point)
processes = 5

# UNIX socket for Nginx communication (faster than TCP)
socket = /opt/flaskapp/uwsgi.sock
chmod-socket = 660
vacuum = true

# Thread support
threads = 2

# Maximum number of requests per worker before recycling
max-requests = 5000

# Log configuration
logto = /var/log/uwsgi/myapp.log
log-date = true

# Die on term signal (allows systemd to manage restart)
die-on-term = true

# Stats server for monitoring
# stats = 127.0.0.1:9191

# Enable cheaper mode for dynamic scaling
# cheaper = 2
# cheaper-initial = 5

# Timeout settings
harakiri = 60
socket-timeout = 30

# Buffer size for large HTTP headers
buffer-size = 32768

# Disable request logging to reduce noise (access logs go in Nginx)
disable-logging = true
log-4xx = true
log-5xx = true
EOF
```

## Testing uWSGI Manually

```bash
# Test that uWSGI starts and serves the application
sudo -u flaskapp bash -c "
source /opt/flaskapp/venv/bin/activate
cd /opt/flaskapp/myapp
export \$(cat /opt/flaskapp/.env | xargs)
uwsgi --ini /opt/flaskapp/uwsgi.ini --socket 127.0.0.1:8000 --protocol http
"
# If this starts without errors, Ctrl+C and proceed to systemd setup
```

## Setting Up systemd for uWSGI

Using systemd socket activation means systemd creates the socket and passes it to uWSGI. The service starts on first connection, reducing memory footprint for lightly used applications.

### Socket Unit

```bash
sudo tee /etc/systemd/system/flaskapp.socket > /dev/null <<'EOF'
[Unit]
Description=uWSGI socket for Flask application

[Socket]
# Socket path must match the 'socket' setting in uwsgi.ini
ListenStream=/opt/flaskapp/uwsgi.sock

# Socket file mode (must be readable by www-data/nginx)
SocketMode=0660
SocketUser=flaskapp
SocketGroup=www-data

[Install]
WantedBy=sockets.target
EOF
```

### Service Unit

```bash
sudo tee /etc/systemd/system/flaskapp.service > /dev/null <<'EOF'
[Unit]
Description=uWSGI service for Flask application
After=network.target
Requires=flaskapp.socket

[Service]
Type=notify
User=flaskapp
Group=www-data

# Working directory
WorkingDirectory=/opt/flaskapp/myapp

# Load environment variables
EnvironmentFile=/opt/flaskapp/.env

# uWSGI startup command with socket activation
ExecStart=/opt/flaskapp/venv/bin/uwsgi --ini /opt/flaskapp/uwsgi.ini

# Graceful reload on SIGHUP
ExecReload=/bin/kill -s HUP $MAINPID

# Stop gracefully
KillSignal=SIGQUIT
TimeoutStopSec=5

# Restart on failure
Restart=on-failure
RestartSec=5s

# Limits
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF
```

```bash
# Create log directory
sudo mkdir -p /var/log/uwsgi
sudo chown flaskapp:flaskapp /var/log/uwsgi

sudo systemctl daemon-reload

# Enable and start the socket (it activates the service on first connection)
sudo systemctl enable flaskapp.socket
sudo systemctl start flaskapp.socket

# Also enable the service so it persists across reboots
sudo systemctl enable flaskapp.service

# Verify status
sudo systemctl status flaskapp.socket
sudo systemctl status flaskapp.service
```

## Configuring Nginx

```bash
sudo apt install -y nginx

sudo tee /etc/nginx/sites-available/flaskapp > /dev/null <<'EOF'
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # TLS certificates
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Security headers
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options SAMEORIGIN;

    # Max upload size
    client_max_body_size 16M;

    # Static files served directly by Nginx
    location /static/ {
        alias /opt/flaskapp/myapp/static/;
        expires 30d;
        add_header Cache-Control "public";
    }

    # Pass all other requests to uWSGI via Unix socket
    location / {
        # uwsgi_pass uses the uWSGI protocol, not HTTP
        uwsgi_pass unix:/opt/flaskapp/uwsgi.sock;

        # Include standard uWSGI parameters
        include /etc/nginx/uwsgi_params;

        # Pass real client IP to the application
        uwsgi_param HTTP_X_REAL_IP $remote_addr;
        uwsgi_param HTTP_X_FORWARDED_FOR $proxy_add_x_forwarded_for;

        # Timeout settings
        uwsgi_connect_timeout 60;
        uwsgi_read_timeout 60;
        uwsgi_send_timeout 60;
    }

    access_log /var/log/nginx/flaskapp_access.log;
    error_log /var/log/nginx/flaskapp_error.log;
}
EOF

sudo ln -sf /etc/nginx/sites-available/flaskapp /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

sudo nginx -t
sudo systemctl reload nginx
```

Note that Nginx communicates with uWSGI using the **uWSGI protocol** (`uwsgi_pass`), not HTTP (`proxy_pass`). The uWSGI protocol is more efficient for this purpose.

## Setting Up SSL

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## Flask Application Configuration for Production

```python
# config.py
import os

class ProductionConfig:
    DEBUG = False
    TESTING = False
    SECRET_KEY = os.environ.get('FLASK_SECRET_KEY')
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')

    # Trust Nginx's X-Forwarded-For header
    # Required when running behind a proxy
    PREFERRED_URL_SCHEME = 'https'
```

```python
# app.py - configure for proxy headers
from flask import Flask
from werkzeug.middleware.proxy_fix import ProxyFix

app = Flask(__name__)

# Apply ProxyFix to handle Nginx forwarded headers correctly
# x_for=1 means trust 1 level of proxy
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)
```

## Deployment Update Process

```bash
# Script to deploy application updates
sudo tee /usr/local/sbin/deploy-flaskapp.sh > /dev/null <<'EOF'
#!/bin/bash
set -e

APP_DIR=/opt/flaskapp/myapp
VENV=/opt/flaskapp/venv

echo "Pulling latest code..."
sudo -u flaskapp git -C $APP_DIR pull

echo "Updating dependencies..."
sudo -u flaskapp $VENV/bin/pip install -r $APP_DIR/requirements.txt --quiet

echo "Reloading uWSGI workers gracefully..."
sudo systemctl reload flaskapp.service

echo "Done."
EOF

sudo chmod +x /usr/local/sbin/deploy-flaskapp.sh
```

## Monitoring and Troubleshooting

```bash
# Check service status
sudo systemctl status flaskapp.service
sudo systemctl status flaskapp.socket

# View uWSGI logs
sudo tail -f /var/log/uwsgi/myapp.log

# View Nginx error log
sudo tail -f /var/log/nginx/flaskapp_error.log

# Check if the socket exists and has correct permissions
ls -la /opt/flaskapp/uwsgi.sock

# If nginx gets "connect() to unix:/opt/flaskapp/uwsgi.sock failed":
# Check socket permissions - nginx user (www-data) needs write access
sudo ls -la /opt/flaskapp/uwsgi.sock

# Restart if needed
sudo systemctl restart flaskapp.service
```

The uWSGI and Nginx combination offers excellent performance and flexibility. uWSGI's master process management, request queuing, and graceful reload capabilities make it well-suited for zero-downtime deployments.
