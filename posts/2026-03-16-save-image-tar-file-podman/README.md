# How to Save an Image to a Tar File with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Image, Image Export, Tar

Description: Learn how to export Podman container images to tar archive files for offline transfer, backup, and distribution across environments.

---

> Saving images to tar files is the simplest way to move container images between machines without a registry.

When working with container images in air-gapped environments, transferring images between servers, or creating backups, you need a reliable way to export images to portable files. Podman provides the `podman save` command to export images into standard tar archives that can be loaded on any compatible container runtime. This guide walks through every practical scenario for saving images to tar files with Podman.

---

## Understanding podman save

The `podman save` command writes an image to a file or standard output. The default output format is a Docker-compatible tar archive, which makes the resulting file portable across container runtimes. For Docker archives, you can use `-m` to save more than one image.

```bash
# Basic syntax

podman save [options] IMAGE
```

## Saving a Single Image

The most common operation is saving a single image to a tar file.

```bash
# Pull an image first
podman pull docker.io/library/nginx:latest

# Save the image to a tar file
podman save -o nginx-latest.tar docker.io/library/nginx:latest
```

The `-o` flag specifies the output file. Without it, the tar data is written to stdout.

```bash
# Verify the tar file was created
ls -lh nginx-latest.tar
# Output: -rw-r--r-- 1 user user 187M Mar 16 10:00 nginx-latest.tar
```

## Saving with Compression

Tar files can be large. You can compress them on the fly by piping through gzip, bzip2, or zstd.

```bash
# Method 1: Pipe through gzip
podman save docker.io/library/nginx:latest | gzip > nginx-latest.tar.gz

# Method 2: Pipe through bzip2 for better compression
podman save docker.io/library/nginx:latest | bzip2 > nginx-latest.tar.bz2

# Method 3: Use zstd for fast compression
podman save docker.io/library/nginx:latest | zstd > nginx-latest.tar.zst
```

Compare the file sizes to choose the right compression for your needs.

```bash
# Check sizes
ls -lh nginx-latest.tar nginx-latest.tar.gz nginx-latest.tar.bz2
```

## Saving Multiple Images

You can save multiple images into a single tar file, which is useful for distributing a set of related images together.

```bash
# Pull multiple images
podman pull docker.io/library/nginx:latest
podman pull docker.io/library/redis:7
podman pull docker.io/library/postgres:16

# Save all three into one tar file
podman save -m -o app-stack.tar \
  docker.io/library/nginx:latest \
  docker.io/library/redis:7 \
  docker.io/library/postgres:16
```

The `-m` flag allows a Docker archive to contain more than one image.

## Choosing the Output Format

Podman supports multiple archive formats through the `--format` flag.

```bash
# Save in OCI format
podman save --format oci-archive -o nginx-oci.tar docker.io/library/nginx:latest

# Save in Docker format (default)
podman save --format docker-archive -o nginx-docker.tar docker.io/library/nginx:latest

# Save as an OCI directory layout
podman save --format oci-dir -o nginx-oci-dir docker.io/library/nginx:latest
```

The `oci-archive` format is recommended when you plan to load the image exclusively with Podman or other OCI-compliant tools. The `docker-archive` format provides maximum compatibility.

## Saving Images by ID

You can also save images using their image ID instead of the full name and tag.

```bash
# List images to find the ID
podman images
# REPOSITORY                     TAG     IMAGE ID      CREATED      SIZE
# docker.io/library/nginx        latest  a8758716bb6a  2 days ago   191 MB

# Save using the image ID
podman save -o nginx-by-id.tar a8758716bb6a
```

Note that when saving by ID, the loaded image will not retain its original name and tag. You will need to tag it manually after loading.

## Saving Multiple Tags of the Same Image

When an image has multiple tags, you can save specific tags or all of them.

```bash
# Tag an image with multiple tags
podman tag docker.io/library/nginx:latest myapp:v1.0
podman tag docker.io/library/nginx:latest myapp:stable

# Save both tags in one archive
podman save -m -o myapp-tags.tar myapp:v1.0 myapp:stable
```

## Practical Workflow: Transfer Between Machines

Here is a complete workflow for transferring an image from one machine to another.

```bash
# On the source machine: save and compress
podman save docker.io/library/nginx:latest | gzip > nginx-latest.tar.gz

# Transfer the file (using scp as an example)
scp nginx-latest.tar.gz user@remote-host:/tmp/

# On the destination machine: load the image
gunzip -c /tmp/nginx-latest.tar.gz | podman load
```

## Inspecting the Tar File Contents

You can examine what is inside a saved tar file without loading it.

```bash
# List the contents of the tar file
tar -tf nginx-latest.tar

# Extract and inspect the manifest
tar -xf nginx-latest.tar manifest.json -O | python3 -m json.tool
```

## Scripting Image Exports

For automation, you might want to save all images or a filtered set.

```bash
# Save all local images to individual tar files
for img in $(podman images --format "{{.Repository}}:{{.Tag}}" | grep -v "<none>"); do
  filename=$(echo "$img" | tr '/:' '_')
  echo "Saving $img to ${filename}.tar.gz"
  podman save "$img" | gzip > "${filename}.tar.gz"
done
```

```bash
# Save all images matching a pattern
podman save -m -o all-myapp-images.tar \
  $(podman images --format "{{.Repository}}:{{.Tag}}" | grep "myapp")
```

## Summary

The `podman save` command is a straightforward tool for exporting container images to portable tar archives. Use compression to reduce file sizes, choose the right archive format for your target runtime, and combine with standard Unix tools for scripting and automation. This approach works well for air-gapped deployments, backups, and image distribution without a container registry.
