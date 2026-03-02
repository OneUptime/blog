# How to Set Up a Python WSGI Application with Gunicorn on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Python, Gunicorn, NGINX, Web Server

Description: Deploy a Python WSGI application using Gunicorn as the application server and Nginx as a reverse proxy on Ubuntu, with systemd service management.

---

Django and Flask are two of the most popular Python web frameworks, and both use WSGI (Web Server Gateway Interface) as the standard protocol for communicating with application servers. Gunicorn (Green Unicorn) is a battle-tested WSGI server that handles the connection between your Python application and the outside world. Nginx sits in front of Gunicorn to handle static files, SSL, and connection management.

## Application Setup

This guide assumes you have a Python application ready. If not, here is a minimal Flask application for testing:

```bash
# Create a project directory
mkdir /var/www/myapp
cd /var/www/myapp

# Create a virtual environment
python3 -m venv venv
source venv/bin/activate

# Install Flask and Gunicorn
pip install flask gunicorn

# Create the application
cat > app.py << 'EOF'
from flask import Flask

app = Flask(__name__)

@app.route('/')
def index():
    return 'Hello from Flask!'

@app.route('/health')
def health():
    return {'status': 'ok'}, 200

# This is the WSGI entry point that Gunicorn uses
# The variable name 'application' is a WSGI convention
application = app

if __name__ == '__main__':
    app.run(debug=True)
EOF
```

For a Django application, the WSGI entry point is typically at `myproject/wsgi.py` and exports an `application` object automatically.

## Installing Gunicorn

Install Gunicorn inside your project's virtual environment:

```bash
cd /var/www/myapp
source venv/bin/activate

# Install Gunicorn
pip install gunicorn

# For better performance, install the async workers too
pip install gevent  # or eventlet

# Save all dependencies
pip freeze > requirements.txt
```

## Running Gunicorn Manually

Test that your application runs with Gunicorn before configuring it as a service:

```bash
cd /var/www/myapp
source venv/bin/activate

# Basic run: 4 worker processes on port 8000
gunicorn --workers 4 --bind 127.0.0.1:8000 app:application

# For Django
# gunicorn --workers 4 --bind 127.0.0.1:8000 myproject.wsgi:application

# Run with a Unix socket instead (preferred with Nginx)
gunicorn --workers 4 --bind unix:/run/gunicorn/myapp.sock app:application
```

Test the connection:

```bash
# If bound to port
curl http://127.0.0.1:8000/

# If bound to socket (from another terminal)
curl --unix-socket /run/gunicorn/myapp.sock http://localhost/
```

## Calculating Worker Count

Gunicorn's recommended formula for synchronous workers is:

```
workers = (2 * CPU cores) + 1
```

Check CPU count:

```bash
nproc --all
# If output is 4, use 9 workers
```

For I/O-heavy applications (lots of database calls, external API requests), use async workers which can handle more concurrent connections:

```bash
# Use gevent async workers (handles I/O-bound workloads better)
gunicorn --workers 4 --worker-class gevent --worker-connections 1000 \
    --bind unix:/run/gunicorn/myapp.sock app:application
```

## Creating a Gunicorn Configuration File

Rather than passing all options on the command line, use a configuration file:

```bash
cat > /var/www/myapp/gunicorn.conf.py << 'EOF'
# /var/www/myapp/gunicorn.conf.py

# Binding
bind = "unix:/run/gunicorn/myapp.sock"

# Worker processes
workers = 9  # (2 * CPU cores) + 1
worker_class = "sync"  # Use "gevent" for I/O-bound apps
worker_connections = 1000  # Used with async workers
threads = 1  # Threads per worker (only for gthread worker class)

# Timeouts
timeout = 30  # Kill worker if it takes longer than this
keepalive = 2  # Seconds to wait for next request on keepalive connection
graceful_timeout = 30  # Time for workers to finish current requests on restart

# Performance
max_requests = 1000  # Restart workers after this many requests (prevents memory leaks)
max_requests_jitter = 50  # Random variation to prevent all workers restarting at once

# Logging
accesslog = "/var/log/gunicorn/myapp-access.log"
errorlog = "/var/log/gunicorn/myapp-error.log"
loglevel = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process management
daemon = False  # Let systemd manage the process
pidfile = "/run/gunicorn/myapp.pid"
user = "www-data"
group = "www-data"
umask = 0o007

# Server hooks
def on_starting(server):
    pass

def worker_exit(server, worker):
    pass
EOF
```

