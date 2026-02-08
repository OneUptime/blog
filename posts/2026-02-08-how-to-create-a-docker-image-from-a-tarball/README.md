# How to Create a Docker Image from a Tarball

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Images, Tarball, Import, DevOps, Containers, Filesystem

Description: Learn how to create Docker images from tar archives using docker import, including rootfs creation and practical use cases.

---

Docker images are usually built from Dockerfiles, but that is not the only way. You can create a Docker image directly from a tarball, a compressed archive of a filesystem. This approach is useful when you need to containerize an existing system, work with custom root filesystems, migrate non-Docker workloads into containers, or build images in environments where Dockerfile builds are not practical.

This guide covers everything from creating simple images from tar files to building complete rootfs archives and importing them as Docker images.

## The Basics: docker import

The `docker import` command creates a Docker image from a tarball. The tar file should contain a filesystem layout that Docker can use as a container root.

Import a tar file as a Docker image:

```bash
# Create a simple tar file with some content
mkdir -p myroot/app
echo '#!/bin/sh' > myroot/app/run.sh
echo 'echo "Hello from tarball image"' >> myroot/app/run.sh
chmod +x myroot/app/run.sh

# Create a tar archive of the filesystem
tar -C myroot -cf myimage.tar .

# Import the tar as a Docker image
docker import myimage.tar myapp:v1

# Run the image
docker run --rm myapp:v1 /app/run.sh
# Output: Hello from tarball image
```

The imported image has exactly one layer containing everything from the tar file.

## Importing from stdin

You can pipe a tar stream directly into docker import without creating a file on disk.

Import directly from a tar stream:

```bash
# Create and import in one step (no intermediate file)
tar -C myroot -c . | docker import - myapp:v1

# Import from a remote tar file
curl -fsSL https://example.com/rootfs.tar.gz | docker import - myapp:v1

# Import from a compressed tar
gzip -dc myimage.tar.gz | docker import - myapp:v1
```

## Adding Metadata During Import

The `--change` flag lets you set Dockerfile-style instructions during import, so the image has proper configuration.

Import with image configuration:

```bash
# Import with CMD, WORKDIR, ENV, and EXPOSE
tar -C myroot -c . | docker import \
    --change 'CMD ["/app/run.sh"]' \
    --change 'WORKDIR /app' \
    --change 'ENV APP_ENV=production' \
    --change 'EXPOSE 8080' \
    - myapp:v1

# Import with an ENTRYPOINT
tar -C myroot -c . | docker import \
    --change 'ENTRYPOINT ["/app/entrypoint.sh"]' \
    --change 'CMD ["--config", "/etc/app/config.yaml"]' \
    - myapp:v1
```

Supported `--change` instructions include CMD, ENTRYPOINT, ENV, EXPOSE, ONBUILD, USER, VOLUME, and WORKDIR.

## Creating a Minimal Root Filesystem

To build a useful image from a tarball, you need a proper root filesystem with at least the basic directory structure and a shell.

### Using debootstrap (Debian/Ubuntu)

Create a minimal Debian rootfs:

```bash
# Install debootstrap if not already installed
sudo apt-get install debootstrap

# Create a minimal Debian bookworm rootfs
sudo debootstrap --variant=minbase bookworm ./debian-root http://deb.debian.org/debian

# Install additional packages into the rootfs
sudo chroot ./debian-root apt-get update
sudo chroot ./debian-root apt-get install -y --no-install-recommends \
    python3 \
    ca-certificates

# Clean up to reduce size
sudo chroot ./debian-root apt-get clean
sudo rm -rf ./debian-root/var/lib/apt/lists/*

# Create the tar and import
sudo tar -C ./debian-root -c . | docker import \
    --change 'CMD ["/bin/bash"]' \
    - my-debian:custom

# Test it
docker run --rm -it my-debian:custom python3 --version
```

### Using Alpine's minirootfs

Alpine provides pre-built minimal root filesystems that are perfect for this purpose:

```bash
# Download Alpine's mini root filesystem
wget https://dl-cdn.alpinelinux.org/alpine/v3.19/releases/x86_64/alpine-minirootfs-3.19.0-x86_64.tar.gz

# Import directly from the compressed archive
docker import \
    --change 'CMD ["/bin/sh"]' \
    alpine-minirootfs-3.19.0-x86_64.tar.gz alpine:custom

# Verify it works
docker run --rm alpine:custom cat /etc/alpine-release
# Output: 3.19.0
```

### Using DNF/YUM (Red Hat/Fedora)

Create a minimal Red Hat-based rootfs:

```bash
# Create a rootfs directory
mkdir -p fedora-root

# Install a minimal system using dnf
sudo dnf --installroot=$(pwd)/fedora-root --releasever=39 \
    install -y --setopt=install_weak_deps=False \
    bash coreutils

# Create tar and import
sudo tar -C ./fedora-root -c . | docker import \
    --change 'CMD ["/bin/bash"]' \
    - my-fedora:custom
```

## Exporting and Re-importing Existing Containers

You can export a running or stopped container's filesystem as a tar and re-import it. This is useful for creating snapshots or transferring containers between systems.

Export a container and re-import it:

```bash
# Start a container and make some changes
docker run -d --name my-worker ubuntu:22.04 sleep infinity
docker exec my-worker apt-get update
docker exec my-worker apt-get install -y python3 nodejs

# Export the container's current filesystem
docker export my-worker -o worker-snapshot.tar

# Import as a new image
docker import \
    --change 'CMD ["python3"]' \
    worker-snapshot.tar my-worker:snapshot

# Stop and remove the original container
docker stop my-worker
docker rm my-worker

# The snapshot image captures the container's state
docker run --rm my-worker:snapshot python3 --version
docker run --rm my-worker:snapshot node --version
```

