# How to Configure Portainer for Multi-Host Container Management on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Docker, Portainer, Container, DevOps

Description: Configure Portainer Business or Community Edition to manage Docker containers across multiple Ubuntu hosts from a single web interface, with agent-based remote management.

---

Managing Docker containers across multiple servers through SSH sessions gets tedious fast. Portainer provides a web interface that connects to remote Docker hosts, letting you deploy stacks, inspect containers, manage volumes, and tail logs across your entire fleet from one place.

## Architecture Overview

Portainer uses two components for multi-host management. The Portainer server runs as a container on one central host and hosts the web UI and API. On each remote host you want to manage, you run the Portainer Agent, a lightweight container that exposes Docker management capabilities to the server.

The agent communicates with the server over port 9001 (TCP). The server's web UI is on port 9443 (HTTPS) or 9000 (HTTP). You control the remote hosts by adding them as "Environments" in the Portainer UI.

## Installing the Portainer Server

Choose a host to be your Portainer server. It should be accessible from your browser and able to reach the agent port on all managed hosts.

```bash
# Create a named volume for Portainer's data (certificates, settings, stack configs)
docker volume create portainer_data

# Run Portainer Community Edition
docker run -d \
  --name portainer \
  --restart=always \
  -p 8000:8000 \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest

# Verify it's running
docker ps | grep portainer
```

Port 8000 is the tunnel server port used for Edge Agent connections. Port 9443 is the HTTPS web UI. Open `https://your-server-ip:9443` in a browser to complete the initial setup.

The first time you access Portainer, it asks you to set an admin password and configure the initial environment. The local Docker socket is automatically available as the first environment.

## Installing the Portainer Agent on Remote Hosts

Run this on every Ubuntu host you want to manage remotely:

```bash
# Pull the agent image
docker pull portainer/agent:latest

# Run the agent
# It listens on port 9001 for connections from the Portainer server
docker run -d \
  --name portainer_agent \
  --restart=always \
  -p 9001:9001 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  portainer/agent:latest

# Confirm the agent is running
docker ps | grep portainer_agent
```

The agent mounts both the Docker socket and the Docker volumes directory. This allows Portainer to manage containers and browse volume contents on the remote host.

Make sure port 9001 is open in your firewall from the Portainer server's IP:

```bash
# Allow the Portainer server to reach the agent
sudo ufw allow from <portainer-server-ip> to any port 9001 proto tcp

# Verify the rule was added
sudo ufw status
```

## Adding Remote Environments in Portainer

After the agent is running on a remote host, add it to Portainer through the web interface.

Log into `https://your-portainer-server:9443`, go to Settings, then Environments, and click "Add environment". Choose "Agent" as the environment type.

Fill in:
- **Name**: A friendly name for the host (e.g., "web-server-01")
- **Environment URL**: `tcp://remote-host-ip:9001`

Click "Connect". Portainer will attempt to reach the agent. If successful, the environment appears in your list and you can switch to it from the left sidebar.

## Using a Docker Stack via Portainer

One of the most useful Portainer features is deploying Docker Compose stacks from the UI. You can paste a compose file or point Portainer at a Git repository.

Here is an example stack definition for a web application with a database:

```yaml
# docker-compose.yml for Portainer stack deployment

version: "3.8"

services:
  web:
    image: nginx:1.25-alpine
    restart: always
    ports:
      - "80:80"
    volumes:
      - ./html:/usr/share/nginx/html:ro
    depends_on:
      - api
    networks:
      - frontend
      - backend

  api:
    image: myapp/api:latest
    restart: always
    environment:
      # Reference environment variables set in Portainer
      - DATABASE_URL=${DATABASE_URL}
      - SECRET_KEY=${SECRET_KEY}
    networks:
      - backend

  db:
    image: postgres:15-alpine
    restart: always
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks:
      - backend

volumes:
  pgdata:

networks:
  frontend:
  backend:
```

Portainer lets you set environment variables for the stack through the UI before deploying, so secrets stay out of the compose file.

## Deploying from a Git Repository

Portainer can pull stack configurations directly from Git, enabling GitOps-style management:

1. In the Portainer UI, go to Stacks and click "Add stack"
2. Choose "Repository" as the build method
3. Enter your Git repository URL
4. Specify the compose file path within the repository (e.g., `docker-compose.yml`)
5. Configure automatic updates if you want Portainer to poll for changes

For private repositories, add credentials in the authentication section. Portainer stores them encrypted.

## Securing Agent Communication

By default, agent communication is unencrypted. For production, enable TLS:

```bash
# Generate a CA and certificates for agent TLS
# This uses a self-signed CA - replace with your PKI in production
openssl req -new -x509 -days 3650 -nodes \
  -out ca.crt -keyout ca.key \
  -subj "/CN=Portainer CA"

# Generate server cert for the agent
openssl req -new -nodes \
  -out agent.csr -keyout agent.key \
  -subj "/CN=portainer-agent"

openssl x509 -req -days 3650 \
  -in agent.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
  -out agent.crt

# Run the agent with TLS
docker run -d \
  --name portainer_agent \
  --restart=always \
  -p 9001:9001 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  -v /path/to/certs:/certs \
  -e AGENT_SECRET=your-shared-secret-here \
  portainer/agent:latest
```

Set the same `AGENT_SECRET` on the Portainer server side when adding the environment.

## Monitoring and Log Management

From the Portainer UI, you can tail logs from any container across any managed host. Navigate to the environment, find the container, and click "Logs". You can follow logs in real time or search through them.

For container statistics:

```bash
# On the remote host, check resource usage of all containers
docker stats --no-stream

# Portainer displays this same information graphically in the
# Container Stats view
```

## Setting Up Access Control

Portainer's Community Edition supports basic user management. Go to Settings, then Users to create accounts. You can assign users to specific teams and restrict which environments they can access.

For more granular RBAC (Role-Based Access Control), Portainer Business Edition adds environment-level permissions, allowing you to give different teams access to different hosts or namespaces.

## Updating Portainer

When a new version of Portainer is released:

```bash
# Pull the new image
docker pull portainer/portainer-ce:latest

# Stop and remove the old container (data is in the volume, not the container)
docker stop portainer
docker rm portainer

# Start a new container from the updated image
docker run -d \
  --name portainer \
  --restart=always \
  -p 8000:8000 \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest

# Update agents on remote hosts the same way
docker pull portainer/agent:latest
docker stop portainer_agent && docker rm portainer_agent
docker run -d \
  --name portainer_agent \
  --restart=always \
  -p 9001:9001 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  portainer/agent:latest
```

Portainer makes multi-host Docker management accessible without requiring a full Kubernetes setup. For teams running a handful of Docker hosts, it hits a sweet spot between raw command-line management and the complexity of a full orchestration platform.
