# How to Set Up and Manage Containers for the RHCSA Exam on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Containers, Certification

Description: Step-by-step guide on set up and manage containers for the rhcsa exam on rhel with practical examples and commands.

---

Container management is part of the RHCSA exam objectives. This guide covers Podman container operations you need to master on RHEL 9.

## Install Container Tools

```bash
sudo dnf install -y container-tools
podman --version
```

## Search and Pull Images

```bash
# Search for images
podman search httpd

# Pull an image
podman pull registry.access.redhat.com/ubi9/httpd-24

# List local images
podman images
```

## Run Containers

```bash
# Run a basic container
podman run -d --name web1 -p 8080:8080 \
  registry.access.redhat.com/ubi9/httpd-24

# Run with environment variables
podman run -d --name db1 \
  -e POSTGRESQL_USER=exam \
  -e POSTGRESQL_PASSWORD=pass123 \
  -e POSTGRESQL_DATABASE=examdb \
  -p 5432:5432 \
  registry.redhat.io/rhel9/postgresql-15
```

## Manage Containers

```bash
# List running containers
podman ps

# List all containers
podman ps -a

# Stop a container
podman stop web1

# Start a container
podman start web1

# Remove a container
podman rm -f web1

# View logs
podman logs web1
```

## Persistent Storage with Volumes

```bash
# Create a volume
podman volume create web-data

# Run container with volume
podman run -d --name web2 \
  -p 8080:8080 \
  -v web-data:/var/www/html:Z \
  registry.access.redhat.com/ubi9/httpd-24

# Inspect volume
podman volume inspect web-data
```

## Run Containers as systemd Services

```bash
# Create the systemd unit file
podman generate systemd --new --name web2 > ~/.config/systemd/user/container-web2.service

# Enable lingering
loginctl enable-linger $(whoami)

# Enable and start the service
systemctl --user daemon-reload
systemctl --user enable --now container-web2
systemctl --user status container-web2
```

## Configure Container Registries

```bash
# View configured registries
cat /etc/containers/registries.conf

# Login to a registry
podman login registry.redhat.io
```

## Build Custom Images

```bash
# Create a Containerfile
cat > Containerfile <<EOF
FROM registry.access.redhat.com/ubi9/ubi
RUN dnf install -y httpd && dnf clean all
COPY index.html /var/www/html/
EXPOSE 80
CMD ["/usr/sbin/httpd", "-D", "FOREGROUND"]
EOF

# Build the image
podman build -t mywebapp:latest .

# Run the custom image
podman run -d --name myweb -p 8080:80 mywebapp:latest
```

## Practice Exercises

1. Pull a UBI 9 image and run a container with port mapping
2. Create a persistent volume and mount it in a container
3. Configure a rootless container to start automatically as a systemd service
4. Build a custom container image from a Containerfile

## Conclusion

Container management with Podman is an important RHCSA exam objective. Practice running, managing, and persisting containers until you can perform these tasks quickly and confidently.

