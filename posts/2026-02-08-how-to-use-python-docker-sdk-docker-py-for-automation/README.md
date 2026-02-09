# How to Use Python Docker SDK (docker-py) for Automation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, python, docker-py, SDK, automation, scripting, containers

Description: Use the Python Docker SDK (docker-py) to automate container management, image builds, and orchestration tasks programmatically.

---

Shell scripts get the job done for simple Docker automation, but they fall apart when you need error handling, complex logic, or integration with other systems. The Python Docker SDK (docker-py) gives you full programmatic access to the Docker Engine API. You can manage containers, images, networks, and volumes with clean Python code instead of parsing command output.

This guide covers practical examples of using docker-py for real automation tasks.

## Installation and Setup

Install the Docker SDK for Python:

```bash
# Install the Docker SDK
pip install docker

# Verify the installation
python -c "import docker; client = docker.from_env(); print(client.version())"
```

The `docker.from_env()` call connects to Docker using the same configuration as the `docker` CLI, reading from environment variables and the default socket.

```python
# connect.py
# Basic connection to the Docker daemon

import docker

# Connect using environment variables (same as docker CLI)
client = docker.from_env()

# Or connect to a specific Docker host
# client = docker.DockerClient(base_url='tcp://192.168.1.100:2376')

# Print Docker version info
info = client.info()
print(f"Docker version: {info['ServerVersion']}")
print(f"Containers running: {info['ContainersRunning']}")
print(f"Images: {info['Images']}")
```

## Managing Containers

Create, start, stop, and inspect containers programmatically.

```python
# container_management.py
# Demonstrates core container lifecycle operations

import docker
import time

client = docker.from_env()

# Run a container in the background (equivalent to docker run -d)
container = client.containers.run(
    "nginx:alpine",
    name="web_server",
    ports={"80/tcp": 8080},
    detach=True,
    environment={"NGINX_HOST": "localhost"},
    labels={"app": "web", "team": "platform"},
)
print(f"Started container: {container.name} ({container.short_id})")

# Wait for the container to be fully running
time.sleep(2)

# Get container details
container.reload()  # Refresh container state from the daemon
print(f"Status: {container.status}")
print(f"IP: {container.attrs['NetworkSettings']['IPAddress']}")

# Execute a command inside the running container
exit_code, output = container.exec_run("nginx -v")
print(f"Nginx version: {output.decode().strip()}")

# Get container logs
logs = container.logs(tail=10).decode()
print(f"Recent logs:\n{logs}")

# Stop and remove the container
container.stop(timeout=10)
container.remove()
print("Container stopped and removed")
```

## Listing and Filtering Containers

```python
# list_containers.py
# Lists containers with various filters

import docker

client = docker.from_env()

# List all running containers
running = client.containers.list()
print(f"Running containers: {len(running)}")
for c in running:
    print(f"  {c.name}: {c.image.tags[0] if c.image.tags else 'untagged'} ({c.status})")

# List all containers including stopped ones
all_containers = client.containers.list(all=True)
print(f"\nAll containers: {len(all_containers)}")

# Filter by label
team_containers = client.containers.list(
    filters={"label": "team=platform"}
)
print(f"\nPlatform team containers: {len(team_containers)}")

# Filter by status
exited = client.containers.list(
    all=True,
    filters={"status": "exited"}
)
print(f"Exited containers: {len(exited)}")
```

## Building Images

Build Docker images from a Dockerfile programmatically.

```python
# build_image.py
# Builds a Docker image and streams build output

import docker
import json

client = docker.from_env()

# Build an image from a Dockerfile in the current directory
print("Building image...")
image, build_logs = client.images.build(
    path=".",
    tag="myapp:latest",
    dockerfile="Dockerfile",
    buildargs={"APP_VERSION": "1.2.3"},
    labels={"build-date": "2026-02-08"},
    rm=True,  # Remove intermediate containers
    nocache=False,
)

# Stream and display build logs
for log_entry in build_logs:
    if "stream" in log_entry:
        print(log_entry["stream"].strip())
    elif "error" in log_entry:
        print(f"ERROR: {log_entry['error']}")

print(f"\nBuilt image: {image.tags}")
print(f"Image ID: {image.short_id}")
print(f"Size: {image.attrs['Size'] / 1024 / 1024:.1f} MB")
```

## Automated Container Health Monitoring

Build a monitoring script that checks container health and takes action.

