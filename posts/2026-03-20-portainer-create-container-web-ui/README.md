# How to Create a Container in Portainer from the Web UI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Container, DevOps, Web UI

Description: Learn how to create and configure a Docker container using the Portainer web interface without writing any command-line instructions.

## Introduction

One of Portainer's most approachable features is its web-based container creation interface. Whether you're new to Docker or a seasoned engineer who prefers a GUI for quick tasks, Portainer's container creation wizard makes it easy to configure every aspect of a container - from image and ports to volumes, environment variables, and resource limits.

## Prerequisites

- Portainer installed and running (Community or Business Edition)
- Access to a connected Docker environment in Portainer
- An image to deploy (from Docker Hub or a private registry)

## Step 1: Navigate to Containers

1. Log in to Portainer.
2. In the left sidebar, select the **environment** you want to deploy to (e.g., `local` or your remote host).
3. Click **Containers** in the sidebar.
4. Click the **+ Add container** button.

## Step 2: Set the Container Name and Image

On the container creation form:

- **Name**: Enter a meaningful name (e.g., `my-nginx`). Container names must be unique on the host.
- **Image**: Enter the image name, such as:
  - `nginx:latest` - latest Nginx from Docker Hub
  - `postgres:15-alpine` - PostgreSQL 15 Alpine
  - `myregistry.example.com/myapp:2.0` - a private registry image

```text
# Examples:

Image: nginx:alpine
Image: redis:7-alpine
Image: myorg/myapp:v2.1.0
```

If using a private registry, click the **Registry** dropdown and select the configured registry.

## Step 3: Configure Port Mappings

Under the **Network ports** section, add port bindings:

| Host Port | Container Port | Protocol |
|-----------|---------------|----------|
| 8080      | 80            | TCP      |
| 8443      | 443           | TCP      |

- **Host port**: Port on the Docker host that accepts connections.
- **Container port**: Port inside the container.
- To have Portainer assign random host ports for exposed ports, enable **Publish all exposed network ports to random host ports**.

## Step 4: Configure Volumes (Optional)

Under **Advanced container settings** > **Volumes**:

- Click **+ map additional volume**.
- Set the **Container path** (e.g., `/var/www/html`).
- Choose a **Volume** from the dropdown or enter a host path for a bind mount.
- Set **Read/Write** mode.

```text
# Bind mount example:
Host path:       /data/nginx/html
Container path:  /usr/share/nginx/html
Mode:            Read only

# Named volume example:
Volume:          my-app-data
Container path:  /app/data
Mode:            Read/Write
```

## Step 5: Set Environment Variables

Under **Advanced container settings** > **Environment Variables**, add environment variables:

```text
# Key-value pairs
POSTGRES_DB=myapp
POSTGRES_USER=appuser
POSTGRES_PASSWORD=supersecret123
TZ=America/New_York
```

You can also click **Load variables from .env file** to upload a file.

## Step 6: Configure Restart Policy

Under **Advanced container settings** > **Restart policy**, select:

- **Never** - Container does not restart automatically.
- **Always** - Always restart the container.
- **On failure** - Restart only if the container exits with a non-zero code.
- **Unless stopped** - Always restart unless explicitly stopped.

For production services, select **Always** or **Unless stopped**.

## Step 7: Set Resource Limits (Optional)

Under **Advanced container settings** > **Runtime & Resources** > **Resources**:

- **Memory reservation**: Soft limit (e.g., 256 MB)
- **Memory limit**: Hard limit (e.g., 512 MB)
- **Maximum CPU usage**: CPU limit (e.g., `0.5` = roughly half a CPU)

## Step 8: Deploy the Container

Once you've configured everything:

1. Review your settings.
2. Click **Deploy the container**.

Portainer will pull the image (if not already local) and start the container. You'll be redirected to the container list where you can see the new container running.

## Verifying the Container

After deployment:
1. Find your container in the list.
2. Click its name to view details.
3. Check:
   - **Status**: Running
   - **Ports**: Configured port mappings
   - Click **Logs** to see container output
   - Click **Stats** to see CPU/memory usage

## Troubleshooting Common Issues

- **Image not found**: Check the image name spelling and registry configuration.
- **Port already in use**: Change the host port or stop the conflicting container.
- **Container exits immediately**: Click **Logs** to see the error output from the container.

## Conclusion

Creating containers through Portainer's web UI is a straightforward process that covers many of the same options available via the `docker run` command, just presented in a user-friendly form. This makes it ideal for operators who prefer a visual interface, or for quickly deploying containers without remembering command-line syntax.
