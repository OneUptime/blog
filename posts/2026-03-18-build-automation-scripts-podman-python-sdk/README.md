# How to Build Automation Scripts with Podman Python SDK

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Python, SDK, Automation, DevOps

Description: Learn how to build practical automation scripts using the Podman Python SDK, including CI/CD pipelines, environment provisioning, health checks, and scheduled maintenance tasks.

---

> Automation transforms manual container management into reliable, repeatable processes. The Podman Python SDK combined with Python's scripting capabilities lets you build powerful DevOps automation that scales with your infrastructure.

Container automation eliminates human error, speeds up deployments, and ensures consistency across environments. The Podman Python SDK provides the building blocks, and Python brings the logic, error handling, and integration with other tools. This guide demonstrates practical automation patterns you can adapt to your workflows.

---

## Automated Environment Provisioning

Create a script that provisions a complete development environment:

```python
from podman import PodmanClient
from podman.errors import NotFound
import time

class EnvironmentProvisioner:
    """Provision and manage multi-container environments."""

    def __init__(self):
        self.client = PodmanClient()
        self.containers = []
        self.networks = []
        self.volumes = []

    def provision(self, config):
        """Provision an environment from a configuration dict."""
        env_name = config["name"]
        print(f"Provisioning environment: {env_name}")

        # Create networks
        for net_config in config.get("networks", []):
            network = self._create_network(net_config)
            self.networks.append(network)

        # Create volumes
        for vol_config in config.get("volumes", []):
            volume = self._create_volume(vol_config)
            self.volumes.append(volume)

        # Create containers
        for svc_config in config.get("services", []):
            container = self._create_service(svc_config)
            self.containers.append(container)

        # Wait for all containers to be running
        self._wait_for_ready()
        print(f"Environment '{env_name}' is ready")

    def _create_network(self, config):
        """Create a network, removing existing one if necessary."""
        name = config["name"]
        try:
            existing = self.client.networks.get(name)
            existing.remove()
        except NotFound:
            pass

        network = self.client.networks.create(name=name, driver="bridge")
        print(f"  Network created: {name}")
        return network

    def _create_volume(self, config):
        """Create a volume."""
        name = config["name"]
        try:
            existing = self.client.volumes.get(name)
            if config.get("recreate", False):
                existing.remove(force=True)
            else:
                print(f"  Volume exists: {name}")
                return existing
        except NotFound:
            pass

        volume = self.client.volumes.create(
            name=name,
            labels=config.get("labels", {})
        )
        print(f"  Volume created: {name}")
        return volume

    def _create_service(self, config):
        """Create and start a service container."""
        name = config["name"]

        # Remove existing container
        try:
            existing = self.client.containers.get(name)
            existing.stop(ignore=True)
            existing.remove()
        except NotFound:
            pass

        # Pull image
        image = config["image"]
        print(f"  Pulling {image}...")
        self.client.images.pull(image)

        # Build container kwargs
        kwargs = {
            "image": image,
            "name": name,
            "detach": True,
            "environment": config.get("environment", {}),
            "labels": config.get("labels", {}),
        }

        if "ports" in config:
            kwargs["ports"] = config["ports"]
        if "volumes" in config:
            kwargs["volumes"] = config["volumes"]
        if "network" in config:
            kwargs["network"] = config["network"]
        if "command" in config:
            kwargs["command"] = config["command"]

        container = self.client.containers.run(**kwargs)
        print(f"  Container started: {name}")
        return container

    def _wait_for_ready(self, timeout=60):
        """Wait for all containers to be running."""
        start = time.time()
        while time.time() - start < timeout:
            all_running = True
            for container in self.containers:
                container.reload()
                if container.status != "running":
                    all_running = False
                    break
            if all_running:
                return True
            time.sleep(2)
        print("Warning: Not all containers reached running state")
        return False

    def teardown(self):
        """Remove all provisioned resources."""
        for container in self.containers:
            try:
                container.stop(ignore=True)
                container.remove()
                print(f"  Removed container: {container.name}")
            except Exception as e:
                print(f"  Error removing {container.name}: {e}")

        for network in self.networks:
            try:
                network.remove()
                print(f"  Removed network: {network.name}")
            except Exception:
                pass

        self.client.close()

# Define environment configuration

dev_config = {
    "name": "development",
    "networks": [
        {"name": "dev-network"}
    ],
    "volumes": [
        {"name": "dev-db-data", "labels": {"env": "dev"}}
    ],
    "services": [
        {
            "name": "dev-db",
            "image": "postgres:15",
            "network": "dev-network",
            "environment": {
                "POSTGRES_PASSWORD": "devpass",
                "POSTGRES_DB": "devdb"
            },
            "volumes": {
                "dev-db-data": {"bind": "/var/lib/postgresql/data", "mode": "rw"}
            }
        },
        {
            "name": "dev-redis",
            "image": "redis:7",
            "network": "dev-network"
        },
        {
            "name": "dev-web",
            "image": "nginx:latest",
            "network": "dev-network",
            "ports": {"80/tcp": 8080}
        }
    ]
}

provisioner = EnvironmentProvisioner()
provisioner.provision(dev_config)
# provisioner.teardown()  # Call when done
```

