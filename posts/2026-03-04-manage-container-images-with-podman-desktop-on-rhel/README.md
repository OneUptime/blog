# How to Manage Container Images with Podman Desktop on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Podman Desktop, Containers, Images, Development

Description: Use Podman Desktop on RHEL to pull, build, inspect, and manage container images through its graphical interface and integrated tools.

---

Podman Desktop provides a visual interface for managing container images on RHEL. You can pull images from registries, build from Dockerfiles, inspect image layers, and clean up unused images without memorizing CLI commands.

## Pull Images from Registries

In Podman Desktop, navigate to the "Images" tab and click "Pull an image". You can also use the CLI alongside the GUI:

```bash
# Pull an image from the command line (visible in Podman Desktop immediately)
podman pull registry.access.redhat.com/ubi9/ubi:latest

# Pull from Docker Hub
podman pull docker.io/library/nginx:latest

# Pull from Quay.io
podman pull quay.io/centos/centos:stream9
```

In Podman Desktop, the Images panel shows all local images with their tags, sizes, and creation dates.

## Build Images

Create a Containerfile and build through Podman Desktop or the CLI:

```dockerfile
# Containerfile - Simple RHEL-based web server
FROM registry.access.redhat.com/ubi9/ubi:latest

# Install nginx
RUN dnf install -y nginx && \
    dnf clean all

# Copy website content
COPY index.html /usr/share/nginx/html/

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

```bash
# Build the image
podman build -t my-web-app:v1 -f Containerfile .

# The new image appears in Podman Desktop's Images panel
```

In Podman Desktop, click "Build an image" to select a Containerfile and build directory through the GUI.

## Inspect Images

Click on any image in Podman Desktop to see details. From the CLI:

```bash
# View image details
podman inspect registry.access.redhat.com/ubi9/ubi:latest

# Check image history (layers)
podman history registry.access.redhat.com/ubi9/ubi:latest

# View image size
podman images --format "{{.Repository}}:{{.Tag}} {{.Size}}"
```

## Tag and Push Images

```bash
# Tag an image for a private registry
podman tag my-web-app:v1 registry.example.com/apps/my-web-app:v1

# Log in to the registry
podman login registry.example.com

# Push the image
podman push registry.example.com/apps/my-web-app:v1
```

## Configure Registries

Set up registry access for Podman Desktop:

```bash
# Edit the registries configuration
sudo vi /etc/containers/registries.conf
```

```toml
# Add your private registry
[[registry]]
location = "registry.example.com"
insecure = false

# Set search order for unqualified image names
unqualified-search-registries = ["registry.access.redhat.com", "docker.io", "quay.io"]
```

## Clean Up Images

```bash
# Remove a specific image
podman rmi my-web-app:v1

# Remove all unused images (no running containers reference them)
podman image prune -a

# Check disk usage
podman system df
```

In Podman Desktop, you can delete images by selecting them and clicking the delete button. The "Prune" option removes all unused images in one click.

## Save and Load Images

```bash
# Save an image to a tar file for offline transfer
podman save -o my-web-app.tar my-web-app:v1

# Load an image from a tar file
podman load -i my-web-app.tar
```

Podman Desktop simplifies image management on RHEL by combining the visual overview with the full power of Podman under the hood.