## Creating the systemd Service

Create a systemd service to manage Gunicorn:

```bash
# Create directories for socket and PID files
sudo mkdir -p /run/gunicorn
sudo chown www-data:www-data /run/gunicorn

# Create log directory
sudo mkdir -p /var/log/gunicorn
sudo chown www-data:www-data /var/log/gunicorn

# Create systemd service file
sudo nano /etc/systemd/system/gunicorn-myapp.service
```

```ini
[Unit]
Description=Gunicorn WSGI server for myapp
After=network.target

[Service]
Type=notify
User=www-data
Group=www-data
RuntimeDirectory=gunicorn
WorkingDirectory=/var/www/myapp

# Source virtual environment and run gunicorn
ExecStart=/var/www/myapp/venv/bin/gunicorn \
    --config /var/www/myapp/gunicorn.conf.py \
    app:application

# Reload workers on SIGUSR2 (zero-downtime deploys)
ExecReload=/bin/kill -s HUP $MAINPID

# On failure, restart after 5 seconds
Restart=on-failure
RestartSec=5

# Environment variables for the application
Environment="DJANGO_SETTINGS_MODULE=myproject.settings"
Environment="APP_ENV=production"

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl start gunicorn-myapp
sudo systemctl enable gunicorn-myapp
sudo systemctl status gunicorn-myapp

# Check the socket was created
ls -la /run/gunicorn/myapp.sock
```

## Configuring Nginx as Reverse Proxy

```nginx
# /etc/nginx/sites-available/myapp
server {
    listen 80;
    server_name example.com;

    # Serve static files directly (much faster than through Python)
    location /static/ {
        alias /var/www/myapp/staticfiles/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Serve media files directly
    location /media/ {
        alias /var/www/myapp/media/;
        expires 7d;
    }

    # Pass everything else to Gunicorn
    location / {
        proxy_pass http://unix:/run/gunicorn/myapp.sock;

        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts - should be >= gunicorn's timeout
        proxy_read_timeout 35;
        proxy_connect_timeout 35;

        # Buffer settings
        proxy_buffering on;
        proxy_buffer_size 8k;
        proxy_buffers 8 8k;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/myapp /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## Zero-Downtime Deployments

Gunicorn supports graceful restarts, allowing you to deploy new code without dropping connections:

```bash
# Deploy new code
cd /var/www/myapp
git pull

# Activate venv and install new dependencies
source venv/bin/activate
pip install -r requirements.txt

# For Django: run database migrations and collect static files
# python manage.py migrate
# python manage.py collectstatic --no-input

# Gracefully reload Gunicorn (workers finish current requests before restarting)
sudo systemctl reload gunicorn-myapp

# Or send the signal directly
sudo kill -HUP $(cat /run/gunicorn/myapp.pid)
```

## Monitoring Gunicorn

```bash
# Check service status
sudo systemctl status gunicorn-myapp

# Watch logs in real time
sudo journalctl -u gunicorn-myapp -f

# Watch access log
sudo tail -f /var/log/gunicorn/myapp-access.log

# Check how many workers are running
ps aux | grep gunicorn | grep -v grep

# Check socket connections
ss -x | grep gunicorn
```

A properly configured Gunicorn and Nginx setup will serve thousands of requests per second for most web applications. The key is matching worker count to available CPU, using async workers for I/O-heavy workloads, and letting Nginx handle static file serving.
