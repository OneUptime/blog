# How to Configure Application Bind Addresses for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Bind Address, Networking, Linux, Application Configuration, Dual-Stack

Description: Configure application listen and bind addresses to support IPv6 across common web servers, databases, and custom applications using wildcard and specific IPv6 addresses.

## Introduction

Many applications are configured to bind on IPv4 addresses only, preventing IPv6 clients from connecting. To accept IPv6 connections, applications must bind to the IPv6 wildcard address (`::`) or specific IPv6 addresses. This guide covers bind address configuration for common services.

## Understanding Bind Addresses

| Bind Address | Protocol | Accepts From |
|-------------|----------|--------------|
| `0.0.0.0` | IPv4 only | All IPv4 interfaces |
| `::` with `IPV6_V6ONLY=0` | Dual-stack | All IPv4 and IPv6 |
| `::` with `IPV6_V6ONLY=1` | IPv6 only | All IPv6 interfaces |
| `2001:db8::1` | IPv6 only | Only that address |
| `127.0.0.1` | IPv4 loopback | Loopback only |
| `::1` | IPv6 loopback | Loopback only |

## Nginx: Dual-Stack Binding

```nginx
# Listen on both IPv4 and IPv6

server {
    listen 80;           # IPv4 on all interfaces
    listen [::]:80;      # IPv6 on all interfaces
    server_name example.com;
    ...
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    ...
}

# Listen on specific IPv6 address only
server {
    listen [2001:db8::1]:8080;
    ...
}
```

## Apache: IPv6 Bind Configuration

```apache
# /etc/apache2/ports.conf
# Listen on all interfaces; on most platforms this covers IPv4 and IPv6
Listen 80

Listen 443

# If your Apache build uses separate IPv4 and IPv6 sockets, configure both explicitly:
# Listen 0.0.0.0:80
# Listen [::]:80
# Listen 0.0.0.0:443
# Listen [::]:443

# Verify IPv6 listeners after restart
# ss -6 -tlnp
```

## PostgreSQL: Accepting IPv6 Connections

```bash
# /etc/postgresql/15/main/postgresql.conf
# Listen on all interfaces including IPv6
listen_addresses = '*'

# Or specific addresses:
listen_addresses = 'localhost, ::1, 2001:db8::10'
```

Update `pg_hba.conf` to allow IPv6 connections:

```text
# /etc/postgresql/15/main/pg_hba.conf
# Allow IPv6 loopback
host    all     all     ::1/128             md5

# Allow IPv6 subnet
host    all     all     2001:db8::/32       md5

# Allow all IPv6 (less secure)
host    all     all     ::0/0               md5
```

```bash
sudo systemctl restart postgresql
sudo ss -6 -tlnp | grep 5432  # Should show an IPv6 listener on port 5432
```

## Redis: IPv6 Bind Address

```bash
# /etc/redis/redis.conf
# Bind to both IPv4 loopback and IPv6 loopback
bind 127.0.0.1 ::1

# Bind to all interfaces (include both protocols)
bind 0.0.0.0 ::

# Bind to specific IPv6 address only
bind 2001:db8::10
```

```bash
sudo systemctl restart redis-server
sudo ss -6 -tlnp | grep 6379
```

## Node.js: Setting Bind Address

```javascript
const http = require('http');

// HTTP server - bind to IPv6 wildcard
const server = http.createServer((req, res) => {
  res.end('Hello from IPv6');
});

// '::' = all IPv6 interfaces; in most operating systems, this may also accept IPv4
server.listen(3000, '::', () => {
  console.log('Listening on [::]:3000');
});

// Express equivalent (separate app/process)
const express = require('express');
const app = express();
app.listen(3001, '::', () => console.log('Express on [::]:3001'));

// To bind Express to a specific IPv6 address instead, replace '::' with '2001:db8::10':
// app.listen(3001, '2001:db8::10', () => console.log('Express on [2001:db8::10]:3001'));
```

## Python Flask/Gunicorn: IPv6 Binding

```bash
# Gunicorn: bind to IPv6 wildcard
gunicorn --bind "[::]:8080" myapp:app

# Bind to specific IPv6 address
gunicorn --bind "[2001:db8::10]:8080" myapp:app

# Bind to both IPv4 and IPv6 explicitly
gunicorn --bind "0.0.0.0:8080" --bind "[::]:8080" myapp:app
```

```python
# Flask development server (not for production)
from flask import Flask
app = Flask(__name__)

if __name__ == '__main__':
    # Bind to IPv6 wildcard
    app.run(host='::', port=8080, debug=True)
```

## Docker: Exposing Ports on IPv6

```yaml
# docker-compose.yml
services:
  webapp:
    image: nginx
    ports:
      # Requires Docker IPv6 support on the host/daemon
      # Expose on both IPv4 and IPv6
      - "0.0.0.0:80:80"    # IPv4
      - "[::]:80:80"        # IPv6
      # Or use the shorthand below instead of the two lines above; with Docker IPv6 enabled,
      # it publishes on both IPv4 and IPv6 by default.
      # - "80:80"
```

## Verifying Bind Addresses

After configuring, verify applications are listening on IPv6:

```bash
# Show all listening TCP sockets with process names
ss -tlnp

# Show only IPv6 listening TCP sockets
ss -6 -tlnp

# Example output format varies by ss version, but you should see the service port
# in the IPv6 listener table, for example:
# LISTEN  0  128  [::]:80  [::]:*  users:(("nginx",pid=1234,fd=7))
```

## Conclusion

Binding applications to IPv6 requires adding an IPv6 listen address such as `::` or a specific IPv6 address, and in some cases keeping a separate IPv4 listener as well. For web servers, add parallel `listen [::]:port` directives where required. For databases and caches, include `::` or `::1` in the bind address list. Always verify with `ss -6 -tlnp` that an IPv6 listener appears for the expected port after configuration changes.
