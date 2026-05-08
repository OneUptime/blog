# How to Place Quadlet Files for System Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Quadlet, Systemd, System Service, Root

Description: Learn where to place Quadlet unit files for system-wide (rootful) Podman services that run at boot with root privileges.

---

> System-level Quadlet files run rootful containers as system services, starting at boot before any user logs in.

System services (rootful) run as root and start during the boot process. They are suitable for infrastructure services like reverse proxies, databases, and monitoring agents that must be available system-wide and not tied to any user session.

---

## System Quadlet Directories

Quadlet looks for system-level unit files in these directories:

```bash
# Primary location for administrator-created files

/etc/containers/systemd/

# Distribution-provided defaults (do not edit)
/usr/share/containers/systemd/
```

## Creating a System Service

```bash
# Create the directory if it doesn't exist
sudo mkdir -p /etc/containers/systemd/
```

```ini
# /etc/containers/systemd/nginx-proxy.container
[Container]
Image=docker.io/library/nginx:alpine
PublishPort=80:80
PublishPort=443:443
Volume=/etc/nginx/conf.d:/etc/nginx/conf.d:ro,Z
Volume=/etc/ssl/certs:/etc/ssl/certs:ro

[Service]
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
# Reload systemd (system-wide, requires sudo)
sudo systemctl daemon-reload

# Start the system service
sudo systemctl start nginx-proxy

# Check status
sudo systemctl status nginx-proxy
```

## System Database Service

```ini
# /etc/containers/systemd/pgdata.volume
[Volume]
Label=service=postgres

# /etc/containers/systemd/postgres.container
[Container]
Image=docker.io/library/postgres:16-alpine
Environment=POSTGRES_PASSWORD=secret
Volume=pgdata.volume:/var/lib/postgresql/data
PublishPort=5432:5432

[Service]
Restart=always
TimeoutStartSec=90

[Install]
WantedBy=multi-user.target
```

## System Monitoring Agent

```ini
# /etc/containers/systemd/node-exporter.container
[Container]
Image=docker.io/prom/node-exporter:latest
# Mount host filesystem for metrics collection
Volume=/:/host:ro,rslave
Network=host
PodmanArgs=--pid=host
Exec=--path.rootfs=/host

[Service]
Restart=always

[Install]
WantedBy=multi-user.target
```

## WantedBy Targets

```ini
# System services should use multi-user.target (not default.target)
[Install]
WantedBy=multi-user.target

# multi-user.target starts after basic system initialization
# Quadlet adds network-online.target dependencies for root units by default
```

## Managing System Services

```bash
# Start the service
sudo systemctl start nginx-proxy

# Stop the service
sudo systemctl stop nginx-proxy

# View logs
sudo journalctl -u nginx-proxy -f

# Restart
sudo systemctl restart nginx-proxy
```

## Verifying Quadlet Generation

```bash
# Preview generated unit files
sudo /usr/lib/systemd/system-generators/podman-system-generator --dryrun

# Check for errors
sudo systemctl status nginx-proxy
sudo journalctl -u nginx-proxy --no-pager
```

## File Permissions

```bash
# Quadlet files should be owned by root
ls -la /etc/containers/systemd/
# -rw-r--r-- 1 root root ... nginx-proxy.container

# Set correct permissions
sudo chmod 644 /etc/containers/systemd/nginx-proxy.container
```

## Summary

Place system-level Quadlet files in `/etc/containers/systemd/` for rootful containers that start at boot. Use `multi-user.target` in the `[Install]` section, manage with `sudo systemctl`, and view logs with `sudo journalctl`. System services run as root-owned services and can be given broad access to host resources through mounts and Podman options.