## Automated Health Checks

Monitor container health and take corrective action:

```python
from podman import PodmanClient
import requests
import time
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("health-checker")

class HealthChecker:
    """Check container health and restart unhealthy containers."""

    def __init__(self):
        self.client = PodmanClient()
        self.checks = []

    def add_check(self, container_name, check_type="running", **kwargs):
        """Add a health check for a container."""
        self.checks.append({
            "container": container_name,
            "type": check_type,
            **kwargs
        })

    def run_checks(self):
        """Run all health checks and return results."""
        results = []
        for check in self.checks:
            result = self._run_check(check)
            results.append(result)

            if not result["healthy"]:
                logger.warning(f"Unhealthy: {check['container']} - {result['message']}")
                self._handle_unhealthy(check, result)
            else:
                logger.info(f"Healthy: {check['container']}")

        return results

    def _run_check(self, check):
        """Run a single health check."""
        try:
            container = self.client.containers.get(check["container"])
            container.reload()

            if check["type"] == "running":
                return {
                    "container": check["container"],
                    "healthy": container.status == "running",
                    "message": f"Status: {container.status}"
                }

            elif check["type"] == "http":
                url = check.get("url", f"http://localhost:{check.get('port', 80)}")
                try:
                    resp = requests.get(url, timeout=5)
                    return {
                        "container": check["container"],
                        "healthy": resp.status_code == 200,
                        "message": f"HTTP {resp.status_code}"
                    }
                except requests.RequestException as e:
                    return {
                        "container": check["container"],
                        "healthy": False,
                        "message": str(e)
                    }

            elif check["type"] == "exec":
                command = check.get("command", ["true"])
                exit_code, output = container.exec_run(command)
                return {
                    "container": check["container"],
                    "healthy": exit_code == 0,
                    "message": output.decode().strip()
                }

        except Exception as e:
            return {
                "container": check["container"],
                "healthy": False,
                "message": str(e)
            }

    def _handle_unhealthy(self, check, result):
        """Handle an unhealthy container."""
        action = check.get("on_failure", "restart")

        if action == "restart":
            try:
                container = self.client.containers.get(check["container"])
                container.restart(timeout=10)
                logger.info(f"Restarted: {check['container']}")
            except Exception as e:
                logger.error(f"Failed to restart {check['container']}: {e}")

    def close(self):
        self.client.close()

# Usage
checker = HealthChecker()
checker.add_check("dev-web", check_type="running")
checker.add_check("dev-web", check_type="http", port=8080)
checker.add_check("dev-db", check_type="exec",
                   command=["pg_isready", "-U", "postgres"])

results = checker.run_checks()
checker.close()
```

## Automated Image Updates

Check for and apply image updates:

```python
from podman import PodmanClient
import logging

logger = logging.getLogger("image-updater")

def update_container_images(container_configs):
    """Check and update container images."""
    with PodmanClient() as client:
        updates = []

        for config in container_configs:
            name = config["name"]
            image_ref = config["image"]

            try:
                container = client.containers.get(name)
                current_image_id = container.image.id

                # Pull the latest version
                logger.info(f"Pulling latest {image_ref}...")
                new_image = client.images.pull(image_ref)

                if new_image.id != current_image_id:
                    logger.info(f"Update available for {name}")
                    updates.append({
                        "name": name,
                        "old_image": current_image_id[:12],
                        "new_image": new_image.id[:12],
                        "config": config
                    })
                else:
                    logger.info(f"No update for {name}")

            except Exception as e:
                logger.error(f"Error checking {name}: {e}")

        # Apply updates
        for update in updates:
            apply_update(client, update)

        return updates

def apply_update(client, update):
    """Apply an image update to a container."""
    config = update["config"]
    name = config["name"]

    try:
        # Stop and remove old container
        old_container = client.containers.get(name)
        old_container.stop(ignore=True)
        old_container.remove()

        # Create new container with updated image
        new_container = client.containers.run(
            image=config["image"],
            name=name,
            detach=True,
            environment=config.get("environment", {}),
            ports=config.get("ports", {}),
            volumes=config.get("volumes", {})
        )

        logger.info(f"Updated {name}: {update['old_image']} -> {update['new_image']}")

    except Exception as e:
        logger.error(f"Failed to update {name}: {e}")

# Usage
configs = [
    {"name": "dev-web", "image": "nginx:latest", "ports": {"80/tcp": 8080}},
    {"name": "dev-redis", "image": "redis:7"},
]

update_container_images(configs)
```

