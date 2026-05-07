# How to Manage Networks with Podman Python SDK

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Python, SDK, Network, Container Networking

Description: Learn how to create, configure, inspect, and manage container networks using the Podman Python SDK, including bridge networks, custom subnets, and multi-container networking.

---

> Container networking controls how containers communicate with each other and the outside world. The Podman Python SDK gives you full programmatic control over network creation, configuration, and management.

Networking is a critical aspect of container orchestration. Whether you need isolated environments, multi-container communication, or custom network topologies, the Podman Python SDK provides the tools to define and manage networks in code. This guide covers everything from basic bridge networks to advanced multi-network configurations.

---

## Listing Networks

Start by listing all existing networks:

```python
from podman import PodmanClient

with PodmanClient() as client:
    networks = client.networks.list()

    for network in networks:
        print(f"Name: {network.name}")
        print(f"ID: {network.short_id}")
        print(f"Driver: {network.attrs.get('driver', 'unknown')}")
        print(f"Internal: {network.attrs.get('internal', False)}")
        print("---")
```

Podman includes a default bridge network that is usually named `podman`, unless the default network name has been changed in `containers.conf`.

## Creating Networks

Create a basic bridge network:

```python
from podman import PodmanClient

with PodmanClient() as client:
    network = client.networks.create(
        name="app-network",
        driver="bridge"
    )

    print(f"Created network: {network.name}")
    print(f"ID: {network.short_id}")
```

### Creating Networks with Custom Subnets

Define specific IP ranges for your network:

```python
from podman import PodmanClient

with PodmanClient() as client:
    network = client.networks.create(
        name="custom-subnet",
        driver="bridge",
        ipam={
            "Config": [
                {
                    "Subnet": "172.20.0.0/16",
                    "Gateway": "172.20.0.1",
                    "IPRange": "172.20.10.0/24"
                }
            ]
        }
    )

    print(f"Network: {network.name}")
    for subnet in network.attrs.get("subnets", []):
        print(f"  Subnet: {subnet.get('subnet')}")
        print(f"  Gateway: {subnet.get('gateway')}")
```

### Creating Internal Networks

Internal networks have no external connectivity, providing isolation:

```python
from podman import PodmanClient

with PodmanClient() as client:
    network = client.networks.create(
        name="internal-only",
        driver="bridge",
        internal=True
    )

    print(f"Internal network: {network.name}")
    print(f"Internal: {network.attrs.get('internal', False)}")
```

### Creating Networks with Labels

Use labels for organization and filtering:

```python
from podman import PodmanClient

with PodmanClient() as client:
    network = client.networks.create(
        name="production-net",
        driver="bridge",
        labels={
            "environment": "production",
            "team": "platform",
            "project": "webapp"
        }
    )

    print(f"Labels: {network.attrs.get('labels', {})}")
```

## Inspecting Networks

Get detailed information about a network:

```python
from podman import PodmanClient

with PodmanClient() as client:
    network = client.networks.get("app-network")

    attrs = network.attrs
    print(f"Name: {network.name}")
    print(f"ID: {network.id}")
    print(f"Driver: {attrs.get('driver')}")
    print(f"Internal: {attrs.get('internal', False)}")

    # IPAM configuration
    ipam_options = attrs.get("ipam_options", {})
    print(f"IPAM Driver: {ipam_options.get('driver', 'default')}")
    for subnet in attrs.get("subnets", []):
        print(f"  Subnet: {subnet.get('subnet')}")
        print(f"  Gateway: {subnet.get('gateway')}")

    # Connected containers
    containers = attrs.get("containers", {})
    print(f"Connected containers: {len(containers)}")
    for cid, info in containers.items():
        print(f"  {info.get('name', cid[:12])}: {info.get('interfaces', {})}")
```

## Connecting Containers to Networks

Attach running containers to networks:

```python
from podman import PodmanClient

with PodmanClient() as client:
    # Create a network
    network = client.networks.create(name="shared-net")

    # Create containers
    web = client.containers.run(
        image="nginx:latest",
        name="web-server",
        detach=True
    )

    api = client.containers.run(
        image="python:3.11-slim",
        name="api-server",
        detach=True,
        command=["python3", "-c", "import time; time.sleep(3600)"]
    )

    # Connect both containers to the network
    network.connect(web)
    network.connect(api)

    print(f"Connected {web.name} and {api.name} to {network.name}")
```

### Connecting with Static IP

Assign a specific IP address when connecting:

```python
from podman import PodmanClient

with PodmanClient() as client:
    network = client.networks.create(
        name="static-ip-net",
        ipam={
            "Config": [{"Subnet": "172.25.0.0/16", "Gateway": "172.25.0.1"}]
        }
    )

    container = client.containers.run(
        image="nginx:latest",
        name="static-ip-web",
        detach=True
    )

    # Connect with a specific IP
    network.connect(container, ipv4_address="172.25.0.100")

    container.reload()
    print(f"Assigned IP: 172.25.0.100")
```

## Disconnecting Containers from Networks

Remove a container from a network:

```python
from podman import PodmanClient

with PodmanClient() as client:
    network = client.networks.get("shared-net")

    container = client.containers.get("web-server")
    network.disconnect(container)

    print(f"Disconnected {container.name} from {network.name}")
```

Force disconnect even if the container is running:

```python
network.disconnect(container, force=True)
```

## Multi-Network Container Setup

Connect a container to multiple networks for segmented communication:

```python
from podman import PodmanClient

with PodmanClient() as client:
    # Create separate networks
    frontend_net = client.networks.create(name="frontend")
    backend_net = client.networks.create(name="backend")
    db_net = client.networks.create(name="database")

    # Frontend only connects to frontend network
    frontend = client.containers.run(
        image="nginx:latest",
        name="frontend-app",
        detach=True,
        network=frontend_net.name
    )

    # API connects to both frontend and backend
    api = client.containers.run(
        image="python:3.11-slim",
        name="api-app",
        detach=True,
        command=["python3", "-c", "import time; time.sleep(3600)"],
        network=frontend_net.name
    )
    backend_net.connect(api)

    # Database only on database network
    db = client.containers.run(
        image="postgres:15",
        name="db-app",
        detach=True,
        environment={"POSTGRES_PASSWORD": "secret"},
        network=db_net.name
    )

    # API also connects to database network
    db_net.connect(api)

    print("Multi-network topology created:")
    print(f"  frontend-app: frontend")
    print(f"  api-app: frontend, backend, database")
    print(f"  db-app: database")
```

## Network Filtering

Filter networks by various criteria:

```python
from podman import PodmanClient

with PodmanClient() as client:
    # Filter by driver
    bridge_nets = client.networks.list(
        filters={"driver": "bridge"}
    )
    print(f"Bridge networks: {len(bridge_nets)}")

    # Filter by label
    prod_nets = client.networks.list(
        filters={"label": "environment=production"}
    )
    print(f"Production networks: {len(prod_nets)}")

    # Filter by name
    app_nets = client.networks.list(
        names=["app"]
    )
    print(f"App networks: {len(app_nets)}")
```

## Removing Networks

Clean up networks that are no longer needed:

```python
from podman import PodmanClient
from podman.errors import APIError

with PodmanClient() as client:
    try:
        network = client.networks.get("old-network")
        network.remove()
        print("Network removed")
    except APIError as e:
        print(f"Cannot remove: {e}")
```

### Pruning Unused Networks

Remove all networks not used by any container:

```python
from podman import PodmanClient

with PodmanClient() as client:
    pruned = client.networks.prune()

    deleted = pruned.get("NetworksDeleted", []) or []
    print(f"Pruned {len(deleted)} unused networks")
    for name in deleted:
        print(f"  Removed: {name}")
```

## Building a Network Topology Manager

Create a reusable class for managing network topologies:

```python
from podman import PodmanClient

class NetworkTopology:
    """Manage a multi-network container topology."""

    def __init__(self):
        self.client = PodmanClient()
        self.networks = {}
        self.containers = {}

    def add_network(self, name, subnet=None, internal=False):
        """Create and register a network."""
        kwargs = {"name": name, "driver": "bridge", "internal": internal}
        if subnet:
            kwargs["ipam"] = {
                "Config": [{"Subnet": subnet}]
            }
        self.networks[name] = self.client.networks.create(**kwargs)
        print(f"Created network: {name}")
        return self.networks[name]

    def add_container(self, name, image, networks, **kwargs):
        """Create a container and connect to specified networks."""
        primary_net = networks[0]
        container = self.client.containers.run(
            image=image,
            name=name,
            detach=True,
            network=self.networks[primary_net].name,
            **kwargs
        )

        for net_name in networks[1:]:
            self.networks[net_name].connect(container)

        self.containers[name] = {
            "container": container,
            "networks": networks
        }
        print(f"Created container: {name} on networks: {', '.join(networks)}")
        return container

    def show_topology(self):
        """Display the current network topology."""
        print("\nNetwork Topology:")
        print("=" * 50)
        for name, info in self.containers.items():
            nets = ", ".join(info["networks"])
            status = info["container"].status
            print(f"  {name} [{status}] -> {nets}")

    def teardown(self):
        """Remove all containers and networks."""
        for name, info in self.containers.items():
            info["container"].stop()
            info["container"].remove()
            print(f"Removed container: {name}")

        for name, network in self.networks.items():
            network.remove()
            print(f"Removed network: {name}")

        self.client.close()

# Usage

topo = NetworkTopology()
topo.add_network("web-tier", subnet="172.30.0.0/24")
topo.add_network("data-tier", subnet="172.31.0.0/24", internal=True)
topo.add_container("web", "nginx:latest", ["web-tier"])
topo.show_topology()
# topo.teardown()  # Clean up when done
```

## Conclusion

The Podman Python SDK provides comprehensive network management capabilities. From simple bridge networks to complex multi-tier topologies, you can define and manage every aspect of container networking programmatically. Proper network segmentation improves security by isolating components, and automating network creation ensures consistent environments across deployments. Next, we will explore pod management with the Podman Python SDK.