```python
# health_monitor.py
# Monitors container health and restarts unhealthy containers

import docker
import time
import logging
from datetime import datetime

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s"
)
logger = logging.getLogger(__name__)

client = docker.from_env()

# Configuration
CHECK_INTERVAL = 30  # seconds
MAX_RESTART_ATTEMPTS = 3
restart_counts = {}


def check_container_health(container):
    """Check if a container is healthy and take action if not."""
    container.reload()
    name = container.name
    status = container.status

    if status != "running":
        logger.warning(f"{name} is not running (status: {status})")
        return False

    # Check health status if a health check is configured
    health = container.attrs.get("State", {}).get("Health", {})
    if health:
        health_status = health.get("Status", "none")
        if health_status == "unhealthy":
            logger.error(f"{name} is unhealthy")

            # Get the last health check log
            health_log = health.get("Log", [])
            if health_log:
                last_check = health_log[-1]
                logger.error(f"  Last check output: {last_check.get('Output', '').strip()}")

            return False

    # Check resource usage via stats
    stats = container.stats(stream=False)
    cpu_delta = stats["cpu_stats"]["cpu_usage"]["total_usage"] - \
                stats["precpu_stats"]["cpu_usage"]["total_usage"]
    system_delta = stats["cpu_stats"]["system_cpu_usage"] - \
                   stats["precpu_stats"]["system_cpu_usage"]
    cpu_percent = (cpu_delta / system_delta) * 100.0 if system_delta > 0 else 0

    mem_usage = stats["memory_stats"].get("usage", 0)
    mem_limit = stats["memory_stats"].get("limit", 1)
    mem_percent = (mem_usage / mem_limit) * 100.0

    logger.info(f"{name}: CPU={cpu_percent:.1f}%, MEM={mem_percent:.1f}%")

    if mem_percent > 90:
        logger.warning(f"{name} memory usage is critically high: {mem_percent:.1f}%")

    return True


def restart_container(container):
    """Restart a container with tracking to prevent restart loops."""
    name = container.name
    count = restart_counts.get(name, 0)

    if count >= MAX_RESTART_ATTEMPTS:
        logger.error(f"{name} has been restarted {count} times. Manual intervention needed.")
        return False

    logger.info(f"Restarting {name} (attempt {count + 1}/{MAX_RESTART_ATTEMPTS})")
    container.restart(timeout=30)
    restart_counts[name] = count + 1
    return True


def main():
    logger.info("Starting Docker health monitor")

    while True:
        try:
            containers = client.containers.list(
                filters={"label": "monitor=true"}
            )

            if not containers:
                # Fall back to monitoring all containers
                containers = client.containers.list()

            for container in containers:
                try:
                    healthy = check_container_health(container)
                    if not healthy:
                        restart_container(container)
                except Exception as e:
                    logger.error(f"Error checking {container.name}: {e}")

        except Exception as e:
            logger.error(f"Monitor error: {e}")

        time.sleep(CHECK_INTERVAL)


if __name__ == "__main__":
    main()
```

## Automated Cleanup Script

Clean up Docker resources based on age and usage.

