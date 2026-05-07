# How to Use Podman on ChromeOS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, ChromeOS, Container, Linux, DevOps, Crostini, Development

Description: Learn how to install and use Podman on ChromeOS via the built-in Linux environment, covering setup, rootless containers, networking, and practical workflows.

---

> ChromeOS ships with a Linux development environment powered by a Debian container. Podman runs beautifully inside this environment, giving you a full container runtime on lightweight Chromebook hardware without needing Docker or a daemon process.

Many developers use Chromebooks as secondary or even primary development machines. With the Linux development environment (Crostini) built into ChromeOS, you can run a full Debian-based Linux system inside a virtual machine. Podman fits perfectly into this setup because it runs as a rootless, daemonless container engine that works within the constraints of the ChromeOS sandbox.

---

## Prerequisites

Before you begin, make sure your Chromebook meets these requirements:

- A Chromebook that supports the Linux development environment
- Linux development environment enabled (Settings > About ChromeOS > Developers > Linux development environment)
- At least 4GB of RAM (8GB recommended for running multiple containers)
- At least 10GB of disk space allocated to the Linux environment

To enable the Linux environment, open ChromeOS Settings, navigate to About ChromeOS > Developers, and click "Set up" next to Linux development environment. ChromeOS will download and set up a Debian environment automatically.

---

## Installing Podman on ChromeOS

Once your Linux terminal is ready, update the package manager and install Podman:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y podman
```

Verify the installation:

```bash
podman --version
```

You should see output like `podman version 4.x` or `podman version 5.x` depending on the Debian release in your Linux environment.

### Configuring Registries

The examples in this guide already use fully qualified image names such as `docker.io/library/nginx:alpine`, so no registry changes are required. If you want to use short names such as `nginx:alpine`, configure only registries you trust:

```bash
sudo mkdir -p /etc/containers
sudo tee /etc/containers/registries.conf <<EOF
unqualified-search-registries = ["docker.io"]
EOF
```

### Setting Up Storage

Install `fuse-overlayfs` if it is not already present:

```bash
sudo apt install -y fuse-overlayfs
```

Rootless Podman uses `fuse-overlayfs` automatically when it is available. If you already ran Podman before installing it, run `podman system reset` once before pulling images so Podman can switch from `vfs` to `overlay`.

---

## Running Your First Container

With Podman installed, pull and run a test container:

```bash
podman run --rm docker.io/library/hello-world
```

Run an interactive Ubuntu container:

```bash
podman run -it --rm docker.io/library/ubuntu:22.04 /bin/bash
```

Inside the container, you have a full Ubuntu environment. Type `exit` to return to the ChromeOS Linux terminal.

---

## Running a Web Application

One of the most common use cases is running web applications for development. Here is how to run an Nginx web server:

```bash
podman run -d --name webserver -p 8080:80 docker.io/library/nginx:alpine
```

Verify it is running:

```bash
podman ps
```

Open the Chrome browser on your Chromebook and navigate to `http://localhost:8080`. ChromeOS forwards `localhost` ports into Crostini, so services listening in the Linux environment are typically reachable from Chrome on the same port.

### Custom Web Content

Create a local directory with your web files and mount it into the container:

```bash
mkdir -p ~/website
echo '<h1>Hello from Podman on ChromeOS</h1>' > ~/website/index.html

podman run -d --name mysite \
  -p 8081:80 \
  -v ~/website:/usr/share/nginx/html:ro \
  docker.io/library/nginx:alpine
```

---

## Running a Development Database

Set up a PostgreSQL database for local development:

```bash
podman run -d --name devdb \
  -p 5432:5432 \
  -e POSTGRES_USER=developer \
  -e POSTGRES_PASSWORD=devpassword \
  -e POSTGRES_DB=myapp \
  -v pgdata:/var/lib/postgresql/data \
  docker.io/library/postgres:16-alpine
```

Connect to it using psql from the host:

```bash
sudo apt install -y postgresql-client
psql -h localhost -U developer -d myapp
```

---

## Using Podman Compose on ChromeOS

For multi-container applications, install a Compose provider:

```bash
sudo apt install -y podman-compose
```

Create a `docker-compose.yml` file for a typical development stack:

```yaml
services:
  web:
    image: docker.io/library/node:20-alpine
    working_dir: /app
    volumes:
      - ./app:/app
    ports:
      - "3000:3000"
    command: sh -c "npm install && npm start"

  db:
    image: docker.io/library/postgres:16-alpine
    environment:
      POSTGRES_USER: appuser
      POSTGRES_PASSWORD: apppass
      POSTGRES_DB: appdb
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

Start the stack:

```bash
podman compose up -d
```

---

## Managing Resources on ChromeOS

Chromebooks typically have limited resources. Monitor your container resource usage:

```bash
podman stats --no-stream
```

Set resource limits when running containers to prevent them from consuming too much memory:

```bash
podman run -d --name limited \
  --memory 512m \
  --cpus 1 \
  docker.io/library/nginx:alpine
```

Clean up unused images and containers to free disk space:

```bash
podman system prune -a -f
```

Check how much disk space Podman is using:

```bash
podman system info | grep -A 5 store
```

---

## Troubleshooting Common Issues

### Permission Errors with Volumes

If you encounter permission errors when mounting volumes, the usual issue on ChromeOS is UID/GID ownership rather than SELinux labels. Let Podman adjust ownership for the container with the `:U` suffix:

```bash
podman run -v ~/mydata:/data:U myimage
```

If you prefer to fix ownership yourself, use `podman unshare chown` with the UID and GID expected by the container image.

### Network Connectivity Issues

If containers cannot reach the internet, check DNS resolution inside the container:

```bash
podman run --rm docker.io/library/alpine cat /etc/resolv.conf
```

If DNS is not working, specify a DNS server:

```bash
podman run --dns 8.8.8.8 --rm docker.io/library/alpine ping -c 3 google.com
```

### Slow Image Pulls

ChromeOS Linux environments share the Chromebook's network connection. If pulls are slow, consider pulling images during off-peak hours or using smaller Alpine-based images.

---

## Persisting Data Across Restarts

The Linux environment on ChromeOS persists across reboots, so your Podman containers and images remain available. However, containers that were running will be stopped after a reboot. Use a simple script to restart your development containers:

```bash
#!/bin/bash
# ~/start-dev.sh

podman start devdb 2>/dev/null || echo "devdb not found"
podman start webserver 2>/dev/null || echo "webserver not found"
echo "Development containers started"
```

Make it executable:

```bash
chmod +x ~/start-dev.sh
```

---

## Conclusion

Podman on ChromeOS transforms a lightweight Chromebook into a capable development machine. The rootless, daemonless architecture of Podman is ideal for the ChromeOS Linux environment where you operate as a regular user inside a virtual machine. You can run web servers, databases, and multi-container development stacks without needing Docker Desktop or root-level daemon processes. Keep an eye on resource usage since Chromebooks have limited RAM and storage, and use Alpine-based images whenever possible to minimize disk consumption.
