# How to Install Portainer Using Docker Run Command

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Container, DevOps, Self-Hosted

Description: A step-by-step guide to installing Portainer Community Edition on Docker using the docker run command.

---

Portainer is a lightweight management UI that lets you manage Docker environments through a web browser. Installing it with `docker run` is the fastest way to get started with a graphical container management interface.

## Prerequisites

- Docker Engine installed and running
- Port 9443 (HTTPS) available on the host, port 8000 if you plan to use Edge agents, and port 9000 only if you need legacy HTTP access

## Create the Portainer Data Volume

Portainer stores its configuration and data in a named volume. Create it before starting the container:

```bash
# Create a named volume to persist Portainer data across container restarts

docker volume create portainer_data
```

## Run Portainer CE

The following command pulls and starts the current Portainer CE LTS image, exposing the web UI on port 9443 and the optional Edge agent tunnel port on 8000:

```bash
# Run Portainer CE with HTTPS on port 9443
# -d          : detached mode (run in background)
# --restart=always : restart the container if it stops or when Docker restarts
# -v /var/run/docker.sock:/var/run/docker.sock : give Portainer access to Docker
# -v portainer_data:/data : persist Portainer configuration
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts
```

## Access the Web UI

After the container starts, open your browser and navigate to:

```text
https://localhost:9443
```

If you are connecting from another machine, replace `localhost` with the Docker host's IP address or FQDN.

On first launch, Portainer prompts you to create an admin account. Set a strong password (minimum 12 characters).

## Verify the Installation

Check that the container is running successfully:

```bash
# Confirm the Portainer container is running
docker ps --filter name=portainer
```

Expected output shows the container in `Up` status:

```text
CONTAINER ID   IMAGE                        STATUS         PORTS
abc123def456   portainer/portainer-ce:lts   Up 2 minutes   0.0.0.0:8000->8000/tcp, 0.0.0.0:9443->9443/tcp
```

## Optional: HTTP Access on Port 9000

If you need plain HTTP access (not recommended for production), add the HTTP port mapping:

```bash
# Include port 9000 for HTTP access alongside HTTPS
docker run -d \
  -p 8000:8000 \
  -p 9000:9000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts
```

## Port Reference

| Port | Protocol | Purpose |
|------|----------|---------|
| 9443 | HTTPS | Web UI (recommended) |
| 9000 | HTTP | Web UI (legacy/insecure) |
| 8000 | TCP | Edge agent tunnel server |

## Next Steps

Once logged in, Portainer automatically detects the local Docker environment. You can immediately start managing containers, images, volumes, and networks from the UI.

---

*Monitor your Docker containers and infrastructure with [OneUptime](https://oneuptime.com) for uptime checks, alerting, and status pages.*
