# How to Use Podman on Debian Server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Debian, Container, Server, DevOps

Description: Learn how to install and configure Podman on Debian Server for running daemonless, rootless containers in stable server environments.

---

> Debian's commitment to stability makes it a solid foundation for Podman containers. This guide covers installing Podman on Debian, configuring rootless mode, and running production container workloads on the most reliable Linux distribution.

Debian is known for its stability and long support cycles, making it a popular choice for servers that need to run reliably for years. Podman integrates well with Debian, offering daemonless container management that aligns with Debian's philosophy of simplicity and reliability. Starting with Debian 11 (Bullseye), Podman is available directly from the official repositories.

This guide covers installing Podman on Debian, configuring it for both rootless and rootful operation, and deploying container workloads in production.

---

## Installing Podman on Debian

On Debian 12 (Bookworm) and later, Podman is available in the default repositories:

```bash
sudo apt update
sudo apt install -y podman
```

Install additional container tools:

```bash
sudo apt install -y buildah skopeo podman-compose slirp4netns uidmap
```

Verify the installation:

```bash
podman --version
podman info
```

For Debian 11 (Bullseye), Podman is also available in the main repository:

```bash
sudo apt update
sudo apt install -y podman
```

## Configuring Rootless Containers

Rootless containers are the recommended way to run Podman. Install the required userspace networking and UID mapping tools:

```bash
sudo apt install -y slirp4netns fuse-overlayfs uidmap
```

Verify subordinate UID and GID mappings exist for your user:

```bash
grep $USER /etc/subuid
grep $USER /etc/subgid
```

If the entries are missing, add them:

```bash
sudo usermod --add-subuids 100000-165535 --add-subgids 100000-165535 $USER
```

Enable user lingering so containers keep running after logout:

```bash
sudo loginctl enable-linger $USER
```

Test rootless operation:

```bash
podman run --rm docker.io/library/alpine:latest echo "Rootless containers work"
```

## Configuring Container Registries

Configure default registries for image pulls. Create or edit the registries configuration:

```bash
sudo tee /etc/containers/registries.conf.d/shortnames.conf << 'EOF'
unqualified-search-registries = ["docker.io", "quay.io"]
EOF
```

Test image pulling:

```bash
podman pull docker.io/library/nginx:latest
podman pull docker.io/library/alpine:latest
```

## Running Containers

Start a basic web server:

```bash
podman run -d --name nginx -p 8080:80 docker.io/library/nginx:latest
podman ps
curl http://localhost:8080
```

Run a container with environment variables and volumes:

```bash
podman volume create mariadb-data

podman run -d --name mariadb \
  -e MYSQL_ROOT_PASSWORD=secret \
  -e MYSQL_DATABASE=myapp \
  -v mariadb-data:/var/lib/mysql \
  -p 3306:3306 \
  docker.io/library/mariadb:11
```

Run an interactive Debian container:

```bash
podman run -it --rm docker.io/library/debian:bookworm bash
```

## Building Container Images

Create a Containerfile based on Debian:

```dockerfile
FROM docker.io/library/debian:bookworm-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      python3 \
      python3-pip \
      python3-venv \
      curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN python3 -m venv /app/venv
ENV PATH="/app/venv/bin:$PATH"

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

HEALTHCHECK --interval=30s --timeout=5s \
  CMD curl -f http://localhost:8000/health || exit 1

EXPOSE 8000
CMD ["python3", "app.py"]
```

Build the image:

```bash
podman build -t myapp:latest .
podman images
podman run -d -p 8000:8000 myapp:latest
```

Use Buildah for more granular image construction:

```bash
container=$(buildah from docker.io/library/debian:bookworm-slim)
buildah run $container apt-get update
buildah run $container apt-get install -y nginx
buildah config --port 80 $container
buildah config --cmd "nginx -g 'daemon off;'" $container
buildah commit $container my-nginx:latest
```

## Networking

Create and manage Podman networks:

```bash
podman network create backend-net
podman network create frontend-net
podman network ls
```

