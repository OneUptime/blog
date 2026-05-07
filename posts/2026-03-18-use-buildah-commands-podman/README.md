# How to Use Buildah Commands with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Buildah, Image Building, OCI

Description: Learn how to use Buildah commands alongside Podman for advanced container image building and manipulation.

---

> Buildah gives you fine-grained control over container image building that goes beyond what a Containerfile can express.

Buildah is a companion tool to Podman that specializes in building OCI container images. While Podman can build images using `podman build`, Buildah offers a lower-level command set that lets you construct images step by step without needing a Containerfile. Both tools share the same image storage, so images built with Buildah are immediately available to Podman. This guide covers the core Buildah commands and how they integrate with Podman.

---

## Prerequisites

```bash
# Install Buildah

# On Fedora/RHEL
sudo dnf install buildah -y

# On Ubuntu/Debian
sudo apt install buildah -y

# Verify both tools are installed
buildah --version
podman --version

# Confirm they share the same storage
buildah info --format '{{.store.GraphRoot}}'
podman info --format '{{.Store.GraphRoot}}'
# Both should show the same path
```

## Core Buildah Commands

### Creating a Working Container

```bash
# Create a working container from a base image
# This is similar to the FROM instruction in a Containerfile
buildah from ubuntu:22.04

# The command outputs a container name like "ubuntu-working-container"
# You can also specify a name
buildah from --name my-builder ubuntu:22.04

# List all working containers
buildah containers --format "table {{.ContainerName}}\t{{.ImageName}}\t{{.ContainerID}}"
```

### Running Commands Inside the Container

```bash
# Run a command inside the working container
# This is similar to the RUN instruction in a Containerfile
buildah run my-builder -- apt-get update
buildah run my-builder -- apt-get install -y curl wget python3
buildah run my-builder -- useradd -r appuser

# Run multiple commands
buildah run my-builder -- bash -c "echo 'Hello from Buildah' > /hello.txt"

# Verify the command worked
buildah run my-builder -- cat /hello.txt
```

### Copying Files into the Container

```bash
# Copy a local file into the container
# This is similar to the COPY instruction
echo "This is my config" > /tmp/myconfig.txt
buildah copy my-builder /tmp/myconfig.txt /etc/myapp/config.txt

# Copy a directory
mkdir -p /tmp/app-files
echo 'print("app code")' > /tmp/app-files/main.py
buildah copy my-builder /tmp/app-files /opt/app/

# Verify the files were copied
buildah run my-builder -- ls -la /etc/myapp/
buildah run my-builder -- ls -la /opt/app/
```

### Configuring Image Metadata

```bash
# Set environment variables (equivalent to ENV in Containerfile)
buildah config --env APP_ENV=production my-builder
buildah config --env APP_PORT=8080 my-builder

# Set the working directory (equivalent to WORKDIR)
buildah config --workingdir /opt/app my-builder

# Set the entrypoint and command (equivalent to ENTRYPOINT and CMD)
buildah config --entrypoint '["python3"]' my-builder
buildah config --cmd '["main.py"]' my-builder

# Set exposed ports (equivalent to EXPOSE)
buildah config --port 8080 my-builder

# Set labels (equivalent to LABEL)
buildah config --label maintainer="team@example.com" my-builder
buildah config --label version="1.0.0" my-builder

# Set the user (equivalent to USER)
buildah config --user appuser my-builder
```

### Committing the Image

```bash
# Commit the working container as a new image
# This saves all changes as a final image
buildah commit my-builder my-custom-app:v1.0

# Verify the image was created
buildah images --format "table {{.Name}}\t{{.Tag}}\t{{.Size}}\t{{.Created}}"

# The image is also visible to Podman
podman images --filter "reference=my-custom-app"
```

## Using Buildah-Built Images with Podman

```bash
# Run the image you built with Buildah using Podman
podman run --rm my-custom-app:v1.0

# Tag and push the image to a registry
podman tag my-custom-app:v1.0 registry.example.com/my-custom-app:v1.0
podman push registry.example.com/my-custom-app:v1.0

# Inspect the image
podman inspect my-custom-app:v1.0 --format '{{.Config.Env}}'
podman inspect my-custom-app:v1.0 --format '{{.Config.Cmd}}'
```

## Complete Build Example

```bash
# Build a complete Python application image step by step
# Start from a base image
container=$(buildah from python:3.12-slim)

# Install system dependencies
buildah run $container -- apt-get update
buildah run $container -- apt-get install -y --no-install-recommends curl
buildah run $container -- apt-get clean
buildah run $container -- rm -rf /var/lib/apt/lists/*

# Install Python packages
buildah run $container -- pip install --no-cache-dir flask gunicorn

# Copy application code
mkdir -p /tmp/flask-app
cat << 'EOF' > /tmp/flask-app/app.py
from flask import Flask
app = Flask(__name__)

@app.route("/")
def hello():
    return "Built with Buildah, served by Podman!"
EOF

buildah copy $container /tmp/flask-app/app.py /app/app.py

# Configure the image
buildah config --workingdir /app $container
buildah config --port 5000 $container
buildah config --entrypoint '["gunicorn"]' $container
buildah config --cmd '["--bind", "0.0.0.0:5000", "app:app"]' $container
buildah config --label description="Flask app built with Buildah" $container

# Commit the final image
buildah commit $container flask-app:latest

# Run it with Podman
podman run -d --name flask-test -p 5000:5000 flask-app:latest
curl http://localhost:5000

# Clean up
podman stop flask-test && podman rm flask-test
buildah rm $container
```

## Cleaning Up

```bash
# Remove working containers
buildah rm --all

# Remove images built during testing
buildah rmi my-custom-app:v1.0 flask-app:latest

# Clean up temporary files
rm -rf /tmp/myconfig.txt /tmp/app-files /tmp/flask-app
```

## Summary

Buildah provides a command-by-command approach to building container images that complements Podman. Each Buildah command maps to a Containerfile instruction but gives you the flexibility to script builds programmatically, inspect intermediate states, and build images without a Containerfile at all. Since Buildah and Podman share the same image storage, images built with Buildah are immediately available for running with Podman. This integration makes the Podman ecosystem a powerful alternative to Docker for building and running containers.
