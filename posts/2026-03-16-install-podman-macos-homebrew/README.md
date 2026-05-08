# How to Install Podman on macOS with Homebrew

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Installation, Linux, Container, DevOps, macOS, Homebrew

Description: A step-by-step guide to installing Podman on macOS using Homebrew, including machine initialization and running containers on Apple Silicon and Intel Macs.

---

> Podman on macOS provides a free, open-source alternative to Docker Desktop with full container support on both Apple Silicon and Intel Macs.

Podman runs Linux containers on macOS by managing a lightweight Linux virtual machine behind the scenes. Using Homebrew, installation is straightforward. This guide covers setting up Podman on macOS, initializing the Podman machine, and running your first containers.

---

## Prerequisites

- macOS 13 (Ventura) or later
- Homebrew installed (visit https://brew.sh if needed)
- At least 4GB of free RAM
- Admin access for Homebrew installations

## Step 1: Install Homebrew (If Not Installed)

If you do not have Homebrew installed:

```bash
# Install Homebrew

/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

## Step 2: Install Podman

```bash
# Update Homebrew
brew update

# Install Podman
brew install podman
```

This installs the Podman CLI. On macOS, Podman uses a Linux virtual machine to run containers locally.

## Step 3: Initialize the Podman Machine

Podman needs a Linux VM to run containers on macOS:

```bash
# Initialize the default Podman machine
podman machine init

# Start the machine
podman machine start
```

The initialization downloads a custom Fedora CoreOS-based machine image and configures it as the container runtime environment.

## Step 4: Verify the Installation

```bash
# Check the Podman version
podman --version

# View system information
podman info

# Run a test container
podman run --rm docker.io/library/hello-world
```

## Step 5: Configure Docker Compatibility

Set up Podman as a Docker replacement:

```bash
# Create a Docker CLI alias
echo 'alias docker=podman' >> ~/.zshrc
source ~/.zshrc

# Homebrew does not provide a podman-docker helper on macOS
```

Enable the Docker-compatible socket:

```bash
# The Podman machine exposes a Docker-compatible socket
# Check its location
podman machine inspect --format '{{.ConnectionInfo.PodmanSocket.Path}}'

# Set the DOCKER_HOST variable
export DOCKER_HOST="unix://$(podman machine inspect --format '{{.ConnectionInfo.PodmanSocket.Path}}')"
echo "export DOCKER_HOST=\"unix://\$(podman machine inspect --format '{{.ConnectionInfo.PodmanSocket.Path}}')\"" >> ~/.zshrc
```

## Step 6: Configure Machine Resources

Customize the VM resources for your workload:

```bash
# Stop the current machine
podman machine stop

# Remove and recreate with custom resources
podman machine rm

# Initialize with more CPUs and memory
podman machine init --cpus 4 --memory 4096 --disk-size 60

# Start the new machine
podman machine start
```

## Running a Practical Example

Run a development environment:

```bash
# Run a Node.js development container with a mounted volume
mkdir -p ~/dev/my-app

# Create a simple Node.js file
cat > ~/dev/my-app/index.js <<'EOF'
const http = require('http');
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello from Podman on macOS!\n');
});
server.listen(3000, () => console.log('Server running on port 3000'));
EOF

# Run the container with volume mount
podman run -d \
  --name dev-server \
  -p 3000:3000 \
  -v ~/dev/my-app:/app:Z \
  -w /app \
  docker.io/library/node:20-alpine \
  node index.js

# Test the server
curl http://localhost:3000

# View logs
podman logs dev-server

# Clean up
podman stop dev-server
podman rm dev-server
```

## Using Podman Compose

Install and use podman-compose for multi-container applications:

```bash
# Install podman-compose
brew install podman-compose

# Create a docker-compose.yml file
mkdir -p ~/dev/compose-test
cat > ~/dev/compose-test/docker-compose.yml <<'EOF'
services:
  web:
    image: docker.io/library/nginx:alpine
    ports:
      - "8080:80"
  redis:
    image: docker.io/library/redis:alpine
    ports:
      - "6379:6379"
EOF

# Start the services
cd ~/dev/compose-test
podman-compose up -d

# Check running containers
podman ps

# Tear down
podman-compose down
```

## Managing the Podman Machine

```bash
# List all machines
podman machine list

# Check machine status
podman machine inspect

# Stop the machine to free resources
podman machine stop

# Start it again
podman machine start

# SSH into the machine for debugging
podman machine ssh

# Reset everything
podman machine rm
podman machine init
podman machine start
```

## Updating Podman

```bash
# Update Podman via Homebrew
brew upgrade podman

# After updating, recreate the machine for the latest VM image
podman machine stop
podman machine rm
podman machine init
podman machine start
```

## Troubleshooting

If `podman machine start` hangs:

```bash
# Stop and remove the machine
podman machine stop
podman machine rm

# Reinitialize
podman machine init
podman machine start
```

If port forwarding does not work:

```bash
# Ensure the machine is running
podman machine list

# Check container port mappings
podman port <container-name>
```

If you get "cannot connect to Podman" errors:

```bash
# Check the machine status
podman machine list

# Restart the machine
podman machine stop
podman machine start

# Verify the connection
podman system connection list
```

For Apple Silicon (M1/M2/M3) architecture issues:

```bash
# Some images may not have ARM builds
# Pull with explicit platform if needed
podman pull --platform linux/amd64 docker.io/library/some-image:latest

# Or check available platforms
podman manifest inspect docker.io/library/nginx:latest | grep architecture
```

## Summary

Podman on macOS via Homebrew provides a complete container development environment without Docker Desktop. The Podman machine manages a lightweight Linux VM transparently, and Docker compatibility features make migration straightforward. Both Apple Silicon and Intel Macs are fully supported.
