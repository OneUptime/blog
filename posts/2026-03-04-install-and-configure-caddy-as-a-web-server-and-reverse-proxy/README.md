# How to Install and Configure Caddy as a Web Server and Reverse Proxy on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Caddy, Web Server, Reverse Proxy, Linux

Description: Learn how to install and Configure Caddy as a Web Server and Reverse Proxy on RHEL 9 with step-by-step instructions, configuration examples, and best practices.

---

Caddy is a modern web server that automatically provisions and renews TLS certificates. It serves as both a web server for static content and a reverse proxy for backend applications, with one of the simplest configuration syntaxes available.

## Prerequisites

- RHEL 9
- Root or sudo access

## Step 1: Install Caddy

```bash
sudo dnf install -y 'dnf-command(copr)'
sudo dnf copr enable -y @caddy/caddy
sudo dnf install -y caddy
```

Or install manually:

```bash
curl -L "https://github.com/caddyserver/caddy/releases/latest/download/caddy_linux_amd64.tar.gz" | tar xz
sudo mv caddy /usr/local/bin/
```

## Step 2: Create a Caddyfile

```bash
sudo vi /etc/caddy/Caddyfile
```

### Serve Static Files

```
example.com {
    root * /var/www/html
    file_server
}
```

### Reverse Proxy

```
api.example.com {
    reverse_proxy localhost:3000
}
```

### Multiple Sites

```
example.com {
    root * /var/www/html
    file_server
}

api.example.com {
    reverse_proxy localhost:3000
}

admin.example.com {
    reverse_proxy localhost:8080
    basicauth {
        admin $2a$14$hashed_password_here
    }
}
```

## Step 3: Start and Enable Caddy

```bash
sudo systemctl enable --now caddy
sudo systemctl status caddy
```

## Step 4: Configure Firewall

```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

## Step 5: Verify HTTPS

Caddy automatically obtains TLS certificates for your domains:

```bash
curl -v https://example.com 2>&1 | grep "SSL certificate"
```

## Step 6: Format and Validate

```bash
caddy fmt --overwrite /etc/caddy/Caddyfile
caddy validate --config /etc/caddy/Caddyfile
```

## Step 7: Reload Configuration

```bash
sudo systemctl reload caddy
```

Caddy supports zero-downtime reloads.

## Conclusion

Caddy provides automatic HTTPS, simple configuration syntax, and both static file serving and reverse proxying on RHEL 9. Its automatic TLS certificate management eliminates one of the most tedious aspects of running a web server.
