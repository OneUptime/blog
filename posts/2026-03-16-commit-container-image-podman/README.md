# How to Commit a Container as an Image with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Image, Commit, Snapshot

Description: Learn how to commit a running or stopped Podman container as a new image, capturing changes for reuse, debugging, and iterative development.

---

> Committing containers lets you capture the current state of a container as a reusable image snapshot.

During development and debugging, you often make changes inside a running container that you want to preserve. Podman's `podman commit` command takes a snapshot of a container's filesystem and configuration, saving it as a new image. This is useful for creating checkpoints, preserving debug environments, and iterative image development. This guide covers all the practical scenarios.

---

## Understanding podman commit

The `podman commit` command creates a new image from a container's changes. It captures the filesystem differences between the container's current state and its base image.

```bash
# Basic syntax

podman commit [options] CONTAINER [IMAGE_NAME[:TAG]]
```

## Basic Container Commit

Start with a container, make changes, and commit it as a new image.

```bash
# Run an Alpine container and install packages
podman run -it --name my-container docker.io/library/alpine:latest sh -c "
  apk add --no-cache curl vim git
  echo 'Custom configuration' > /etc/myapp.conf
  exit
"

# Commit the container as a new image
podman commit my-container mytools:latest

# Verify the new image
podman images mytools
# REPOSITORY        TAG     IMAGE ID      CREATED        SIZE
# localhost/mytools  latest  abc123def456  5 seconds ago  52 MB

# Test the committed image
podman run --rm mytools:latest which curl
# /usr/bin/curl
```

## Committing with Configuration Changes

Use the `--change` or `-c` flag to modify the image configuration during the commit.

```bash
# Create a container with an application
podman run -d --name webapp docker.io/library/python:3.12-slim sh -c "
  pip install flask &&
  mkdir -p /app &&
  printf '%s\n' 'from flask import Flask' 'app = Flask(__name__)' 'app.run(host=\"0.0.0.0\", port=5000)' > /app/main.py &&
  sleep infinity
"

# Commit with configuration changes
podman commit \
  -c "CMD python /app/main.py" \
  -c "EXPOSE 5000" \
  -c "WORKDIR /app" \
  -c "ENV FLASK_APP=main.py" \
  webapp flask-app:v1.0

# Stop and remove the original container
podman stop webapp && podman rm webapp

# Run the committed image
podman run -d -p 5000:5000 flask-app:v1.0
```

## Committing a Running Container

You can commit a container while it is still running. By default, Podman does not pause the container during the commit, but you can enable pausing with `--pause=true` when you want the container paused while the image is created.

```bash
# Start a container that is actively running
podman run -d --name running-app docker.io/library/nginx:latest

# Commit while it is running, pausing the container during the commit
podman commit --pause=true running-app nginx-snapshot:$(date +%Y%m%d)

# The container continues running after the commit
podman ps | grep running-app
```

## Using the Pause Flag

By default, Podman does not pause the container during commit. You can enable this behavior when you want the container paused while the image is created.

```bash
# Commit without pausing (default)
podman commit --pause=false my-container myimage:latest

# Commit with pause
podman commit --pause=true my-container myimage:latest
```

## Adding Author and Message

Document your commits with author information and messages.

```bash
# Commit with author and message
podman commit \
  --format docker \
  --author "Dev Team <dev@example.com>" \
  --message "Added monitoring tools and custom config" \
  my-container monitoring-tools:v1.0

# View the commit information
podman inspect monitoring-tools:v1.0 | grep -A2 -E "Author|Comment"

# Check the image history
podman history monitoring-tools:v1.0
```

## Choosing the Image Format

Podman supports committing in both OCI and Docker image formats.

```bash
# Commit in OCI format (default)
podman commit --format oci my-container myimage:oci

# Commit in Docker format
podman commit --format docker my-container myimage:docker
```

## Including All Changes

By default, Podman includes filesystem changes. You can explicitly control what gets included.

```bash
# Commit including contents from volumes added with --volume or --mount
podman commit --include-volumes my-container myimage:with-volumes
```

## Iterative Development Workflow

Committing containers is especially useful during iterative development.

```bash
# Step 1: Start from a base image
podman run -it --name dev docker.io/library/ubuntu:24.04 bash

# Inside the container: install dependencies
# apt-get update && apt-get install -y python3 python3-pip
# pip3 install requests flask
# exit

# Step 2: Commit the first iteration
podman commit -c "CMD bash" dev myapp:iter1

# Step 3: Continue development from the committed image
podman run -it --name dev2 myapp:iter1 bash

# Inside: add application code, test configurations
# mkdir /app && echo 'print("hello")' > /app/main.py
# exit

# Step 4: Commit the second iteration
podman commit \
  -c "CMD python3 /app/main.py" \
  -c "WORKDIR /app" \
  dev2 myapp:iter2

# Clean up development containers
podman rm dev dev2
```

## Debugging Workflow

Capture a container's state at the point of failure for later analysis.

```bash
# A container crashed or stopped unexpectedly
podman ps -a | grep Exited

# Commit the stopped container to preserve its state
podman commit failed-container debug-snapshot:$(date +%s)

# Later, investigate the snapshot
podman run -it debug-snapshot:1710590400 sh
# Examine logs, file states, configurations inside the container
```

## Comparing Before and After

See what changed in a container before committing.

```bash
# View filesystem changes in a container
podman diff my-container
# C /etc
# A /etc/myapp.conf
# C /usr
# A /usr/bin/curl

# C = Changed, A = Added, D = Deleted
```

## Squashing Layers

When committing, you can squash all changes into a single layer.

```bash
# Commit with squashed layers for a simpler layer history
podman commit --squash my-container myimage:squashed

# Compare sizes
podman images | grep myimage
```

## Summary

The `podman commit` command captures container state as a reusable image. It is valuable for iterative development, debugging snapshots, and preserving manual changes. While Containerfiles remain the preferred method for reproducible builds, `podman commit` fills the gap when you need to capture ad-hoc changes quickly. Always document your commits with author and message metadata for traceability.
