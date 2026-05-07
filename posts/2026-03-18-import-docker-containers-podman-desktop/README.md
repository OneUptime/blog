# How to Import Docker Containers into Podman Desktop

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Podman Desktop, Docker, Migration, Import

Description: Learn how to import existing Docker containers, images, and volumes into Podman Desktop to migrate your development environment seamlessly.

---

> Migrating from Docker to Podman does not mean starting over. You can import your existing images, containers, and data directly into Podman Desktop.

Transitioning from Docker to Podman Desktop is straightforward because both tools use the same OCI image standards. Your existing Docker images, exported containers, and data can be imported into Podman with minimal effort. This guide covers every method for moving your Docker resources into Podman Desktop.

---

## Importing Docker Images

Docker images follow the OCI standard and can be moved to Podman directly:

```bash
# Method 1: Save from Docker and load into Podman

docker save -o nginx-alpine.tar nginx:alpine
podman load -i nginx-alpine.tar

# Verify the image was imported
podman images | grep nginx

# Method 2: Pipe directly between Docker and Podman
docker save my-app:latest | podman load

# Method 3: Pull the same image from a registry
podman pull docker.io/library/nginx:alpine
```

## Importing Multiple Images at Once

For bulk migration, export and import multiple images:

```bash
# List all Docker images
docker images --format "{{.Repository}}:{{.Tag}}" | grep -v "<none>"

# Save all images to a single archive
docker save -o all-images.tar \
  $(docker images --format "{{.Repository}}:{{.Tag}}" | grep -v "<none>")

# Load all images into Podman
podman load -i all-images.tar

# Verify the import
podman images
```

## Importing Docker Containers

Running or stopped containers can be exported and imported:

```bash
# Export a Docker container's filesystem
docker export -o my-container.tar my-container

# Import the container filesystem as a Podman image
podman import my-container.tar my-container-image:imported

# Run the imported image in Podman
podman run -d --name my-container-restored \
  my-container-image:imported \
  /original/entrypoint/command

# Verify the container is running
podman ps
```

Note that `docker export` captures only the filesystem, not the container configuration. You will need to recreate port mappings, environment variables, and volumes.

## Migrating Docker Compose Projects

For Docker Compose projects, the transition is straightforward:

```bash
# Option 1: Use podman-compose with existing files
pip install podman-compose
podman-compose -f docker-compose.yml up -d

# Option 2: Use Docker Compose with the Podman socket
export DOCKER_HOST="unix:///run/user/$(id -u)/podman/podman.sock"
docker compose up -d

# Option 3: Convert to Kubernetes YAML
# First run with podman-compose, then generate YAML
podman-compose up -d
podman kube generate my-service > my-service-k8s.yaml
```

## Migrating Docker Volumes

Transfer data stored in Docker volumes to Podman volumes:

```bash
# Create a backup of the Docker volume
docker run --rm \
  -v my-docker-volume:/source:ro \
  -v $(pwd):/backup \
  alpine tar czf /backup/volume-backup.tar.gz -C /source .

# Create a Podman volume
podman volume create my-podman-volume

# Restore the data into the Podman volume
podman run --rm \
  -v my-podman-volume:/target \
  -v $(pwd):/backup:ro \
  alpine tar xzf /backup/volume-backup.tar.gz -C /target

# Verify the data was migrated
podman run --rm \
  -v my-podman-volume:/data:ro \
  alpine ls -la /data
```

## Using Podman Desktop to Import Images

Podman Desktop shows images imported with the Podman CLI:

1. Save or export your Docker image or container to a tar file.
2. Run `podman load -i image-archive.tar` for Docker image archives, or `podman import container-archive.tar image-name:tag` for exported container filesystems.
3. Open Podman Desktop and go to the **Images** section.
4. The imported image will appear in the images list.
5. You can then run containers from the imported image.

## Recreating Container Configurations

When migrating containers, recreate the configuration in Podman:

```bash
# Inspect the Docker container configuration
docker inspect my-container > container-config.json

# Extract key settings and recreate in Podman
# Example: recreate a web container with its original settings
podman run -d \
  --name web-server \
  -p 8080:80 \
  -p 8443:443 \
  -e APP_ENV=production \
  -e DB_HOST=localhost \
  -v app-data:/var/www/html \
  --restart=always \
  my-app:latest

# Compare the running containers
podman inspect web-server
```

## Verifying the Migration

After importing, verify everything works correctly:

```bash
# Check all imported images
podman images

# Verify running containers
podman ps -a

# Check volume data integrity
podman volume ls
podman volume inspect my-podman-volume

# Test network connectivity
podman run --rm alpine ping -c 3 google.com

# Run your application tests
curl -s http://localhost:8080
```

## Summary

Importing Docker containers into Podman Desktop is a well-supported migration path thanks to shared OCI standards. Whether you are moving individual images, bulk-exporting your entire image library, or migrating volume data, the process involves standard export and import operations. Podman Desktop's graphical interface makes imported images easy to view and run, while the CLI handles complex migration scenarios. The key is to preserve not just the images but also the container configurations including ports, environment variables, and volume mounts.
