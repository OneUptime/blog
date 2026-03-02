# How to Install Portainer for Container Management on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Docker, Portainer, Container Management, DevOps

Description: Install Portainer Community Edition on Ubuntu to manage Docker containers, stacks, volumes, and networks through a web interface, with tips for managing multiple environments and deploying stacks.

---

Portainer is a web-based management interface for Docker and Docker Swarm. It gives you a dashboard to view running containers, manage images, deploy stacks from Docker Compose files, inspect logs, exec into containers, and manage volumes and networks - all from a browser. For teams that run Docker on servers but find `docker` CLI commands awkward for day-to-day management, Portainer reduces the friction significantly.

## Portainer Community Edition vs Business Edition

The free Community Edition (CE) covers single-server Docker management and a limited number of environments in Portainer's multi-environment mode. The Business Edition adds features like RBAC, automatic updates, and expanded environment support. For most self-hosters and small teams, CE is sufficient.

## Installing Portainer CE

Portainer itself runs as a Docker container and manages Docker via the Docker socket.

```bash
# Ensure Docker is installed and running
sudo apt update
sudo apt install -y docker.io

sudo systemctl enable --now docker
sudo usermod -aG docker $USER

# Create a Docker volume for Portainer's data
# (stores configuration, user data, and environment info)
docker volume create portainer_data

# Run Portainer CE
docker run -d \
  --name portainer \
  --restart=always \
  -p 8000:8000 \       # Used for Portainer Edge agent tunneling
  -p 9443:9443 \       # HTTPS web interface
  -v /var/run/docker.sock:/var/run/docker.sock \  # Docker socket access
  -v portainer_data:/data \                        # Persistent data
  portainer/portainer-ce:latest
```

Alternatively, use Docker Compose for a more maintainable setup:

```bash
# Create directory for Portainer
mkdir -p /opt/portainer
cd /opt/portainer

cat > docker-compose.yml << 'EOF'
version: "3.8"

services:
  portainer:
    image: portainer/portainer-ce:latest
    container_name: portainer
    restart: always
    ports:
      # Portainer HTTPS web interface
      - "9443:9443"
      # Edge agent tunnel port (can remove if not using Edge agents)
      - "8000:8000"
    volumes:
      # Docker socket - grants Portainer full Docker access
      - /var/run/docker.sock:/var/run/docker.sock
      # Persistent data directory
      - portainer_data:/data

volumes:
  portainer_data:
EOF

docker compose up -d
docker compose logs -f portainer
```

Portainer generates a self-signed certificate for HTTPS by default. The web interface is at `https://your-server-ip:9443`.

## Initial Setup

1. Visit `https://your-server-ip:9443`
2. Create the admin account (username and strong password)
3. Choose "Get Started" to manage the local Docker environment
4. The dashboard shows running containers, images, volumes, and networks

## Setting Up Nginx Reverse Proxy (Optional)

For access via a domain name with a proper SSL certificate:

```bash
sudo apt install -y nginx certbot python3-certbot-nginx

sudo nano /etc/nginx/sites-available/portainer
```

```nginx
# Nginx reverse proxy for Portainer
server {
    listen 80;
    server_name portainer.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name portainer.example.com;

    ssl_certificate     /etc/letsencrypt/live/portainer.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/portainer.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    location / {
        proxy_pass https://127.0.0.1:9443;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support for Portainer's terminal features
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Needed when proxying HTTPS to HTTPS
        proxy_ssl_verify off;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/portainer /etc/nginx/sites-enabled/
sudo certbot --nginx -d portainer.example.com
sudo nginx -t && sudo systemctl reload nginx
```

## Using Portainer

### Managing Containers

From the **Containers** section you can:
- Start, stop, restart, and kill containers
- View resource usage (CPU, memory, network)
- Access container logs with real-time streaming
- Open a terminal session inside a running container
- Inspect container configuration and environment variables

The "Console" button provides an in-browser terminal equivalent to `docker exec -it container bash`.

### Deploying Stacks

Stacks are equivalent to Docker Compose deployments. Portainer can deploy stacks from:
- A Compose file pasted directly in the UI
- A Git repository URL
- An uploaded Compose file

To deploy a new stack:
1. Click **Stacks** > **Add Stack**
2. Name your stack (e.g., `nextcloud`)
3. Choose the build method (Web editor, Git repository, Upload, or Template)
4. Paste your `docker-compose.yml` content
5. Add environment variables in the **Environment variables** section
6. Click **Deploy the stack**

Example stack deployment via the web editor:

```yaml
# Paste this in the Portainer web editor to deploy Nginx
version: "3.8"
services:
  web:
    image: nginx:alpine
    ports:
      - "8080:80"
    volumes:
      - nginx_data:/usr/share/nginx/html
    restart: unless-stopped

volumes:
  nginx_data:
```

