# How to Use Podman on CentOS Stream 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, CentOS Stream, Container, RHEL, Enterprise Linux

Description: Learn how to install and use Podman on CentOS Stream 9 for running containers in enterprise development and production environments.

---

> CentOS Stream 9 serves as the upstream for RHEL and ships with excellent Podman support. This guide covers installing Podman, running rootless and rootful containers, and setting up production-grade container workloads on CentOS Stream 9.

CentOS Stream 9 is the continuously delivered distribution that tracks just ahead of Red Hat Enterprise Linux. It provides a stable yet current platform that receives updates before they land in RHEL. Podman is the default container engine in the RHEL ecosystem, and CentOS Stream 9 gives you access to the latest Podman features that will eventually appear in RHEL 9.

This guide walks through installing Podman on CentOS Stream 9 and using it for everything from basic container operations to production workloads.

---

## Installing Podman

Podman is available in the default CentOS Stream 9 repositories. Install it along with common companion tools:

```bash
sudo dnf install -y podman podman-compose buildah skopeo
```

Verify the installation:

```bash
podman --version
podman info
```

For the latest Podman version beyond what ships in the base repos, you can enable the container-tools module:

```bash
sudo dnf module list container-tools
sudo dnf module install -y container-tools:latest
```

## Configuring Rootless Containers

Rootless containers are the recommended approach for most workloads. Ensure your user has the proper subordinate UID and GID mappings:

```bash
cat /etc/subuid
cat /etc/subgid
```

If your user is missing entries, add them:

```bash
sudo usermod --add-subuids 100000-165535 --add-subgids 100000-165535 $USER
podman system migrate
```

Verify rootless mode works:

```bash
podman unshare cat /proc/self/uid_map
podman run --rm docker.io/library/alpine:latest id
```

## Running Containers

Pull and run a basic container:

```bash
podman pull docker.io/library/nginx:latest
podman run -d --name webserver -p 8080:80 docker.io/library/nginx:latest
```

Check the running containers:

```bash
podman ps
curl http://localhost:8080
```

Run an interactive container:

```bash
podman run -it --rm docker.io/library/centos:stream9 bash
```

## Working with Container Images

List local images:

```bash
podman images
```

Search for images:

```bash
podman search nginx
podman search --list-tags docker.io/library/nginx
```

Inspect an image before pulling:

```bash
skopeo inspect docker://docker.io/library/nginx:latest
```

Remove unused images:

```bash
podman rmi docker.io/library/nginx:latest
podman image prune -a
```

## Building Custom Images

Create a Containerfile for a CentOS Stream 9-based application:

```dockerfile
FROM quay.io/centos/centos:stream9

RUN dnf install -y python3 python3-pip && \
    dnf clean all

WORKDIR /app
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

COPY app.py .

EXPOSE 8000
CMD ["python3", "app.py"]
```

Build the image:

```bash
podman build -t myapp:latest .
```

You can also use Buildah for more advanced image building:

```bash
container=$(buildah from quay.io/centos/centos:stream9)
buildah run $container dnf install -y httpd
buildah config --cmd "/usr/sbin/httpd -D FOREGROUND" $container
buildah commit $container my-httpd:latest
```

## Volume Management

Create and use named volumes for persistent data:

```bash
podman volume create app-data
podman volume ls
podman volume inspect app-data

podman run -d --name database \
  -v app-data:/var/lib/mysql:Z \
  -e MYSQL_ROOT_PASSWORD=secret \
  docker.io/library/mysql:8
```

Bind mount a host directory:

```bash
podman run -d --name web \
  -v /srv/www:/usr/share/nginx/html:ro,Z \
  -p 8080:80 \
  docker.io/library/nginx:latest
```

The `:Z` suffix tells Podman to relabel the content for SELinux, which is enabled by default on CentOS Stream 9.

## SELinux and Podman

CentOS Stream 9 runs SELinux in enforcing mode by default. Podman handles SELinux contexts automatically in most cases, but you should understand the options:

```bash
# Z = private label (one container only)

podman run -v /data:/data:Z myapp

# z = shared label (multiple containers can access)
podman run -v /data:/data:z myapp

# Check SELinux context
ls -lZ /data
```

If you encounter SELinux denials, check the audit log:

```bash
sudo ausearch -m avc -ts recent
sudo sealert -a /var/log/audit/audit.log
```

## Networking

Create custom networks for container communication:

```bash
podman network create app-network
podman network ls

podman run -d --network app-network --name backend myapp-backend:latest
podman run -d --network app-network --name frontend myapp-frontend:latest
```

Containers on the same network can reach each other by name:

```bash
podman run --rm --network app-network docker.io/library/alpine \
  ping -c 3 backend
```

Configure DNS for containers:

```bash
podman run -d --dns 8.8.8.8 --dns-search example.com myapp:latest
```

## Systemd Integration with Quadlet

Create production services using Quadlet unit files:

```ini
# /etc/containers/systemd/app.container
[Container]
ContainerName=production-app
Image=myapp:latest
PublishPort=8080:8000
Volume=app-data:/app/data:Z
Environment=ENV=production
Environment=DB_HOST=db.example.com
AutoUpdate=local

[Service]
Restart=always
TimeoutStartSec=300

[Install]
WantedBy=multi-user.target default.target
```

Activate the service:

```bash
sudo systemctl daemon-reload
sudo systemctl start app.service
sudo systemctl status app.service
sudo journalctl -u app.service -f
```

## Pods for Multi-Container Applications

Create a pod that runs a complete application stack:

```bash
podman pod create --name app-stack \
  -p 8080:80 \
  -p 5432:5432

podman run -d --pod app-stack --name db \
  -e POSTGRES_PASSWORD=secret \
  -e POSTGRES_DB=myapp \
  -v pgdata:/var/lib/postgresql/data:Z \
  docker.io/library/postgres:16

podman run -d --pod app-stack --name app \
  -e DATABASE_URL=postgresql://postgres:secret@localhost:5432/myapp \
  myapp:latest

podman run -d --pod app-stack --name proxy \
  -v ./nginx.conf:/etc/nginx/nginx.conf:ro,Z \
  docker.io/library/nginx:latest
```

Manage the pod:

```bash
podman pod ps
podman pod stop app-stack
podman pod start app-stack
podman pod rm -f app-stack
```

## Firewall Configuration

CentOS Stream 9 uses firewalld. Open ports for your containers:

```bash
sudo firewall-cmd --add-port=8080/tcp --permanent
sudo firewall-cmd --add-service=http --permanent
sudo firewall-cmd --reload
sudo firewall-cmd --list-all
```

## Container Health Checks

Add health checks to your containers:

```bash
podman run -d --name webapp \
  --health-cmd="curl -f http://localhost:8000/health || exit 1" \
  --health-interval=30s \
  --health-retries=3 \
  --health-timeout=5s \
  -p 8080:8000 \
  myapp:latest
```

Check health status:

```bash
podman healthcheck run webapp
podman inspect --format '{{.State.Health.Status}}' webapp
```

## Auto-Updates

Enable automatic container image updates:

```bash
sudo systemctl enable --now podman-auto-update.timer
podman auto-update --dry-run
```

## Cleanup and Maintenance

Regular maintenance commands:

```bash
# View disk usage
podman system df

# Remove all stopped containers
podman container prune

# Remove all unused images
podman image prune -a

# Full system cleanup
podman system prune -a --volumes
```

## Conclusion

CentOS Stream 9 provides an enterprise-grade foundation for running Podman containers. With SELinux integration, systemd management through Quadlet, and the full suite of container tools including Buildah and Skopeo, CentOS Stream 9 delivers a production-ready container platform. Whether you are developing applications or running production services, Podman on CentOS Stream 9 gives you the same container experience that powers RHEL deployments worldwide.
