# How to Use Podman with systemd for Production Container Workloads on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Podman, Containers, systemd

Description: Step-by-step guide on use podman with systemd for production container workloads on rhel 9 with practical examples and commands.

---

Podman integrates with systemd to manage production container workloads on RHEL 9 with automatic restarts, dependency management, and logging.

## Prerequisites

- RHEL 9 with Podman installed
- Basic understanding of systemd units
- Container images for your workloads

## Generate systemd Units from Running Containers

Start a container and generate a systemd unit:

```bash
podman run -d --name webapp \
  -p 8080:80 \
  registry.access.redhat.com/ubi9/httpd-24

podman generate systemd --new --name webapp \
  --restart-policy=always \
  --restart-sec=10 \
  -f
```

This creates `container-webapp.service` in the current directory.

## Install the systemd Unit

For root containers:

```bash
sudo cp container-webapp.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now container-webapp
```

For rootless containers:

```bash
mkdir -p ~/.config/systemd/user/
cp container-webapp.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now container-webapp
```

## Enable Lingering for Rootless Containers

Rootless containers need lingering to run without an active user session:

```bash
sudo loginctl enable-linger $(whoami)
```

## Create a Pod with Multiple Containers

```bash
podman pod create --name app-pod -p 8080:80 -p 5432:5432

podman run -d --pod app-pod --name app-web \
  registry.access.redhat.com/ubi9/httpd-24

podman run -d --pod app-pod --name app-db \
  -e POSTGRESQL_USER=app \
  -e POSTGRESQL_PASSWORD=secret \
  -e POSTGRESQL_DATABASE=appdb \
  registry.redhat.io/rhel9/postgresql-15

podman generate systemd --new --name app-pod -f
```

## Use Quadlet for Declarative Container Management

RHEL 9 supports Quadlet, which is a native way to define containers as systemd units:

```ini
# /etc/containers/systemd/webapp.container
[Container]
Image=registry.access.redhat.com/ubi9/httpd-24
PublishPort=8080:80
Volume=webapp-data.volume:/var/www/html:Z

[Service]
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```ini
# /etc/containers/systemd/webapp-data.volume
[Volume]
Label=app=webapp
```

Reload and start:

```bash
sudo systemctl daemon-reload
sudo systemctl start webapp
```

## Monitor Container Services

```bash
sudo systemctl status container-webapp
sudo journalctl -u container-webapp -f
podman ps
podman stats
```

## Health Checks

Add health checks to your container unit:

```bash
podman run -d --name webapp \
  --health-cmd="curl -f http://localhost:80/ || exit 1" \
  --health-interval=30s \
  --health-retries=3 \
  --health-timeout=10s \
  -p 8080:80 \
  registry.access.redhat.com/ubi9/httpd-24
```

## Conclusion

Podman with systemd provides a daemonless, production-ready container runtime on RHEL 9. Use Quadlet for declarative configuration and systemd integration for reliable container lifecycle management.