### Deploying from Git Repository

For stacks defined in your Git repository:
1. Add Stack > Repository
2. Repository URL: `https://github.com/yourorg/infrastructure`
3. Branch: `main`
4. Compose file path: `services/nextcloud/docker-compose.yml`
5. Optional: Enable auto-update (Portainer polls for changes and redeploys)

This turns Portainer into a lightweight GitOps deployment tool.

### Managing Images

From **Images** you can:
- Pull new images from Docker Hub or private registries
- Build images from Dockerfiles (limited support)
- Remove unused images to free disk space
- Tag images before pushing to a registry

```bash
# You can also do bulk cleanup from the host:
# Portainer's "Cleanup" button in Images section does the same as:
docker image prune -af
```

### Managing Volumes

Portainer's **Volumes** section shows all Docker volumes, their usage (which containers mount them), and their disk size. You can:
- Create new volumes
- Browse volume contents (with the volume browser button)
- Remove unused volumes

The volume browser lets you view and edit files inside a volume from the web UI - useful for checking configuration files or logs without exec'ing into a container.

### Viewing Logs

From any container's detail page, click **Logs** to see the container's stdout/stderr:
- Live streaming with auto-scroll
- Filter by keyword
- Download log file

For persistent log viewing across restarts, combine with a log driver like Loki or Fluentd.

## Setting Up Additional Environments

Portainer can manage multiple Docker hosts or Docker Swarm clusters from one interface.

### Adding a Remote Docker Host

On the remote Docker host, expose the Docker daemon socket over TLS:

```bash
# On the remote Ubuntu server:
# Configure Docker daemon to listen on TCP with TLS
sudo nano /etc/docker/daemon.json
```

```json
{
  "tls": true,
  "tlscert": "/etc/docker/certs/server-cert.pem",
  "tlskey": "/etc/docker/certs/server-key.pem",
  "tlscacert": "/etc/docker/certs/ca.pem",
  "hosts": ["unix:///var/run/docker.sock", "tcp://0.0.0.0:2376"]
}
```

Alternatively, use the Portainer Agent approach (simpler and more secure):

```bash
# On the remote host, deploy the Portainer Agent
docker run -d \
  -p 9001:9001 \
  --name portainer_agent \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  portainer/agent:latest
```

Then in Portainer:
1. Environments > Add Environment
2. Choose "Docker Standalone" > Agent
3. Name: `web-server-02`
4. Environment address: `remote-host-ip:9001`
5. Connect

You can now switch between environments in the top-left environment selector.

## User Management

Portainer CE supports multiple users with role-based access:

1. **Settings > Users** > Add User
2. Assign roles:
   - **Administrator** - full access
   - **User** - scoped access to specific environments and resource groups

For team environments, create Teams and assign users to them, then grant teams access to specific environments.

## API Access

Portainer has a REST API useful for automation:

```bash
# Authenticate and get API token
TOKEN=$(curl -s -X POST https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# List all containers
curl -s -H "Authorization: Bearer $TOKEN" \
  https://portainer.example.com/api/endpoints/1/docker/containers/json | \
  python3 -m json.tool

# Restart a container by ID
CONTAINER_ID="abc123..."
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  "https://portainer.example.com/api/endpoints/1/docker/containers/${CONTAINER_ID}/restart"
```

## Backup

Portainer stores configuration in the `portainer_data` Docker volume:

```bash
# Stop Portainer before backup for consistency
docker stop portainer

# Backup the volume
docker run --rm \
  -v portainer_data:/data \
  -v /backup:/backup \
  alpine tar czf /backup/portainer-backup-$(date +%Y%m%d).tar.gz /data

# Start Portainer again
docker start portainer

# Restore from backup
docker run --rm \
  -v portainer_data:/data \
  -v /backup:/backup \
  alpine tar xzf /backup/portainer-backup-YYYYMMDD.tar.gz -C /
```

## Updating Portainer

```bash
# For Docker run installation:
docker stop portainer
docker rm portainer
docker pull portainer/portainer-ce:latest
docker run -d --name portainer --restart=always \
  -p 9443:9443 -p 8000:8000 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest

# For Docker Compose installation:
cd /opt/portainer
docker compose pull
docker compose up -d
```

## Summary

Portainer CE on Ubuntu provides a practical web interface for Docker management without complex infrastructure. The stack deployment feature makes it easy to deploy and manage Docker Compose applications through a UI, and the multi-environment support lets you manage multiple Docker hosts from a single interface. For teams where not everyone is comfortable with Docker CLI, Portainer provides the operational access they need without requiring sysadmin-level Docker knowledge.
