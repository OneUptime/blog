# How to Use Podman on Fedora Silverblue

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Fedora Silverblue, Container, Immutable Desktop, Linux

Description: Learn how to use Podman on Fedora Silverblue, the immutable desktop operating system where containers are the primary way to run applications and development environments.

---

> Fedora Silverblue is an immutable desktop OS with first-class support for container-focused workflows. This guide covers using Podman for development workflows, running GUI applications in containers, and leveraging toolbox and distrobox alongside Podman.

Fedora Silverblue is an immutable variant of Fedora Workstation that delivers a stable, reliable desktop experience. The root filesystem is read-only, and applications are typically installed as Flatpaks, layered with rpm-ostree when needed, or run inside containers. Podman comes pre-installed and is a key tool for running containerized workloads, building images, and managing pods and services.

This guide explains how to take full advantage of Podman on Silverblue for both development and everyday use.

---

## Understanding Silverblue and Podman

On Fedora Silverblue, the base OS is managed by rpm-ostree. You cannot use dnf to install packages directly on the host. Instead, you generally have three primary ways to install or run software:

1. Flatpak for desktop applications
2. Toolbox for mutable development environments and CLI tools
3. rpm-ostree package layering for host-level packages

Podman is already installed as part of the base image and is used directly for standalone containers, images, pods, and services. Distrobox can be added as an alternative to toolbox for mutable container-based environments. Verify Podman and the host state:

```bash
podman --version
podman info
rpm-ostree status
```

## Running Your First Container

Start using Podman immediately after logging into Silverblue:

```bash
podman run --rm docker.io/library/hello-world
podman run -it --rm docker.io/library/alpine:latest sh
```

Pull and run a web server:

```bash
podman run -d --name nginx -p 8080:80 docker.io/library/nginx:latest
curl http://localhost:8080
```

## Setting Up Development Environments

One of the most common uses of Podman on Silverblue is creating isolated development environments. Instead of installing compilers and libraries on the host, run them in containers.

Create a Node.js development container:

```bash
podman run -it --rm \
  -v $HOME/projects:/projects:Z \
  -w /projects \
  -p 3000:3000 \
  docker.io/library/node:20 \
  bash
```

Inside the container, you have full access to Node.js tools:

```bash
node --version
npm init -y
npm install express
```

Create a Python development container:

```bash
podman run -it --rm \
  -v $HOME/projects/myapp:/app:Z \
  -w /app \
  -p 8000:8000 \
  docker.io/library/python:3.12 \
  bash
```

## Using Toolbox with Podman

Toolbox is built on top of Podman and provides mutable pet containers that integrate seamlessly with the host. Create a toolbox:

```bash
toolbox create dev-env
toolbox enter dev-env
```

Inside the toolbox, you can use dnf to install packages:

```bash
sudo dnf install gcc make cmake python3-devel nodejs npm
```

Toolbox containers persist between sessions and have access to your home directory. They appear in Podman:

```bash
podman ps -a --filter label=com.github.containers.toolbox=true
```

## Using Distrobox as an Alternative

Distrobox extends the toolbox concept to support multiple distributions. Install it and create containers based on different distros:

```bash
rpm-ostree install distrobox
systemctl reboot

# Create an Ubuntu-based environment

distrobox create --name ubuntu-dev --image docker.io/library/ubuntu:24.04
distrobox enter ubuntu-dev

# Inside Ubuntu container
sudo apt update && sudo apt install build-essential
```

Create an Arch Linux environment for access to the AUR:

```bash
distrobox create --name arch-dev --image docker.io/library/archlinux:latest
distrobox enter arch-dev
```

## Running GUI Applications in Containers

Podman on Silverblue can run graphical applications. On Wayland sessions, the key is sharing the Wayland socket with the container:

```bash
# Run a GUI app with Wayland support
podman run -it --rm \
  -e WAYLAND_DISPLAY=$WAYLAND_DISPLAY \
  -e XDG_RUNTIME_DIR=$XDG_RUNTIME_DIR \
  -v $XDG_RUNTIME_DIR:$XDG_RUNTIME_DIR \
  --security-opt label=disable \
  my-gui-app:latest
```

