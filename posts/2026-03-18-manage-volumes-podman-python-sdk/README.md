# How to Manage Volumes with Podman Python SDK

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Python, SDK, Volumes, Storage

Description: A complete guide to creating, inspecting, listing, and removing volumes with the Podman Python SDK, including backup strategies and persistent storage patterns.

---

> Volumes provide persistent storage that survives container restarts and removal. The Podman Python SDK makes it easy to manage volumes programmatically, enabling automated backup, cleanup, and storage orchestration.

Containers are ephemeral by design, but application data often needs to persist. Podman volumes solve this by providing managed storage that exists independently of any container. The Podman Python SDK gives you full programmatic control over volume creation, inspection, and lifecycle management.

---

## Creating Volumes

Create a named volume with default settings:

```python
from podman import PodmanClient

with PodmanClient() as client:
    volume = client.volumes.create(name="my-data")

    print(f"Name: {volume.name}")
    print(f"Driver: {volume.attrs.get('Driver', 'local')}")
    print(f"Mountpoint: {volume.attrs.get('Mountpoint')}")
```

### Creating Volumes with Labels

Labels help organize and identify volumes:

```python
from podman import PodmanClient

with PodmanClient() as client:
    volume = client.volumes.create(
        name="app-database",
        labels={
            "app": "mywebapp",
            "component": "database",
            "environment": "production",
            "backup": "daily"
        }
    )

    print(f"Created volume: {volume.name}")
    print(f"Labels: {volume.attrs.get('Labels', {})}")
```

### Creating Volumes with Options

Pass driver-specific options when creating volumes:

```python
from podman import PodmanClient

with PodmanClient() as client:
    # Create a volume with specific mount options
    volume = client.volumes.create(
        name="fast-storage",
        driver="local",
        driver_opts={
            "type": "tmpfs",
            "device": "tmpfs",
            "o": "size=500m,uid=1000"
        }
    )

    print(f"Created: {volume.name}")
    print(f"Options: {volume.attrs.get('Options', {})}")
```

## Listing Volumes

List all volumes on the system:

```python
from podman import PodmanClient

with PodmanClient() as client:
    volumes = client.volumes.list()

    print(f"Total volumes: {len(volumes)}")
    for volume in volumes:
        mountpoint = volume.attrs.get("Mountpoint", "unknown")
        labels = volume.attrs.get("Labels", {})
        print(f"  {volume.name}")
        print(f"    Mountpoint: {mountpoint}")
        print(f"    Labels: {labels}")
```

### Filtering Volumes

Filter volumes by labels or other criteria:

```python
from podman import PodmanClient

with PodmanClient() as client:
    # Filter by label
    production_volumes = client.volumes.list(
        filters={"label": "environment=production"}
    )
    print(f"Production volumes: {len(production_volumes)}")

    # Filter by driver
    local_volumes = client.volumes.list(
        filters={"driver": "local"}
    )
    print(f"Local volumes: {len(local_volumes)}")

    # Filter by name pattern
    db_volumes = client.volumes.list(
        filters={"name": "database"}
    )
    print(f"Database volumes: {len(db_volumes)}")
```

## Inspecting Volumes

Get detailed information about a specific volume:

```python
from podman import PodmanClient

with PodmanClient() as client:
    volume = client.volumes.get("my-data")

    attrs = volume.attrs
    print(f"Name: {volume.name}")
    print(f"Driver: {attrs.get('Driver')}")
    print(f"Mountpoint: {attrs.get('Mountpoint')}")
    print(f"Created: {attrs.get('CreatedAt')}")
    print(f"Labels: {attrs.get('Labels', {})}")
    print(f"Options: {attrs.get('Options', {})}")
    print(f"Scope: {attrs.get('Scope', 'local')}")
```

## Using Volumes with Containers

Attach volumes to containers for persistent storage:

```python
from podman import PodmanClient

with PodmanClient() as client:
    # Create volumes
    data_vol = client.volumes.create(name="postgres-data")
    config_vol = client.volumes.create(name="postgres-config")

    # Run a container with volumes attached
    container = client.containers.run(
        image="postgres:15",
        name="db-server",
        detach=True,
        environment={"POSTGRES_PASSWORD": "secret"},
        volumes={
            "postgres-data": {
                "bind": "/var/lib/postgresql/data",
                "mode": "rw"
            },
            "postgres-config": {
                "bind": "/etc/postgresql",
                "mode": "ro"
            }
        }
    )

    print(f"Container {container.name} running with volumes")
```

### Sharing Volumes Between Containers

Multiple containers can share the same volume:

```python
from podman import PodmanClient

with PodmanClient() as client:
    # Create a shared volume
    shared = client.volumes.create(name="shared-data")

    # Writer container
    writer = client.containers.run(
        image="alpine:latest",
        name="data-writer",
        detach=True,
        command=["sh", "-c", "while true; do date >> /data/log.txt; sleep 5; done"],
        volumes={
            "shared-data": {"bind": "/data", "mode": "rw"}
        }
    )

    # Reader container
    reader = client.containers.run(
        image="alpine:latest",
        name="data-reader",
        detach=True,
        command=["sh", "-c", "tail -f /data/log.txt"],
        volumes={
            "shared-data": {"bind": "/data", "mode": "ro"}
        }
    )

    print("Writer and reader containers sharing volume")
```

## Backing Up Volumes

Create a backup container that archives volume data:

