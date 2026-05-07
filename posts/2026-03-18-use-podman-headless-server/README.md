# How to Use Podman on a Headless Server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Headless Server, Container, Linux, DevOps, Systemd, Production, SSH

Description: Learn to install and manage Podman on headless Linux servers, covering SSH remote management, systemd integration, auto-start containers, and monitoring.

---

> Headless servers are the backbone of production infrastructure. Podman's daemonless, rootless architecture makes it an excellent choice for running containers on servers where you manage everything through SSH and the command line. No Docker daemon, no root privileges, no unnecessary attack surface.

Most production containers run on headless servers, machines with no graphical interface that you access exclusively through SSH. Podman is particularly well-suited for this environment because it does not require a long-running daemon process. Each container is launched without a central daemon and monitored by its own `conmon` process, which simplifies process management, logging, and integration with systemd.

---

## Installing Podman on Common Server Distributions

### Ubuntu Server 22.04 / 24.04

```bash
sudo apt update
sudo apt install -y podman slirp4netns fuse-overlayfs uidmap
```

### RHEL / AlmaLinux / Rocky Linux 9

```bash
sudo dnf install -y podman
```

### Debian 12

```bash
sudo apt update
sudo apt install -y podman slirp4netns fuse-overlayfs uidmap
```

Verify the installation:

```bash
podman --version
podman info
```

---

## Configuring Rootless Podman for a Service Account

On production servers, run containers under a dedicated service account rather than root:

```bash
sudo useradd -r -m -s /bin/bash podman-svc
sudo loginctl enable-linger podman-svc
```

The `enable-linger` command allows the service account's systemd user instance to run without an active login session, which is essential for containers that need to survive SSH disconnections.

Set up subuid and subgid mappings:

```bash
sudo usermod --add-subuids 200000-265535 podman-svc
sudo usermod --add-subgids 200000-265535 podman-svc
```

Switch to the service account:

```bash
sudo -u podman-svc bash
```

Configure registries for the service account:

```bash
mkdir -p ~/.config/containers
cat > ~/.config/containers/registries.conf <<EOF
unqualified-search-registries = ['docker.io', 'quay.io', 'ghcr.io']
EOF
```

---

## Running Containers via SSH

When managing containers on a headless server, you connect via SSH and use Podman directly:

```bash
ssh podman-svc@your-server.example.com

# Pull and run an application

podman pull docker.io/library/nginx:alpine
podman run -d --name webserver -p 8080:80 docker.io/library/nginx:alpine

# Check running containers
podman ps

# View logs
podman logs -f webserver
```

### Running Commands Remotely

You can also run Podman commands directly over SSH without an interactive session:

```bash
ssh podman-svc@your-server.example.com "podman ps --format '{{.Names}} {{.Status}}'"
```

---

## Generating Systemd Units for Auto-Start

**Note:** `podman generate systemd` is deprecated. Quadlet (shown in the next section) is the recommended approach. The command below still works but will not receive new features.

One of Podman's most powerful features for headless servers is the ability to generate systemd unit files from running containers:

```bash
# First, create and configure your container
podman run -d --name myapp \
  -p 8080:8080 \
  -v appdata:/data:Z \
  -e APP_ENV=production \
  docker.io/myorg/myapp:latest

# Generate a systemd unit file
mkdir -p ~/.config/systemd/user
podman generate systemd --new --name myapp \
  --restart-policy=always \
  > ~/.config/systemd/user/container-myapp.service

# Stop and remove the original container before handing control to systemd
podman stop myapp
podman rm myapp

# Enable and start the service
systemctl --user daemon-reload
systemctl --user enable --now container-myapp.service

# Check status
systemctl --user status container-myapp.service
```

The `--new` flag means systemd will create a fresh container each time the service starts, using the same `podman run` arguments. This ensures clean startups, but you should stop and remove the original container before starting the unit to avoid name or port conflicts.

### Using Quadlet (Podman 4.4+)

On newer Podman versions, Quadlet provides a cleaner way to define container services:

```bash
mkdir -p ~/.config/containers/systemd

cat > ~/.config/containers/systemd/myapp.container <<EOF
[Unit]
Description=My Application Container
After=network-online.target

[Container]
Image=docker.io/myorg/myapp:latest
PublishPort=8080:8080
Volume=appdata:/data:Z
Environment=APP_ENV=production
AutoUpdate=registry

[Service]
Restart=always
TimeoutStartSec=300

[Install]
WantedBy=default.target
EOF

systemctl --user daemon-reload
systemctl --user start myapp
systemctl --user enable myapp
```

