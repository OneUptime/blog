# How to Manage Pods with Podman Python SDK

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Python, SDK, Pod, Kubernetes

Description: Learn how to create, manage, and inspect pods using the Podman Python SDK, including adding containers to pods, port mapping, and Kubernetes YAML generation.

---

> Pods are a first-class Podman feature that groups containers into a shared network namespace, just like Kubernetes pods. The Podman Python SDK lets you manage pods programmatically for tightly coupled container deployments.

Podman's pod concept mirrors Kubernetes pods, grouping multiple containers that share the same network namespace, IPC, and optionally PID namespace. This makes pods ideal for sidecar patterns, logging agents, and tightly coupled services. The Podman Python SDK provides a rich API for pod lifecycle management.

---

## Understanding Pods

A pod in Podman is a group of containers that share:
- A network namespace (same IP address and port space)
- An IPC namespace (inter-process communication)
- Optionally a PID namespace

By default, every pod includes an infrastructure container (the "infra" container) that holds the shared namespaces alive, even when other containers in the pod are stopped.

## Creating Pods

Create a basic pod:

```python
from podman import PodmanClient

with PodmanClient() as client:
    pod = client.pods.create(name="my-pod")

    print(f"Pod: {pod.name}")
    print(f"ID: {pod.short_id}")
    print(f"Status: {pod.attrs.get('State', 'unknown')}")
```

### Creating Pods with Port Mappings

Ports are defined at the pod level, not on individual containers:

```python
from podman import PodmanClient

with PodmanClient() as client:
    pod = client.pods.create(
        name="web-pod",
        portmappings=[
            {
                "container_port": 80,
                "host_port": 8080,
                "protocol": "tcp"
            },
            {
                "container_port": 443,
                "host_port": 8443,
                "protocol": "tcp"
            }
        ]
    )

    print(f"Pod: {pod.name}")
    print(f"Infra ID: {pod.attrs.get('InfraContainerID', 'N/A')[:12]}")
```

### Creating Pods with Labels

```python
from podman import PodmanClient

with PodmanClient() as client:
    pod = client.pods.create(
        name="labeled-pod",
        labels={
            "app": "mywebapp",
            "tier": "frontend",
            "version": "1.0"
        }
    )

    print(f"Labels: {pod.attrs.get('Labels', {})}")
```

## Adding Containers to Pods

Create containers inside a pod:

```python
from podman import PodmanClient

with PodmanClient() as client:
    # Create the pod
    pod = client.pods.create(
        name="app-pod",
        portmappings=[
            {"container_port": 80, "host_port": 8080, "protocol": "tcp"}
        ]
    )

    # Add a web server container
    web = client.containers.create(
        image="nginx:latest",
        name="app-pod-web",
        pod=pod.id
    )

    # Add a log collector sidecar
    logger = client.containers.create(
        image="alpine:latest",
        name="app-pod-logger",
        pod=pod.id,
        command=["sh", "-c", "while true; do echo 'collecting logs...'; sleep 10; done"]
    )

    # Start the entire pod
    pod.start()

    print(f"Pod {pod.name} started with containers:")
    pod.reload()
    for cid in pod.attrs.get("Containers", []):
        status = cid.get("State", cid.get("Status", cid.get("state", "unknown")))
        print(f"  {cid.get('Name', 'unknown')}: {status}")
```

## Listing Pods

List all pods on the system:

```python
from podman import PodmanClient

with PodmanClient() as client:
    pods = client.pods.list()

    print(f"Total pods: {len(pods)}")
    for pod in pods:
        containers = pod.attrs.get("Containers", [])
        status = pod.attrs.get("Status", pod.attrs.get("State", "unknown"))
        print(f"  {pod.name}: {status} ({len(containers)} containers)")
```

### Filtering Pods

Filter pods by various criteria:

```python
from podman import PodmanClient

with PodmanClient() as client:
    # Filter by status
    running_pods = client.pods.list(
        filters={"status": ["running"]}
    )
    print(f"Running pods: {len(running_pods)}")

    # Filter by label
    app_pods = client.pods.list(
        filters={"label": ["app=mywebapp"]}
    )
    print(f"App pods: {len(app_pods)}")

    # Filter by name
    web_pods = client.pods.list(
        filters={"name": ["web"]}
    )
    print(f"Web pods: {len(web_pods)}")
```

## Inspecting Pods

Get detailed information about a pod:

```python
from podman import PodmanClient

with PodmanClient() as client:
    pod = client.pods.get("app-pod")

    attrs = pod.attrs
    print(f"Name: {pod.name}")
    print(f"ID: {pod.id[:12]}")
    print(f"Status: {attrs.get('State', 'unknown')}")
    print(f"Created: {attrs.get('Created', 'unknown')}")
    print(f"Infra Container: {attrs.get('InfraContainerID', 'N/A')[:12]}")
    print(f"Shared Namespaces: {attrs.get('SharedNamespaces', [])}")

    # List containers in the pod
    print("\nContainers:")
    for container_info in attrs.get("Containers", []):
        status = container_info.get("State", container_info.get("Status", container_info.get("state")))
        container_id = container_info.get("Id", container_info.get("ID", container_info.get("id", "")))
        print(f"  {container_info.get('Name', 'unknown')}: {status}")
        print(f"    ID: {container_id[:12]}")
```

## Pod Lifecycle Management

Control the lifecycle of pods and all their containers:

