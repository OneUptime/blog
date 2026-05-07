# How to Backup Podman Images

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Podman, Image, Backup, Container Registry, DevOps

Description: Learn how to back up Podman images using save, push, and registry mirroring so you can recover your container environment even when upstream registries are unavailable.

---

> Upstream registries go down, images get deleted, and tags get overwritten. Backing up your Podman images ensures you can always rebuild your environment regardless of what happens upstream.

Most teams pull container images from public registries and assume they will always be available. Then Docker Hub introduces rate limits, a maintainer deletes a tag, or an image gets flagged and removed. Suddenly, your deployment pipeline is broken and you cannot start containers. Backing up images locally or to a private registry gives you independence from upstream availability.

---

## Why Back Up Images

Container images are the foundation of every container. Without the image, you cannot create or recreate a container. There are several reasons to maintain local backups:

- **Registry outages** can block deployments during critical moments.
- **Tag mutation** means `nginx:latest` today may differ from `nginx:latest` tomorrow.
- **Image deletion** by upstream maintainers removes your dependency permanently.
- **Air-gapped environments** have no registry access at all.
- **Compliance requirements** may mandate local copies of all production dependencies.

## Listing Images to Back Up

Start by identifying which images are in use:

```bash
# All local images

podman images --format "{{.Repository}}:{{.Tag}} {{.Size}} {{.ID}}"

# Images used by running containers
podman ps --format "{{.Image}}" | sort -u

# Images used by all containers including stopped
podman ps -a --format "{{.Image}}" | sort -u
```

## Saving Images with podman save

The `podman save` command exports an image to a tar archive, preserving all layers, metadata, tags, and history:

```bash
podman save -o /backups/images/nginx-latest.tar docker.io/library/nginx:latest
```

To compress the output:

```bash
podman save docker.io/library/nginx:latest | gzip > /backups/images/nginx-latest.tar.gz
```

You can save multiple images into a single archive:

```bash
podman save --multi-image-archive -o /backups/images/web-stack.tar \
    docker.io/library/nginx:latest \
    docker.io/library/redis:7 \
    docker.io/library/postgres:16
```

This is useful for creating a single backup file that contains an entire application stack.

## Saving Images by ID vs Tag

Tags can change, but image IDs are immutable. For critical images, save by ID to ensure you get exactly the right image:

```bash
# Get the image ID
IMAGE_ID=$(podman inspect docker.io/library/nginx:latest --format '{{.Id}}')
IMAGE_ID_SHORT=${IMAGE_ID#sha256:}

# Save by ID
podman save -o /backups/images/nginx-${IMAGE_ID_SHORT:0:12}.tar "$IMAGE_ID"
```

When saving by ID, include a manifest file so you know what the image was:

```bash
IMAGE_ID=$(podman inspect docker.io/library/nginx:latest --format '{{.Id}}')
IMAGE_ID_SHORT=${IMAGE_ID#sha256:}
podman inspect docker.io/library/nginx:latest > /backups/images/nginx-${IMAGE_ID_SHORT:0:12}-manifest.json
```

## Batch Backup of All Images

Here is a script that backs up every image on the system:

```bash
#!/bin/bash

BACKUP_DIR="/backups/podman-images/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "Backing up all Podman images to $BACKUP_DIR"

podman images --format "{{.Repository}}:{{.Tag}}" | grep -v "<none>" | while read image; do
    # Create a safe filename from the image name
    SAFE_NAME=$(echo "$image" | tr '/:' '_')

    echo "Saving: $image"
    podman save "$image" | gzip > "$BACKUP_DIR/${SAFE_NAME}.tar.gz"

    if [ $? -eq 0 ]; then
        SIZE=$(du -h "$BACKUP_DIR/${SAFE_NAME}.tar.gz" | cut -f1)
        echo "  Saved: ${SAFE_NAME}.tar.gz ($SIZE)"
    else
        echo "  FAILED: $image"
    fi
done

# Save a manifest of all images
podman images --format "{{.Repository}}:{{.Tag}} {{.ID}} {{.Size}}" > "$BACKUP_DIR/manifest.txt"

echo "Backup complete: $BACKUP_DIR"
```

