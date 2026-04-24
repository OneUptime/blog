# How to Install Portainer on Unraid via Community Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Unraid, Docker, Community Applications, Self-Hosted, Home Lab

Description: Install Portainer on Unraid using the Community Applications plugin to manage Docker containers with a more powerful interface alongside Unraid's native Docker manager.

## Introduction

Unraid has a built-in Docker manager, but Portainer provides additional capabilities like stack deployments, Compose support, and advanced networking configuration. The Community Applications (CA) plugin makes it straightforward to install Portainer as a Docker container on Unraid.

## Prerequisites

- Unraid 6.12 or later
- Community Applications plugin installed
- Docker service enabled in Unraid settings

## Step 1: Install Community Applications Plugin

If not already installed:

1. Navigate to **Plugins** tab in Unraid WebUI
2. Click **Install Plugin**
3. Enter the URL: `https://raw.githubusercontent.com/Squidly271/community.applications/master/plugins/community.applications.plg`
4. Click **Install**

## Step 2: Install Portainer via Community Applications

1. Click the **Apps** tab in Unraid WebUI
2. Search for `Portainer`
3. Find a Portainer template from a trusted maintainer
4. Click **Install**

### Configure the Template

The CA template will pre-fill most settings. Review and adjust:

| Field | Value |
|-------|-------|
| Name | portainer |
| Repository | portainer/portainer-ce:lts |
| WebUI | https://[IP]:[PORT:9443] |
| Port 9000 | 9000 (optional legacy HTTP) |
| Port 9443 | 9443 |

**Volume Paths:**
- Container path `/data` → Host path `/mnt/user/appdata/portainer`
- Container path `/var/run/docker.sock` → Host path `/var/run/docker.sock`

**Important:** Change the host path for `/data` to match your Unraid appdata share:
- Typically: `/mnt/user/appdata/portainer`

Click **Apply** to install.

## Step 3: Manual Installation via Unraid Docker UI

If you prefer not to use CA, install manually:

1. Navigate to **Docker** tab
2. Click **Add Container**
3. Fill in:
   - **Name**: portainer
   - **Repository**: portainer/portainer-ce:lts
   - **Restart Policy**: Unless Stopped

4. Click **Add another Path, Port, Variable, Label or Device**
5. Add Port for legacy HTTP (optional):
   - Name: WebUI
   - Container Port: 9000
   - Host Port: 9000
   - Connection Type: TCP

6. Add Port for HTTPS:
   - Name: HTTPS
   - Container Port: 9443
   - Host Port: 9443
   - Connection Type: TCP

7. Add Path for data:
   - Container Path: `/data`
   - Host Path: `/mnt/user/appdata/portainer`
   - Access Mode: Read/Write

8. Add Path for Docker socket:
   - Container Path: `/var/run/docker.sock`
   - Host Path: `/var/run/docker.sock`
   - Access Mode: Read/Write

9. Click **Apply**

## Step 4: Via SSH with Docker Compose

For a reproducible setup outside Unraid's native Docker UI, if you already have Compose available on your Unraid system, SSH into Unraid and create a compose file in a persistent location:

```bash
# SSH into Unraid

ssh root@<unraid-ip>

# Create the appdata directory
mkdir -p /mnt/user/appdata/portainer

# Create compose file
cat > /mnt/user/appdata/portainer/portainer-compose.yml << 'EOF'
services:
  portainer:
    image: portainer/portainer-ce:lts
    container_name: portainer
    restart: unless-stopped
    ports:
      - "9443:9443"
      - "9000:9000" # Optional legacy HTTP access
    volumes:
      # Docker socket for container management
      - /var/run/docker.sock:/var/run/docker.sock
      # Store data on Unraid array
      - /mnt/user/appdata/portainer:/data
EOF

# Deploy
docker compose -f /mnt/user/appdata/portainer/portainer-compose.yml up -d
```

## Step 5: Access Portainer

Navigate to `https://<unraid-ip>:9443` and create your admin account. If you exposed the legacy HTTP port, `http://<unraid-ip>:9000` will also work.

## Integrating Portainer with Unraid

### Managing Unraid's Docker Containers in Portainer

Portainer will automatically detect all containers managed by Unraid's Docker manager. You can monitor them in Portainer, but be careful: **avoid stopping or deleting containers from Portainer if they are managed by Unraid**, as Unraid tracks container state separately.

### Using Portainer for Stacks

Portainer's stack feature works independently of Unraid's Docker manager. Use it for multi-container applications that Unraid's single-container approach doesn't handle well:

1. In Portainer, navigate to **Stacks > Add stack**
2. Give it a name and paste your Compose content
3. Click **Deploy the stack**

Unraid does not natively manage Docker Compose deployments in its Docker tab, so ongoing management is typically done through Portainer or the Docker CLI.

## Updating Portainer on Unraid

### Via Community Applications

1. Navigate to the **Apps** tab and open **Action Center**
2. Click **Actions > Update** for the Portainer app
3. CA will pull the new image and recreate the container

### Via Command Line

```bash
# SSH into Unraid
ssh root@<unraid-ip>

# Update Portainer
docker stop portainer
docker rm portainer
docker pull portainer/portainer-ce:lts

# Recreate with original settings
# (Unraid stores the container config - use the Docker tab to recreate)
# Or run manually:
docker run -d \
  --name portainer \
  --restart=unless-stopped \
  -p 9000:9000 \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /mnt/user/appdata/portainer:/data \
  portainer/portainer-ce:lts
```

## Conclusion

Portainer on Unraid via Community Applications is the easiest installation method and integrates well with Unraid's existing Docker infrastructure. Using Unraid's appdata share for Portainer's data ensures it survives array operations and is included in any backup jobs you have configured for your appdata.
