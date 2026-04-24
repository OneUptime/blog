# How to Use the --tunnel-addr and --tunnel-port Flags for Edge Agents

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, CLI Flags, Edge Agent, Tunnel, Configuration, Networking

Description: Learn how to use the --tunnel-addr and --tunnel-port flags in Portainer to configure the Edge Agent tunnel server for remote site management.

---

The `--tunnel-addr` and `--tunnel-port` flags configure the address and port that Portainer uses for its Edge Agent tunnel server. Edge Agents at remote sites connect outbound to this address to establish a reverse tunnel for management.

## Default Values

By default, Portainer listens for Edge Agent tunnel connections on:

- **Address**: `0.0.0.0` (all interfaces)
- **Port**: `8000`

## Changing the Tunnel Port

If port 8000 is in use by another service, change the tunnel port:

```bash
docker run -d \
  --name portainer \
  --restart=always \
  -p 9000:9000 \
  -p 9443:9443 \
  -p 8001:8001 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest \
  --edge-compute \
  --tunnel-port 8001
```

Update the Edge Agent deployment commands to reference the new port when creating Edge environments.

## Binding the Tunnel to a Specific IP

For multi-homed hosts, bind the tunnel to a specific interface:

```bash
docker run -d \
  --name portainer \
  --network host \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest \
  --edge-compute \
  --tunnel-addr 10.0.0.5 \
  --tunnel-port 8000
```

## Understanding the Edge Connection Flow

```mermaid
graph LR
    A[Edge Agent<br/>Remote Site] -->|Polls API over 9443| B[Portainer Server]
    A -->|Opens tunnel on 8000| B
    B -->|Management traffic over tunnel| A
```

The Edge Agent dials out - no inbound firewall rules needed at the remote site. The Portainer server must be reachable from the Edge environment on port `9443` for API polling and on port `8000` (or your custom tunnel port) for the reverse tunnel.

## Configuring Edge Agent to Use Custom Tunnel Port

When creating an Edge environment in Portainer, the generated deployment command includes the tunnel address and port configured for that environment. If you change the tunnel port after creating Edge environments, redeploy the Edge Agents with an updated deployment command so they receive a new `EDGE_KEY`.

```bash
# EDGE_KEY includes the Portainer API URL and reverse tunnel server address

# If tunnel-port changes, redeploy agents with an updated EDGE_KEY
```

## Docker Compose Example

```yaml
services:
  portainer:
    image: portainer/portainer-ce:latest
    restart: unless-stopped
    command:
      - --edge-compute
      - --tunnel-port=8000
      - --tunnel-addr=0.0.0.0
    ports:
      - "9443:9443"
      - "8000:8000"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data

volumes:
  portainer_data:
```
