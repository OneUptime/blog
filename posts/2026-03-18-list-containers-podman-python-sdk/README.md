# How to List Containers with Podman Python SDK

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Python, SDK, Container, Listing

Description: Learn how to list, filter, and inspect containers using the Podman Python SDK, including running containers, stopped containers, and advanced filtering techniques.

---

> Listing containers is one of the most common operations in container management. The Podman Python SDK provides powerful methods to query, filter, and inspect containers programmatically.

When managing containerized applications, you frequently need to know what containers exist, which are running, and what resources they consume. The Podman Python SDK makes this simple with its container listing and inspection methods. This guide covers everything from basic listing to advanced filtering and status monitoring.

---

## Basic Container Listing

The simplest way to list containers is through the `containers.list()` method:

```python
from podman import PodmanClient

with PodmanClient() as client:
    containers = client.containers.list()
    for container in containers:
        container.reload()
        print(f"Name: {container.name}")
        print(f"ID: {container.short_id}")
        print(f"Status: {container.status}")
        print("---")
```

By default, `list()` returns only running containers, just like `podman ps` on the command line.

## Listing All Containers

To include stopped, exited, and created containers, pass the `all` parameter:

```python
from podman import PodmanClient

with PodmanClient() as client:
    # List all containers, including stopped ones
    all_containers = client.containers.list(all=True)

    print(f"Total containers: {len(all_containers)}")
    for container in all_containers:
        container.reload()
        print(f"  {container.name}: {container.status}")
```

This is equivalent to running `podman ps -a` from the command line.

## Filtering Containers

The SDK supports filters to narrow down results. Filters are passed as a dictionary:

```python
from podman import PodmanClient

with PodmanClient() as client:
    # Filter by status
    running = client.containers.list(
        filters={"status": ["running"]}
    )
    print(f"Running containers: {len(running)}")

    # Filter by exited status
    exited = client.containers.list(
        all=True,
        filters={"status": ["exited"]}
    )
    print(f"Exited containers: {len(exited)}")
```

### Filter by Name

```python
from podman import PodmanClient

with PodmanClient() as client:
    # Find containers with names matching a pattern
    web_containers = client.containers.list(
        all=True,
        filters={"name": ["web"]}
    )
    for c in web_containers:
        print(f"Found: {c.name}")
```

### Filter by Label

Labels are a powerful way to organize and query containers:

```python
from podman import PodmanClient

with PodmanClient() as client:
    # Filter by label key
    labeled = client.containers.list(
        all=True,
        filters={"label": ["app"]}
    )

    # Filter by label key=value
    production = client.containers.list(
        all=True,
        filters={"label": ["environment=production"]}
    )

    print(f"Containers with 'app' label: {len(labeled)}")
    print(f"Production containers: {len(production)}")
```

### Filter by Image

```python
from podman import PodmanClient

with PodmanClient() as client:
    # Find all containers using a specific image
    nginx_containers = client.containers.list(
        all=True,
        filters={"ancestor": ["nginx:latest"]}
    )
    for c in nginx_containers:
        c.reload()
        print(f"{c.name} uses image {c.image.tags}")
```

## Inspecting Container Details

Each container object provides detailed information through its attributes and the `inspect` method:

```python
from podman import PodmanClient

with PodmanClient() as client:
    containers = client.containers.list()

    for container in containers:
        container.reload()
        # Basic attributes
        print(f"Name: {container.name}")
        print(f"ID: {container.id}")
        print(f"Short ID: {container.short_id}")
        print(f"Status: {container.status}")
        print(f"Image: {container.image}")
        print(f"Created: {container.attrs['Created']}")
        print(f"Ports: {container.ports}")
        print(f"Labels: {container.labels}")
        print("---")
```

### Detailed Inspection

The `attrs` dictionary contains the full inspection data:

```python
from podman import PodmanClient

with PodmanClient() as client:
    containers = client.containers.list()

    if containers:
        container = containers[0]
        attrs = container.inspect()

        # Network settings
        network = attrs.get("NetworkSettings", {})
        print(f"IP Address: {network.get('IPAddress', 'N/A')}")

        # Resource limits
        host_config = attrs.get("HostConfig", {})
        print(f"Memory Limit: {host_config.get('Memory', 'unlimited')}")
        print(f"CPU Shares: {host_config.get('CpuShares', 'default')}")

        # State details
        state = attrs.get("State", {})
        print(f"Running: {state.get('Running')}")
        print(f"Paused: {state.get('Paused')}")
        print(f"PID: {state.get('Pid')}")
```

