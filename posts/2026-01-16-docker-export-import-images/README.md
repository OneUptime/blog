# How to Export and Import Docker Images (save, load, and transfer)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Images, DevOps, Containers, Transfer

Description: Learn how to export, import, and transfer Docker images between systems using docker save, docker load, docker export, and docker import commands for offline environments and air-gapped deployments.

---

Sometimes you need to move Docker images without using a registry. Air-gapped environments, slow internet connections, or simple machine-to-machine transfers all require knowing how to export and import images. Docker provides several commands for this, each serving different purposes.

## save vs export: Understanding the Difference

Docker has two pairs of commands that sound similar but do different things:

| Command | Works With | Includes | Use Case |
|---------|-----------|----------|----------|
| `docker save` | Images | All layers, tags, history | Transfer complete images |
| `docker load` | Images | Restores from save | Import saved images |
| `docker export` | Containers | Flattened filesystem | Create image from container state |
| `docker import` | Containers | Creates new image | Import exported filesystem |

Most of the time, you want `save` and `load` for transferring images.

## Exporting Images with docker save

The `save` command exports one or more images to a tar archive, preserving all layers, metadata, and tags.

### Basic Export

```bash
# Save single image
docker save nginx:latest > nginx.tar

# Or using -o flag
docker save -o nginx.tar nginx:latest

# Save with compression
docker save nginx:latest | gzip > nginx.tar.gz

# Better compression with xz (slower but smaller)
docker save nginx:latest | xz > nginx.tar.xz
```

### Export Multiple Images

```bash
# Save multiple images to one archive
docker save -o my-stack.tar nginx:latest postgres:15 redis:7

# Save all images matching a pattern
docker save $(docker images --format "{{.Repository}}:{{.Tag}}" | grep "my-app") -o my-apps.tar
```

### Export with All Tags

```bash
# Save all tags of an image
docker save -o myapp-all.tar myapp

# This includes myapp:latest, myapp:v1, myapp:v2, etc.
```

## Importing Images with docker load

The `load` command imports images from a tar archive created by `save`.

### Basic Import

```bash
# Load from tar file
docker load < nginx.tar

# Or using -i flag
docker load -i nginx.tar

# Load compressed archive
gunzip -c nginx.tar.gz | docker load

# Or with zcat
zcat nginx.tar.gz | docker load

# For xz compressed files
xz -d -c nginx.tar.xz | docker load
```

### Verify Loaded Images

```bash
# Load and see what was imported
docker load -i my-stack.tar
# Output:
# Loaded image: nginx:latest
# Loaded image: postgres:15
# Loaded image: redis:7

# Verify images exist
docker images
```

## Transferring Images Between Systems

### Method 1: Direct File Transfer

```bash
# On source machine
docker save myapp:v1.0 | gzip > myapp-v1.0.tar.gz

# Transfer via scp
scp myapp-v1.0.tar.gz user@target-server:/tmp/

# On target machine
gunzip -c /tmp/myapp-v1.0.tar.gz | docker load
```

### Method 2: SSH Pipe (No Intermediate File)

Transfer directly without creating a file on either system.

```bash
# Save on source, load on target in one command
docker save myapp:v1.0 | gzip | ssh user@target-server 'gunzip | docker load'

# With compression via pv for progress indication
docker save myapp:v1.0 | gzip | pv | ssh user@target-server 'gunzip | docker load'
```

### Method 3: USB Drive for Air-Gapped Systems

```bash
# On connected machine
docker pull nginx:latest
docker pull postgres:15
docker save nginx:latest postgres:15 | gzip > /media/usb/docker-images.tar.gz

# On air-gapped machine
gunzip -c /media/usb/docker-images.tar.gz | docker load
```

## Using docker export and import

The `export` command creates a tar archive of a container's filesystem. Unlike `save`, it flattens all layers into one and loses image history.

### Export Container Filesystem

```bash
# Create and export a container
docker run -d --name mycontainer nginx
docker export mycontainer > container-fs.tar

# Export with output flag
docker export -o container-fs.tar mycontainer
```

### Import as New Image

```bash
# Import creates a new image from the filesystem
docker import container-fs.tar my-imported-image:latest

# Import with a commit message
docker import -m "Imported from container" container-fs.tar my-image:v1

# Import and set CMD
docker import -c 'CMD ["nginx", "-g", "daemon off;"]' container-fs.tar my-nginx
```

### When to Use export/import

- Creating a minimal image from a configured container
- Reducing image size by flattening layers
- Extracting files from a container
- Forensic analysis of container state

