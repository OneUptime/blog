# How to Disable HTTP Access in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Security, HTTP, HTTPS, Docker

Description: Learn how to completely disable plain HTTP access to the Portainer UI and enforce HTTPS-only connections.

---

Allowing HTTP access to Portainer in production exposes your credentials and session tokens to network interception. Disabling HTTP is a critical security hardening step.

## Understanding Portainer's HTTP Ports

Portainer can expose two web interfaces:
- **Port 9443**: HTTPS (TLS encrypted) - recommended
- **Port 9000**: HTTP (unencrypted) - should be disabled in production

The key insight: omitting `-p 9000:9000` stops Docker from publishing port 9000 on the host, but Portainer's legacy HTTP listener is still enabled unless you explicitly disable it. For a true HTTPS-only setup, omit the port mapping and start Portainer with `--http-disabled`.

## Step 1: Remove HTTP Port Mapping and Disable HTTP

Stop and recreate Portainer without the HTTP port, and explicitly disable Portainer's HTTP listener:

```bash
# Stop and remove current container

docker stop portainer
docker container rm portainer

# Restart WITHOUT -p 9000:9000
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest \
  --http-disabled
```

## Step 2: Block Port 9000 at the Firewall Level

Even if Portainer isn't publishing port 9000, add a firewall rule as defense in depth:

```bash
# Block port 9000 with ufw
sudo ufw deny 9000/tcp
sudo ufw deny 9000/udp

# Verify the rule
sudo ufw status | grep 9000
```

## Step 3: Check Agent Connectivity

If you're using Edge Agents, make sure they're already configured for HTTPS before you disable Portainer's HTTP listener. If you also run standard Portainer Agents, they are not affected and use HTTPS on port 9001 by default:

```bash
# Standard Portainer Agent communication uses HTTPS on port 9001 by default
docker ps --filter name=portainer_agent --format "table {{.Names}}\t{{.Ports}}"
```

## Step 4: Configure Nginx to Block HTTP

If you're using a reverse proxy, add an explicit HTTP deny rule:

```nginx
# Block plain HTTP access at the proxy
server {
    listen 80;
    server_name portainer.example.com;

    # Return 403 rather than redirecting (stricter)
    return 403 "HTTP access disabled. Use HTTPS.";
}
```

Or to redirect to HTTPS instead:

```nginx
server {
    listen 80;
    server_name portainer.example.com;
    return 301 https://$host$request_uri;
}
```

## Verify HTTP is Disabled

```bash
# Test that HTTP port 9000 is not reachable
nc -zv localhost 9000 2>&1
# Expected: Connection refused

# Test that HTTPS port 9443 still works
curl -k -o /dev/null -w "%{http_code}" https://localhost:9443/
# Expected: 200
```

## Docker Compose Example

```yaml
# docker-compose.yml - HTTP disabled

services:
  portainer:
    image: portainer/portainer-ce:latest
    command: ["--http-disabled"]
    container_name: portainer
    restart: always
    ports:
      - "8000:8000"   # Optional: Edge agent tunnel
      - "9443:9443"   # HTTPS only - port 9000 not exposed
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data

volumes:
  portainer_data:
```

---

*Monitor Portainer's HTTPS endpoint with [OneUptime](https://oneuptime.com) SSL certificate monitoring.*
