# How to Use Podman on Ubuntu Server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Ubuntu, Container, DevOps, Server

Description: Learn how to install, configure, and use Podman on Ubuntu Server as a Docker alternative for running containers without a daemon.

---

> Podman brings daemonless, rootless containers to Ubuntu Server. This guide covers installation, configuration, and practical usage of Podman on Ubuntu, including migration tips for Docker users.

Ubuntu Server is one of the most widely deployed Linux distributions for cloud and on-premises infrastructure. While Docker has traditionally been the container runtime of choice on Ubuntu, Podman offers a compelling alternative with its daemonless architecture, rootless container support, and Docker-compatible CLI. This guide walks through setting up Podman on Ubuntu Server and using it for real-world container workloads.

---

## Installing Podman on Ubuntu Server

Podman is available in the official Ubuntu repositories for Ubuntu 20.10 and newer. Install it directly:

```bash
sudo apt update
sudo apt install -y podman
```

On Ubuntu 24.04 LTS and later, the packaged `podman-compose` provider is also available:

```bash
sudo apt install -y podman podman-compose
podman --version
```

If you need a newer version than what ships in the Ubuntu repos, add the Kubic repository:

```bash
sudo mkdir -p /etc/apt/keyrings
curl -fsSL "https://download.opensuse.org/repositories/devel:kubic:libcontainers:unstable/xUbuntu_$(lsb_release -rs)/Release.key" \
  | gpg --dearmor \
  | sudo tee /etc/apt/keyrings/devel_kubic_libcontainers_unstable.gpg > /dev/null

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/devel_kubic_libcontainers_unstable.gpg] \
  https://download.opensuse.org/repositories/devel:kubic:libcontainers:unstable/xUbuntu_$(lsb_release -rs)/ /" \
  | sudo tee /etc/apt/sources.list.d/devel:kubic:libcontainers:unstable.list

sudo apt update
sudo apt install -y podman
```

Verify the installation:

```bash
podman --version
podman info
```

## Configuring Rootless Containers

Ubuntu Server requires some configuration for rootless Podman. Check that your user has subordinate UID and GID ranges:

```bash
cat /etc/subuid
cat /etc/subgid
```

If entries are missing for your user:

```bash
sudo usermod --add-subuids 100000-165535 --add-subgids 100000-165535 $USER
```

Enable the user lingering so rootless containers survive after you log out:

```bash
sudo loginctl enable-linger $USER
```

For rootless user services, verify that your login session has `XDG_RUNTIME_DIR` set automatically:

```bash
echo $XDG_RUNTIME_DIR
ls -ld /run/user/$(id -u)
```

## Configuring Container Registries

By default, Podman on Ubuntu may not have Docker Hub configured as a search registry. Edit the registries configuration:

```bash
sudo tee /etc/containers/registries.conf.d/docker.conf << 'EOF'
unqualified-search-registries = ["docker.io"]
EOF
```

Now you can pull images without specifying the full registry path:

```bash
podman pull nginx:latest
podman pull alpine:latest
```

## Running Containers

Run a basic web server:

```bash
podman run -d --name webserver -p 8080:80 docker.io/library/nginx:latest
podman ps
curl http://localhost:8080
```

Run an interactive container:

```bash
podman run -it --rm docker.io/library/ubuntu:24.04 bash
```

Run a database container with persistent storage:

```bash
podman volume create pgdata
podman run -d --name postgres \
  -e POSTGRES_PASSWORD=mysecret \
  -e POSTGRES_DB=myapp \
  -v pgdata:/var/lib/postgresql/data \
  -p 5432:5432 \
  docker.io/library/postgres:16
```

## Migrating from Docker to Podman

If you are transitioning from Docker, Podman is designed to be a drop-in replacement. Most Docker commands work identically:

```bash
# Docker command           # Podman equivalent

# docker run               podman run
# docker build             podman build
# docker-compose           podman compose
# docker ps                podman ps
# docker images            podman images
```

You can create an alias for a seamless transition:

