# How to Change the Default Portainer Port from 9443

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Configuration, Networking, Security

Description: Learn how to run Portainer on a custom port instead of the default 9443 by changing Docker port mappings or using a reverse proxy.

---

By default, Portainer serves its web UI on port 9443 (HTTPS). Port 9000 can be published for legacy HTTP access if required. You may need to change these ports due to firewall rules, port conflicts, or organizational security policies.

## Method 1: Change Port Mapping in Docker Run

The simplest approach is to remap the port at the Docker level:

```bash
# Run Portainer on custom port 8443 instead of 9443

# Publish 8000 only if you use Edge Agents.
# Format: -p <host-port>:<container-port>
# The container still listens on 9443 internally
docker run -d \
  -p 8000:8000 \
  -p 8443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest
```

Access Portainer at `https://localhost:8443`.

## Method 2: Bind to a Specific Interface

To restrict Portainer to a specific network interface:

```bash
# Bind only the UI port to localhost (127.0.0.1)
# Prevents external access - use with a reverse proxy
# If you use Edge Agents, publish port 8000 separately
docker run -d \
  -p 127.0.0.1:9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest
```

## Method 3: Use a Reverse Proxy on Standard Ports

The recommended production approach is to put Portainer behind Nginx or Traefik on port 443:

```nginx
# /etc/nginx/sites-available/portainer
server {
    listen 443 ssl;
    server_name portainer.example.com;

    ssl_certificate     /etc/letsencrypt/live/portainer.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/portainer.example.com/privkey.pem;

    # Proxy all traffic to Portainer's internal port
    location / {
        proxy_pass https://localhost:9443;
        proxy_ssl_verify off;

        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name portainer.example.com;
    return 301 https://$host$request_uri;
}
```

## Method 4: Docker Compose with Custom Ports

```yaml
# docker-compose.yml
version: "3.8"

services:
  portainer:
    image: portainer/portainer-ce:latest
    container_name: portainer
    restart: always
    ports:
      - "8000:8000"   # Optional: Edge Agent tunnel
      - "8443:9443"   # Custom HTTPS UI port
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data

volumes:
  portainer_data:
```

## Update Portainer Edge Agent Communication

If you use Edge Agents, the tunnel port (8000) is separate from the UI port. Only change the UI port mapping. Standard Portainer Agents use port `9001`, not `8000`.

## Firewall Rules

After changing the port, update your firewall:

```bash
# Allow new custom port through ufw
sudo ufw allow 8443/tcp comment 'Portainer HTTPS'
```

If you published Portainer with Docker `-p`, remove the old `9443:9443` mapping to stop exposing port 9443. Do not rely on `ufw deny 9443/tcp` alone for Docker-published ports.

---

*Monitor your Portainer instance on any port with [OneUptime](https://oneuptime.com) HTTP monitors.*
