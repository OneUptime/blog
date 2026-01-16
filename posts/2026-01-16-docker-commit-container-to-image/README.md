# How to Create Images from Running Containers with docker commit

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Containers, Images, DevOps, Development

Description: Learn how to use docker commit to create new images from running containers, capture manual changes, and understand when this approach is appropriate versus using Dockerfiles.

---

Sometimes you need to capture the current state of a running container as a new image. Maybe you've manually installed software, configured settings, or debugged an issue and want to preserve those changes. The `docker commit` command creates a new image from a container's current filesystem state.

## Basic Usage

```bash
# Create an image from a running or stopped container
docker commit <container> <new-image-name>

# Example: Create image from container named "myapp"
docker commit myapp myapp:configured

# With repository and tag
docker commit myapp myregistry/myapp:v1.0
```

## How docker commit Works

```
┌─────────────────────────────────────────────────────────────┐
│                    Original Image                            │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Layer 1: Base OS                                     │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │ Layer 2: Dependencies                                │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │ Layer 3: Application                                 │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼ docker run
┌─────────────────────────────────────────────────────────────┐
│                  Running Container                           │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Read-only layers from image                          │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │ Writable container layer (your changes)              │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼ docker commit
┌─────────────────────────────────────────────────────────────┐
│                     New Image                                │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Original layers                                      │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │ New layer: Your changes                              │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Practical Examples

### Capture Manual Configuration

```bash
# Start with a base image
docker run -it --name mycontainer ubuntu:22.04 bash

# Inside the container, make changes
apt-get update
apt-get install -y nginx vim curl
echo "Hello from committed image" > /var/www/html/index.html
exit

# Commit the changes
docker commit mycontainer ubuntu-nginx:configured

# Verify the new image
docker images | grep ubuntu-nginx
```

### Add Commit Message and Author

```bash
# Include metadata with the commit
docker commit \
  --author "John Doe <john@example.com>" \
  --message "Added nginx and custom index page" \
  mycontainer ubuntu-nginx:v1.0

# View the commit history
docker history ubuntu-nginx:v1.0
```

### Change Image Configuration

```bash
# Change CMD, ENV, or other settings during commit
docker commit \
  --change 'CMD ["nginx", "-g", "daemon off;"]' \
  --change 'EXPOSE 80' \
  --change 'ENV APP_ENV=production' \
  mycontainer ubuntu-nginx:production
```

### Available --change Options

| Option | Example |
|--------|---------|
| CMD | `--change 'CMD ["nginx"]'` |
| ENTRYPOINT | `--change 'ENTRYPOINT ["/entrypoint.sh"]'` |
| ENV | `--change 'ENV KEY=value'` |
| EXPOSE | `--change 'EXPOSE 8080'` |
| LABEL | `--change 'LABEL version=1.0'` |
| USER | `--change 'USER www-data'` |
| WORKDIR | `--change 'WORKDIR /app'` |

## Debugging Workflow

A common use case is capturing a debugged container state.

```bash
# Start a container from your application image
docker run -d --name app-debug myapp:latest

# Container crashes - check logs
docker logs app-debug

# Start a shell in the stopped container
docker start app-debug
docker exec -it app-debug bash

# Debug and fix issues inside the container
# ... install tools, fix configs, etc.
exit

# Save the fixed state
docker commit \
  --message "Fixed configuration issue XYZ" \
  app-debug myapp:debugged

# Test the fixed image
docker run -d --name app-test myapp:debugged
```

## Pause Container During Commit

By default, docker commit pauses the container during the commit to ensure filesystem consistency.

```bash
# Default behavior (with pause)
docker commit mycontainer myimage:latest

# Skip pause (faster but may have inconsistent state)
docker commit --pause=false mycontainer myimage:latest
```

Use `--pause=false` only when:
- The container is already stopped
- You're certain no writes are occurring
- Speed is more important than consistency

## Export vs Commit

| Feature | docker commit | docker export/import |
|---------|--------------|---------------------|
| Preserves layers | Yes | No (flattens) |
| Keeps history | Yes | No |
| Image size | Larger | Smaller |
| Metadata | Preserved | Lost |
| Use case | Capture changes | Create minimal image |

```bash
# docker commit - preserves layers
docker commit mycontainer myimage:committed
docker history myimage:committed  # Shows all layers

# docker export/import - flattens to single layer
docker export mycontainer > container.tar
docker import container.tar myimage:flattened
docker history myimage:flattened  # Shows single layer
```

## When to Use docker commit

### Good Use Cases

```bash
# 1. Quick debugging and prototyping
docker run -it ubuntu:22.04 bash
# ... experiment with different configurations
docker commit $(docker ps -lq) ubuntu:experiment

