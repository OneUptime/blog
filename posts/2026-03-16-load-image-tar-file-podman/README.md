# How to Load an Image from a Tar File with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Image, Image Import, Tar

Description: Learn how to load container images from tar archive files into Podman for use in air-gapped environments, backups, and offline deployments.

---

> Loading images from tar files lets you deploy containers in environments without registry access.

Container images saved as tar archives need to be loaded back into a container runtime before you can use them. Podman provides the `podman load` command to import images from tar files, restoring all layers, tags, and metadata. This guide covers every practical aspect of loading images from tar files with Podman.

---

## Understanding podman load

The `podman load` command reads images from a tar archive or standard input and adds them to the local image store.

```bash
# Basic syntax

podman load [options]
```

## Loading a Basic Tar File

The simplest way to load an image is with the `-i` flag pointing to a tar file.

```bash
# Load an image from a tar file
podman load -i nginx-latest.tar

# Expected output:
# Getting image source signatures
# Copying blob sha256:abc123... done
# Copying config sha256:def456... done
# Writing manifest to image destination
# Loaded image: docker.io/library/nginx:latest
```

## Loading from Standard Input

You can pipe tar data directly into `podman load`, which is useful when combined with decompression or network transfers.

```bash
# Load from a gzip-compressed tar file
gunzip -c nginx-latest.tar.gz | podman load

# Load from a bzip2-compressed file
bzip2 -dc nginx-latest.tar.bz2 | podman load

# Load from a zstd-compressed file
zstd -dc nginx-latest.tar.zst | podman load
```

## Verifying a Loaded Image

After loading, confirm the image is available in your local store.

```bash
# List images to verify
podman images

# Check specific image details
podman inspect docker.io/library/nginx:latest

# Verify the image runs correctly
podman run --rm docker.io/library/nginx:latest nginx -v
# Output: nginx version: nginx/1.27.x
```

## Loading Multiple Images from One Archive

If a tar file contains multiple images, `podman load` imports all of them in a single operation.

```bash
# Load an archive containing multiple images
podman load -i app-stack.tar

# Output shows each loaded image:
# Loaded image: docker.io/library/nginx:latest
# Loaded image: docker.io/library/redis:7
# Loaded image: docker.io/library/postgres:16

# Verify all images were loaded
podman images | grep -E "nginx|redis|postgres"
```

## Loading and Retagging Images

When an image was saved by ID rather than name, it loads without a repository name or tag. You need to retag it manually.

```bash
# Load an image saved by ID
podman load -i nginx-by-id.tar
# Output: Loaded image: sha256:a8758716bb6a...

# Tag the image with a meaningful name
podman tag a8758716bb6a myregistry.example.com/nginx:latest

# Verify the tag
podman images myregistry.example.com/nginx
```

## Loading from a Remote Source

You can combine standard Unix networking tools with `podman load` to load images from remote locations.

```bash
# Load from a file on a remote server via SSH
ssh user@remote-host "cat /backups/nginx-latest.tar.gz" | gunzip | podman load

# Load from an HTTP server using curl
curl -sSL https://internal-server.example.com/images/nginx-latest.tar | podman load

# Load from an S3-compatible store
aws s3 cp s3://my-bucket/images/nginx-latest.tar.gz - | gunzip | podman load
```

## Handling Different Archive Formats

Podman can load images saved in different formats. The format is detected automatically.

```bash
# Load Docker-format archive (default from docker save or podman save)
podman load -i image-docker-format.tar

# Load OCI-format archive
podman load -i image-oci-format.tar
```

Both formats are auto-detected, so you do not need to specify the format when loading.

## Batch Loading Multiple Tar Files

When you have multiple individual tar files, you can load them all with a simple loop.

```bash
# Load all tar files in a directory
for tarfile in /path/to/images/*.tar; do
  echo "Loading: $tarfile"
  podman load -i "$tarfile"
done
```

```bash
# Load all compressed tar files
for tarfile in /path/to/images/*.tar.gz; do
  echo "Loading: $tarfile"
  gunzip -c "$tarfile" | podman load
done
```

## Quiet Mode

Use the `-q` or `--quiet` flag to suppress progress output, which is useful in scripts.

```bash
# Load silently, only output the image name
podman load -q -i nginx-latest.tar
# Output: Loaded image: docker.io/library/nginx:latest
```

## Complete Air-Gapped Deployment Workflow

Here is an end-to-end workflow for deploying containers in an air-gapped environment.

```bash
# Step 1: On an internet-connected machine, pull and save images
podman pull docker.io/library/nginx:1.27
podman pull docker.io/library/redis:7
podman save --multi-image-archive docker.io/library/nginx:1.27 docker.io/library/redis:7 | gzip > app-images.tar.gz

# Step 2: Transfer to air-gapped machine via USB or secure copy
# (physical transfer or scp to a jump host)

# Step 3: On the air-gapped machine, load the images
gunzip -c /media/usb/app-images.tar.gz | podman load

# Step 4: Verify and run
podman images
podman run -d --name web -p 8080:80 docker.io/library/nginx:1.27
podman run -d --name cache -p 6379:6379 docker.io/library/redis:7
```

## Troubleshooting Common Issues

```bash
# Error: file is not a valid tar archive
# Check if the file is compressed
file nginx-image.tar
# If it shows "gzip compressed", decompress first:
gunzip -c nginx-image.tar | podman load

# Error: image name conflict
# Remove the existing image first
podman rmi docker.io/library/nginx:latest
podman load -i nginx-latest.tar

# Check disk space before loading large images
df -h /var/lib/containers
```

## Summary

The `podman load` command is the counterpart to `podman save`, letting you restore images from tar archives into your local image store. It handles multiple formats automatically, supports piped input for compression and remote transfers, and works seamlessly in scripted workflows. This makes it an essential tool for air-gapped deployments, disaster recovery, and offline container management.
