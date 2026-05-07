# How to Use Let's Encrypt with Podman Containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Let's Encrypt, SSL, TLS, Certbot, HTTPS

Description: Learn how to obtain and automatically renew free TLS certificates from Let's Encrypt for Podman containers using Certbot, Caddy, and Traefik.

---

> Let's Encrypt provides free, automated TLS certificates that are trusted by all major browsers. Integrating Let's Encrypt with Podman containers eliminates the cost and manual effort of managing production SSL certificates.

Deploying HTTPS in production used to require purchasing certificates from a Certificate Authority and manually installing them. Let's Encrypt changed this by offering free, automatically renewable certificates through the ACME protocol. When running containers with Podman, you have several approaches to integrate Let's Encrypt: using Certbot alongside an Nginx proxy, using Caddy with its built-in ACME client, or using Traefik with automatic certificate management.

This guide covers all three approaches so you can choose the one that best fits your environment.

---

## Prerequisites

- Podman 4.0 or later
- A public-facing server with ports 80 and 443 open
- One or more domain names with DNS A records pointing to your server
- A Linux system with systemd

Let's Encrypt validates domain ownership by connecting to your server, so your server must be publicly reachable on ports 80 and 443.

## Approach 1: Certbot with Nginx

This approach uses Certbot to obtain certificates and Nginx as the reverse proxy.

### Set Up the Directory Structure

```bash
mkdir -p ~/letsencrypt/{certbot/conf,certbot/www,nginx/conf.d}
```

### Create the Initial Nginx Configuration

Start with an HTTP-only configuration that serves the ACME challenge:

```bash
cat > ~/letsencrypt/nginx/conf.d/default.conf << 'EOF'
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}
EOF
```

### Create the Podman Network and Start Services

```bash
podman network create letsencrypt-net

podman run -d \
  --name backend \
  --network letsencrypt-net \
  docker.io/library/nginx:alpine

podman run -d \
  --name nginx-proxy \
  --network letsencrypt-net \
  -p 80:80 \
  -p 443:443 \
  -v ~/letsencrypt/nginx/conf.d:/etc/nginx/conf.d:ro,Z \
  -v ~/letsencrypt/certbot/conf:/etc/letsencrypt:ro,z \
  -v ~/letsencrypt/certbot/www:/var/www/certbot:ro,z \
  docker.io/library/nginx:alpine
```

### Obtain the Certificate

Run Certbot in a container to obtain the certificate:

```bash
podman run --rm \
  -v ~/letsencrypt/certbot/conf:/etc/letsencrypt:z \
  -v ~/letsencrypt/certbot/www:/var/www/certbot:z \
  docker.io/certbot/certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email \
  -d yourdomain.com \
  -d www.yourdomain.com
```

Certbot places the certificate and key in `/etc/letsencrypt/live/yourdomain.com/`.

### Update Nginx for HTTPS

Now update the configuration to use the certificate:

```bash
cat > ~/letsencrypt/nginx/conf.d/default.conf << 'EOF'
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    http2 on;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;

    location / {
        proxy_pass http://backend:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
```

Reload Nginx:

```bash
podman exec nginx-proxy nginx -s reload
```

### Automatic Certificate Renewal

Let's Encrypt certificates expire after 90 days. Set up automatic renewal with a systemd timer:

```bash
mkdir -p ~/.config/systemd/user

cat > ~/.config/systemd/user/certbot-renew.service << 'EOF'
[Unit]
Description=Certbot certificate renewal

[Service]
Type=oneshot
ExecStart=%h/.local/bin/certbot-renew.sh
EOF

cat > ~/.config/systemd/user/certbot-renew.timer << 'EOF'
[Unit]
Description=Run Certbot renewal twice daily

[Timer]
OnCalendar=*-*-* 00,12:00:00
RandomizedDelaySec=3600
Persistent=true

[Install]
WantedBy=timers.target
EOF
```

Create the renewal script:

```bash
mkdir -p ~/.local/bin

cat > ~/.local/bin/certbot-renew.sh << 'SCRIPT'
#!/bin/bash
podman run --rm \
  -v "$HOME/letsencrypt/certbot/conf:/etc/letsencrypt:z" \
  -v "$HOME/letsencrypt/certbot/www:/var/www/certbot:z" \
  docker.io/certbot/certbot renew --quiet

podman exec nginx-proxy nginx -s reload
SCRIPT
chmod +x ~/.local/bin/certbot-renew.sh
```

If you want the user timer to keep running after logout and across reboots, enable lingering, then enable the timer:

```bash
loginctl enable-linger "$USER"
systemctl --user daemon-reload
systemctl --user enable --now certbot-renew.timer
```

## Approach 2: Caddy with Automatic HTTPS

Caddy has a built-in ACME client and manages HTTPS certificates automatically with no additional configuration.

### Create the Caddyfile

```bash
mkdir -p ~/caddy-le/{data,config}

cat > ~/caddy-le/Caddyfile << 'EOF'
yourdomain.com {
    reverse_proxy backend:80
}

www.yourdomain.com {
    redir https://yourdomain.com{uri}
}
EOF
```

### Run Caddy

```bash
podman network create caddy-le-net

podman run -d \
  --name backend \
  --network caddy-le-net \
  docker.io/library/nginx:alpine

podman run -d \
  --name caddy \
  --network caddy-le-net \
  -p 80:80 \
  -p 443:443 \
  -v ~/caddy-le/Caddyfile:/etc/caddy/Caddyfile:ro,Z \
  -v ~/caddy-le/data:/data:Z \
  -v ~/caddy-le/config:/config:Z \
  docker.io/library/caddy:2-alpine
```

Caddy automatically obtains and renews a publicly trusted certificate, configures HTTPS, and redirects HTTP to HTTPS. No timer, no script, no additional configuration.

## Approach 3: Traefik with ACME

Traefik also supports automatic certificate management through its built-in ACME client.

### Create the Configuration

```bash
mkdir -p ~/traefik-le/{config,dynamic,acme}
touch ~/traefik-le/acme/acme.json
chmod 600 ~/traefik-le/acme/acme.json

cat > ~/traefik-le/config/traefik.yml << 'EOF'
entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https

  websecure:
    address: ":443"

certificatesResolvers:
  letsencrypt:
    acme:
      email: your-email@example.com
      storage: /acme/acme.json
      httpChallenge:
        entryPoint: web

providers:
  file:
    directory: /etc/traefik/dynamic
    watch: true
EOF

cat > ~/traefik-le/dynamic/services.yml << 'EOF'
http:
  routers:
    backend-router:
      rule: "Host(`yourdomain.com`)"
      service: backend-service
      entryPoints:
        - websecure
      tls:
        certResolver: letsencrypt

  services:
    backend-service:
      loadBalancer:
        servers:
          - url: "http://backend:80"
EOF
```

### Run Traefik

```bash
podman network create traefik-le-net

podman run -d \
  --name backend \
  --network traefik-le-net \
  docker.io/library/nginx:alpine

podman run -d \
  --name traefik \
  --network traefik-le-net \
  -p 80:80 \
  -p 443:443 \
  -v ~/traefik-le/config/traefik.yml:/etc/traefik/traefik.yml:ro,Z \
  -v ~/traefik-le/dynamic:/etc/traefik/dynamic:ro,Z \
  -v ~/traefik-le/acme:/acme:Z \
  docker.io/library/traefik:v3.0
```

Traefik automatically handles the ACME challenge, obtains the certificate, and renews it.

## DNS Challenge for Wildcard Certificates

For wildcard certificates (`*.yourdomain.com`), you need to use the DNS challenge instead of the HTTP challenge. Here is an example using Certbot with the Cloudflare DNS plugin:

```bash
cat > ~/letsencrypt/cloudflare.ini << 'EOF'
dns_cloudflare_api_token = your-cloudflare-api-token
EOF
chmod 600 ~/letsencrypt/cloudflare.ini

podman run --rm \
  -v ~/letsencrypt/certbot/conf:/etc/letsencrypt:z \
  -v ~/letsencrypt/cloudflare.ini:/etc/cloudflare.ini:ro,Z \
  docker.io/certbot/dns-cloudflare certonly \
  --dns-cloudflare \
  --dns-cloudflare-credentials /etc/cloudflare.ini \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email \
  -d yourdomain.com \
  -d "*.yourdomain.com"
```

## Verifying Your Certificates

After setup, verify the certificate is valid and trusted:

```bash
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com < /dev/null 2>/dev/null | openssl x509 -noout -subject -issuer -dates
```

You should see the issuer as "Let's Encrypt" and the dates showing 90-day validity.

## Conclusion

Let's Encrypt removes the cost and complexity of TLS certificate management for Podman containers. If you want full control, use Certbot with Nginx and a systemd timer for renewal. If you prefer zero-configuration HTTPS, Caddy handles everything automatically. Traefik sits in between, offering automatic certificates with more granular routing control. Whichever approach you choose, the result is the same: free, trusted, automatically renewed TLS certificates protecting your containerized services.
