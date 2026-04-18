# How to View Container Mount Points in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Volumes, Mount Points, Operation, Storage

Description: Inspect volume and bind mount configurations for running containers in Portainer to understand data persistence and identify misconfigured mounts.

---

This guide shows you how to accomplish this common container management task in Portainer, including both the UI approach and the equivalent command-line method.

## Using the Portainer UI

Navigate to **Containers** in the left sidebar and click a container name to open its details page. Scroll to the **Volumes** section to see every mount attached to the container. Each row shows:

- **Host / Volume**: The named volume or host path backing the mount.
- **Container path**: Where the mount is exposed inside the container.
- **Type**: `volume` for a Docker-managed named volume, `bind` for a host path, and `tmpfs` for an in-memory mount.
- **Read-only / Read-write**: Access mode for the mount.

Clicking a named volume takes you to the **Volumes** view, where you can inspect the driver, labels, mount point on the host, and containers currently using it.

If you need the raw engine data, open the **Inspect** tab on the container page. The JSON output includes a top-level `Mounts` array and a `HostConfig.Binds` / `HostConfig.Mounts` section, which Docker uses internally to represent the mount configuration.

## Using the Docker CLI

For scripted or automated use cases, the Docker CLI exposes the same information:

```bash
# Show mounts for a specific container as JSON
docker inspect --format '{{json .Mounts}}' my-container

# Pretty-print mounts (requires jq)
docker inspect --format '{{json .Mounts}}' my-container | jq .

# Print a table of Type, Source, Destination, Mode
docker inspect \
  --format '{{range .Mounts}}{{.Type}}{{"\t"}}{{.Source}}{{"\t"}}{{.Destination}}{{"\t"}}{{.Mode}}{{"\n"}}{{end}}' \
  my-container

# Inspect a named volume directly
docker volume inspect my-data

# List all volumes on the host
docker volume ls

# Find the on-disk location of a named volume
docker volume inspect --format '{{.Mountpoint}}' my-data
```

Each entry in the `.Mounts` array includes a `Type` (`volume`, `bind`, or `tmpfs`), a `Source` (the host path or named volume), a `Destination` (the container path), and an `RW` boolean indicating whether the mount is writable. For `volume` mounts, the `Name` and `Driver` fields identify the underlying Docker volume.

## Declaring Mounts

Mounts are declared at container creation time. In a Compose file:

```yaml
# In your docker-compose.yml
services:
  webapp:
    image: myapp:1.2.3
    volumes:
      # Named volume (Docker manages the host path)
      - app-data:/var/lib/app
      # Bind mount (explicit host path)
      - ./config:/etc/app/config:ro
      # Long syntax for clarity
      - type: bind
        source: /var/log/app
        target: /var/log/app
      - type: tmpfs
        target: /tmp
        tmpfs:
          size: 67108864

volumes:
  app-data:
```

When running containers directly, the equivalent `docker run` flags are:

```bash
# Named volume
docker run -v app-data:/var/lib/app myapp:1.2.3

# Bind mount, read-only
docker run -v /host/config:/etc/app/config:ro myapp:1.2.3

# Using the more explicit --mount flag
docker run --mount type=bind,source=/var/log/app,target=/var/log/app myapp:1.2.3

# Tmpfs mount
docker run --mount type=tmpfs,destination=/tmp,tmpfs-size=67108864 myapp:1.2.3
```

## Using the Portainer API

For integration with monitoring tools or dashboards:

```python
import requests

headers = {"X-API-Key": "your-api-token"}

# Inspect a container via Portainer's Docker proxy endpoint
response = requests.get(
    "https://portainer.example.com/api/endpoints/1/docker/containers/my-container/json",
    headers=headers,
)

data = response.json()
name = data["Name"].lstrip("/")
for mount in data.get("Mounts", []):
    mount_type = mount.get("Type")
    source = mount.get("Source") or mount.get("Name", "")
    destination = mount.get("Destination")
    mode = "rw" if mount.get("RW") else "ro"
    print(f"{name}: [{mount_type}] {source} -> {destination} ({mode})")
```

The `Mounts` array in the response mirrors the output of the Docker Engine API's `GET /containers/{id}/json` endpoint, which Portainer proxies through its `/api/endpoints/:id/docker/` path.

## Summary

Portainer's **Volumes** section on the container details page surfaces the same mount information that `docker inspect` returns from the CLI. Knowing how to read these mounts is essential for verifying that persistent data is attached to the right volume, spotting accidental bind mounts of sensitive host paths, and confirming that read-only mounts stay read-only in production.
