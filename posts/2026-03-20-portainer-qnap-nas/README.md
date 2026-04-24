# How to Install Portainer on QNAP NAS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, QNAP, NAS, Docker, Container Station, Self-Hosted, Home Lab

Description: Install Portainer on a QNAP NAS using Container Station to get a powerful Docker management interface beyond what QNAP's native tools provide.

## Introduction

QNAP's Container Station provides basic Docker management, but it lacks many advanced features. Installing Portainer on your QNAP NAS gives you full stack support, environment templates, registry management, and a far more capable interface for managing complex containerized applications.

## Prerequisites

- QNAP NAS running QTS 5.x or QuTS hero
- Container Station 3.x installed from App Center
- At least 2GB RAM available
- SSH access enabled (Control Panel > Network & File Services > Telnet/SSH)

## Method 1: Via Container Station UI

### Step 1: Pull the Portainer Image

1. Open **Container Station**
2. Click **Images** in the left sidebar
3. Click **Pull**
4. Enter `portainer/portainer-ce` and tag `lts`
5. Click **Pull**

### Step 2: Create the Container

1. Click **Containers > Create**
2. Select the `portainer/portainer-ce:lts` image
3. Click **Advanced Settings**

Configure the following:

**Network:** Use a bridge mapping:
- Host port `9443` → Container port `9443`
- Optional: Host port `9000` → Container port `9000` for legacy HTTP access

**Storage:**
- Click **Add Volume**
- Type: Docker Volume, Name: `portainer_data`, Mount path: `/data`
- Click **Add Bind Mount**
- Host path: `/var/run/docker.sock`, Mount path: `/var/run/docker.sock`
- Access mode: Read/Write

**Auto Restart:** Enable

4. Click **Create**

## Method 2: Via SSH (Recommended)

SSH into your QNAP NAS:

```bash
ssh <admin-username>@<qnap-ip>
```

Install Portainer via Docker CLI:

```bash
# Create persistent data volume

docker volume create portainer_data

# Run Portainer
docker run -d \
  --name portainer \
  --restart=unless-stopped \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts

# Check it's running
docker ps | grep portainer
```

If you need legacy HTTP access, add `-p 9000:9000` to the `docker run` command.

## Method 3: Via Container Station Compose (QTS 5.1+)

Container Station 3.x supports Docker Compose. Create a new application:

1. Open **Container Station**
2. Click **Applications > Create**
3. Enter application name: `portainer`
4. Paste this compose file:

```yaml
services:
  portainer:
    image: portainer/portainer-ce:lts
    container_name: portainer
    restart: unless-stopped
    ports:
      - "9443:9443"
      # - "9000:9000"  # Enable only if you need legacy HTTP access
    volumes:
      # Mount Docker socket for container management
      - /var/run/docker.sock:/var/run/docker.sock
      # Persistent data volume
      - portainer_data:/data

volumes:
  portainer_data:
    driver: local
```

5. Click **Create**

## Step 3: Configure QNAP Firewall

If QuFirewall is enabled:

1. Open **QuFirewall**
2. Edit your active firewall profile
3. Add rules to allow TCP port `9443` and, if you enabled legacy HTTP access, `9000` from your local subnet
4. Ensure the allow rules are ordered before any deny-all rule

## Step 4: Access Portainer

Navigate to `https://<qnap-ip>:9443` in your browser. Portainer uses a self-signed certificate by default, so your browser may show a warning on first access. Create your admin account on first access.

## Troubleshooting QNAP-Specific Issues

### Docker Socket Permission Denied

QNAP may have different socket permissions:

```bash
# Check socket permissions
ls -la /var/run/docker.sock
```

If your SSH session does not have sufficient administrator permission, switch to an administrator shell with `sudo -i` and retry instead of making the Docker socket world-writable.

### Container Station Conflict

If Container Station manages the same containers:

```bash
# List all containers including Container Station ones
docker ps -a

# Check if Container Station is interfering
docker info | grep -i "docker root"
```

### Port Already in Use

If you enabled legacy HTTP on port 9000 and it is already used by QNAP services:

```bash
# Check which process uses port 9000
netstat -tlnp | grep 9000

# Use an alternative host port for legacy HTTP access
docker run -d \
  --name portainer \
  --restart=unless-stopped \
  -p 9443:9443 \
  -p 19000:9000 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts
```

## Updating Portainer on QNAP

```bash
# SSH into QNAP
ssh <admin-username>@<qnap-ip>

# Stop and remove old container
docker stop portainer && docker rm portainer

# Pull latest image
docker pull portainer/portainer-ce:lts

# Recreate (data volume is preserved)
docker run -d \
  --name portainer \
  --restart=unless-stopped \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts
```

Add `-p 9000:9000` to the recreate command only if you still need legacy HTTP access.

## Conclusion

Portainer on QNAP NAS unlocks full Docker stack management capabilities that Container Station doesn't provide. Whether you use the UI, SSH, or the Container Station Compose feature, the result is a powerful management interface that complements QNAP's native tools. With persistent volumes, your Portainer configuration survives updates and reboots.
