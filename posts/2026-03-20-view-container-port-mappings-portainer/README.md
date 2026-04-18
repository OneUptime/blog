# How to View Container Port Mappings in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Networking, Port, Operation, Troubleshooting

Description: Inspect container port bindings in Portainer to understand which host ports are mapped to container ports and identify port conflicts between services.

---

This guide shows you how to accomplish this common container management task in Portainer, including both the UI approach and the equivalent command-line method.

## Using the Portainer UI

Navigate to **Containers** in the left sidebar. The container list shows a **Published Ports** column that displays each container's active host-to-container port mappings as clickable links (for example, `8080:80`). Clicking a published port opens the mapped host port in a new browser tab.

### Inspecting Detailed Port Bindings

For full port details, click a container name to open its details page. Scroll to the **Container details** section to see:

- **Published ports**: The list of host ports exposed by the container.
- **Port configuration**: Each binding shows the host IP, host port, container port, and protocol (TCP or UDP).
- **Exposed ports**: Ports declared in the image (via `EXPOSE`) that are not necessarily bound to a host port.

If you need the raw engine data, open the **Inspect** tab on the container page. The JSON output includes `NetworkSettings.Ports` and `HostConfig.PortBindings`, which Docker uses internally to represent the mapping.

## Using the Docker CLI

For scripted or automated use cases, the Docker CLI exposes the same information:

```bash
# List containers and show the PORTS column
docker ps

# Show port mappings for a specific container
docker port my-container

# Show the mapping for a specific container port
docker port my-container 80/tcp

# Get the full port binding details as JSON
docker inspect --format '{{json .NetworkSettings.Ports}}' my-container

# Get just the host port bound to container port 80/tcp
docker inspect \
  --format '{{(index (index .NetworkSettings.Ports "80/tcp") 0).HostPort}}' \
  my-container
```

`docker port` prints lines like `80/tcp -> 0.0.0.0:8080`, which reads as "traffic to host port 8080 is forwarded to container port 80 over TCP". A binding of `0.0.0.0` means the port is reachable on all host interfaces, while `127.0.0.1` would restrict access to the loopback interface only.

## Declaring Port Mappings

Port mappings are declared at container creation time. In a Compose file:

```yaml
# In your docker-compose.yml
services:
  webapp:
    image: myapp:1.2.3
    ports:
      # Short syntax: "HOST:CONTAINER"
      - "8080:80"
      # Bind to a specific host interface
      - "127.0.0.1:9090:9090"
      # UDP protocol
      - "5353:5353/udp"
      # Long syntax for clarity
      - target: 443
        published: 8443
        protocol: tcp
        mode: host
```

When running containers directly, the equivalent `docker run` flags are:

```bash
# Map host port 8080 to container port 80
docker run -p 8080:80 nginx:1.25

# Bind to a specific host interface
docker run -p 127.0.0.1:9090:9090 myapp

# Publish all EXPOSE-declared ports to random host ports
docker run -P nginx:1.25
```

## Using the Portainer API

For integration with monitoring tools or dashboards:

```python
import requests

headers = {"X-API-Key": "your-api-token"}

# List containers via Portainer's Docker proxy endpoint
response = requests.get(
    "https://portainer.example.com/api/endpoints/1/docker/containers/json",
    headers=headers,
    params={"all": "false"},  # Only running containers
)

for container in response.json():
    name = container["Names"][0].lstrip("/")
    for port in container.get("Ports", []):
        host_ip = port.get("IP", "")
        public = port.get("PublicPort")
        private = port["PrivatePort"]
        proto = port["Type"]
        if public:
            print(f"{name}: {host_ip}:{public} -> {private}/{proto}")
        else:
            print(f"{name}: {private}/{proto} (exposed, not published)")
```

The `Ports` array in the response mirrors the output of the Docker Engine API's `GET /containers/json` endpoint, which Portainer proxies through its `/api/endpoints/:id/docker/` path.

## Summary

Portainer's **Published Ports** column and container details page surface the same host-to-container bindings that `docker ps`, `docker port`, and `docker inspect` return from the CLI. Knowing how to read these mappings is essential for diagnosing port conflicts, confirming which services are exposed to the network, and verifying that firewall rules line up with the ports your containers actually publish.
