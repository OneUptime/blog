# How to Configure Portainer to Use HTTPS Only

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, HTTPS, TLS, Security, Docker

Description: Learn how to configure Portainer to serve only HTTPS connections and disable insecure HTTP access for production security.

---

By default, Portainer exposes both HTTP (port 9000) and HTTPS (port 9443) interfaces. For production deployments, you should disable HTTP entirely and enforce HTTPS-only access.

## Default Port Behavior

| Port | Protocol | Default State |
|------|----------|--------------|
| 9000 | HTTP | Enabled (if mapped) |
| 9443 | HTTPS | Enabled |
| 8000 | TCP | Edge agent tunnel |

## Method 1: Don't Expose Port 9000

The simplest approach: only publish port 9443 in your Docker run command:

```bash
# Run Portainer without exposing port 9000

# This leaves HTTP inaccessible from outside the container
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest
```

Without `-p 9000:9000`, port 9000 is not reachable from the host network.

## Method 2: Use --http-disabled with Custom Certificates

Disable the HTTP listener entirely and provide your own TLS certificate:

```bash
# Run Portainer with custom SSL certificate and HTTP disabled
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  -v /path/to/certs:/certs \
  portainer/portainer-ce:latest \
  --http-disabled \
  --sslcert /certs/portainer.crt \
  --sslkey /certs/portainer.key
```

The `--http-disabled` flag tells Portainer to serve only on HTTPS, refusing connections on port 9000 even if it is mapped.

## Method 3: HTTPS-Only via Reverse Proxy

Use Nginx to terminate TLS and enforce HTTPS with HSTS headers:

```nginx
# /etc/nginx/sites-available/portainer-https
server {
    listen 443 ssl http2;
    server_name portainer.example.com;

    ssl_certificate     /etc/ssl/certs/portainer.crt;
    ssl_certificate_key /etc/ssl/private/portainer.key;

    # Strong TLS configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # HTTP Strict Transport Security (HSTS)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        proxy_pass https://localhost:9443;
        proxy_ssl_verify off;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# Force redirect HTTP to HTTPS
server {
    listen 80;
    server_name portainer.example.com;
    return 301 https://$host$request_uri;
}
```

## Method 4: Docker Compose HTTPS-Only Configuration

```yaml
# docker-compose.yml
version: "3.8"

services:
  portainer:
    image: portainer/portainer-ce:latest
    container_name: portainer
    restart: always
    ports:
      - "8000:8000"
      - "9443:9443"
      # Note: port 9000 is intentionally NOT exposed
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
      - ./certs:/certs:ro
    command:
      - --http-disabled
      - --sslcert
      - /certs/portainer.crt
      - --sslkey
      - /certs/portainer.key

volumes:
  portainer_data:
```

## Verify HTTPS-Only Access

```bash
# Confirm HTTPS works
curl -k https://localhost:9443/api/status

# Confirm HTTP is blocked (should fail or refuse connection)
curl http://localhost:9000/api/status
# Expected: Connection refused
```

---

*Ensure your secure Portainer instance stays available with [OneUptime](https://oneuptime.com) SSL monitoring.*
