# How to Use Podman on Oracle Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Oracle Linux, Container, Enterprise, OCI

Description: Learn how to install and use Podman on Oracle Linux for running containers on Oracle Cloud Infrastructure and on-premises Oracle environments.

---

> Oracle Linux provides Podman as a fully supported container engine. This guide covers installing Podman on Oracle Linux, working with Oracle Container Registry images, and deploying containers on Oracle Cloud Infrastructure.

Oracle Linux is a free, open-source operating system optimized for Oracle workloads and Oracle Cloud Infrastructure (OCI). Based on Red Hat Enterprise Linux sources, Oracle Linux supports Podman as the recommended container runtime. Whether you are running Oracle Database in containers, deploying applications on OCI compute instances, or managing on-premises infrastructure, Podman on Oracle Linux gives you a secure and efficient container platform.

This guide covers installing Podman, configuring it for Oracle environments, and running production container workloads.

---

## Installing Podman on Oracle Linux

On Oracle Linux 9, Podman is available in the default repositories:

```bash
sudo dnf install -y container-tools
```

On Oracle Linux 8, enable the container-tools module:

```bash
sudo dnf module install -y container-tools:ol8
```

Verify the installation:

```bash
podman --version
podman info
```

Check the running kernel reported by the host and Podman:

```bash
uname -r
podman info --format '{{.Host.Kernel}}'
```

## Configuring the Oracle Container Registry

Oracle Linux already configures Podman to search Oracle Container Registry and Docker Hub by default. Verify the current setting:

```bash
grep '^unqualified-search-registries' /etc/containers/registries.conf
```

Log in to the Oracle Container Registry:

For licensed images, use your Oracle account username and an Oracle Container Registry authentication token as the password, and accept the repository terms in the web UI first if required.

```bash
podman login container-registry.oracle.com
```

Pull Oracle-provided images:

```bash
podman pull container-registry.oracle.com/os/oraclelinux:9
podman pull container-registry.oracle.com/database/express:latest
```

## Setting Up Rootless Containers

Configure rootless Podman on Oracle Linux:

```bash
cat /etc/subuid
cat /etc/subgid
```

Add subordinate ID mappings if needed:

```bash
sudo usermod --add-subuids 100000-165535 --add-subgids 100000-165535 $USER
podman system migrate
```

Enable user lingering:

```bash
sudo loginctl enable-linger $USER
```

Test rootless containers:

```bash
podman run --rm container-registry.oracle.com/os/oraclelinux:9 cat /etc/oracle-release
```

## Running Containers

Run a basic Oracle Linux container:

```bash
podman run -it --rm container-registry.oracle.com/os/oraclelinux:9 bash
```

Deploy a web server:

```bash
podman run -d --name webserver \
  -p 8080:80 \
  docker.io/library/nginx:latest

podman ps
curl http://localhost:8080
```

Run Oracle Database Express Edition in a container:

```bash
podman run -d --name oracle-xe \
  -p 1521:1521 \
  -p 5500:5500 \
  -e ORACLE_PWD=YourPassword123 \
  -v oracle-data:/opt/oracle/oradata \
  container-registry.oracle.com/database/express:latest
```

Monitor the database startup:

```bash
podman logs -f oracle-xe
```

## Building Oracle Linux-Based Images

Create a Containerfile using Oracle Linux as the base:

```dockerfile
FROM container-registry.oracle.com/os/oraclelinux:9-slim

RUN microdnf install -y python3 python3-pip curl && \
    microdnf clean all

WORKDIR /app

COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

COPY . .

RUN useradd -r appuser
USER appuser

EXPOSE 8000
CMD ["python3", "app.py"]
```

Build and run:

```bash
podman build -t myapp:latest .
podman run -d -p 8000:8000 myapp:latest
```

For Java applications on Oracle Linux:

```dockerfile
FROM container-registry.oracle.com/graalvm/jdk:21

WORKDIR /app
COPY target/myapp.jar .

EXPOSE 8080
CMD ["java", "-jar", "myapp.jar"]
```

## Working with Oracle Cloud Infrastructure

When running on OCI compute instances, Podman works with OCI-specific networking and storage. Pull images from Oracle Cloud Infrastructure Registry (OCIR):

```bash
podman login <region-key>.ocir.io
podman pull <region-key>.ocir.io/<tenancy-namespace>/myapp:latest
```

When prompted, use `<tenancy-namespace>/<username>` and an OCI auth token. For federated users, use `<tenancy-namespace>/<domain-name>/<username>`.

