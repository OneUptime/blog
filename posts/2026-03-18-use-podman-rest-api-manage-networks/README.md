# How to Use the Podman REST API to Manage Networks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, REST API, Container Networking, DevOps, Network Management

Description: Learn how to create, configure, inspect, and manage container networks using the Podman REST API with practical examples for bridge, macvlan, and custom networks.

---

> Managing networks through the Podman REST API lets you programmatically define how containers communicate, isolate workloads, and build complex multi-container architectures with custom networking configurations.

Container networking determines how containers communicate with each other and the outside world. Podman provides a flexible networking stack powered by Netavark (or CNI on older versions) that supports bridge networks, macvlan networks, and custom configurations. The REST API exposes full control over network creation, management, and container attachment. This guide covers the main network operations available through the API.

---

## Understanding Podman Networks

Common user-defined Podman network drivers include:

- **Bridge**: The default network type. Creates an isolated network with a virtual bridge, providing NAT-based connectivity to the host network. Containers on the same bridge can communicate directly.
- **Macvlan**: Assigns a MAC address to each container, making it appear as a physical device on the network. Useful when containers need to be directly accessible on the LAN.

The default bridge network is named `podman`; when Podman runs as root, `--network bridge` and `--network podman` use it.

## Listing Networks

Retrieve all configured networks.

```bash
# List all networks

curl -s --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  http://localhost/v4.0.0/libpod/networks/json | python3 -m json.tool

# Format output with jq
curl -s --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  http://localhost/v4.0.0/libpod/networks/json | \
  jq '.[] | {name: .name, driver: .driver, subnets: [.subnets[]?.subnet]}'
```

## Filtering Networks

Use filters to find specific networks.

```bash
# Filter by name
curl -g -s --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  "http://localhost/v4.0.0/libpod/networks/json?filters={\"name\":[\"my-network\"]}"

# Filter by driver type
curl -g -s --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  "http://localhost/v4.0.0/libpod/networks/json?filters={\"driver\":[\"bridge\"]}"

# Filter by label
curl -g -s --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  "http://localhost/v4.0.0/libpod/networks/json?filters={\"label\":[\"env=production\"]}"
```

## Creating a Bridge Network

Create a custom bridge network with a specific subnet.

```bash
# Create a basic bridge network
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "name": "app-network",
    "driver": "bridge",
    "subnets": [
      {
        "subnet": "10.10.0.0/24",
        "gateway": "10.10.0.1"
      }
    ]
  }' \
  http://localhost/v4.0.0/libpod/networks/create
```

The response confirms the network was created with the specified configuration.

## Creating a Network with Labels and DNS

Add labels and configure DNS settings.

```bash
# Create a network with labels and DNS enabled
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "name": "backend-network",
    "driver": "bridge",
    "dns_enabled": true,
    "internal": false,
    "subnets": [
      {
        "subnet": "10.20.0.0/24",
        "gateway": "10.20.0.1"
      }
    ],
    "labels": {
      "app": "backend",
      "env": "production"
    }
  }' \
  http://localhost/v4.0.0/libpod/networks/create
```

When `dns_enabled` is true, containers on this bridge network can resolve each other by name. On bridge networks, setting `internal` to true removes the default route and restricts external access.

## Creating an Internal Network

On bridge networks, internal mode preserves container-to-container communication while removing the default route for external access.

```bash
# Create an internal-only network
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "name": "db-internal",
    "driver": "bridge",
    "internal": true,
    "dns_enabled": true,
    "subnets": [
      {
        "subnet": "10.30.0.0/24",
        "gateway": "10.30.0.1"
      }
    ]
  }' \
  http://localhost/v4.0.0/libpod/networks/create
```

## Creating a Macvlan Network

Macvlan networks give containers direct access to the physical network.

```bash
# Create a macvlan network
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "name": "lan-network",
    "driver": "macvlan",
    "network_interface": "eth0",
    "subnets": [
      {
        "subnet": "192.168.1.0/24",
        "gateway": "192.168.1.1"
      }
    ]
  }' \
  http://localhost/v4.0.0/libpod/networks/create
```

## Creating a Dual-Stack Network

Create a network with both IPv4 and IPv6 subnets.

```bash
# Create a dual-stack network
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "name": "dual-stack-net",
    "driver": "bridge",
    "subnets": [
      {
        "subnet": "10.40.0.0/24",
        "gateway": "10.40.0.1"
      },
      {
        "subnet": "fd00:dead:beef::/64",
        "gateway": "fd00:dead:beef::1"
      }
    ]
  }' \
  http://localhost/v4.0.0/libpod/networks/create
```

## Inspecting a Network

Get detailed information about a network.

```bash
# Inspect a network by name
curl -s --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  http://localhost/v4.0.0/libpod/networks/app-network/json | python3 -m json.tool

# Extract key details
curl -s --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  http://localhost/v4.0.0/libpod/networks/app-network/json | \
  jq '{
    name: .name,
    driver: .driver,
    subnets: .subnets,
    dns_enabled: .dns_enabled,
    internal: .internal
  }'
```

## Checking if a Network Exists

