# How to Pull and Run a Docker Image in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Container, Image, DevOps

Description: Learn how to pull a Docker image from a registry and run it as a container using the Portainer web interface.

## Introduction

Before running a container, Docker needs the image on the host. Portainer lets you pull images manually from the Images section, or automatically during container creation. This guide covers both workflows, plus how to pull from private registries.

## Prerequisites

- Portainer installed and running
- Access to a Docker environment in Portainer
- Internet access or a configured registry (for private images)

## Method 1: Pull an Image Before Creating a Container

### Step 1: Navigate to Images

1. Log in to Portainer.
2. Select your Docker environment.
3. Click **Images** in the left sidebar.

### Step 2: Enter the Image Details

On the Images page:

- **Image**: Enter the image name and tag. In **Advanced mode**, you can specify a full registry reference.

```bash
# Public Docker Hub images:

nginx:alpine
redis:7
postgres:15-alpine
node:20-slim

# Specific image digests (for reproducibility):
ubuntu@sha256:2e863c44b718727c860746568e1d54afd13b2fa71b160f5cd9058fc436217b30

# Image name when using a configured private registry:
myapp:2.1.0

# Full registry references (for advanced mode):
myregistry.example.com:5000/myapp:2.1.0
ghcr.io/myorg/myservice:latest
```

- **Registry**: Select the registry. For Docker Hub public images, leave as default.

### Step 3: Pull the Image

Click **Pull the image**. Portainer will display a progress indicator while the image layers download. For large images, this may take a few minutes.

## Method 2: Pull During Container Creation

This is the most common workflow - Portainer pulls the image automatically when you deploy:

1. Navigate to **Containers > Add container**.
2. Enter the image name in the **Image** field.
3. Portainer will automatically pull the image if it's not already on the host.
4. Configure the rest of your container settings.
5. Click **Deploy the container**.

```text
# In the container creation form:
Name:   my-redis
Image:  redis:7-alpine

# Portainer pulls redis:7-alpine automatically before starting
```

## Pulling from Private Registries

### Prerequisite: Add a Registry in Portainer

1. Go to **Registries** in the Portainer menu.
2. Click **Add registry**.
3. Fill in the details:

```text
Registry provider: Custom registry
Name:              My Private Registry
Registry URL:      registry.example.com:5000
Username:          myuser
Password:          mypassword
```

### Pull a Private Image

Once the registry is configured:

1. Navigate to **Images**.
2. Enter the image name: `myapp:2.0`.
3. Under **Registry**, select **My Private Registry**.
4. Click **Pull the image**.

Or during container creation, select the registry in the **Registry** dropdown.

## Running the Container After Pull

### Via the Images Section

1. Navigate to **Images**.
2. Find your pulled image in the list to confirm the pull succeeded.
3. Then go to **Containers > Add container** to deploy a container from that image.

### Via the Containers Section

1. Navigate to **Containers > Add container**.
2. Enter the image name.
3. Configure:

```text
Name:              my-nginx-web
Image:             nginx:alpine
Port mapping:      8080 → 80
Restart policy:    Always
```

4. Click **Deploy the container**.

## Verifying the Running Container

```bash
# Equivalent Docker CLI commands to what Portainer does:

# Pull an image
docker pull nginx:alpine

# Run a container
docker run -d \
  --name my-nginx-web \
  --restart always \
  -p 8080:80 \
  nginx:alpine
```

In Portainer:
1. After deployment, find the container in the **Containers** list.
2. Status should be **Running** (green dot).
3. Click the container name to see details.
4. Open `http://your-docker-host:8080` to verify the application is responding.

## Keeping Images Updated

To pull the latest version of an image:

1. Navigate to **Images**.
2. Pull the same image name and tag again.
3. Portainer downloads the newer image if that tag now points to a newer digest.
4. Re-create any containers using the old image to use the new version.

## Troubleshooting

- **Pull failed: unauthorized**: Add or update the registry credentials in **Registries**.
- **Pull failed: not found**: Verify the image name and tag are correct.
- **Pull very slow**: Check network connectivity and consider using a registry mirror.

```bash
# Configure a registry mirror (add to /etc/docker/daemon.json)
{
  "registry-mirrors": ["https://<your-registry-mirror-host>"]
}
```

## Conclusion

Pulling and running Docker images in Portainer is a two-step process: first pull the image (automatically or manually), then configure and run the container. Portainer handles the complexity of registry authentication and image layer caching, letting you focus on configuring your application rather than Docker plumbing.
