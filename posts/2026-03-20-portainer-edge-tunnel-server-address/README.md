# How to Configure the Tunnel Server Address for Edge Agents - Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Edge Agent, Tunnel Server, Configuration, Network

Description: Configure the Portainer tunnel server address and port that Edge Agents use to establish their management connection.

## Introduction

The Portainer tunnel server is the component that handles communication between edge agents and the Portainer server. When running Portainer in a custom network environment, you may need to configure a specific bind address or port for the tunnel server - particularly when using a reverse proxy or when running on non-standard ports.

## Default Tunnel Server Configuration

By default, Portainer's tunnel server:
- Listens on port **8000**
- Listens on **0.0.0.0** inside the Portainer container
- Uses the same hostname as the Portainer server in generated edge keys unless overridden during deployment or in Edge Compute settings
- Is included automatically in edge keys

## Configuring the Tunnel Server Address

When starting Portainer, `--tunnel-addr` controls the local address the tunnel server listens on, while `--tunnel-port` controls the listening port. The public tunnel server address used by Edge Agents is generated when you create the Edge environment, and in Portainer Business Edition it can be overridden during deployment or in Edge Compute settings.

```bash
docker run -d \
  --name portainer \
  --restart always \
  -p 443:9443 \
  -p 8000:8000 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:sts \
  --tunnel-addr=0.0.0.0 \
  --tunnel-port=8000
```

```yaml
# docker-compose.yml

services:
  portainer:
    image: portainer/portainer-ce:sts
    ports:
      - "443:9443"
      - "8000:8000"
    command:
      - "--tunnel-addr=0.0.0.0"
      - "--tunnel-port=8000"
```

## Using a Non-Standard Tunnel Port

If port 8000 is in use or blocked, use a different port:

```bash
docker run -d \
  -p 443:9443 \
  -p 18000:18000 \
  portainer/portainer-ce:sts \
  --tunnel-port=18000
```

Edge agents receive the new port in their edge key.

## Tunnel Server Behind a Reverse Proxy

Portainer's official Nginx reverse proxy example publishes port 8000 directly for Edge Agents rather than proxying it through the HTTP virtual host:

```yaml
services:
  portainer:
    image: portainer/portainer-ce:sts
    environment:
      - VIRTUAL_HOST=portainer.example.com
      - VIRTUAL_PORT=9000
    ports:
      - "8000:8000"
```

For Traefik, Portainer's official example uses a separate router for the Edge tunnel service on port 8000:

```yaml
# docker-compose labels on the Portainer service
labels:
  - "traefik.http.routers.frontend.rule=Host(`portainer.example.com`)"
  - "traefik.http.routers.frontend.entrypoints=websecure"
  - "traefik.http.services.frontend.loadbalancer.server.port=9000"
  - "traefik.http.routers.frontend.service=frontend"
  - "traefik.http.routers.frontend.tls.certresolver=leresolver"
  - "traefik.http.routers.edge.rule=Host(`edge.example.com`)"
  - "traefik.http.routers.edge.entrypoints=websecure"
  - "traefik.http.services.edge.loadbalancer.server.port=8000"
  - "traefik.http.routers.edge.service=edge"
  - "traefik.http.routers.edge.tls.certresolver=leresolver"
```

## Viewing the Tunnel Server Address in Edge Keys

```bash
# Decode an edge key to inspect the tunnel server configuration
EDGE_KEY="your-edge-key" python3 - <<'PY'
import base64
import os

key = os.environ["EDGE_KEY"]
decoded = base64.b64decode(key + "=" * (-len(key) % 4)).decode()
api_url, tunnel_addr, fingerprint, endpoint_id = decoded.split("|")
print(f"api_url={api_url}")
print(f"tunnel_addr={tunnel_addr}")
print(f"fingerprint={fingerprint}")
print(f"endpoint_id={endpoint_id}")
PY
```

## Checking Tunnel Server Availability

```bash
# Test tunnel server port
nc -zv portainer.example.com 8000

# Test from the Portainer container's network namespace
docker run --rm --network container:portainer alpine nc -zv 127.0.0.1 8000

# Check Portainer logs for tunnel server status
docker logs portainer 2>&1 | grep -i "tunnel"
```

## Conclusion

The tunnel server address configuration is critical for edge agent connectivity. When Portainer is behind a reverse proxy or running on custom ports, ensure the tunnel server address in the edge key matches the publicly accessible address used by Edge Agents. Test tunnel port connectivity from representative edge device locations before deploying agents at scale.