```bash
# Example: Create minimal image from configured container
docker run -d --name configured-app base-image
docker exec configured-app apt-get update
docker exec configured-app apt-get install -y some-package
docker exec configured-app configure-something.sh

# Export flattened filesystem and import as new image
docker export configured-app | docker import - my-configured-app:v1

# Original might be 500MB with many layers
# Imported might be 350MB with one layer
```

## Practical Scripts

### Bulk Export Script

This script exports all images to individual compressed files.

```bash
#!/bin/bash
# export-all-images.sh

OUTPUT_DIR=${1:-./docker-images}
mkdir -p "$OUTPUT_DIR"

docker images --format "{{.Repository}}:{{.Tag}}" | grep -v '<none>' | while read image; do
    # Replace / and : with _ for filename
    filename=$(echo "$image" | tr '/:' '_')
    echo "Exporting $image to ${filename}.tar.gz"
    docker save "$image" | gzip > "${OUTPUT_DIR}/${filename}.tar.gz"
done

echo "Exported images:"
ls -lh "$OUTPUT_DIR"
```

### Bulk Import Script

```bash
#!/bin/bash
# import-all-images.sh

INPUT_DIR=${1:-./docker-images}

for file in "$INPUT_DIR"/*.tar.gz; do
    echo "Loading $file"
    gunzip -c "$file" | docker load
done

echo "Loaded images:"
docker images
```

### Transfer Script with Progress

```bash
#!/bin/bash
# transfer-images.sh

IMAGES="$1"
TARGET="$2"

if [ -z "$IMAGES" ] || [ -z "$TARGET" ]; then
    echo "Usage: $0 'image1 image2' user@host"
    exit 1
fi

echo "Transferring: $IMAGES"
echo "To: $TARGET"

# Calculate size for progress indicator
SIZE=$(docker save $IMAGES | wc -c)
echo "Total size: $(numfmt --to=iec $SIZE)"

# Transfer with progress
docker save $IMAGES | pv -s $SIZE | gzip | ssh "$TARGET" 'gunzip | docker load'
```

## Image Size Considerations

### Check Image Size Before Export

```bash
# Size of image
docker images myapp --format "{{.Size}}"

# Detailed size breakdown
docker history myapp:latest

# Estimate export size (usually close to image size)
docker save myapp:latest | wc -c | numfmt --to=iec
```

### Compression Comparison

| Method | Speed | Compression | Command |
|--------|-------|-------------|---------|
| None | Fastest | 1x | `docker save > file.tar` |
| gzip | Fast | ~2-3x | `docker save \| gzip > file.tar.gz` |
| pigz (parallel gzip) | Faster | ~2-3x | `docker save \| pigz > file.tar.gz` |
| xz | Slow | ~4-5x | `docker save \| xz > file.tar.xz` |
| zstd | Fast | ~3-4x | `docker save \| zstd > file.tar.zst` |

```bash
# Using zstd (if installed) - good balance of speed and compression
docker save myapp:latest | zstd > myapp.tar.zst

# Load zstd compressed
zstd -d -c myapp.tar.zst | docker load
```

## Troubleshooting

### "No such image" Error

```bash
# Make sure to use the full image reference
docker save myapp          # Might fail
docker save myapp:latest   # Works

# List available tags
docker images myapp
```

### "Loaded image ID" Instead of Tag

If you see "Loaded image: sha256:abc123..." instead of "Loaded image: myapp:latest", the image was saved without a tag.

```bash
# Tag the loaded image manually
docker tag sha256:abc123... myapp:latest
```

### Large Image Taking Forever

```bash
# Use parallel compression
docker save myapp:latest | pigz -p 4 > myapp.tar.gz

# Or split into chunks
docker save myapp:latest | split -b 1G - myapp.tar.part.
# Transfer parts separately, then:
cat myapp.tar.part.* | docker load
```

## Summary

| Task | Command |
|------|---------|
| Export image to file | `docker save image:tag > file.tar` |
| Export compressed | `docker save image:tag \| gzip > file.tar.gz` |
| Import from file | `docker load < file.tar` |
| Import compressed | `gunzip -c file.tar.gz \| docker load` |
| Transfer via SSH | `docker save image \| gzip \| ssh host 'gunzip \| docker load'` |
| Export container filesystem | `docker export container > file.tar` |
| Import as new image | `docker import file.tar newimage:tag` |

For most transfer scenarios, use `docker save` with gzip compression. It preserves all image metadata and layers, making it the reliable choice for moving images between systems.
