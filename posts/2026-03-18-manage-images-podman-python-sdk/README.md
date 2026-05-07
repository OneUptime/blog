# How to Manage Images with Podman Python SDK

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Python, SDK, Image, Container Registry

Description: Learn how to pull, push, build, tag, inspect, and remove container images using the Podman Python SDK, including working with registries and Dockerfiles.

---

> Container images are the foundation of every containerized application. The Podman Python SDK provides a complete set of tools for managing images, from pulling from registries to building custom images from Dockerfiles.

Managing container images programmatically enables automated CI/CD pipelines, image cleanup routines, and registry synchronization. The Podman Python SDK wraps the Podman REST API to give you full image lifecycle management from Python. This guide covers every image operation you will need.

---

## Listing Images

Start by listing all images available on your system:

```python
from podman import PodmanClient

with PodmanClient() as client:
    images = client.images.list()

    for image in images:
        tags = image.tags if image.tags else ["<none>"]
        size_mb = image.attrs.get("Size", 0) / 1024 / 1024
        print(f"Tags: {', '.join(tags)}")
        print(f"ID: {image.short_id}")
        print(f"Size: {size_mb:.1f} MB")
        print(f"Created: {image.attrs.get('Created', 'unknown')}")
        print("---")
```

### Filtering Images

Filter images by various criteria:

```python
from podman import PodmanClient

with PodmanClient() as client:
    # List only dangling images (untagged)
    dangling = client.images.list(filters={"dangling": True})
    print(f"Dangling images: {len(dangling)}")

    # Filter by image name
    nginx_images = client.images.list(name="nginx")
    print(f"Nginx images: {len(nginx_images)}")

    # Filter by label
    labeled = client.images.list(filters={"label": ["maintainer"]})
    print(f"Images with maintainer label: {len(labeled)}")
```

## Pulling Images

Pull images from a container registry:

```python
from podman import PodmanClient

with PodmanClient() as client:
    # Pull a specific tag
    image = client.images.pull("docker.io/library/python:3.11-slim")
    print(f"Pulled: {image.tags}")
    print(f"ID: {image.short_id}")

    # Pull latest tag
    image = client.images.pull("docker.io/library/nginx:latest")
    print(f"Pulled: {image.tags}")
```

### Pulling with Progress Tracking

Track download progress for large images:

```python
from podman import PodmanClient

with PodmanClient() as client:
    # Pull with streaming progress
    for line in client.images.pull(
        "docker.io/library/ubuntu:22.04",
        stream=True,
        decode=True
    ):
        if isinstance(line, dict):
            status = line.get("status", "")
            progress = line.get("progress", "")
            if progress:
                print(f"\r{status}: {progress}", end="", flush=True)
            else:
                print(f"\n{status}")
    print("\nPull complete")
```

### Pulling from Private Registries

Authenticate with private registries before pulling:

```python
from podman import PodmanClient

with PodmanClient() as client:
    # Login to a private registry
    client.login(
        registry="registry.example.com",
        username="myuser",
        password="mypassword"
    )

    # Pull from the private registry
    image = client.images.pull("registry.example.com/myapp:latest")
    print(f"Pulled private image: {image.tags}")
```

## Inspecting Images

Get detailed information about an image:

```python
from podman import PodmanClient

with PodmanClient() as client:
    image = client.images.get("python:3.11-slim")

    # Basic attributes
    print(f"Tags: {image.tags}")
    print(f"ID: {image.id}")
    print(f"Short ID: {image.short_id}")

    # Detailed inspection
    attrs = image.attrs
    print(f"Architecture: {attrs.get('Architecture', 'unknown')}")
    print(f"OS: {attrs.get('Os', 'unknown')}")
    print(f"Size: {attrs.get('Size', 0) / 1024 / 1024:.1f} MB")

    # Config details
    config = attrs.get("Config", {})
    print(f"Entrypoint: {config.get('Entrypoint')}")
    print(f"Cmd: {config.get('Cmd')}")
    print(f"Exposed Ports: {config.get('ExposedPorts', {})}")
    print(f"Env: {config.get('Env', [])}")
    print(f"Labels: {config.get('Labels', {})}")
```

### Viewing Image History

Inspect the layer history of an image:

```python
from podman import PodmanClient

with PodmanClient() as client:
    image = client.images.get("python:3.11-slim")
    history = image.history()

    print(f"Image layers for {image.tags}:")
    for layer in history:
        created_by = layer.get("CreatedBy", "")
        size = layer.get("Size", 0) / 1024 / 1024
        # Truncate long commands
        if len(created_by) > 80:
            created_by = created_by[:77] + "..."
        print(f"  {size:>8.2f} MB | {created_by}")
```

## Building Images

Build images from a Dockerfile programmatically:

```python
from podman import PodmanClient
import json

with PodmanClient() as client:
    # Build from a Dockerfile in a directory
    image, build_logs = client.images.build(
        path="/path/to/project",
        tag="myapp:latest",
        dockerfile="Dockerfile"
    )

    for log in build_logs:
        result = json.loads(log)
        if "stream" in result:
            print(result["stream"], end="")

    print(f"\nBuilt: {image.tags}")
```