# 2. Capturing manual fixes for investigation
docker commit crashed-container myapp:crashed-state

# 3. Creating one-off images for testing
docker commit configured-container test-image:latest

# 4. Learning and exploration
docker run -it python:3.11 bash
# ... explore, install packages
docker commit $(docker ps -lq) python:custom
```

### When NOT to Use docker commit

| Scenario | Use Instead |
|----------|-------------|
| Production images | Dockerfile |
| Reproducible builds | Dockerfile |
| CI/CD pipelines | Dockerfile |
| Team collaboration | Dockerfile |
| Version control | Dockerfile |

## Convert Committed Image to Dockerfile

If you've used docker commit but need a Dockerfile, you can inspect the image.

```bash
# View the history of changes
docker history --no-trunc myimage:committed

# Get configuration
docker inspect myimage:committed

# Use tools like dockerfile-from-image
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  alpine/dfimage myimage:committed
```

Manual Dockerfile recreation:

```dockerfile
# Based on inspection of committed image
FROM ubuntu:22.04

RUN apt-get update && apt-get install -y \
    nginx \
    vim \
    curl

COPY index.html /var/www/html/

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## Squashing Layers

Combine multiple layers into one for smaller images.

```bash
# Method 1: Export and import
docker export mycontainer > container.tar
docker import container.tar myimage:squashed

# Method 2: Multi-stage build (preferred for production)
# Create a Dockerfile that copies from the committed image
```

```dockerfile
# Dockerfile.squash
FROM myimage:committed AS source
FROM ubuntu:22.04
COPY --from=source / /
```

## Complete Workflow Example

```bash
#!/bin/bash
# workflow-example.sh

# 1. Start with base image
echo "Starting base container..."
docker run -d --name setup-container python:3.11-slim bash -c "sleep infinity"

# 2. Install dependencies
echo "Installing dependencies..."
docker exec setup-container pip install flask gunicorn redis

# 3. Copy application files
docker cp ./app setup-container:/app

# 4. Create configuration
docker exec setup-container bash -c 'cat > /app/config.py << EOF
DEBUG = False
REDIS_URL = "redis://localhost:6379"
EOF'

# 5. Commit with proper configuration
echo "Committing image..."
docker commit \
  --author "DevOps Team" \
  --message "Flask app with gunicorn and redis client" \
  --change 'WORKDIR /app' \
  --change 'EXPOSE 8000' \
  --change 'CMD ["gunicorn", "-b", "0.0.0.0:8000", "app:app"]' \
  setup-container myflaskapp:v1.0

# 6. Cleanup
docker stop setup-container
docker rm setup-container

# 7. Test the new image
echo "Testing new image..."
docker run -d --name test-app -p 8000:8000 myflaskapp:v1.0
sleep 3
curl http://localhost:8000/health || echo "App might need Redis"

# 8. Cleanup test
docker stop test-app
docker rm test-app

echo "Done! Image available as myflaskapp:v1.0"
```

## Commit Size Considerations

```bash
# Check container's writable layer size
docker ps -s --format "table {{.Names}}\t{{.Size}}"

# Output shows:
# mycontainer   2.5MB (virtual 150MB)
#               ^^^^^ This is what gets committed

# View layer sizes in committed image
docker history myimage:committed --format "{{.Size}}\t{{.CreatedBy}}"
```

## Best Practices

### 1. Always Add Metadata

```bash
docker commit \
  --author "Your Name <email@example.com>" \
  --message "Description of changes" \
  container image:tag
```

### 2. Clean Up Before Committing

```bash
# Inside container before commit
apt-get clean
rm -rf /var/lib/apt/lists/*
rm -rf /tmp/*
rm -rf /root/.cache
```

### 3. Document the Changes

```bash
# Create a log file in the container
echo "Installed: nginx, vim, curl" >> /root/changes.log
echo "Modified: /etc/nginx/nginx.conf" >> /root/changes.log
echo "Date: $(date)" >> /root/changes.log
```

### 4. Use Tags Effectively

```bash
# Use descriptive tags
docker commit container myapp:debug-issue-123
docker commit container myapp:experiment-redis
docker commit container myapp:$(date +%Y%m%d-%H%M%S)
```

## Summary

| Command | Purpose |
|---------|---------|
| `docker commit container image` | Basic commit |
| `docker commit -m "message"` | Add commit message |
| `docker commit --change 'CMD [...]'` | Modify image config |
| `docker commit --pause=false` | Skip pause during commit |
| `docker history image` | View commit history |

docker commit is useful for quick prototyping, debugging, and learning, but for production images, always use Dockerfiles to ensure reproducibility and maintainability. Think of docker commit as a snapshot tool, not a build system.