```python
from podman import PodmanClient
import time

with PodmanClient() as client:
    # Create pod with containers
    pod = client.pods.create(name="lifecycle-pod")

    client.containers.create(
        image="nginx:latest",
        name="lifecycle-web",
        pod=pod.id
    )

    # Start all containers in the pod
    pod.start()
    pod.reload()
    print(f"Started: {pod.attrs.get('State', 'unknown')}")

    # Pause all containers
    pod.pause()
    pod.reload()
    print(f"Paused: {pod.attrs.get('State', 'unknown')}")

    time.sleep(2)

    # Unpause all containers
    pod.unpause()
    pod.reload()
    print(f"Unpaused: {pod.attrs.get('State', 'unknown')}")

    # Stop all containers
    pod.stop()
    pod.reload()
    print(f"Stopped: {pod.attrs.get('State', 'unknown')}")

    # Restart all containers
    pod.restart()
    pod.reload()
    print(f"Restarted: {pod.attrs.get('State', 'unknown')}")

    # Kill all containers (send SIGKILL)
    pod.kill()
    pod.reload()
    print(f"Killed: {pod.attrs.get('State', 'unknown')}")
```

## Building a Microservice Pod

Create a pod that groups related microservice components:

```python
from podman import PodmanClient

def create_microservice_pod(name, web_image, api_port=8080):
    """Create a microservice pod with web server, API, and monitoring."""
    with PodmanClient() as client:
        # Create pod with port mappings
        pod = client.pods.create(
            name=name,
            portmappings=[
                {"container_port": 80, "host_port": api_port, "protocol": "tcp"},
                {"container_port": 9090, "host_port": 9090, "protocol": "tcp"}
            ],
            labels={
                "app": name,
                "managed-by": "podman-sdk"
            }
        )

        # Main web application
        client.containers.create(
            image=web_image,
            name=f"{name}-web",
            pod=pod.id
        )

        # Metrics sidecar
        client.containers.create(
            image="alpine:latest",
            name=f"{name}-metrics",
            pod=pod.id,
            command=["sh", "-c", "while true; do echo 'metrics'; sleep 30; done"]
        )

        # Log forwarder sidecar
        client.containers.create(
            image="alpine:latest",
            name=f"{name}-logs",
            pod=pod.id,
            command=["sh", "-c", "while true; do echo 'forwarding logs'; sleep 15; done"]
        )

        # Start the pod
        pod.start()
        pod.reload()

        print(f"Microservice pod '{name}' created and started")
        for c in pod.attrs.get("Containers", []):
            status = c.get("State", c.get("Status", c.get("state", "unknown")))
            print(f"  {c.get('Name', 'unknown')}: {status}")

        return pod

create_microservice_pod("my-service", "nginx:latest")
```

## Generating Kubernetes YAML from Pods

One of Podman's standout features is generating Kubernetes-compatible YAML:

```python
from podman import PodmanClient
import subprocess

def generate_kube_yaml(pod_name, output_file=None):
    """Generate Kubernetes YAML from a Podman pod."""
    # Use the podman CLI for kube generate (SDK may not expose this directly)
    result = subprocess.run(
        ["podman", "kube", "generate", pod_name],
        capture_output=True, text=True
    )

    if result.returncode != 0:
        print(f"Error: {result.stderr}")
        return None

    yaml_content = result.stdout

    if output_file:
        with open(output_file, "w") as f:
            f.write(yaml_content)
        print(f"Kubernetes YAML saved to {output_file}")
    else:
        print(yaml_content)

    return yaml_content

generate_kube_yaml("my-service", "my-service-k8s.yaml")
```

## Removing Pods

Clean up pods and their containers:

```python
from podman import PodmanClient
from podman.errors import APIError

with PodmanClient() as client:
    try:
        pod = client.pods.get("old-pod")
        # Stop first, then remove
        pod.stop()
        pod.remove()
        print("Pod removed")
    except APIError as e:
        print(f"Error: {e}")

    # Force remove (stops and removes all containers)
    try:
        pod = client.pods.get("stuck-pod")
        pod.remove(force=True)
        print("Pod force removed")
    except Exception as e:
        print(f"Error: {e}")
```

### Pruning Unused Pods

Remove all stopped pods:

```python
from podman import PodmanClient

with PodmanClient() as client:
    pruned = client.pods.prune()
    print(f"Pruned pods: {pruned}")
```

## Pod Status Dashboard

Build a dashboard showing all pod statuses:

```python
from podman import PodmanClient
from datetime import datetime

def pod_dashboard():
    """Display a comprehensive pod status dashboard."""
    with PodmanClient() as client:
        pods = client.pods.list()

        if not pods:
            print("No pods found.")
            return

        print(f"{'='*70}")
        print(f"Pod Dashboard - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Total pods: {len(pods)}")
        print(f"{'='*70}")

        for pod in pods:
            containers = pod.attrs.get("Containers", [])
            running = sum(
                1
                for c in containers
                if str(c.get("State", c.get("Status", c.get("state", "")))).lower() == "running"
            )
            status = pod.attrs.get("Status", pod.attrs.get("State", "unknown"))

            print(f"\nPod: {pod.name}")
            print(f"  Status: {status}")
            print(f"  Containers: {running}/{len(containers)} running")

            for c in containers:
                container_status = c.get("State", c.get("Status", c.get("state", "unknown")))
                status_icon = "+" if str(container_status).lower() == "running" else "-"
                print(f"    [{status_icon}] {c.get('Name', 'unknown')}: {container_status}")

pod_dashboard()
```

## Conclusion

Pods are a powerful Podman feature that brings Kubernetes-style container grouping to local development and production environments. The Podman Python SDK provides comprehensive pod management capabilities for creation and lifecycle control, and the Podman CLI can generate Kubernetes YAML when needed. Using pods simplifies multi-container deployments and enables seamless migration to Kubernetes when needed.