```bash
# Check if a network exists
curl -o /dev/null -s -w "%{http_code}" \
  --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  http://localhost/v4.0.0/libpod/networks/app-network/exists
# 204 = exists, 404 = not found
```

## Connecting Containers to Networks

Attach a running container to an additional network.

```bash
# Connect a container to a network
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "container": "my-container"
  }' \
  http://localhost/v4.0.0/libpod/networks/app-network/connect

# Connect with a static IP address
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "container": "my-container",
    "static_ips": ["10.10.0.50"]
  }' \
  http://localhost/v4.0.0/libpod/networks/app-network/connect
```

## Disconnecting Containers from Networks

Remove a container from a network.

```bash
# Disconnect a container from a network
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "container": "my-container"
  }' \
  http://localhost/v4.0.0/libpod/networks/app-network/disconnect

# Force disconnect
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "container": "my-container",
    "force": true
  }' \
  http://localhost/v4.0.0/libpod/networks/app-network/disconnect
```

## Creating Containers on Specific Networks

Specify the network when creating a container.

```bash
# Create a container attached to a custom network
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "image": "docker.io/library/nginx:latest",
    "name": "web-on-custom-net",
    "networks": {
      "app-network": {
        "static_ips": ["10.10.0.100"]
      }
    }
  }' \
  http://localhost/v4.0.0/libpod/containers/create

# Create a container on multiple networks
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "image": "docker.io/library/nginx:latest",
    "name": "multi-net-container",
    "networks": {
      "app-network": {},
      "backend-network": {}
    }
  }' \
  http://localhost/v4.0.0/libpod/containers/create
```

## Removing a Network

Delete a network that is no longer needed.

```bash
# Remove a network (fails if containers are attached)
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X DELETE \
  http://localhost/v4.0.0/libpod/networks/app-network

# Force remove (removes containers attached to the network)
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X DELETE \
  "http://localhost/v4.0.0/libpod/networks/app-network?force=true"
```

## Pruning Unused Networks

Remove all networks not used by any containers.

```bash
# Prune unused networks
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  http://localhost/v4.0.0/libpod/networks/prune

# Prune with a label filter
curl -g --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  "http://localhost/v4.0.0/libpod/networks/prune?filters={\"label\":[\"env=dev\"]}"
```

## Managing Networks with Python

A Python client for network operations.

```python
import json
import os
import socket
import http.client

class PodmanNetworkClient:
    def __init__(self):
        self.socket_path = f"{os.environ['XDG_RUNTIME_DIR']}/podman/podman.sock"
        self.base = '/v4.0.0/libpod'

    def _request(self, method, path, body=None):
        conn = http.client.HTTPConnection('localhost')
        conn.sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        conn.sock.connect(self.socket_path)
        headers = {'Content-Type': 'application/json'} if body else {}
        data = json.dumps(body).encode() if body else None
        conn.request(method, path, body=data, headers=headers)
        resp = conn.getresponse()
        status = resp.status
        result = resp.read().decode()
        conn.close()
        return status, json.loads(result) if result else {}

    def create(self, name, subnet, gateway, dns=True, internal=False, labels=None):
        body = {
            "name": name,
            "driver": "bridge",
            "dns_enabled": dns,
            "internal": internal,
            "subnets": [{"subnet": subnet, "gateway": gateway}]
        }
        if labels:
            body["labels"] = labels
        return self._request('POST', f'{self.base}/networks/create', body)

    def list_networks(self):
        return self._request('GET', f'{self.base}/networks/json')

    def inspect(self, name):
        return self._request('GET', f'{self.base}/networks/{name}/json')

    def connect(self, network, container, static_ip=None):
        body = {"container": container}
        if static_ip:
            body["static_ips"] = [static_ip]
        return self._request('POST', f'{self.base}/networks/{network}/connect', body)

    def disconnect(self, network, container):
        body = {"container": container}
        return self._request('POST', f'{self.base}/networks/{network}/disconnect', body)

    def remove(self, name, force=False):
        return self._request('DELETE', f'{self.base}/networks/{name}?force={str(force).lower()}')


client = PodmanNetworkClient()

# Create an application network
status, result = client.create(
    name="myapp-net",
    subnet="10.50.0.0/24",
    gateway="10.50.0.1",
    dns=True,
    labels={"app": "myapp", "env": "dev"}
)
print(f"Created network: {result.get('name', 'error')}")

# List all networks
status, networks = client.list_networks()
for net in networks:
    subnets = [s.get('subnet', 'N/A') for s in net.get('subnets', [])]
    print(f"  {net['name']:25s} {net['driver']:10s} {subnets}")
```

## Conclusion

The Podman REST API provides comprehensive network management through a clean HTTP interface. You can create bridge, macvlan, and dual-stack networks with custom subnets, DNS settings, and access controls. Connecting and disconnecting containers from networks at runtime gives you flexibility in how you structure container communication. The ability to specify static IP addresses, create internal-only networks, and filter by labels makes it straightforward to build complex network topologies programmatically. Combined with the container and volume APIs, network management completes the toolset for fully automated container infrastructure provisioning.