## System Cleanup Automation

Automate resource cleanup to prevent disk and resource exhaustion:

```python
from podman import PodmanClient
from datetime import datetime

def system_cleanup(dry_run=True):
    """Comprehensive system cleanup."""
    with PodmanClient() as client:
        print(f"System Cleanup - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Mode: {'DRY RUN' if dry_run else 'LIVE'}")
        print("=" * 50)

        # 1. Remove stopped containers
        stopped = client.containers.list(
            all=True,
            filters={"status": ["exited", "dead"]}
        )
        print(f"\nStopped containers: {len(stopped)}")
        for c in stopped:
            if dry_run:
                print(f"  Would remove: {c.name}")
            else:
                c.remove()
                print(f"  Removed: {c.name}")

        # 2. Remove dangling images
        dangling = client.images.list(filters={"dangling": True})
        print(f"\nDangling images: {len(dangling)}")
        for img in dangling:
            size_mb = img.attrs.get("Size", 0) / 1024 / 1024
            if dry_run:
                print(f"  Would remove: {img.short_id} ({size_mb:.1f} MB)")
            else:
                try:
                    client.images.remove(img.id)
                    print(f"  Removed: {img.short_id} ({size_mb:.1f} MB)")
                except Exception as e:
                    print(f"  Failed: {img.short_id}: {e}")

        # 3. Prune unused volumes
        if not dry_run:
            pruned_vols = client.volumes.prune()
            deleted = pruned_vols.get("VolumesDeleted", []) or []
            print(f"\nPruned {len(deleted)} volumes")
        else:
            print("\nVolume pruning skipped in dry run")

        # 4. Prune unused networks
        if not dry_run:
            pruned_nets = client.networks.prune()
            deleted = pruned_nets.get("NetworksDeleted", []) or []
            print(f"Pruned {len(deleted)} networks")
        else:
            print("Network pruning skipped in dry run")

        # System disk usage summary
        info = client.info()
        print(f"\nSystem Summary:")
        store = info.get("store", {})
        print(f"  Containers: {store.get('containerStore', {}).get('number', 0)}")
        print(f"  Images: {store.get('imageStore', {}).get('number', 0)}")

# Preview cleanup
system_cleanup(dry_run=True)

# Execute cleanup
# system_cleanup(dry_run=False)
```

## CLI Tool with argparse

Build a command-line tool wrapping common operations:

```python
#!/usr/bin/env python3
"""Podman automation CLI tool."""

import argparse
import sys
from podman import PodmanClient
from podman.errors import NotFound

def cmd_status(args):
    """Show system status."""
    with PodmanClient() as client:
        info = client.info()
        containers = client.containers.list(all=True)
        running = [c for c in containers if c.status == "running"]

        print(f"Podman Version: {client.version()['Version']}")
        print(f"Containers: {len(running)} running / {len(containers)} total")
        print(f"Images: {len(client.images.list())}")

def cmd_restart(args):
    """Restart a container."""
    with PodmanClient() as client:
        try:
            container = client.containers.get(args.name)
            container.restart(timeout=args.timeout)
            print(f"Restarted: {container.name}")
        except NotFound:
            print(f"Container not found: {args.name}")
            sys.exit(1)

def cmd_logs(args):
    """Show container logs."""
    with PodmanClient() as client:
        try:
            container = client.containers.get(args.name)
            logs = container.logs(tail=args.lines, timestamps=args.timestamps)
            print(logs.decode("utf-8"))
        except NotFound:
            print(f"Container not found: {args.name}")
            sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description="Podman automation tool")
    subparsers = parser.add_subparsers(dest="command")

    # Status command
    subparsers.add_parser("status", help="Show system status")

    # Restart command
    restart_parser = subparsers.add_parser("restart", help="Restart a container")
    restart_parser.add_argument("name", help="Container name")
    restart_parser.add_argument("--timeout", type=int, default=10)

    # Logs command
    logs_parser = subparsers.add_parser("logs", help="Show container logs")
    logs_parser.add_argument("name", help="Container name")
    logs_parser.add_argument("--lines", type=int, default=50)
    logs_parser.add_argument("--timestamps", action="store_true")

    args = parser.parse_args()

    commands = {
        "status": cmd_status,
        "restart": cmd_restart,
        "logs": cmd_logs,
    }

    if args.command in commands:
        commands[args.command](args)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
```

## Conclusion

The Podman Python SDK is a powerful foundation for building container automation. From environment provisioning and health monitoring to image updates and system cleanup, Python scripts can handle every aspect of container lifecycle management. By combining the SDK with Python's standard library and ecosystem, you can create sophisticated DevOps tools tailored to your infrastructure needs. The patterns shown here serve as building blocks that you can extend and customize for your specific workflows.