---

## Setting Up a Multi-Container Application

For applications with multiple services, create individual Quadlet files:

```bash
# Database
cat > ~/.config/containers/systemd/postgres.container <<EOF
[Unit]
Description=PostgreSQL Database

[Container]
Image=docker.io/library/postgres:16-alpine
ContainerName=postgres
Volume=pgdata:/var/lib/postgresql/data:Z
Environment=POSTGRES_USER=app
Environment=POSTGRES_PASSWORD=secret
Environment=POSTGRES_DB=production
Network=appnet.network

[Service]
Restart=always

[Install]
WantedBy=default.target
EOF

# Network
cat > ~/.config/containers/systemd/appnet.network <<EOF
[Network]
Subnet=10.89.1.0/24
Gateway=10.89.1.1
EOF

# Application
cat > ~/.config/containers/systemd/webapp.container <<EOF
[Unit]
Description=Web Application
After=postgres.service

[Container]
Image=docker.io/myorg/webapp:latest
PublishPort=8080:8080
Environment=DATABASE_URL=postgresql://app:secret@postgres:5432/production
Network=appnet.network

[Service]
Restart=always

[Install]
WantedBy=default.target
EOF

systemctl --user daemon-reload
systemctl --user start postgres webapp
```

---

## Monitoring Containers on a Headless Server

Resource Usage

Check real-time resource usage:

```bash
podman stats
```

For a one-time snapshot:

```bash
podman stats --no-stream --format \
  "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"
```

### Health Checks

Define health checks when running containers:

```bash
podman run -d --name api \
  --health-cmd "curl -f http://localhost:8080/health || exit 1" \
  --health-interval 30s \
  --health-retries 3 \
  --health-timeout 5s \
  docker.io/myorg/api:latest
```

Check health status:

```bash
podman healthcheck run api
podman inspect api --format '{{.State.Health.Status}}'
```

### Centralized Logging with Journald

Podman integrates with journald by default. Query container logs using journalctl:

```bash
# All logs for a specific container
journalctl --user -u container-myapp.service

# Follow logs in real time
journalctl --user -u container-myapp.service -f

# Logs from the last hour
journalctl --user -u container-myapp.service --since "1 hour ago"
```

---

## Automatic Image Updates

Set up automatic image updates for your containers:

```bash
# Enable the podman-auto-update timer
systemctl --user enable --now podman-auto-update.timer

# Check when the next update will run
systemctl --user list-timers podman-auto-update.timer
```

This works with containers that have the `AutoUpdate=registry` label or Quadlet setting. Podman checks the registry for new image versions and restarts containers when updates are available.

---

## Firewall Configuration

On a headless server, configure the firewall to allow traffic to your container ports:

```bash
# firewalld (RHEL/Fedora)
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --reload

# ufw (Ubuntu/Debian)
sudo ufw allow 8080/tcp
sudo ufw reload
```

---

## Backup and Recovery

Create a backup script for your container volumes:

```bash
#!/bin/bash
# ~/backup-containers.sh
BACKUP_DIR="/backup/podman/$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"

# Export running container list
podman ps --format '{{.Names}}' > "$BACKUP_DIR/running-containers.txt"

# Backup named volumes
for vol in $(podman volume ls -q); do
  podman volume export "$vol" > "$BACKUP_DIR/${vol}.tar"
  echo "Backed up volume: $vol"
done

# Backup container configurations
podman ps -a --format json > "$BACKUP_DIR/containers.json"

echo "Backup complete: $BACKUP_DIR"
```

Add it to cron for regular backups:

```bash
crontab -e
# Add: 0 2 * * * /home/podman-svc/backup-containers.sh
```

---

## Conclusion

Podman on a headless server provides a production-ready container runtime without the overhead of a daemon process. By using a dedicated service account with rootless containers, systemd integration through Quadlet, and journald for logging, you get a secure and manageable container infrastructure. The combination of auto-updates, health checks, and backup scripts gives you a complete operations workflow. Since Podman containers are regular processes managed by systemd, they integrate naturally with the Linux server administration tools you already use.