For applications that need GPU access:

```bash
podman run -it --rm \
  --device /dev/dri \
  -e WAYLAND_DISPLAY=$WAYLAND_DISPLAY \
  -e XDG_RUNTIME_DIR=$XDG_RUNTIME_DIR \
  -v $XDG_RUNTIME_DIR:$XDG_RUNTIME_DIR \
  --security-opt label=disable \
  docker.io/library/ubuntu:24.04 bash
```

## Building Container Images

Build custom images directly on Silverblue:

```bash
mkdir -p ~/projects/myapp
cat > ~/projects/myapp/Containerfile << 'EOF'
FROM docker.io/library/python:3.12-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

EXPOSE 8000
CMD ["python", "app.py"]
EOF
```

Build the image:

```bash
cd ~/projects/myapp
podman build -t myapp:latest .
podman images
```

## Rootless Containers on Silverblue

Silverblue encourages rootless container workflows. All the commands above run without sudo. Check your rootless configuration:

```bash
podman unshare cat /proc/self/uid_map
podman info --format '{{.Host.Security.Rootless}}'
```

If you need to adjust the subordinate UID/GID ranges:

```bash
cat /etc/subuid
cat /etc/subgid
```

## Systemd Integration with Quadlet

Run persistent services using Quadlet. Create a container unit in your user systemd directory:

```ini
# ~/.config/containers/systemd/dev-database.container
[Container]
ContainerName=dev-database
Image=docker.io/library/postgres:16
PublishPort=5432:5432
Environment=POSTGRES_PASSWORD=devpassword
Volume=pgdata:/var/lib/postgresql/data:Z

[Service]
Restart=always

[Install]
WantedBy=default.target
```

Reload user systemd and start it:

```bash
systemctl --user daemon-reload
systemctl --user start dev-database.service
```

## Pod-Based Development Stacks

Create a development stack with multiple services using a pod:

```bash
podman pod create --name dev-stack -p 3000:3000 -p 5432:5432 -p 6379:6379

podman run -d --pod dev-stack --name postgres \
  -e POSTGRES_PASSWORD=dev \
  -v pgdata:/var/lib/postgresql/data:Z \
  docker.io/library/postgres:16

podman run -d --pod dev-stack --name redis \
  docker.io/library/redis:7

podman run -d --pod dev-stack --name app \
  -v $HOME/projects/myapp:/app:Z \
  -w /app \
  docker.io/library/node:20 \
  npm start
```

## Managing Container Storage

Check how much space containers are using:

```bash
podman system df
podman system df -v
```

Clean up unused images and containers:

```bash
podman system prune -a
podman volume prune
```

Override the rootless storage location if you need to customize it. Edit `~/.config/containers/storage.conf`:

```toml
[storage]
driver = "overlay"
graphroot = "$HOME/containers/storage"

[storage.options.overlay]
mount_program = "/usr/bin/fuse-overlayfs"
```

On SELinux systems, relabel the new path to match the default rootless container storage context before using it.

## Podman Compose for Development

Use Podman's compose wrapper for multi-container development environments. Install a compose provider in a toolbox:

```bash
toolbox enter dev-env
sudo dnf install podman-compose
```

Create a compose file:

```yaml
services:
  web:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./src:/app/src:Z
    depends_on:
      - db
  db:
    image: docker.io/library/postgres:16
    environment:
      POSTGRES_PASSWORD: dev
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:
```

Run the stack:

```bash
podman compose up -d
podman compose logs -f
```

## Updating Podman on Silverblue

Podman updates come with the OS updates. Check for and apply updates:

```bash
rpm-ostree upgrade
systemctl reboot
podman --version
```

## Conclusion

Fedora Silverblue makes Podman a first-class citizen in the desktop Linux experience. By combining Podman containers for services, toolbox or distrobox for development environments, and Flatpak for desktop applications, you get a stable and reproducible workstation setup. The immutable base OS protects system integrity while Podman provides the flexibility to run any workload in isolated containers. This approach gives developers the best of both worlds: a rock-solid desktop with the freedom to run anything inside containers.
