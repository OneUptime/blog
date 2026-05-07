# How to Set Up a Local Development Environment with Podman

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Podman, Container, Development Environment, DevOps, Local Development

Description: A step-by-step guide to installing Podman and configuring a local containerized development environment on macOS, Linux, and Windows.

---

> Podman gives you much of what Docker does for local development, without a daemon running in the background and without requiring root privileges for rootless containers.

Containers have become the standard way to build, test, and ship software. Most developers reach for Docker out of habit, but Podman offers a compelling alternative. It runs containers without a central daemon process, supports rootless mode out of the box, and its CLI is comparable to Docker's. If you can type `docker run`, you already know how to type `podman run`.

This guide walks through installing Podman on all three major operating systems, configuring it for everyday development work, and running your first containerized application.

---

## Why Podman Over Docker

Docker relies on a long-running background daemon (`dockerd`) that listens for API requests and manages containers. That daemon typically runs as root, which has security implications. Podman takes a different approach. Podman does not depend on a central long-running daemon to create and manage containers. Containers run under your user account by default when you use Podman as a regular user, which reduces the attack surface.

From a developer experience perspective, the two tools are nearly interchangeable. Podman supports the same Dockerfile syntax, the same image registries, and many of the same CLI flags. You can even alias `docker` to `podman` and most workflows will not notice the difference.

## Installing Podman on macOS

macOS does not natively support Linux containers, so Podman creates a lightweight Linux virtual machine behind the scenes. The `podman machine` commands manage this VM for you.

```bash
# Install Podman using Homebrew

brew install podman

# Initialize a Podman machine (downloads a Fedora CoreOS VM image)
podman machine init

# Start the machine
podman machine start

# Verify the installation
podman info
```

The `podman machine init` command creates a VM with sensible defaults: 1 CPU, 2 GB of memory, and 10 GB of disk unless your containers configuration overrides them. You can customize these at creation time.

```bash
# Create a machine with more resources for heavier workloads
podman machine init --cpus 4 --memory 8192 --disk-size 200
```

To stop the machine when you are done working:

```bash
podman machine stop
```

## Installing Podman on Linux

On Linux, Podman runs containers natively without a VM. Most distributions include Podman in their default package repositories.

```bash
# Ubuntu / Debian
sudo apt update && sudo apt install -y podman

# Fedora
sudo dnf install -y podman

# Arch Linux
sudo pacman -S podman
```

After installation, verify that rootless mode works under your regular user account:

```bash
# Run a quick test container as a normal user (no sudo)
podman run --rm docker.io/library/hello-world
```

If this prints the hello-world message, rootless containers are working correctly.

## Installing Podman on Windows

On Windows, Podman uses WSL 2 (Windows Subsystem for Linux) to run a Linux environment.

```powershell
# Install Podman using winget
winget install -e --id RedHat.Podman

# Initialize and start the Podman machine
podman machine init
podman machine start

# Verify
podman info
```

Make sure WSL 2 is enabled on your system before running `podman machine init`. You can enable it through PowerShell:

```powershell
wsl --install
```

## Configuring Container Registries

By default, Podman searches a list of container registries when you pull an image by short name. You can configure which registries it checks and in what order.

```bash
# Pull an image using its full registry path
podman pull docker.io/library/nginx:latest

# Pull using a short name (Podman will prompt you to choose a registry)
podman pull nginx
```

To set Docker Hub as the default unqualified search registry, edit the registries configuration file:

```bash
# On Linux, edit /etc/containers/registries.conf or create a user-level config
mkdir -p ~/.config/containers
cat > ~/.config/containers/registries.conf << 'EOF'
unqualified-search-registries = ["docker.io", "quay.io"]
EOF
```

## Running Your First Development Container

With Podman installed, you can spin up a development container. Here is an example that runs a Python environment and mounts your project directory into the container.

```bash
# Run a Python container with your project mounted
podman run -it --rm \
  -v $(pwd):/app:Z \
  -w /app \
  -p 8000:8000 \
  docker.io/library/python:3.12-slim \
  bash
```

Breaking down the flags:

- `-it` attaches an interactive terminal
- `--rm` removes the container when it exits
- `-v $(pwd):/app:Z` mounts the current directory into `/app` inside the container (the `:Z` suffix handles SELinux labeling on Fedora/RHEL systems)
- `-w /app` sets the working directory inside the container
- `-p 8000:8000` forwards port 8000 from the container to your host

Once inside the container, you can install dependencies and run your application as if you were on a clean Linux machine.

## Managing Containers and Images

Here are the most common commands you will use during daily development:

```bash
# List running containers
podman ps

# List all containers (including stopped ones)
podman ps -a

# List downloaded images
podman images

# Stop a running container
podman stop <container_id>

# Remove a container
podman rm <container_id>

# Remove an image
podman rmi <image_name>

# View container logs
podman logs <container_id>

# Execute a command in a running container
podman exec -it <container_id> bash
```

## Building Custom Images with Containerfile

Podman uses `Containerfile` (or `Dockerfile`, both are supported) to build custom images.

```dockerfile
# Containerfile for a basic Node.js development image
FROM docker.io/library/node:20-slim

# Install common development tools
RUN apt-get update && apt-get install -y \
    git \
    curl \
    vim \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user for development
RUN useradd -m -s /bin/bash developer
USER developer

WORKDIR /home/developer/app

# Default command opens a shell
CMD ["bash"]
```

Build and run the image:

```bash
# Build the image from the Containerfile
podman build -t my-dev-env .

# Run a container from the custom image
podman run -it --rm -v $(pwd):/home/developer/app:Z my-dev-env
```

## Using Podman Compose for Multi-Container Setups

Many development environments need more than one container. A web application might need an app server, a database, and a cache. Podman supports `podman-compose`, a community tool that reads `docker-compose.yml` files.

```bash
# Install podman-compose
pip install podman-compose

# Or on Fedora
sudo dnf install podman-compose
```

Create a `docker-compose.yml` for a typical web application stack:

```yaml
services:
  app:
    image: docker.io/library/node:20-slim
    ports:
      - "3000:3000"
    volumes:
      - ./src:/app:Z
    working_dir: /app
    command: ["node", "server.js"]

  db:
    image: docker.io/library/postgres:16
    environment:
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: devpass
      POSTGRES_DB: myapp
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

Start the stack:

```bash
podman-compose up -d

# View logs
podman-compose logs -f

# Stop everything
podman-compose down
```

## Setting Up a Docker Alias

If you have scripts or tools that call `docker` directly, you can alias it to Podman so everything works transparently.

```bash
# Add to your shell profile (~/.bashrc, ~/.zshrc, etc.)
alias docker=podman
```

For tools that use the Docker socket, Podman can emulate that too:

```bash
# Enable the Podman socket (systemd-based Linux systems)
systemctl --user enable --now podman.socket

# Set the DOCKER_HOST variable to point to the Podman socket
export DOCKER_HOST=unix://$XDG_RUNTIME_DIR/podman/podman.sock
```

## Conclusion

Setting up Podman as your local container runtime takes about five minutes regardless of your operating system. The daemonless architecture and rootless-by-default design make it a solid choice for development machines where you want containers without giving up system-level control. Once installed, the CLI works the same way Docker does, so existing muscle memory and scripts carry over directly. From here, you can move on to language-specific development workflows, multi-container stacks, and production image builds, all without changing tools.