## Restoring Images with podman load

To restore an image from a tar archive:

```bash
podman load -i /backups/images/nginx-latest.tar
```

For compressed archives:

```bash
gunzip -c /backups/images/nginx-latest.tar.gz | podman load
```

The `podman load` command restores all layers, tags, and metadata exactly as they were when the image was saved. Unlike `podman import` (which creates a flat image from a container export), `podman load` preserves the full layer history.

## Pushing Images to a Private Registry

Instead of saving to tar files, you can push images to a private registry for backup. This is more scalable for large environments:

```bash
# Tag for your private registry
podman tag docker.io/library/nginx:latest registry.internal.example.com/backups/nginx:latest

# Push to private registry
podman push registry.internal.example.com/backups/nginx:latest
```

To mirror all images to a private registry:

```bash
#!/bin/bash

REGISTRY="registry.internal.example.com/mirror"

podman images --format "{{.Repository}}:{{.Tag}}" | grep -v "<none>" | while read image; do
    # Extract the image name without the registry prefix
    NAME=$(echo "$image" | sed 's|^[^/]*/||')

    echo "Mirroring: $image -> $REGISTRY/$NAME"
    podman tag "$image" "$REGISTRY/$NAME"
    podman push "$REGISTRY/$NAME"
done
```

## Setting Up a Local Registry for Backups

If you do not have a private registry, you can run one locally with Podman:

```bash
podman run -d \
    --name backup-registry \
    -p 5000:5000 \
    -v registry-data:/var/lib/registry \
    --restart unless-stopped \
    docker.io/library/registry:2
```

Then push images to `localhost:5000`:

```bash
podman tag docker.io/library/nginx:latest localhost:5000/nginx:latest
podman push localhost:5000/nginx:latest --tls-verify=false
```

To avoid passing `--tls-verify=false` each time, configure the local registry as insecure in `/etc/containers/registries.conf`, or in `$HOME/.config/containers/registries.conf` for a rootless-only configuration:

```toml
[[registry]]
location = "localhost:5000"
insecure = true
```

## Comparing Save vs Push Approaches

| Aspect | podman save | Registry Push |
|--------|------------|---------------|
| Storage format | Tar archives on disk | Registry blobs |
| Deduplication | No (each archive is independent) | Yes (shared layers) |
| Network transfer | Must copy files manually | Built-in push/pull |
| Air-gapped support | Excellent | Requires local registry |
| Scalability | Limited by disk I/O | Better for large environments |
| Restore speed | Fast (local file) | Depends on network |

For small environments or air-gapped systems, `podman save` is simpler. For larger environments, a private registry is more efficient because it deduplicates shared image layers.

## Verifying Image Backups

Verify that compressed saved images can be loaded successfully:

```bash
#!/bin/bash

BACKUP_FILE="$1"

echo "Verifying image backup: $BACKUP_FILE"

# Check archive integrity
if ! gzip -t "$BACKUP_FILE" 2>/dev/null; then
    echo "FAIL: Archive is corrupted"
    exit 1
fi

# Try loading the image
LOADED=$(gunzip -c "$BACKUP_FILE" | podman load 2>&1)
echo "$LOADED"

# Extract the image name from the load output
IMAGE_NAME=$(echo "$LOADED" | grep "Loaded image" | sed 's/Loaded image: //')

if [ -n "$IMAGE_NAME" ]; then
    echo "Loaded successfully: $IMAGE_NAME"

    # Verify the image exists in local storage after loading
    podman image exists "$IMAGE_NAME"

    # Clean up the test image if desired
    # podman rmi "$IMAGE_NAME"
else
    echo "FAIL: Could not load image"
    exit 1
fi
```

## Conclusion

Image backups protect you from upstream registry failures, tag mutations, and image deletions. Use `podman save` for simple, portable backups and a private registry for scalable mirroring. Whichever approach you choose, verify your backups regularly and maintain a manifest of which images your environment depends on. When an upstream registry goes down at 2 AM, you will be glad you have local copies.