Run containers on specific networks:

```bash
podman run -d --network backend-net --name api myapp-api:latest
podman run -d --network backend-net --name db docker.io/library/postgres:16

podman run -d \
  --network frontend-net \
  --network backend-net \
  --name gateway \
  -p 8080:80 \
  my-gateway:latest
```

Containers on the same network can resolve each other by name:

```bash
podman run --rm --network backend-net docker.io/library/alpine \
  wget -qO- http://api:8000/health
```

## Pods for Multi-Container Applications

Group related containers into pods:

```bash
podman pod create --name webapp -p 8080:80 -p 5432:5432

podman run -d --pod webapp --name db \
  -e POSTGRES_PASSWORD=secret \
  -v pgdata:/var/lib/postgresql/data \
  docker.io/library/postgres:16

podman run -d --pod webapp --name app \
  -e DB_HOST=localhost \
  myapp:latest

podman run -d --pod webapp --name proxy \
  docker.io/library/nginx:latest
```

Manage pods:

```bash
podman pod ps
podman pod inspect webapp
podman pod stop webapp
podman pod restart webapp
```

## Systemd Integration with Quadlet

Create production-grade container services using Quadlet:

```ini
# /etc/containers/systemd/production-app.container

[Container]
ContainerName=production-app
Image=myapp:latest
Network=app-network.network
PublishPort=8080:8000
Volume=app-data:/app/data
Environment=ENV=production
Environment=LOG_LEVEL=info
AutoUpdate=registry

[Service]
Restart=always
TimeoutStartSec=300

[Install]
WantedBy=multi-user.target default.target
```

Create a network unit:

```ini
# /etc/containers/systemd/app-network.network
[Network]
Driver=bridge
Subnet=10.89.1.0/24
Gateway=10.89.1.1
```

Activate the services:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now production-app.service
sudo systemctl status production-app.service
journalctl -u production-app.service -f
```

## Using Podman Compose

Run multi-container applications with podman-compose:

```bash
sudo apt install -y podman-compose
```

Create a compose file:

```yaml
version: "3.8"
services:
  web:
    image: docker.io/library/nginx:latest
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - app
  app:
    build: .
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/app
    depends_on:
      - db
  db:
    image: docker.io/library/postgres:16
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: app
    volumes:
      - dbdata:/var/lib/postgresql/data
volumes:
  dbdata:
```

Run the stack:

```bash
podman-compose up -d
podman-compose ps
podman-compose down
```

## Firewall Configuration

Debian uses nftables or iptables. If you use ufw:

```bash
sudo apt install -y ufw
sudo ufw allow 8080/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

With raw iptables:

```bash
sudo iptables -A INPUT -p tcp --dport 8080 -j ACCEPT
sudo iptables-save | sudo tee /etc/iptables/rules.v4
```

## Storage Configuration

Configure the storage driver for your environment. Edit `/etc/containers/storage.conf`:

```toml
[storage]
driver = "overlay"
```

For rootless users, configure storage in `~/.config/containers/storage.conf`:

```toml
[storage]
driver = "overlay"
graphroot = "/home/user/.local/share/containers/storage"

[storage.options.overlay]
mount_program = "/usr/bin/fuse-overlayfs"
```

## Container Auto-Updates

Enable automatic container updates:

```bash
sudo systemctl enable --now podman-auto-update.timer
sudo systemctl list-timers | grep podman
sudo podman auto-update --dry-run
```

## Maintenance and Cleanup

Regular maintenance commands:

```bash
podman system df
podman container prune
podman image prune -a
podman volume prune
podman system prune -a --volumes
```

## Conclusion

Podman on Debian Server combines the legendary stability of Debian with a modern, daemonless container runtime. The rootless container support reduces security risk, Quadlet provides native systemd integration, and the Docker-compatible CLI makes migration painless. For teams running Debian servers that want to adopt containers without the overhead of a container daemon, Podman is the right choice. It integrates cleanly with Debian's existing system management tools and delivers a reliable container platform for production workloads.