## Getting a Specific Container

If you know the container name or ID, you can get it directly:

```python
from podman import PodmanClient
from podman.errors import NotFound

with PodmanClient() as client:
    try:
        # Get by name
        container = client.containers.get("my-web-server")
        print(f"Found: {container.name} ({container.status})")

        # Get by ID (full or short)
        container = client.containers.get("abc123def456")
        print(f"Found: {container.name}")

    except NotFound:
        print("Container not found")
```

## Checking Container Resource Usage

Get real-time resource statistics for running containers:

```python
from podman import PodmanClient

with PodmanClient() as client:
    containers = client.containers.list()

    for container in containers:
        stats = container.stats(stream=False, decode=True)

        # CPU usage
        cpu_stats = stats.get("cpu_stats", {})
        print(f"Container: {container.name}")
        print(f"  CPU Usage: {cpu_stats.get('cpu_usage', {}).get('total_usage', 0)}")

        # Memory usage
        mem_stats = stats.get("memory_stats", {})
        usage = mem_stats.get("usage", 0)
        limit = mem_stats.get("limit", 1)
        print(f"  Memory: {usage / 1024 / 1024:.1f} MB / {limit / 1024 / 1024:.1f} MB")
        print("---")
```

## Building a Container Status Dashboard

Combine listing and inspection to build a comprehensive status view:

```python
from podman import PodmanClient
from datetime import datetime

def container_dashboard():
    """Display a dashboard of all container statuses."""
    with PodmanClient() as client:
        containers = client.containers.list(all=True)

        if not containers:
            print("No containers found.")
            return

        # Group by status
        status_groups = {}
        for container in containers:
            container.reload()
            status = container.status
            if status not in status_groups:
                status_groups[status] = []
            status_groups[status].append(container)

        # Display grouped results
        print(f"{'='*60}")
        print(f"Container Dashboard - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Total containers: {len(containers)}")
        print(f"{'='*60}")

        for status, group in sorted(status_groups.items()):
            print(f"\n[{status.upper()}] ({len(group)} containers)")
            print(f"{'-'*40}")
            for c in group:
                image_name = c.image.tags[0] if hasattr(c.image, 'tags') and c.image.tags else "unknown"
                print(f"  {c.name:<30} {c.short_id}  {image_name}")

container_dashboard()
```

## Watching for Container Changes

Monitor containers for status changes by polling at intervals:

```python
from podman import PodmanClient
import time

def watch_containers(interval=5):
    """Watch for container status changes."""
    previous_states = {}

    with PodmanClient() as client:
        print("Watching containers (Ctrl+C to stop)...")

        while True:
            current_states = {}
            containers = client.containers.list(all=True)

            for container in containers:
                container.reload()
                current_states[container.id] = {
                    "name": container.name,
                    "status": container.status
                }

            # Detect changes
            for cid, info in current_states.items():
                if cid in previous_states:
                    if previous_states[cid]["status"] != info["status"]:
                        print(f"[CHANGED] {info['name']}: "
                              f"{previous_states[cid]['status']} -> {info['status']}")
                else:
                    print(f"[NEW] {info['name']}: {info['status']}")

            for cid in previous_states:
                if cid not in current_states:
                    print(f"[REMOVED] {previous_states[cid]['name']}")

            previous_states = current_states
            time.sleep(interval)

# Run the watcher

try:
    watch_containers()
except KeyboardInterrupt:
    print("\nStopped watching.")
```

## Exporting Container Lists

Export container information to JSON for reporting or integration with other tools:

```python
import json
from podman import PodmanClient

def export_container_list(output_file="containers.json"):
    """Export container list to JSON."""
    with PodmanClient() as client:
        containers = client.containers.list(all=True)

        container_data = []
        for c in containers:
            c.reload()
            container_data.append({
                "name": c.name,
                "id": c.short_id,
                "status": c.status,
                "image": str(c.image),
                "labels": c.labels,
                "ports": c.ports,
                "created": c.attrs.get("Created", ""),
            })

        with open(output_file, "w") as f:
            json.dump(container_data, f, indent=2, default=str)

        print(f"Exported {len(container_data)} containers to {output_file}")

export_container_list()
```

## Conclusion

The Podman Python SDK provides comprehensive methods for listing and inspecting containers. From simple listing to advanced filtering by status, labels, and images, you can query your container environment precisely. Combining these methods with inspection and statistics gives you everything needed to build monitoring dashboards, automation scripts, and management tools. In the next guide, we will cover creating and configuring containers programmatically.
