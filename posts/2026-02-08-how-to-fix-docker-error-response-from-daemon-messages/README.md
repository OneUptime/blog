# How to Fix Docker 'Error Response from Daemon' Messages

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Troubleshooting, Error Response from Daemon, Docker Daemon, DevOps, Debugging

Description: Diagnose and fix the most common Docker 'Error response from daemon' messages with practical solutions and commands.

---

"Error response from daemon" is Docker's way of telling you that the Docker daemon rejected your request. It is a generic wrapper around dozens of different errors, from missing images to permission problems to resource exhaustion. The actual cause is in the message that follows the prefix.

This guide covers the most common daemon error messages, what causes them, and how to fix each one.

## Understanding the Error Format

Every daemon error follows this pattern:

```
Error response from daemon: <specific error message>
```

The specific message tells you what went wrong. Let us go through the most frequent ones.

## "conflict: unable to delete (must be forced)"

This happens when you try to remove an image that is referenced by a container.

```bash
# This fails because a container (running or stopped) uses the image
docker rmi myapp:v1.0
# Error response from daemon: conflict: unable to delete abc123 (must be forced) - image is being used by stopped container def456
```

Fix by removing the container first, or force the image removal:

```bash
# Option 1: Remove the container first, then the image
docker rm def456
docker rmi myapp:v1.0

# Option 2: Force remove the image (removes the tag, container keeps a reference)
docker rmi -f myapp:v1.0

# Option 3: Remove all stopped containers, then prune images
docker container prune -f
docker image prune -af
```

## "Conflict. The container name is already in use"

You tried to create a container with a name that already exists.

```bash
docker run --name myapp myimage:latest
# Error response from daemon: Conflict. The container name "/myapp" is already in use by container "abc123"
```

Fix by removing the old container or choosing a different name:

```bash
# Remove the existing container (works even if it is stopped)
docker rm myapp

# Or remove and recreate in one command
docker rm -f myapp && docker run --name myapp myimage:latest

# Or use --rm to auto-remove when the container stops
docker run --rm --name myapp myimage:latest
```

## "No such container" / "No such image"

The resource you referenced does not exist.

```bash
docker stop myapp
# Error response from daemon: No such container: myapp

docker pull nonexistent/image:tag
# Error response from daemon: pull access denied for nonexistent/image, repository does not exist or may require 'docker login'
```

Fix by verifying the name:

```bash
# List running containers to find the correct name
docker ps

# List all containers including stopped ones
docker ps -a

# Search for images (partial match)
docker images | grep myapp
```

## "driver failed programming external connectivity"

This usually means a port conflict. Another process (or another container) is already using the port you are trying to bind.

```bash
docker run -p 80:80 nginx
# Error response from daemon: driver failed programming external connectivity on endpoint xyz: Bind for 0.0.0.0:80 failed: port is already allocated
```

Fix by finding what is using the port:

```bash
# Find what process is using port 80
sudo lsof -i :80
# or
sudo ss -tlnp | grep :80

# Find which Docker container is using the port
docker ps --format '{{.Names}}\t{{.Ports}}' | grep 80

# Use a different port mapping
docker run -p 8080:80 nginx

# Or stop the conflicting container/process
docker stop <conflicting-container>
```

## "OCI runtime create failed: unable to start container"

The container cannot start, usually because of a problem with the entrypoint, command, or file permissions.

```bash
docker run myimage
# Error response from daemon: OCI runtime create failed: container_linux.go:380: starting container process caused: exec: "/app/start.sh": permission denied
```

Fix by checking the executable:

```bash
# Check if the entrypoint file exists and is executable inside the image
docker run --rm --entrypoint /bin/sh myimage -c "ls -la /app/start.sh"

# Fix permissions in your Dockerfile
# RUN chmod +x /app/start.sh

# Or override the entrypoint to debug
docker run --rm -it --entrypoint /bin/sh myimage
```

## "no space left on device"

Docker ran out of disk space. This affects image pulls, container creation, and volume writes.

```bash
docker pull ubuntu:latest
# Error response from daemon: write /var/lib/docker/tmp/...: no space left on device
```

Fix by cleaning up Docker resources:

```bash
# Check Docker disk usage
docker system df

# Remove unused containers, networks, images, and build cache
docker system prune -af

# Remove unused volumes (WARNING: deletes data in unused volumes)
docker volume prune -f

# Check the host's disk usage
df -h /var/lib/docker

# If /var/lib/docker is on a small partition, move Docker's data directory
# Edit /etc/docker/daemon.json:
# { "data-root": "/mnt/large-disk/docker" }
```

## "Cannot connect to the Docker daemon"

The Docker daemon is not running, or your user does not have permission to access it.

```bash
docker ps
# Error response from daemon: Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?
```

Fix by starting the daemon or fixing permissions:

```bash
# Start the Docker daemon
sudo systemctl start docker

# Check Docker daemon status
sudo systemctl status docker

# If you get a permission denied error, add your user to the docker group
sudo usermod -aG docker $USER
# Then log out and back in, or run:
newgrp docker

# On macOS, make sure Docker Desktop is running
open -a Docker
```

## "i/o timeout" or "net/http: TLS handshake timeout"

Network issues when pulling images from a registry.

```bash
docker pull myregistry.com/myimage:latest
# Error response from daemon: Get "https://myregistry.com/v2/": net/http: TLS handshake timeout
```

Fix by checking network connectivity:

```bash
# Test connectivity to the registry
curl -v https://myregistry.com/v2/

# Check DNS resolution
nslookup myregistry.com

# Check if a proxy is required
echo $HTTP_PROXY $HTTPS_PROXY

# Configure Docker to use a proxy
# Create or edit /etc/systemd/system/docker.service.d/proxy.conf
# [Service]
# Environment="HTTP_PROXY=http://proxy.example.com:3128"
# Environment="HTTPS_PROXY=http://proxy.example.com:3128"

sudo systemctl daemon-reload
sudo systemctl restart docker

# For Docker Hub specifically, try a mirror
# Edit /etc/docker/daemon.json:
# { "registry-mirrors": ["https://mirror.gcr.io"] }
```

## "maximum retry attempts reached"

Swarm-specific error when a task keeps failing.

```bash
docker service ps myservice
# Error response from daemon: rpc error: code = Unknown desc = maximum retry attempts reached
```

Check the service logs and task history:

```bash
# View the service logs
docker service logs myservice

# See the task history including error details
docker service ps myservice --no-trunc

# Check if the image exists and can be pulled
docker pull myimage:v1.0

# Recreate the service if it is stuck
docker service update --force myservice
```

## "could not find an available, non-overlapping IPv4 address pool"

Docker ran out of subnet ranges for bridge networks. This happens when you create many custom networks.

```bash
docker network create mynet
# Error response from daemon: could not find an available, non-overlapping IPv4 address pool among the defaults to assign to the network
```

Fix by removing unused networks or specifying a subnet:

```bash
# Remove unused networks
docker network prune -f

# Create a network with a specific subnet
docker network create --subnet 172.30.0.0/16 mynet

# Check existing network subnets
docker network ls -q | xargs -I {} docker network inspect {} --format '{{.Name}}: {{range .IPAM.Config}}{{.Subnet}}{{end}}'
```

## General Debugging Steps

When you encounter any daemon error, these steps help narrow down the cause:

```bash
# Check Docker daemon logs for more details
sudo journalctl -u docker -n 50 --no-pager

# On macOS with Docker Desktop
# Check ~/Library/Containers/com.docker.docker/Data/log/

# Verify Docker version and system info
docker version
docker info

# Check Docker events for recent failures
docker events --since 10m --filter type=container

# Restart Docker if the daemon seems stuck
sudo systemctl restart docker
```

## Conclusion

"Error response from daemon" is a catchall prefix for every error the Docker daemon can produce. The fix depends entirely on the specific message that follows. Most issues fall into a handful of categories: name conflicts, missing resources, port conflicts, disk space, permissions, and network problems. The debugging process is consistent: read the full error message, check the relevant resource (container, image, network, volume), and apply the appropriate fix. Keep `docker system prune` and `docker system df` in your toolkit for the space-related errors, and `docker logs` and `journalctl` for everything else.
