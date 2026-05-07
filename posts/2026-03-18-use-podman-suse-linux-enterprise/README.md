# How to Use Podman on SUSE Linux Enterprise

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, SUSE, SLE, Container, Enterprise Linux

Description: Learn how to install and use Podman on SUSE Linux Enterprise Server for running containers in enterprise environments with full vendor support.

---

> SUSE Linux Enterprise ships Podman as its primary container engine. This guide covers installing and configuring Podman on SLES, managing container workloads, and using SUSE-specific tools for enterprise container deployments.

SUSE Linux Enterprise Server (SLES) is one of the leading enterprise Linux distributions, widely deployed in regulated industries, SAP environments, and high-performance computing. SUSE has embraced Podman as the supported container engine for SLES; it has been supported since SLES 15 SP2 and is the recommended container runtime for current SLES releases. Podman integrates with SUSE's enterprise tooling and provides the rootless, daemonless container runtime that enterprise security teams prefer.

This guide walks through setting up and using Podman on SUSE Linux Enterprise Server.

---

## Installing Podman on SLES

On SUSE Linux Enterprise Server 15, Podman is available from the Containers module. Use the service pack and architecture values that match your system. For example, on SLES 15 SP7 x86_64, activate the module with:

```bash
sudo SUSEConnect -p sle-module-containers/15.7/x86_64
```

Install Podman and companion tools:

```bash
sudo zypper install -y podman buildah skopeo
```

Verify the installation:

```bash
podman --version
podman info
```

On openSUSE Tumbleweed, Podman is in the default repositories:

```bash
sudo zypper install -y podman buildah skopeo
```

## Configuring Rootless Containers

Install helper packages commonly used with rootless containers:

```bash
sudo zypper install -y slirp4netns fuse-overlayfs
```

Check subordinate UID and GID mappings:

```bash
cat /etc/subuid
cat /etc/subgid
```

Add mappings if needed:

```bash
sudo usermod --add-subuids 100000-165535 --add-subgids 100000-165535 $USER
```

Log out and back in, or restart the user session, after changing subuid and subgid mappings.

Enable user lingering for persistent rootless services:

```bash
sudo loginctl enable-linger $USER
```

Test rootless operation:

```bash
podman run --rm docker.io/library/alpine:latest echo "Rootless Podman works on SLES"
```

## Configuring Registries

SUSE provides its own container registry. Configure Podman to search both the SUSE registry and Docker Hub:

```bash
sudo tee /etc/containers/registries.conf.d/suse.conf << 'EOF'
unqualified-search-registries = ["registry.suse.com", "docker.io"]
EOF
```

Pull SUSE-based images:

```bash
podman pull registry.suse.com/bci/bci-base:15.7
podman pull registry.suse.com/bci/python:3.11
podman pull registry.suse.com/bci/nodejs:22
```

SUSE Base Container Images (BCI) are freely available and designed for enterprise use.

## Running Containers

Run a basic container using a SUSE base image:

```bash
podman run -it --rm registry.suse.com/bci/bci-base:15.7 bash
```

Deploy a web server:

```bash
podman run -d --name webserver \
  -p 8080:80 \
  docker.io/library/nginx:latest

curl http://localhost:8080
```

Run a database with persistent storage:

```bash
podman volume create pgdata

podman run -d --name postgres \
  -e POSTGRES_PASSWORD=secret \
  -e POSTGRES_DB=enterprise_app \
  -v pgdata:/var/lib/postgresql/data \
  -p 5432:5432 \
  docker.io/library/postgres:16
```

## Building Enterprise Container Images

Create images based on SUSE BCI for enterprise deployments:

```dockerfile
FROM registry.suse.com/bci/python:3.11

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN useradd -r -s /sbin/nologin appuser
USER appuser

HEALTHCHECK --interval=30s --timeout=5s \
  CMD python3 -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

EXPOSE 8000
CMD ["python3", "app.py"]
```

Build using SUSE BCI as the base:

```bash
podman build -t enterprise-app:latest .
podman images
```

Create a Node.js application image:

```dockerfile
FROM registry.suse.com/bci/nodejs:22

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .

USER node
EXPOSE 3000
CMD ["node", "server.js"]
```

## AppArmor and Security

SLES can use AppArmor for container security. Check the AppArmor status:

```bash
sudo aa-status
```

Podman integrates with AppArmor automatically. Run a container with a specific AppArmor profile loaded on the host:

```bash
podman run -d --security-opt apparmor=your-profile-name myapp:latest
```

For containers that need additional capabilities:

```bash
podman run -d \
  --cap-add NET_ADMIN \
  --cap-add SYS_TIME \
  myapp:latest
```

Run containers with no new privileges to enhance security:

```bash
podman run -d --security-opt no-new-privileges myapp:latest
```

## Systemd Integration with Quadlet

Create production services using Quadlet on SLES:

```ini
# /etc/containers/systemd/enterprise-app.container

[Container]
ContainerName=enterprise-app
Image=registry.example.com/my-org/enterprise-app:latest
Network=enterprise.network
PublishPort=8080:8000
Volume=app-data:/app/data
Environment=ENV=production
Environment=LOG_FORMAT=json
AutoUpdate=registry
SecurityLabelDisable=false

[Service]
Restart=always
TimeoutStartSec=300
TimeoutStopSec=60

[Install]
WantedBy=multi-user.target default.target
```

Create a Quadlet network:

```ini
# /etc/containers/systemd/enterprise.network
[Network]
Driver=bridge
Subnet=10.89.0.0/24
```

Activate the services:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now enterprise-app.service
sudo systemctl status enterprise-app.service
```

## Pods for Multi-Tier Applications

Deploy enterprise multi-tier applications using pods:

```bash
podman pod create --name erp-stack \
  -p 8080:80 \
  -p 5432:5432

podman run -d --pod erp-stack --name erp-db \
  -e POSTGRES_PASSWORD=enterprise_secret \
  -e POSTGRES_DB=erp \
  -v erpdata:/var/lib/postgresql/data \
  docker.io/library/postgres:16

podman run -d --pod erp-stack --name erp-app \
  -e DATABASE_URL=postgresql://postgres:enterprise_secret@localhost:5432/erp \
  enterprise-app:latest

podman run -d --pod erp-stack --name erp-proxy \
  -v ./nginx.conf:/etc/nginx/nginx.conf:ro \
  docker.io/library/nginx:latest
```

## Networking

Create and manage networks:

```bash
podman network create --subnet 10.90.0.0/24 app-net
podman network create --subnet 10.91.0.0/24 db-net
podman network ls
```

Run containers on multiple networks:

```bash
podman run -d --network app-net --network db-net --name middleware myapp:latest
```

## Using Podman with SUSE Manager

If you manage your SLES fleet with SUSE Manager, you can deploy container configurations across multiple hosts. Create a salt state for container deployment:

```yaml
# /srv/salt/containers/webapp.sls
podman_webapp:
  cmd.run:
    - name: podman run -d --name webapp -p 8080:80 docker.io/library/nginx:latest
    - unless: podman ps --format '{{.Names}}' | grep -q webapp
```

## Firewall Configuration

SLES uses firewalld. Open ports for your containers:

```bash
sudo firewall-cmd --add-port=8080/tcp --permanent
sudo firewall-cmd --add-port=5432/tcp --permanent
sudo firewall-cmd --reload
sudo firewall-cmd --list-all
```

## Container Auto-Updates

Enable automatic container updates:

```bash
sudo systemctl enable --now podman-auto-update.timer
podman auto-update --dry-run
```

## Storage and Performance

Configure storage for enterprise workloads:

```bash
podman system info --format '{{.Store.GraphDriverName}}'
```

For high-performance storage, configure the overlay driver explicitly:

```toml
# /etc/containers/storage.conf
[storage]
driver = "overlay"

[storage.options.overlay]
mountopt = "nodev,metacopy=on"
```

## Monitoring and Logging

Monitor container resource usage:

```bash
podman stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"
```

View container logs through journald:

```bash
journalctl -u enterprise-app.service --since "1 hour ago"
journalctl CONTAINER_NAME=enterprise-app -f
```

## Maintenance

Regular maintenance:

```bash
podman system df
podman system prune -a
podman volume prune
podman image prune -a
```

## Conclusion

Podman on SUSE Linux Enterprise Server delivers an enterprise-grade container runtime backed by SUSE's commercial support and security infrastructure. With SUSE Base Container Images, AppArmor integration, and compatibility with SUSE Manager for fleet management, Podman on SLES provides a complete container platform for organizations that need vendor-supported, security-hardened container deployments. The daemonless architecture and rootless support align with enterprise security requirements, making Podman the natural container engine for SUSE environments.
