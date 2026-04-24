# How to Use the --http-disabled Flag for HTTPS-Only Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Security, HTTPS, CLI, Configuration

Description: Configure Portainer to run in HTTPS-only mode using the --http-disabled flag, disabling the insecure HTTP port 9000 and forcing all access through HTTPS.

## Introduction

Current Portainer releases enable HTTPS on port 9443 by default, and HTTP on port 9000 remains available if you publish it. For production environments, you should disable HTTP entirely and require HTTPS for all access. The `--http-disabled` flag does exactly this, disabling the HTTP listener on port 9000 and serving Portainer only on port 9443.

## Prerequisites

- SSL/TLS certificate and key files
- Or Let's Encrypt certificates
- Portainer CE 2.9+ (or BE 2.10+)

## Step 1: Generate or Obtain Certificates

```bash
# Option A: Self-signed certificate (development/internal)

mkdir -p /opt/portainer/certs
openssl req -x509 -nodes -days 365 -newkey rsa:4096 \
  -keyout /opt/portainer/certs/portainer.key \
  -out /opt/portainer/certs/portainer.crt \
  -subj "/CN=portainer.yourdomain.com" \
  -addext "subjectAltName = DNS:portainer.yourdomain.com"

# Option B: Let's Encrypt certificate
# (obtained via certbot or ACME - run certbot first)
# Certs are at:
# /etc/letsencrypt/live/portainer.yourdomain.com/fullchain.pem
# /etc/letsencrypt/live/portainer.yourdomain.com/privkey.pem

# Option C: Copy existing certificate
cp /etc/ssl/certs/yourdomain.crt /opt/portainer/certs/portainer.crt
cp /etc/ssl/private/yourdomain.key /opt/portainer/certs/portainer.key
```

## Step 2: Start Portainer with HTTPS-Only

```bash
# Run Portainer in HTTPS-only mode
docker run -d \
  -p 9443:9443 \
  --name portainer \
  --restart=unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  -v /opt/portainer/certs:/certs:ro \
  portainer/portainer-ce:latest \
  --http-disabled \
  --sslcert /certs/portainer.crt \
  --sslkey /certs/portainer.key

# Note: Do NOT expose port 9000 when using --http-disabled
# Only port 9443 is needed
```

## Step 3: Verify HTTPS-Only Mode

```bash
# HTTP should be refused
curl http://localhost:9000/api/status
# Expected: Connection refused

# HTTPS should work
curl -k https://localhost:9443/api/status
# Expected: {"Version":"2.x.x",...}

# Confirm the container was started with the flag
docker inspect portainer --format '{{json .Args}}'
# Expected to include "--http-disabled"
```

## Step 4: Use Let's Encrypt Certificate

```bash
# If you have Let's Encrypt certificates via certbot:
docker run -d \
  -p 443:9443 \
  --name portainer \
  --restart=unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  -v /etc/letsencrypt/live/portainer.yourdomain.com:/certs/live/portainer.yourdomain.com:ro \
  -v /etc/letsencrypt/archive/portainer.yourdomain.com:/certs/archive/portainer.yourdomain.com:ro \
  portainer/portainer-ce:latest \
  --http-disabled \
  --sslcert /certs/live/portainer.yourdomain.com/fullchain.pem \
  --sslkey /certs/live/portainer.yourdomain.com/privkey.pem

# Access at: https://portainer.yourdomain.com
```

## Step 5: Docker Compose for HTTPS-Only

```yaml
version: "3.8"
services:
  portainer:
    image: portainer/portainer-ce:latest
    container_name: portainer
    restart: unless-stopped
    command: >
      --http-disabled
      --sslcert /certs/portainer.crt
      --sslkey /certs/portainer.key
    ports:
      # Only expose HTTPS port
      - "443:9443"
      # Do NOT expose 9000 - HTTP is disabled
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
      - /opt/portainer/certs:/certs:ro

volumes:
  portainer_data:
```

## Step 6: Combine with Reverse Proxy (Recommended)

For the best security, use a reverse proxy that handles TLS termination:

```nginx
# Nginx handles certificates, Portainer uses HTTP internally
server {
    listen 443 ssl;
    server_name portainer.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/portainer.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/portainer.yourdomain.com/privkey.pem;

    location / {
        # Connect to Portainer's HTTP port (no TLS between proxy and Portainer)
        proxy_pass http://localhost:9000;

        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        proxy_read_timeout 3600s;
        proxy_buffering off;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name portainer.yourdomain.com;
    return 301 https://$host$request_uri;
}
```

In this setup, leave Portainer's HTTP listener enabled so the reverse proxy can reach port 9000, but route all external access through the HTTPS proxy.

## Step 7: Certificate Auto-Renewal

```bash
#!/bin/bash
# renew-portainer-certs.sh
# Run monthly or via certbot's renewal hooks

# For Let's Encrypt auto-renewal:
# Edit /etc/letsencrypt/renewal/portainer.yourdomain.com.conf
# Add post_hook to restart Portainer after renewal

# /etc/letsencrypt/renewal-hooks/post/restart-portainer.sh
#!/bin/bash
docker restart portainer
echo "Portainer restarted with renewed certificates"
```

## Step 8: Test Certificate Validity

```bash
# Check certificate expiry
openssl s_client -connect portainer.yourdomain.com:9443 -servername portainer.yourdomain.com -showcerts </dev/null 2>/dev/null | \
  openssl x509 -noout -dates

# For a private CA or self-signed setup, verify against your CA certificate
openssl verify -CAfile /path/to/ca.crt /opt/portainer/certs/portainer.crt

# Test with browser
# Navigate to https://portainer.yourdomain.com
# Verify the padlock shows a valid certificate
```

## Edge Agent Tunnel Port

When using `--http-disabled`, the Edge Agent tunnel (port 8000) is separate from HTTP. You still need to expose it if using Edge Agents:

```bash
docker run -d \
  -p 9443:9443 \
  -p 8000:8000 \
  --name portainer \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  -v /opt/portainer/certs:/certs:ro \
  portainer/portainer-ce:latest \
  --http-disabled \
  --sslcert /certs/portainer.crt \
  --sslkey /certs/portainer.key
```

## Conclusion

Using `--http-disabled` with Portainer's HTTPS listener and your certificate options ensures all Portainer UI access uses encrypted HTTPS connections. For production deployments, this is a recommended security configuration. If managing certificates is complex, use a reverse proxy to handle TLS termination and keep Portainer's HTTP listener available only to the proxy on the same host or a trusted private network.
