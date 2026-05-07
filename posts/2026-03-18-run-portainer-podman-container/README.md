# How to Run Portainer in a Podman Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Podman, Container, Container Management, Linux, DevOps, Web UI

Description: Deploy Portainer inside a Podman container to get a web-based GUI for managing your containers, images, volumes, and networks without memorizing CLI commands.

---

> Portainer provides a clean web interface for managing containers. Running it in Podman gives you visual control over your entire container environment without installing anything on the host beyond Podman itself.

Portainer is a lightweight management UI that lets you interact with your container runtime through a web browser. Instead of typing CLI commands, you can start, stop, inspect, and manage containers, images, volumes, and networks from a graphical dashboard. While Portainer was originally built for Docker, it works with Podman by connecting through the Podman socket, which provides a Docker-compatible API. This guide covers setting up Portainer with Podman, enabling the Podman socket, and configuring the web interface.

---

## Prerequisites

- A Linux host with Podman installed. Portainer's current Podman support targets Podman 5.x on Linux.
- Root access (for the system-level Podman socket) or a rootless Podman setup.
- A web browser for accessing the Portainer dashboard.

---

## Step 1: Enable the Podman Socket

Portainer communicates with the container runtime through a socket. Podman provides a Docker-compatible API socket that Portainer can use.

### System-Level Socket (Root)

```bash
# Enable and start the Podman socket service at the system level

sudo systemctl enable podman.socket
sudo systemctl start podman.socket

# Verify the socket is active
sudo systemctl status podman.socket

# Check that the socket file exists
ls -la /run/podman/podman.sock
```

### User-Level Socket (Rootless)

```bash
# Enable and start the Podman socket for your user
systemctl --user enable podman.socket
systemctl --user start podman.socket

# Verify it is active
systemctl --user status podman.socket

# Check the socket path (varies by system)
ls -la /run/user/$(id -u)/podman/podman.sock
```

---

## Step 2: Create a Data Volume for Portainer

Portainer stores its database and configuration in a persistent volume:

```bash
# Create a named volume for Portainer data
podman volume create portainer_data

# Verify the volume
podman volume inspect portainer_data
```

---

## Step 3: Run Portainer with the System Socket

For a system-level (root) Podman setup:

```bash
# Run Portainer CE (Community Edition) with access to the Podman socket
sudo podman run -d \
  --name portainer \
  -p 8000:8000 \
  -p 9443:9443 \
  --restart=always \
  --privileged \
  --security-opt label=disable \
  -v /run/podman/podman.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  docker.io/portainer/portainer-ce:lts
```

Key flags explained:

| Flag | Purpose |
|------|---------|
| `-p 9443:9443` | HTTPS web interface (primary access point) |
| `-p 8000:8000` | Edge agent communication port |
| `-v /run/podman/podman.sock:/var/run/docker.sock` | Maps the Podman socket to where Portainer expects the Docker socket |
| `--privileged` and `--security-opt label=disable` | Allows Portainer to access the Podman API socket from inside the container |
| `-v portainer_data:/data` | Persists Portainer's database and settings |

The critical mapping is the socket: Portainer looks for `/var/run/docker.sock`, so we mount the Podman socket at that path. Since Podman's API is Docker-compatible, Portainer works seamlessly.

---

## Step 4: Run Portainer with the User Socket (Rootless)

For a rootless Podman setup, note that Portainer with rootless Podman may work but is not currently officially supported by Portainer:

```bash
# Run Portainer with the user-level Podman socket
podman run -d \
  --name portainer \
  -p 8000:8000 \
  -p 9443:9443 \
  --restart=always \
  --privileged \
  --security-opt label=disable \
  -v /run/user/$(id -u)/podman/podman.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  docker.io/portainer/portainer-ce:lts
```

Note that in a rootless setup, Portainer will only see and manage containers running under your user account.

---

## Step 5: Access the Web Interface

Open your browser and navigate to:

```text
https://<your-host-ip>:9443
```

Your browser will show a certificate warning because Portainer uses a self-signed certificate by default. Accept the warning to proceed.

On first access:

1. Create an administrator account (username and strong password).
2. Portainer will detect the local Docker-compatible environment automatically.
3. Click "Get Started" to connect to your local Podman instance.

