# How to Configure uWSGI for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: UWSGI, Python, IPv6, WSGI, Deployment, Dual-Stack, Emperor

Description: Configure uWSGI to bind to IPv6 addresses, configure dual-stack listeners, and integrate with NGINX over IPv6 sockets for Python web application deployment.

## Introduction

uWSGI is a feature-rich application server supporting Python WSGI (along with PSGI, Rack, and other language plugins) and multiple protocol modes. IPv6 support requires specific socket notation and configuration to avoid common binding failures.

## Step 1: IPv6 Socket Configuration

```ini
# /etc/uwsgi/apps-available/myapp.ini

[uwsgi]
# Bind to all IPv6 interfaces

http-socket = [::]:8000

# Or use the socket type explicitly
socket = [::]:8000
protocol = http

# Bind to IPv6 loopback only
# http-socket = [::1]:8000

# Bind to specific IPv6 address
# http-socket = [2001:db8::1]:8000

# Dual-stack: bind to both IPv4 and IPv6
# (run two socket lines)
http-socket = 0.0.0.0:8000
http-socket = [::]:8000
```

## Step 2: Full Application Configuration

```ini
# /etc/uwsgi/apps-available/myapp.ini

[uwsgi]
# Application
module = myapp.wsgi:application
chdir = /var/www/myapp

# IPv6 HTTP socket
http-socket = [::]:8000

# Virtualenv
virtualenv = /var/www/myapp/venv

# Workers
workers = 4
threads = 2
harakiri = 30

# Buffer sizes (important for IPv6 headers)
buffer-size = 65536

# Logging
logto = /var/log/uwsgi/myapp.log
log-format = %(addr) %(method) %(uri) %(proto) %(status)
# %(addr) logs the client IPv6 address

# Process management
master = true
vacuum = true
die-on-term = true

# Stats (on IPv6 loopback)
stats = [::1]:9191
```

## Step 3: Unix Socket Alternative (avoids IPv6 complexity)

```ini
[uwsgi]
# Use Unix socket instead of TCP for NGINX communication
socket = /run/uwsgi/myapp.sock
chmod-socket = 660

# Still bind HTTP directly to IPv6 for healthchecks
# http-socket = [::1]:8000
```

## Step 4: uWSGI Emperor (Multi-App)

```ini
# /etc/uwsgi/emperor.ini
[uwsgi]
emperor = /etc/uwsgi/apps-enabled
emperor-procname = uwsgi-emperor

# Each vassal binds its own IPv6 port
```

```bash
# Enable the app
ln -s /etc/uwsgi/apps-available/myapp.ini /etc/uwsgi/apps-enabled/
uwsgi --ini /etc/uwsgi/emperor.ini
```

## Step 5: Systemd Service

```ini
# /etc/systemd/system/uwsgi.service
[Unit]
Description=uWSGI Emperor
After=network.target

[Service]
ExecStartPre=/bin/bash -c 'mkdir -p /run/uwsgi && chown www-data:www-data /run/uwsgi'
ExecStart=/usr/bin/uwsgi --ini /etc/uwsgi/emperor.ini
Restart=on-failure
KillSignal=SIGQUIT
Type=notify
StandardError=syslog
NotifyAccess=all

[Install]
WantedBy=multi-user.target
```

## Step 6: NGINX Integration

```nginx
# TCP socket to uWSGI on IPv6
upstream uwsgi_backend {
    server [::1]:8000;
}

server {
    listen [::]:80;
    listen 80;

    location / {
        include uwsgi_params;
        uwsgi_pass uwsgi_backend;  # For uwsgi protocol
        # Or for HTTP socket:
        # proxy_pass http://[::1]:8000;
    }
}
```

## Troubleshooting

```bash
# Verify uWSGI is listening on IPv6
ss -lntp | grep uwsgi
# or
ss -lntp | grep :8000

# Test IPv6 connectivity
curl -6 http://[::1]:8000/health

# Check uWSGI logs
tail -f /var/log/uwsgi/myapp.log

# Common error: "invalid address" for IPv6
# Ensure bracket notation: [::]:8000 NOT :::8000
uwsgi --http-socket "[::]:8000" --module app:app
```

## Conclusion

uWSGI binds to IPv6 using bracket notation in socket directives: `http-socket = [::]:8000`. For dual-stack, add separate `http-socket` lines for IPv4 and IPv6. The `log-format = %(addr)` correctly logs IPv6 client addresses. Use Unix sockets for NGINX communication when possible - simpler than configuring IPv6 TCP. Monitor uWSGI process health with OneUptime.