```python
# cleanup.py
# Cleans up unused Docker resources with configurable retention

import docker
from datetime import datetime, timezone, timedelta

client = docker.from_env()

# Configuration
IMAGE_MAX_AGE_DAYS = 7
CONTAINER_MAX_AGE_HOURS = 24
PROTECTED_IMAGES = ["postgres", "redis", "registry"]


def cleanup_stopped_containers(max_age_hours):
    """Remove stopped containers older than the specified age."""
    removed = 0
    cutoff = datetime.now(timezone.utc) - timedelta(hours=max_age_hours)

    containers = client.containers.list(all=True, filters={"status": "exited"})

    for container in containers:
        finished = container.attrs["State"]["FinishedAt"]
        # Parse the ISO format timestamp
        finished_dt = datetime.fromisoformat(finished.replace("Z", "+00:00"))

        if finished_dt < cutoff:
            print(f"  Removing container: {container.name} (stopped {finished})")
            container.remove(v=False)  # v=False to keep anonymous volumes
            removed += 1

    return removed


def cleanup_unused_images(max_age_days):
    """Remove unused images older than the specified age."""
    removed = 0
    reclaimed_bytes = 0
    cutoff = datetime.now(timezone.utc) - timedelta(days=max_age_days)

    images = client.images.list()

    for image in images:
        # Skip images with no tags (dangling will be handled separately)
        tags = image.tags
        if not tags:
            continue

        # Skip protected images
        if any(p in tag for tag in tags for p in PROTECTED_IMAGES):
            continue

        created = datetime.fromisoformat(
            image.attrs["Created"].replace("Z", "+00:00")
        )

        if created < cutoff:
            # Check if any container is using this image
            try:
                containers = client.containers.list(
                    all=True, filters={"ancestor": image.id}
                )
                if containers:
                    continue
            except Exception:
                continue

            size = image.attrs["Size"]
            print(f"  Removing image: {tags[0]} ({size / 1024 / 1024:.1f} MB)")
            try:
                client.images.remove(image.id, force=False)
                removed += 1
                reclaimed_bytes += size
            except docker.errors.APIError as e:
                print(f"    Skipped: {e}")

    return removed, reclaimed_bytes


def cleanup_dangling_images():
    """Remove all dangling (untagged) images."""
    result = client.images.prune(filters={"dangling": True})
    deleted = len(result.get("ImagesDeleted", []) or [])
    reclaimed = result.get("SpaceReclaimed", 0)
    return deleted, reclaimed


def cleanup_orphaned_volumes():
    """Remove volumes not attached to any container."""
    result = client.volumes.prune()
    deleted = len(result.get("VolumesDeleted", []) or [])
    reclaimed = result.get("SpaceReclaimed", 0)
    return deleted, reclaimed


def main():
    print("=== Docker Cleanup ===")
    print(f"Date: {datetime.now()}")

    print("\n--- Cleaning stopped containers ---")
    containers_removed = cleanup_stopped_containers(CONTAINER_MAX_AGE_HOURS)
    print(f"Removed {containers_removed} containers")

    print("\n--- Cleaning dangling images ---")
    dangling_removed, dangling_reclaimed = cleanup_dangling_images()
    print(f"Removed {dangling_removed} dangling images ({dangling_reclaimed / 1024 / 1024:.1f} MB)")

    print("\n--- Cleaning old unused images ---")
    images_removed, images_reclaimed = cleanup_unused_images(IMAGE_MAX_AGE_DAYS)
    print(f"Removed {images_removed} images ({images_reclaimed / 1024 / 1024:.1f} MB)")

    print("\n--- Cleaning orphaned volumes ---")
    volumes_removed, volumes_reclaimed = cleanup_orphaned_volumes()
    print(f"Removed {volumes_removed} volumes ({volumes_reclaimed / 1024 / 1024:.1f} MB)")

    total_reclaimed = dangling_reclaimed + images_reclaimed + volumes_reclaimed
    print(f"\nTotal space reclaimed: {total_reclaimed / 1024 / 1024:.1f} MB")


if __name__ == "__main__":
    main()
```

## Docker Event Listener

React to Docker events in real time.

```python
# event_listener.py
# Listens for Docker events and triggers actions based on event type

import docker
import json
from datetime import datetime

client = docker.from_env()


def handle_event(event):
    """Process a Docker event and take appropriate action."""
    action = event.get("Action", "")
    actor = event.get("Actor", {})
    attributes = actor.get("Attributes", {})
    name = attributes.get("name", "unknown")
    image = attributes.get("image", "unknown")

    timestamp = datetime.fromtimestamp(event.get("time", 0))

    # Log all events
    print(f"[{timestamp}] {action}: {name} ({image})")

    # React to specific events
    if action == "die":
        exit_code = attributes.get("exitCode", "unknown")
        if exit_code != "0":
            print(f"  WARNING: Container {name} exited with code {exit_code}")

    elif action == "oom":
        print(f"  CRITICAL: Container {name} killed by OOM")

    elif action == "start":
        # Verify the new container has required labels
        try:
            container = client.containers.get(actor["ID"])
            labels = container.labels
            if "team" not in labels:
                print(f"  NOTICE: Container {name} is missing the 'team' label")
        except Exception:
            pass


def main():
    print("Listening for Docker events...")
    for event in client.events(decode=True):
        try:
            handle_event(event)
        except Exception as e:
            print(f"Error handling event: {e}")


if __name__ == "__main__":
    main()
```

## Summary

The Python Docker SDK transforms Docker automation from fragile shell scripts into robust, maintainable programs. Use it for container lifecycle management, automated health monitoring, cleanup operations, image building, and event-driven workflows. The SDK mirrors the Docker CLI API closely, so if you know how to do something with `docker` commands, translating it to Python is straightforward. Start with simple scripts and build up to more complex automation as your needs grow.
