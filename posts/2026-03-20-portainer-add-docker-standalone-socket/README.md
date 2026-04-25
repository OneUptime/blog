# How to Add a Docker Standalone Environment to Portainer via Socket - Add

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Environment, Docker Socket, Configuration

Description: Add a Docker standalone environment to Portainer by mounting the Docker socket, enabling management of the local Docker host.

## Introduction

The simplest way to add a Docker environment to Portainer is via the Docker socket (`/var/run/docker.sock`). When Portainer runs on the same host as Docker, it can communicate with Docker directly via the socket without any additional components. This guide covers setting up Portainer with socket access.

## How Socket Access Works

The Docker socket is a Unix socket that the Docker daemon listens on. When you mount it into the Portainer container, Portainer can send commands to Docker as if it were running natively on the host.

## Step 1: Run Portainer with Socket Access

```bash
docker run -d \
  --name portainer \
  --restart always \
  -p 443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts
```

The key is `-v /var/run/docker.sock:/var/run/docker.sock`.

## Step 2: Docker Compose with Socket

```yaml
services:
  portainer:
    image: portainer/portainer-ce:lts
    container_name: portainer
    restart: always
    ports:
      - "443:9443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data

volumes:
  portainer_data:
```

## Step 3: Portainer Automatically Detects the Local Environment

When Portainer first starts with socket access, the installation process automatically detects the local environment during initial setup:

1. It detects the Docker socket on startup
2. A "local" environment is automatically created
3. No manual configuration is needed for the local environment

## Step 4: Adding Additional Environments via Socket

If you have a Portainer instance already running and want to add another Docker Standalone environment via a socket that is already mounted into the Portainer container:

1. Log in to Portainer
2. Go to **Environments** → **Add environment**
3. Select **Docker Standalone**
4. Select **Socket** as the connection type
5. The socket path defaults to `/var/run/docker.sock`
6. Give the environment a name
7. Click **Connect**

The special "local" environment can only be created when the Portainer Server container is first deployed. If you use a non-default socket path, update the Portainer container bind mount and enable **Override default socket path** in the wizard.

## Socket Permissions

The Docker socket requires appropriate permissions:

```bash
# Check socket permissions

ls -la /var/run/docker.sock
# Typically: srw-rw---- 1 root docker 0 Mar 20 10:00 /var/run/docker.sock

# The process inside the Portainer container needs access to the mounted socket.
# One way to grant socket access inside the container is to add the socket's group ID:
SOCKET_GID=$(stat -c '%g' /var/run/docker.sock)

docker run -d \
  --name portainer \
  --restart always \
  --group-add "$SOCKET_GID" \
  -p 443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts

# Avoid chmod 666 on /var/run/docker.sock unless it is only for short-lived troubleshooting.
```

For rootless Docker:
```bash
# Rootless Docker socket is typically at:
/run/user/<UID>/docker.sock

# Portainer with rootless Docker has some limitations and may require additional configuration.
# Replace <UID> with the user ID running the rootless Docker daemon.
docker run -d \
  --name portainer \
  --restart always \
  -p 9443:9443 \
  -v /run/user/<UID>/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts
```

## Security Considerations

Granting access to the Docker socket is equivalent to root access on the host. Portainer also documents direct Docker socket connections as a legacy option that does not support edge features or policy management. For most use cases, Portainer recommends the Edge Agent instead.

## Verifying the Connection

```bash
# After adding, check the environment status
# In Portainer UI: Environments should show "Up"

# Via API
TOKEN=$(curl -s -X POST \
  https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"adminpassword"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

curl -s \
  -H "Authorization: Bearer $TOKEN" \
  https://portainer.example.com/api/endpoints \
  | python3 -c "
import sys, json
for env in json.load(sys.stdin):
    print(f'ID={env[\"Id\"]} Name={env[\"Name\"]} Status={env[\"Status\"]}')
"
```

## Conclusion

Socket-based Docker environment access is the simplest and most direct way to connect Portainer to a local Docker host. The docker.sock mount provides full Docker API access without network configuration. For current Portainer releases, direct Docker socket connections are a legacy option, and Portainer recommends the Edge Agent for most use cases.