```python
from podman import PodmanClient
from datetime import datetime
import os

def backup_volume(volume_name, backup_dir="/tmp/backups"):
    """Backup a volume to a tar archive."""
    os.makedirs(backup_dir, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = f"{volume_name}_{timestamp}.tar.gz"

    with PodmanClient() as client:
        # Run a temporary container to create the backup
        container = client.containers.run(
            image="alpine:latest",
            name=f"backup-{volume_name}",
            command=[
                "tar", "czf",
                f"/backup/{backup_file}",
                "-C", "/source", "."
            ],
            volumes={
                volume_name: {"bind": "/source", "mode": "ro"},
                backup_dir: {"bind": "/backup", "mode": "rw"}
            },
            detach=True
        )

        # Wait for the backup to complete
        result = container.wait()
        exit_code = result.get("StatusCode", -1)

        # Clean up the backup container
        container.remove()

        if exit_code == 0:
            print(f"Backup saved: {backup_dir}/{backup_file}")
        else:
            print(f"Backup failed with exit code {exit_code}")

        return exit_code == 0

backup_volume("postgres-data")
```

### Restoring from Backup

Restore a volume from a tar archive:

```python
from podman import PodmanClient

def restore_volume(volume_name, backup_path):
    """Restore a volume from a tar archive."""
    with PodmanClient() as client:
        # Create the volume if it does not exist
        try:
            client.volumes.get(volume_name)
        except Exception:
            client.volumes.create(name=volume_name)

        # Run a temporary container to restore
        import os
        backup_dir = os.path.dirname(backup_path)
        backup_file = os.path.basename(backup_path)

        container = client.containers.run(
            image="alpine:latest",
            name=f"restore-{volume_name}",
            command=[
                "tar", "xzf",
                f"/backup/{backup_file}",
                "-C", "/target"
            ],
            volumes={
                volume_name: {"bind": "/target", "mode": "rw"},
                backup_dir: {"bind": "/backup", "mode": "ro"}
            },
            detach=True
        )

        result = container.wait()
        container.remove()

        exit_code = result.get("StatusCode", -1)
        if exit_code == 0:
            print(f"Restored volume {volume_name} from {backup_path}")
        else:
            print(f"Restore failed with exit code {exit_code}")

        return exit_code == 0

restore_volume("postgres-data", "/tmp/backups/postgres-data_20260318_120000.tar.gz")
```

## Removing Volumes

Remove volumes that are no longer needed:

```python
from podman import PodmanClient
from podman.errors import APIError

with PodmanClient() as client:
    # Remove a specific volume
    try:
        volume = client.volumes.get("old-data")
        volume.remove()
        print("Volume removed")
    except APIError as e:
        print(f"Cannot remove: {e}")

    # Force remove (even if in use)
    try:
        volume = client.volumes.get("stuck-volume")
        volume.remove(force=True)
    except Exception as e:
        print(f"Error: {e}")
```

### Pruning Unused Volumes

Remove all volumes not attached to any container:

```python
from podman import PodmanClient

with PodmanClient() as client:
    pruned = client.volumes.prune()

    deleted = pruned.get("VolumesDeleted", []) or []
    print(f"Pruned {len(deleted)} unused volumes")
    for name in deleted:
        print(f"  Removed: {name}")
```

## Volume Size Monitoring

Track volume disk usage:

```python
from podman import PodmanClient
import subprocess

def get_volume_sizes():
    """Get disk usage for all volumes."""
    with PodmanClient() as client:
        volumes = client.volumes.list()

        for volume in volumes:
            mountpoint = volume.attrs.get("Mountpoint", "")
            if mountpoint:
                try:
                    result = subprocess.run(
                        ["du", "-sh", mountpoint],
                        capture_output=True, text=True
                    )
                    size = result.stdout.split()[0] if result.stdout else "unknown"
                except Exception:
                    size = "unknown"
            else:
                size = "unknown"

            print(f"{volume.name}: {size}")

get_volume_sizes()
```

## Automated Volume Lifecycle Management

Build a comprehensive volume manager:

```python
from podman import PodmanClient
from datetime import datetime

class VolumeManager:
    """Manage Podman volumes with lifecycle automation."""

    def __init__(self):
        self.client = PodmanClient()

    def create_with_policy(self, name, retention_days=30, **kwargs):
        """Create a volume with retention metadata."""
        labels = kwargs.pop("labels", {})
        labels.update({
            "created_at": datetime.now().isoformat(),
            "retention_days": str(retention_days),
            "managed_by": "volume-manager"
        })
        return self.client.volumes.create(name=name, labels=labels, **kwargs)

    def list_managed(self):
        """List only volumes managed by this tool."""
        return self.client.volumes.list(
            filters={"label": "managed_by=volume-manager"}
        )

    def cleanup_expired(self, dry_run=True):
        """Remove volumes past their retention period."""
        managed = self.list_managed()
        removed = 0

        for volume in managed:
            labels = volume.attrs.get("Labels", {})
            created = labels.get("created_at", "")
            retention = int(labels.get("retention_days", "30"))

            if created:
                created_date = datetime.fromisoformat(created)
                age = (datetime.now() - created_date).days

                if age > retention:
                    if dry_run:
                        print(f"[DRY RUN] Would remove: {volume.name} (age: {age} days)")
                    else:
                        volume.remove()
                        print(f"Removed: {volume.name} (age: {age} days)")
                    removed += 1

        return removed

    def close(self):
        self.client.close()

# Usage

manager = VolumeManager()
vol = manager.create_with_policy("temp-data", retention_days=7)
print(f"Created: {vol.name}")
manager.cleanup_expired(dry_run=True)
manager.close()
```

## Conclusion

Volumes are essential for persistent storage in containerized applications. The Podman Python SDK provides all the tools needed to create, inspect, back up, and clean up volumes programmatically. By automating volume management, you can ensure data persistence, implement backup strategies, and keep disk usage under control. Next, we will explore network management with the Podman Python SDK.