---

## Step 6: Explore the Dashboard

Once connected, the Portainer dashboard gives you access to:

### Containers

View all running and stopped containers. For each container you can:

- Start, stop, restart, or remove it.
- View logs in real time.
- Open a console session inside the container.
- Inspect environment variables, mounts, and network settings.

### Images

Browse pulled images, check their sizes, and remove unused ones. You can also pull new images from registries directly through the UI.

### Volumes

List, create, and remove named volumes. Inspect which containers are using each volume.

### Networks

View Podman networks, create new ones, and see which containers are attached to each network.

---

## Step 7: Deploy Containers from the UI

Portainer lets you launch new containers without touching the command line:

1. Navigate to Containers > Add Container.
2. Fill in the container name and image (for example, `docker.io/library/nginx:latest`).
3. Configure port mappings under "Network ports configuration."
4. Add volume mounts under "Volumes."
5. Set environment variables under "Env."
6. Click "Deploy the container."

This is equivalent to running a `podman run` command but with a visual form that helps prevent typos and forgotten flags.

---

## Step 8: Use Stacks for Multi-Container Deployments

Portainer supports Docker Compose-style stack files (which work with Podman through `podman-compose` or the compatibility API):

```yaml
# Example stack file for a web application
version: "3"
services:
  web:
    image: docker.io/library/nginx:alpine
    ports:
      - "8080:80"
    volumes:
      - web-data:/usr/share/nginx/html

  db:
    image: docker.io/library/postgres:15
    environment:
      POSTGRES_PASSWORD: example
      POSTGRES_DB: myapp
    volumes:
      - db-data:/var/lib/postgresql/data

volumes:
  web-data:
  db-data:
```

In Portainer, go to Stacks > Add Stack, paste the YAML content, and click "Deploy the stack."

---

## Managing the Portainer Container

```bash
# View Portainer logs
podman logs --tail 50 portainer

# Restart Portainer
podman restart portainer

# Update Portainer to the latest version
podman pull docker.io/portainer/portainer-ce:lts
podman stop portainer
podman rm portainer
# Re-run the podman run command from Step 3 or Step 4
# Your data is preserved in the portainer_data volume
```

---

## Running as a Systemd Service

> **Note:** `podman generate systemd` is deprecated in Podman 4.4 and later. The recommended approach is to use Quadlet files. The legacy method is shown first, followed by the Quadlet approach.

### Legacy Method (podman generate systemd)

```bash
# Generate the systemd unit file (deprecated)
sudo podman generate systemd --name portainer --new --files

# Install and enable
sudo mv container-portainer.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable container-portainer.service
sudo systemctl start container-portainer.service
```

### Recommended Method (Quadlet)

Create a file at `/etc/containers/systemd/portainer.container`:

```ini
[Unit]
Description=Portainer CE Container

[Container]
ContainerName=portainer
Image=docker.io/portainer/portainer-ce:lts
PublishPort=8000:8000
PublishPort=9443:9443
PodmanArgs=--privileged
SecurityLabelDisable=true
Volume=/run/podman/podman.sock:/var/run/docker.sock
Volume=portainer_data:/data

[Service]
Restart=always

[Install]
WantedBy=default.target
```

Then reload and start:

```bash
sudo systemctl daemon-reload
sudo systemctl start portainer.service
```

---

## Security Considerations

- Use a strong administrator password when creating the first user.
- Use a reverse proxy (such as Nginx or Caddy) with a valid TLS certificate in front of Portainer for production use.
- Restrict access to port 9443 using firewall rules to trusted IPs only.
- The Podman socket grants full control over your containers. Anyone with access to Portainer can manage all containers visible to that socket.
- Consider Portainer Business Edition's role-based access control (RBAC) if multiple users need granular access.

---

## Conclusion

Portainer running inside a Podman container gives you a powerful web-based management interface for your entire container environment. By mounting the Podman socket, Portainer sees all your containers, images, volumes, and networks through a clean dashboard. It lowers the barrier to container management for team members who prefer a GUI, while still allowing power users to work from the CLI. The Portainer data volume ensures your settings and user accounts survive container updates.