```bash
echo 'alias docker=podman' >> ~/.bashrc
source ~/.bashrc
```

Import Docker images into Podman:

```bash
docker save myapp:latest | podman load
```

## Building Images

Create a Containerfile (or Dockerfile, both are supported):

```dockerfile
FROM docker.io/library/ubuntu:24.04

RUN apt-get update && \
    apt-get install -y python3 python3-pip python3-venv && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
RUN python3 -m venv /app/venv
ENV PATH="/app/venv/bin:$PATH"

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["python3", "app.py"]
```

Build and run:

```bash
podman build -t myapp:latest .
podman run -d -p 8000:8000 myapp:latest
```

## Networking

Create custom networks:

```bash
podman network create mynet
podman network ls

podman run -d --network mynet --name backend myapp-api:latest
podman run -d --network mynet --name frontend myapp-web:latest
```

Inspect network details:

```bash
podman network inspect mynet
```

Connect a running container to a network:

```bash
podman network connect mynet existing-container
```

## Systemd Integration with Quadlet

Create a systemd-managed container service. For rootful containers:

```ini
# /etc/containers/systemd/webapp.container
[Container]
ContainerName=webapp
Image=docker.io/library/nginx:latest
PublishPort=80:80
Volume=web-content:/usr/share/nginx/html
AutoUpdate=registry

[Service]
Restart=always

[Install]
WantedBy=multi-user.target default.target
```

For rootless user services:

```ini
# ~/.config/containers/systemd/devdb.container
[Container]
ContainerName=devdb
Image=docker.io/library/postgres:16
PublishPort=5432:5432
Environment=POSTGRES_PASSWORD=dev
Volume=pgdata:/var/lib/postgresql/data

[Service]
Restart=always

[Install]
WantedBy=default.target
```

Activate the service:

```bash
# Rootful
sudo systemctl daemon-reload
sudo systemctl enable --now webapp.service

# Rootless
systemctl --user daemon-reload
systemctl --user enable --now devdb.service
```

## Using Podman Compose

On Ubuntu 24.04 LTS and later, Podman can use Docker Compose files through the packaged `podman-compose` provider:

```bash
sudo apt install -y podman-compose
```

Use your existing docker-compose.yml files:

```yaml
version: "3.8"
services:
  web:
    image: docker.io/library/nginx:latest
    ports:
      - "8080:80"
    volumes:
      - ./html:/usr/share/nginx/html:ro
    depends_on:
      - api
  api:
    build: ./api
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:secret@db:5432/app
  db:
    image: docker.io/library/postgres:16
    environment:
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: app
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:
```

Run the stack:

```bash
podman compose up -d
podman compose ps
podman compose logs -f
podman compose down
```

## Firewall Configuration

Ubuntu uses ufw for firewall management. Open ports for your containers:

```bash
sudo ufw allow 8080/tcp
sudo ufw allow 5432/tcp
sudo ufw status
```

Resource Limits

Constrain container resources:

```bash
podman run -d --name limited-app \
  --memory=512m \
  --cpus=1.0 \
  --memory-swap=1g \
  myapp:latest
```

Monitor resource usage:

```bash
podman stats
podman stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"
```

## Container Auto-Updates

Enable automatic container updates for the same systemd scope that owns your services:

```bash
# Rootful services
sudo systemctl enable --now podman-auto-update.timer
sudo podman auto-update --dry-run

# Rootless user services
systemctl --user enable --now podman-auto-update.timer
podman auto-update --dry-run
```

## Maintenance

Regular cleanup tasks:

```bash
podman system df
podman system prune -a
podman volume prune
podman image prune -a
```

## Conclusion

Podman on Ubuntu Server provides a powerful, daemonless container runtime that fits naturally into existing Ubuntu infrastructure. With Docker CLI compatibility, rootless container support, and systemd integration through Quadlet, Podman is a production-ready alternative that reduces attack surface while maintaining the workflows developers already know. Whether you are migrating from Docker or starting fresh, Podman on Ubuntu Server delivers the flexibility and security that modern container deployments require.