## Building a Custom Application Image

Create an image for a custom application by building the filesystem from scratch.

Build a complete application image from a tarball:

```bash
#!/bin/bash
# build-from-tar.sh - Build a custom app image from a tarball

# Create the filesystem structure
ROOT="./app-root"
mkdir -p $ROOT/{app,etc,bin,lib,usr/lib,tmp}

# Copy your application
cp -r ./my-application/* $ROOT/app/

# Copy necessary system libraries (for dynamically linked binaries)
# Use ldd to find dependencies
for lib in $(ldd ./my-application/server 2>/dev/null | grep "=>" | awk '{print $3}'); do
    if [ -f "$lib" ]; then
        cp "$lib" "$ROOT/lib/"
    fi
done

# Copy the dynamic linker
cp /lib64/ld-linux-x86-64.so.2 $ROOT/lib/ 2>/dev/null || true

# Create a configuration file
cat > $ROOT/etc/app.conf << 'CONF'
port=8080
log_level=info
CONF

# Create the tar and import
tar -C $ROOT -c . | docker import \
    --change 'CMD ["/app/server"]' \
    --change 'WORKDIR /app' \
    --change 'EXPOSE 8080' \
    --change 'ENV APP_CONFIG=/etc/app.conf' \
    - myapp:custom

echo "Image created: myapp:custom"
docker images myapp:custom
```

## Importing Compressed Archives

Docker import handles various compression formats.

Import from different compressed formats:

```bash
# gzip compressed tar
docker import myimage.tar.gz myapp:v1

# bzip2 compressed tar
docker import myimage.tar.bz2 myapp:v1

# xz compressed tar
docker import myimage.tar.xz myapp:v1

# Automatic format detection works in most cases
# Docker detects the compression format from the file content
```

## docker import vs docker load

These two commands are different and serve different purposes.

`docker import` creates a new single-layer image from a tar archive of a filesystem. It does not preserve image metadata, layers, or history.

`docker load` restores a previously saved Docker image (created with `docker save`). It preserves all layers, tags, metadata, and history.

Compare the two:

```bash
# docker save creates a full image archive (with layers and metadata)
docker save nginx:alpine -o nginx-save.tar

# docker load restores it exactly as it was
docker load -i nginx-save.tar

# docker export creates a filesystem archive (flat, no layers)
docker export $(docker create nginx:alpine) -o nginx-export.tar

# docker import creates a new single-layer image from it
docker import nginx-export.tar nginx:imported

# The loaded image has all original layers
docker image inspect nginx:alpine --format "Layers: {{len .RootFS.Layers}}"
# Layers: 7

# The imported image has just one layer
docker image inspect nginx:imported --format "Layers: {{len .RootFS.Layers}}"
# Layers: 1
```

Use `docker save`/`docker load` when you want an exact copy of an image. Use `docker export`/`docker import` when you want to flatten or create new images from filesystem snapshots.

## Transferring Images Between Systems

Tarballs are useful for moving images between air-gapped systems or systems without a shared registry.

Transfer an image via tar:

```bash
# On the source system: save the image
docker save myapp:v1 | gzip > myapp-v1.tar.gz

# Transfer the file (scp, USB drive, etc.)
scp myapp-v1.tar.gz user@destination:/tmp/

# On the destination system: load the image
docker load -i /tmp/myapp-v1.tar.gz

# Verify the image is available
docker images myapp
```

For creating smaller transfer packages, flatten first:

```bash
# Export (flatten) then compress for a smaller transfer file
CID=$(docker create myapp:v1)
docker export $CID | gzip > myapp-v1-flat.tar.gz
docker rm $CID

# On the destination: import with metadata
zcat myapp-v1-flat.tar.gz | docker import \
    --change 'CMD ["python3", "app.py"]' \
    - myapp:v1
```

## Automating with a Makefile

Standardize your tarball-based image builds:

```makefile
# Makefile for building images from tarballs

IMAGE_NAME := myapp
IMAGE_TAG := $(shell date +%Y%m%d)
ROOT_DIR := ./rootfs

.PHONY: rootfs image clean

rootfs:
	mkdir -p $(ROOT_DIR)/{app,etc,tmp}
	cp -r src/* $(ROOT_DIR)/app/
	cp config/* $(ROOT_DIR)/etc/

image: rootfs
	tar -C $(ROOT_DIR) -c . | docker import \
		--change 'CMD ["/app/start.sh"]' \
		--change 'WORKDIR /app' \
		--change 'EXPOSE 8080' \
		- $(IMAGE_NAME):$(IMAGE_TAG)
	@echo "Built $(IMAGE_NAME):$(IMAGE_TAG)"

clean:
	rm -rf $(ROOT_DIR)
	docker rmi $(IMAGE_NAME):$(IMAGE_TAG) 2>/dev/null || true
```

## Summary

Creating Docker images from tarballs gives you flexibility beyond what Dockerfiles offer. Use `docker import` with a tar archive of a filesystem to create single-layer images. Add `--change` flags to set CMD, ENTRYPOINT, ENV, and other metadata. Build root filesystems using debootstrap, Alpine minirootfs, or manual directory creation. For exact image transfers, prefer `docker save`/`docker load` over export/import. Use the tarball approach when containerizing existing systems, creating minimal custom images, or building images in restricted environments.
