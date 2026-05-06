# How to Configure Gunicorn for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Gunicorn, Python, IPv6, WSGI, Deployment, Dual-Stack, Worker

Description: Configure Gunicorn to listen on IPv6 addresses, bind to multiple interfaces, and integrate with NGINX for dual-stack Python application deployment.

## Introduction

Gunicorn (Green Unicorn) is the most popular WSGI server for Python applications. It supports IPv6 binding using bracket notation in the bind address. This post covers single and dual-stack binding, worker configuration, and NGINX integration.

## Step 1: Basic IPv6 Binding

```bash
# Bind to all IPv6 interfaces
# On Linux, this also accepts IPv4 if net.ipv6.bindv6only=0.

gunicorn --bind "[::]:8000" app:application

# Bind to IPv6 loopback only
gunicorn --bind "[::1]:8000" app:application

# Bind to specific IPv6 address
gunicorn --bind "[2001:db8::1]:8000" app:application

# Bind both IPv4 and IPv6 loopback addresses
gunicorn \
    --bind "127.0.0.1:8000" \
    --bind "[::1]:8000" \
    app:application
```

## Step 2: Gunicorn Configuration File

```python
# gunicorn.conf.py

# IPv4 + IPv6 loopback binding
bind = [
    "[::1]:8000",      # IPv6 loopback
    "127.0.0.1:8000",  # IPv4 loopback
]

# Worker configuration
workers = 4
worker_class = "gthread"   # or "sync", "gevent", "uvicorn_worker.UvicornWorker"
threads = 2                # Used by gthread
worker_connections = 1000  # Used by gthread/gevent

# Timeouts
timeout = 30
keepalive = 5

# Access logging
accesslog = "/var/log/gunicorn/access.log"
errorlog  = "/var/log/gunicorn/error.log"
loglevel  = "info"

# Log client IPs behind a reverse proxy
access_log_format = '%({x-forwarded-for}i)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s"'
# %{x-forwarded-for}i = client IP chain passed by the reverse proxy

# Process naming
proc_name = "myapp"

# Security
forwarded_allow_ips = "::1,127.0.0.1,2001:db8::1"
```

## Step 3: Forwarded Allow IPs for IPv6 Proxy

```python
# gunicorn.conf.py

# Trust these proxy IPs for forwarded secure headers such as X-Forwarded-Proto
forwarded_allow_ips = "::1,127.0.0.1"

# Or trust a subnet of proxy IPs
forwarded_allow_ips = "::1,127.0.0.0/8,2001:db8::/32"

# Trust all (dangerous - only in trusted networks)
# forwarded_allow_ips = "*"
```

## Step 4: Systemd Service

```ini
# /etc/systemd/system/gunicorn.service
[Unit]
Description=Gunicorn IPv6 WSGI server
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/myapp
Environment="PATH=/var/www/myapp/venv/bin"
ExecStart=/var/www/myapp/venv/bin/gunicorn \
    --config /var/www/myapp/gunicorn.conf.py \
    myapp.wsgi:application
ExecReload=/bin/kill -s HUP $MAINPID
KillMode=mixed
TimeoutStopSec=5
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload
systemctl enable --now gunicorn
systemctl status gunicorn

# Verify IPv6 listening
ss -lntp | grep :8000
# tcp  LISTEN  0  2048  [::1]:8000  [::]:*  users:(("gunicorn",...))
```

## Step 5: NGINX + Gunicorn IPv6

```nginx
upstream gunicorn_backend {
    server [::1]:8000;
}

server {
    listen [::]:80;
    listen 80;
    server_name example.com;

    location / {
        proxy_pass http://gunicorn_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /static/ {
        alias /var/www/myapp/static/;
    }
}
```

## Step 6: Async Workers (Uvicorn) for ASGI

```bash
# For FastAPI / Django ASGI / Starlette (install uvicorn-worker first)
gunicorn myapp.asgi:application \
    --worker-class uvicorn_worker.UvicornWorker \
    --bind "[::]:8000" \
    --workers 4
```

## Troubleshooting

```bash
# If you omit brackets around an IPv6 address, Gunicorn will not parse it correctly
# Wrong:  --bind ":::8000"
# Right:  --bind "[::]:8000"

# Error: Address already in use
# Check what's on port 8000
ss -lntp | grep :8000
fuser 8000/tcp

# Verify Gunicorn actually bound to IPv6
curl -6 http://[::1]:8000/health
```

## Conclusion

Gunicorn binds to IPv6 with bracket notation: `--bind "[::]:8000"`. Use `gunicorn.conf.py` for production configuration including `forwarded_allow_ips` to trust IPv4 and IPv6 proxy addresses for forwarded secure headers. Run Gunicorn behind NGINX with `proxy_pass http://[::1]:8000` for best performance. Monitor Gunicorn worker health and response times with OneUptime.
