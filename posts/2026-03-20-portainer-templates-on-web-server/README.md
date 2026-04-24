# How to Host Custom Portainer Templates on a Web Server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Template, Web Server, DevOps

Description: Learn how to host a custom Portainer template catalog on your own web server for private or internal use.

## Introduction

For organizations that cannot use public platforms like GitHub, hosting Portainer templates on an internal web server is the ideal solution. This approach works well for air-gapped environments, organizations with strict data residency requirements, or when templates reference internal registries and configuration. This guide covers setting up a web server to host your template catalog.

## Prerequisites

- A Linux server accessible from your Portainer instance
- Docker installed on the server
- Basic understanding of Nginx or Caddy
- Portainer CE or BE admin access

## Architecture Overview

```text
Portainer → HTTP GET → Web Server → templates.json
Portainer → Git clone/fetch → Internal Git Repository → docker-compose.yml
```

Portainer fetches the `templates.json` file via HTTP/HTTPS. For stack templates, `repository.url` must point to a Git repository that the Portainer Server can access, and `stackfile` identifies the Compose file within that repository.

## Option A: Host with Nginx in Docker

### Step 1: Create the Template Directory Structure

```bash
# Create directory structure on the web server

mkdir -p /opt/portainer-templates
mkdir -p /opt/portainer-templates/logos
```

### Step 2: Create the Templates JSON

For stack templates, the `repository.url` value must point to a Git repository rather than a web server URL.

```bash
cat > /opt/portainer-templates/templates.json << 'EOF'
{
  "version": "2",
  "templates": [
    {
      "type": 1,
      "title": "Internal App",
      "description": "Our internal application",
      "categories": ["internal"],
      "platform": "linux",
      "image": "registry.internal.company.com/myapp:latest",
      "ports": ["8080/tcp"],
      "env": [
        {
          "name": "APP_ENV",
          "label": "Environment",
          "default": "production"
        }
      ],
      "restart_policy": "unless-stopped"
    },
    {
      "type": 3,
      "title": "Monitoring Stack",
      "description": "Prometheus and Grafana",
      "categories": ["monitoring"],
      "platform": "linux",
      "repository": {
        "url": "https://git.internal.company.com/devops/monitoring-stack.git",
        "stackfile": "docker-compose.yml"
      },
      "env": [
        {
          "name": "GRAFANA_PASSWORD",
          "label": "Grafana admin password"
        }
      ]
    }
  ]
}
EOF
```

### Step 3: Create a Compose File in Your Git Repository

```yaml
# In your internal Git repository: docker-compose.yml
version: "2"

services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - prometheus-data:/prometheus
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
    volumes:
      - grafana-data:/var/lib/grafana
    depends_on:
      - prometheus
    restart: unless-stopped

volumes:
  prometheus-data:
  grafana-data:
```

### Step 4: Deploy Nginx to Serve Templates

```yaml
# /opt/portainer-templates/docker-compose.yml
services:
  template-server:
    image: nginx:alpine
    container_name: portainer-template-server
    ports:
      - "8080:80"
    volumes:
      # Serve the templates directory
      - /opt/portainer-templates:/usr/share/nginx/html:ro
      - /opt/portainer-templates/nginx.conf:/etc/nginx/conf.d/default.conf:ro
    restart: unless-stopped
```

```nginx
# /opt/portainer-templates/nginx.conf
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index templates.json;

    # Cache static files
    location ~* \.(yml|yaml|json)$ {
        expires 5m;
        add_header Cache-Control "public, no-transform";
    }
}
```

```bash
# Start the template server
docker compose -f /opt/portainer-templates/docker-compose.yml up -d
```

## Option B: Host with Caddy (HTTPS Automatic)

```yaml
# docker-compose.yml for Caddy-based template server
services:
  template-server:
    image: caddy:alpine
    container_name: portainer-template-server
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /opt/portainer-templates:/srv:ro
      - caddy-data:/data
      - /opt/portainer-templates/Caddyfile:/etc/caddy/Caddyfile:ro
    restart: unless-stopped

volumes:
  caddy-data:
```

```caddyfile
# Caddyfile
templates.company.com {
    root * /srv
    file_server
}
```

## Option C: Python Simple HTTP Server (Development/Testing)

```bash
# Quick test server - NOT for production
cd /opt/portainer-templates
python3 -m http.server 8080

# Access at: http://server-ip:8080/templates.json
```

## Step 5: Configure Portainer

1. In Portainer, go to **Settings**
2. Set the **App Templates URL**:

```text
http://templates.internal.company.com:8080/templates.json
# or with HTTPS:
https://templates.internal.company.com/templates.json
```

3. Save settings
4. Go to **Templates** > **Application** to verify

## Automating Template Updates

If you keep the catalog files in Git, set up a cron job or CI/CD pipeline to update templates automatically:

```bash
#!/bin/bash
# /opt/portainer-templates/update-templates.sh

cd /opt/portainer-templates

if [ -d .git ]; then
  git pull --ff-only

  # Nginx will serve the updated files immediately (no restart needed)
  echo "Templates updated at $(date)"
else
  echo "/opt/portainer-templates is not a Git checkout"
  exit 1
fi
```

```bash
# Cron job to update every 5 minutes
echo "*/5 * * * * /opt/portainer-templates/update-templates.sh >> /var/log/template-update.log 2>&1" | crontab -
```

## Security Considerations

```nginx
# Restrict access to specific IPs (Portainer server only)
server {
    listen 80;

    allow 10.0.1.100;    # Portainer server IP
    deny all;

    # ... rest of config
}
```

For HTTPS, use a certificate from Let's Encrypt (with Caddy auto-HTTPS) or your internal CA.

## Troubleshooting

```bash
# Test the template URL
curl http://templates.internal.company.com:8080/templates.json | python3 -m json.tool

# Check Nginx logs
docker logs portainer-template-server

# Inspect response headers
curl -I http://templates.internal.company.com:8080/templates.json
```

## Conclusion

Hosting Portainer templates on your own web server gives you full control over your template catalog. Using Nginx or Caddy in Docker makes it straightforward to set up a reliable, low-maintenance template server. This approach is ideal for organizations with strict security requirements or air-gapped environments where public GitHub access is not available.
