# How to Use the --bind and --bind-https Flags in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, CLI Flags, Configuration, Networking, HTTPS, Docker

Description: Learn how to use the --bind and --bind-https flags in Portainer to control which network interfaces and ports the HTTP and HTTPS servers listen on.

---

By default, Portainer binds to all interfaces on port 9000 (HTTP) and 9443 (HTTPS). The `--bind` and `--bind-https` flags let you restrict Portainer to specific interfaces and ports for security or multi-tenant setups.

## Default Binding Behavior

```bash
# Default: listens on all interfaces

# HTTP:  0.0.0.0:9000
# HTTPS: 0.0.0.0:9443
```

## Using --bind to Change the HTTP Port and Interface

```bash
# Bind HTTP to all interfaces on port 8888
docker run -d \
  --name portainer \
  -p 8888:8888 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest \
  --bind :8888

# Publish HTTP on the host loopback interface only (localhost only)
docker run -d \
  --name portainer \
  -p 127.0.0.1:9000:9000 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest \
  --bind :9000
```

## Using --bind-https to Change the HTTPS Port

```bash
# Use a non-standard HTTPS port
docker run -d \
  --name portainer \
  -p 8443:8443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest \
  --bind-https :8443
```

## Binding to a Specific IP

When the host has multiple network interfaces, and you're using Docker host networking on Linux, bind Portainer to only one:

```bash
# Only serve on the management network interface (e.g., 192.168.10.1)
docker run -d \
  --name portainer \
  --network host \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest \
  --bind 192.168.10.1:9000 \
  --bind-https 192.168.10.1:9443
```

## Combining Both Flags

```bash
# HTTP on port 80, HTTPS on port 443
docker run -d \
  --name portainer \
  -p 80:80 \
  -p 443:443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest \
  --bind :80 \
  --bind-https :443
```

## Docker Compose Example

```yaml
services:
  portainer:
    image: portainer/portainer-ce:latest
    restart: unless-stopped
    command:
      - --bind=:9000
      - --bind-https=:9443
    ports:
      - "9000:9000"
      - "9443:9443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data

volumes:
  portainer_data:
```

The `--bind` and `--bind-https` flags accept `[ip]:port` format. Omitting the IP (`:port`) binds to all interfaces.
