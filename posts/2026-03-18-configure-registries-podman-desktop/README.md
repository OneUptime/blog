# How to Configure Registries in Podman Desktop

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Podman Desktop, Registry, Container Registry

Description: Learn how to configure and manage container registries in Podman Desktop for pulling and pushing images to public and private repositories.

---

> Configuring registries correctly ensures you can pull trusted images and push your own to private repositories without friction.

Container registries are the backbone of any container workflow. Whether you are pulling official images from Docker Hub, using GitHub Container Registry, or running a private registry, Podman Desktop makes it straightforward to configure authentication and registry settings. This guide covers registry configuration through both the UI and configuration files.

---

## Default Registry Behavior

Podman searches registries in a defined order when you pull an image without specifying a full domain. The default configuration typically includes Docker Hub, Quay.io, and other public registries.

```bash
# Pull an image using the full registry path

podman pull docker.io/library/nginx:alpine

# Pull from Quay.io
podman pull quay.io/podman/hello

# Check which registries are configured
podman info --format '{{.Registries}}'
```

## Configuring Registries via Podman Desktop

Podman Desktop provides a UI for managing registry connections:

1. Open Podman Desktop and go to **Settings** (gear icon).
2. Navigate to **Registries** in the settings menu.
3. Click **Add Registry** to configure a new registry.
4. Enter the registry URL (e.g., `https://ghcr.io` or `https://registry.example.com`).
5. Provide your username and password or token.
6. Click **Login** to authenticate.

The registry will appear in your list with a connected status indicator.

## Editing the Registries Configuration File

Podman uses the `registries.conf` file for registry configuration:

```bash
# View the current registries configuration
cat /etc/containers/registries.conf

# For user-level overrides, edit this file
mkdir -p ~/.config/containers
cat > ~/.config/containers/registries.conf << 'EOF'
# Search these registries when pulling short names
unqualified-search-registries = ["docker.io", "quay.io", "ghcr.io"]

# Configure a private registry
[[registry]]
location = "registry.example.com"
insecure = false

# Mirror configuration for Docker Hub
[[registry]]
location = "docker.io"

[[registry.mirror]]
location = "mirror.gcr.io"
EOF
```

## Logging into Registries via CLI

Use the `podman login` command to authenticate:

```bash
# Log into Docker Hub
podman login docker.io
# Enter username and password when prompted

# Log into GitHub Container Registry with a token
echo "$GITHUB_TOKEN" | podman login ghcr.io -u USERNAME --password-stdin

# Log into AWS ECR
aws ecr get-login-password --region us-east-1 | \
  podman login --username AWS --password-stdin \
  123456789.dkr.ecr.us-east-1.amazonaws.com

# Log into a private registry
podman login registry.example.com \
  --username myuser \
  --password mypassword

# Verify login status
podman login --get-login docker.io
```

## Pushing Images to a Registry

After authenticating, you can push images to your registries:

```bash
# Tag a local image for your registry
podman tag my-app:latest ghcr.io/myuser/my-app:latest

# Push the image
podman push ghcr.io/myuser/my-app:latest

# Push with a specific tag
podman push ghcr.io/myuser/my-app:v1.0.0
```

## Configuring Insecure Registries

For development registries that use self-signed certificates or HTTP:

```bash
# Add an insecure registry to the configuration
cat >> ~/.config/containers/registries.conf << 'EOF'

# Allow insecure connection to a local development registry
[[registry]]
location = "localhost:5000"
insecure = true
EOF
```

You can also run a local registry for testing:

```bash
# Start a local registry
podman run -d --name local-registry \
  -p 5000:5000 \
  registry:2

# Tag and push an image to the local registry
podman tag my-app:latest localhost:5000/my-app:latest
podman push localhost:5000/my-app:latest
```

## Managing Authentication Credentials

Podman stores registry credentials in an auth file:

```bash
# View the default Linux auth file path
echo "${XDG_RUNTIME_DIR}/containers/auth.json"

# Check stored credentials (paths may vary by OS)
cat ${XDG_RUNTIME_DIR}/containers/auth.json 2>/dev/null || \
  cat ~/.config/containers/auth.json 2>/dev/null

# Log out of a specific registry
podman logout docker.io

# Log out of all registries
podman logout --all
```

## Configuring Registry Mirrors

Mirrors help speed up pulls and provide redundancy:

```bash
# Configure a mirror in registries.conf
cat >> ~/.config/containers/registries.conf << 'EOF'

# Use a corporate mirror for Docker Hub images
[[registry]]
prefix = "docker.io"
location = "docker.io"

[[registry.mirror]]
location = "corporate-mirror.example.com"
insecure = false
EOF
```

## Summary

Configuring registries in Podman Desktop is essential for a smooth container workflow. The graphical interface simplifies authentication for common registries, while the configuration files and CLI provide full control over registry search order, mirrors, and security settings. Proper registry configuration ensures reliable image pulls and secure pushes to your repositories.