Push images to OCIR:

```bash
podman tag myapp:latest <region-key>.ocir.io/<tenancy-namespace>/myapp:latest
podman push <region-key>.ocir.io/<tenancy-namespace>/myapp:latest
```

## SELinux Integration

Oracle Linux runs SELinux in enforcing mode by default. Podman handles SELinux labeling with volume mounts:

```bash
# Private label for single container access

podman run -v /data:/data:Z myapp:latest

# Shared label for multi-container access
podman run -v /data:/data:z myapp:latest
```

Check SELinux contexts:

```bash
ls -lZ /data
sudo ausearch -m avc -ts recent
```

## Networking

Create custom networks:

```bash
podman network create app-network --subnet 10.89.0.0/24
podman network ls
```

Deploy containers on the network:

```bash
podman run -d --network app-network --name api myapp-api:latest
podman run -d --network app-network --name db \
  -e POSTGRES_PASSWORD=secret \
  docker.io/library/postgres:16
```

For OCI instances, configure firewall rules:

```bash
sudo firewall-cmd --add-port=8080/tcp --permanent
sudo firewall-cmd --reload
```

## Systemd Integration with Quadlet

Create production services:

```ini
# /etc/containers/systemd/oracle-app.container
[Container]
ContainerName=oracle-app
Image=<region-key>.ocir.io/<tenancy-namespace>/myapp:latest
PublishPort=8080:8000
Volume=app-data:/app/data:Z
Environment=ENV=production
Environment=DB_HOST=oracle-db.subnet.vcn.oraclevcn.com
AutoUpdate=registry

[Service]
Restart=always
TimeoutStartSec=300

[Install]
WantedBy=multi-user.target default.target
```

Enable the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now oracle-app.service
```

## Pods for Multi-Container Applications

Deploy a complete application stack:

```bash
podman pod create --name app-stack -p 8080:80 -p 1521:1521

podman run -d --pod app-stack --name oracle-db \
  -e ORACLE_PWD=secret \
  -v oracledata:/opt/oracle/oradata \
  container-registry.oracle.com/database/express:latest

podman run -d --pod app-stack --name app \
  -e DB_HOST=localhost \
  -e DB_PORT=1521 \
  myapp:latest

podman run -d --pod app-stack --name proxy \
  -v ./nginx.conf:/etc/nginx/nginx.conf:ro,Z \
  docker.io/library/nginx:latest
```

Resource Management

Set resource limits appropriate for your OCI instance shape:

```bash
podman run -d --name limited-app \
  --memory=2g \
  --cpus=2.0 \
  --memory-swap=4g \
  myapp:latest
```

Monitor resource consumption:

```bash
podman stats --no-stream
podman stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"
```

## Health Checks

Add health checks for production containers:

```bash
podman run -d --name webapp \
  --health-cmd="curl -f http://localhost:8000/health || exit 1" \
  --health-interval=30s \
  --health-retries=3 \
  --health-timeout=10s \
  -p 8080:8000 \
  myapp:latest
```

Check health status:

```bash
podman healthcheck run webapp
podman inspect --format '{{.State.Health.Status}}' webapp
```

## Container Auto-Updates

Enable automatic updates:

```bash
sudo systemctl enable --now podman-auto-update.timer
podman auto-update --dry-run
```

## Using Podman with Oracle Instant Client

Run applications that need Oracle database connectivity:

```dockerfile
FROM container-registry.oracle.com/os/oraclelinux:9-slim

RUN microdnf install -y oracle-release-el9 python3 && \
    microdnf install -y oracle-instantclient19.27-basic oracle-instantclient19.27-sqlplus && \
    microdnf clean all

ENV LD_LIBRARY_PATH=/usr/lib/oracle/19.27/client64/lib
ENV PATH=$PATH:/usr/lib/oracle/19.27/client64/bin

WORKDIR /app
COPY . .

CMD ["python3", "app.py"]
```

## Maintenance

Regular cleanup:

```bash
podman system df
podman system prune -a
podman volume prune
podman image prune -a
```

## Conclusion

Podman on Oracle Linux provides a fully supported container runtime optimized for Oracle workloads and Oracle Cloud Infrastructure. With access to the Oracle Container Registry, Oracle Linux base images, and native OCI integration, you can build and deploy enterprise containers that take full advantage of the Oracle ecosystem. The combination of SELinux security, systemd integration through Quadlet, and rootless container support makes Podman on Oracle Linux a robust platform for both development and production deployments.
