# How to Expose Container Ports and Bind to Specific IPv4 Addresses

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Networking, IPv4, Port Binding, Container, Security

Description: Publish Docker container ports and bind them to specific host IPv4 addresses to control which interfaces accept external connections, limiting exposure to trusted networks.

## Introduction

By default, `docker run -p 8080:80` publishes port 8080 on all host addresses (`0.0.0.0`, and `[::]` on IPv6-enabled hosts), making the service broadly reachable. Binding to a specific host IPv4 address publishes the port only on that host address, which is useful for limiting exposure and for multi-homed servers.

## Bind to All Interfaces (Default)

```bash
# Container port 80 accessible on all host addresses at port 8080

docker run -d -p 8080:80 nginx:alpine

# Explicit IPv4 any-address form
docker run -d -p 0.0.0.0:8080:80 nginx:alpine
```

## Bind to a Specific Host IP

```bash
# Only accessible from the local machine (loopback)
docker run -d -p 127.0.0.1:8080:80 nginx:alpine

# Published on the LAN IP
docker run -d -p 192.168.1.100:8080:80 nginx:alpine

# Published on a specific management IP
docker run -d -p 10.0.0.5:8080:80 nginx:alpine
```

## Binding Multiple Ports to Different IPs

```bash
# Public-facing API on one IP, admin on another
docker run -d \
  -p 203.0.113.10:443:443 \
  -p 192.168.1.100:8443:8443 \
  my-app:latest
```

## Verifying the Binding

```bash
# Confirm which address:port the container is bound to
docker port nginx-container

# Output:
# 80/tcp -> 127.0.0.1:8080

# Or use ss on the host
ss -tlnp | grep 8080
```

## Docker Compose Port Binding

```yaml
services:
  web:
    image: nginx:alpine
    ports:
      # Bind to loopback only
      - "127.0.0.1:8080:80"

  api:
    image: my-api:latest
    ports:
      # Bind to a specific LAN IP
      - "192.168.1.100:3000:3000"

  db-admin:
    image: dpage/pgadmin4:latest
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@example.com
      PGADMIN_DEFAULT_PASSWORD: changeme
    ports:
      # Bind to a specific management IP
      - "10.0.0.5:5050:80"
```

## Setting Default Binding in daemon.json

To change the default binding address for published ports on the default bridge network, create `/etc/docker/daemon.json` with:

```bash
sudo tee /etc/docker/daemon.json << 'EOF'
{
  "ip": "127.0.0.1"
}
EOF
sudo systemctl restart docker
```

If `/etc/docker/daemon.json` already exists, merge this key into the existing JSON instead of overwriting it or appending a second JSON object.

Now `-p` without an explicit IP binds to `127.0.0.1` for containers on the default bridge network.

## Security Recommendation

| Scenario | Recommended Binding |
|---|---|
| Internal service (DB, cache) | `127.0.0.1:<port>` or not exposed |
| LAN-accessible service | `<LAN IP>:<port>` |
| Public web service | `0.0.0.0:<port>` (behind firewall) |
| Admin/debug interface | `127.0.0.1:<port>` |

## Conclusion

Use `<host-ip>:<host-port>:<container-port>` syntax to bind published ports to specific IPv4 host addresses. Bind admin and internal services to `127.0.0.1` for the strictest isolation. Set `"ip": "127.0.0.1"` in `daemon.json` to make localhost-only the default for published ports on the default bridge network.