### Building from a String

Create a Dockerfile in memory and build from it:

```python
from podman import PodmanClient
import io
import tarfile

dockerfile_content = """
FROM python:3.11-slim
WORKDIR /app
EXPOSE 8000
CMD ["python", "-m", "http.server", "8000"]
"""

with PodmanClient() as client:
    # Create a build context with just the Dockerfile
    fileobj = io.BytesIO()
    with tarfile.open(fileobj=fileobj, mode="w") as tar:
        dockerfile_data = dockerfile_content.encode("utf-8")
        info = tarfile.TarInfo(name="Dockerfile")
        info.size = len(dockerfile_data)
        tar.addfile(info, io.BytesIO(dockerfile_data))

    fileobj.seek(0)

    image, logs = client.images.build(
        fileobj=fileobj,
        tag="myapp:latest",
        custom_context=True,
        dockerfile="Dockerfile"
    )

    print(f"Built image: {image.tags}")
```

## Tagging Images

Add tags to images for versioning and registry organization:

```python
from podman import PodmanClient

with PodmanClient() as client:
    image = client.images.get("myapp:latest")

    # Add a version tag
    image.tag("myapp", tag="1.0.0")

    # Tag for a remote registry
    image.tag("registry.example.com/myapp", tag="1.0.0")
    image.tag("registry.example.com/myapp", tag="latest")

    # Verify the new tags
    image.reload()
    print(f"Tags: {image.tags}")
```

## Pushing Images

Push images to a container registry:

```python
from podman import PodmanClient

with PodmanClient() as client:
    # Tag for the target registry
    image = client.images.get("myapp:latest")
    image.tag("registry.example.com/myapp", tag="1.0.0")

    # Push to registry
    result = client.images.push(
        "registry.example.com/myapp:1.0.0"
    )
    print(f"Push result: {result}")
```

## Removing Images

Clean up images you no longer need:

```python
from podman import PodmanClient
from podman.errors import APIError

with PodmanClient() as client:
    # Remove a specific image
    try:
        client.images.remove("myapp:old-version")
        print("Image removed")
    except APIError as e:
        print(f"Cannot remove: {e}")

    # Force remove (even if containers reference it)
    client.images.remove("myapp:old-version", force=True)
```

### Pruning Unused Images

Remove all unused images to reclaim disk space:

```python
from podman import PodmanClient

with PodmanClient() as client:
    # Remove dangling images only
    pruned = client.images.prune(filters={"dangling": True})
    space = pruned.get("SpaceReclaimed", 0)
    print(f"Pruned dangling images, reclaimed {space / 1024 / 1024:.1f} MB")

    # Remove all unused images (not just dangling)
    pruned = client.images.prune(all=True)
    space = pruned.get("SpaceReclaimed", 0)
    print(f"Pruned all unused images, reclaimed {space / 1024 / 1024:.1f} MB")
```

## Saving and Loading Images

Export images to tar files for offline transfer:

```python
from podman import PodmanClient

with PodmanClient() as client:
    image = client.images.get("myapp:latest")

    # Save to a tar file
    with open("myapp-latest.tar", "wb") as f:
        for chunk in image.save(named=True):
            f.write(chunk)

    print("Image saved to myapp-latest.tar")

    # Load from a tar file
    loaded = client.images.load(file_path="myapp-latest.tar")

    for img in loaded:
        print(f"Loaded: {img.tags}")
```

## Image Cleanup Automation

Build an automated cleanup script for old or unused images:

```python
from podman import PodmanClient
from datetime import datetime

def cleanup_old_images(max_age_days=30, dry_run=True):
    """Remove images older than max_age_days."""
    with PodmanClient() as client:
        images = client.images.list()
        cutoff = datetime.now().timestamp() - (max_age_days * 86400)
        removed = 0

        for image in images:
            created = image.attrs.get("Created", 0)
            if isinstance(created, str):
                created = datetime.fromisoformat(
                    created.replace("Z", "+00:00")
                ).timestamp()

            if created < cutoff:
                tags = image.tags or ["<none>"]
                size_mb = image.attrs.get("Size", 0) / 1024 / 1024

                if dry_run:
                    print(f"[DRY RUN] Would remove: {tags} ({size_mb:.1f} MB)")
                else:
                    try:
                        client.images.remove(image.id)
                        print(f"Removed: {tags} ({size_mb:.1f} MB)")
                        removed += 1
                    except Exception as e:
                        print(f"Cannot remove {tags}: {e}")

        print(f"\n{'Would remove' if dry_run else 'Removed'} {removed} images")

# Preview what would be removed

cleanup_old_images(max_age_days=30, dry_run=True)
```

## Conclusion

The Podman Python SDK provides a complete toolkit for managing container images. From pulling and building to tagging, pushing, and cleaning up, every image operation is available through a clean Python API. Automating image management with these tools enables efficient CI/CD pipelines, consistent deployments, and controlled disk usage. Next, we will explore how to manage volumes for persistent storage.
