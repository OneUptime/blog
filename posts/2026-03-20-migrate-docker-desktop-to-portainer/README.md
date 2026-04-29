# How to Migrate from Docker Desktop to Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Desktop, Migration, Linux, Container

Description: Step-by-step guide to replacing Docker Desktop with Portainer for container management on development and production systems.

## Introduction

Docker Desktop requires a paid subscription for professional use in larger organizations and runs containers in a VM on macOS and Windows. Portainer, combined with the Docker engine directly, offers a lightweight alternative with a browser-based management UI that works natively on Linux servers. This guide covers migrating workloads and workflows from Docker Desktop to Portainer.

## Why Migrate?

- Docker Desktop requires a paid subscription for professional use in larger organizations, including companies over 250 employees or $10M in annual revenue
- Docker Desktop on macOS/Windows runs containers in a VM, adding overhead
- Portainer works with the native Docker engine on Linux, eliminating VM overhead
- Portainer provides centralized, browser-based management, and Portainer Business Edition adds RBAC and activity logs

## Step 1: Export Your Docker Desktop Data

Before migrating, export important configurations:

```bash
# Create export directories
mkdir -p exports volume-exports compose-exports

# List all images to migrate

docker images --format "{{.Repository}}:{{.Tag}}" > images-to-migrate.txt

# List all volumes
docker volume ls --format "{{.Name}}" > volumes-to-migrate.txt

# Export each image
while IFS= read -r image; do
  filename=$(echo "$image" | tr '/:' '--')
  docker save "$image" -o "exports/$filename.tar"
done < images-to-migrate.txt

# Export volumes
while IFS= read -r vol; do
  docker run --rm \
    -v "$vol:/data" \
    -v "$(pwd)/volume-exports:/backup" \
    alpine tar czf "/backup/$vol.tar.gz" -C /data .
  echo "Exported volume: $vol"
done < volumes-to-migrate.txt

# Export Compose files while preserving relative paths
find . -path ./compose-exports -prune -o \( -name "docker-compose*.yml" -o -name "docker-compose*.yaml" -o -name "compose*.yml" -o -name "compose*.yaml" \) -print0 | \
  rsync -aR --from0 --files-from=- ./ compose-exports/
```

## Step 2: Set Up Linux Server with Docker Engine

```bash
# On your Linux server (Ubuntu/Debian)
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
. /etc/os-release
sudo curl -fsSL "https://download.docker.com/linux/$ID/gpg" -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/$ID \
  $VERSION_CODENAME stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add your user to the docker group
sudo usermod -aG docker $USER

# Enable Docker to start on boot
sudo systemctl enable --now docker

# Verify
sudo docker --version
sudo docker info

# Log out and back in before continuing so the docker group membership is applied
```

## Step 3: Install Portainer

```bash
# Create Portainer data volume
docker volume create portainer_data

# Deploy Portainer
# Port 8000 is only required if you plan to use Edge agents
docker run -d \
  --name portainer \
  --restart=always \
  -p 8000:8000 \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:sts

# Access at https://your-server-ip:9443
```

## Step 4: Import Images and Volumes

```bash
# Copy exported files to the Linux server
rsync -av exports/ user@linux-server:/tmp/docker-imports/
rsync -av volume-exports/ user@linux-server:/tmp/volume-imports/

# On the Linux server: Import images
for tar in /tmp/docker-imports/*.tar; do
  docker image load --input "$tar"
  echo "Loaded: $tar"
done

# Import volumes
for archive in /tmp/volume-imports/*.tar.gz; do
  vol_name=$(basename "$archive" .tar.gz)
  docker volume create "$vol_name"
  docker run --rm \
    -v "$vol_name:/data" \
    -v /tmp/volume-imports:/backup \
    alpine tar xzf "/backup/$(basename "$archive")" -C /data
  echo "Imported volume: $vol_name"
done
```

## Step 5: Migrate Docker Compose Stacks

Import your compose files into Portainer:

```bash
# In Portainer UI:
# Stacks > Add Stack > Web editor
# Paste the contents of each compose file from compose-exports/
# Or: Select Upload and choose the compose file from your computer
# If a stack relies on multiple Compose files, use Portainer's Git repository option
```

## Step 6: Configure Remote Access

Replace Docker Desktop's local GUI with Portainer accessible remotely:

```bash
# Option 1: Access via browser
# https://your-server-ip:9443

# Option 2: SSH tunnel for secure access
ssh -L 9443:localhost:9443 user@your-server
# Then browse to: https://localhost:9443

# Option 3: Set up Cloudflare Tunnel or Tailscale for secure access
# Install Tailscale on the server
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
# Access via: https://tailscale-ip:9443
```

## Docker Context Migration (for CLI Users)

```bash
# Add the remote Docker host as a context
docker context create linux-server \
  --docker host=ssh://user@your-server

# Switch to the new context
docker context use linux-server

# Verify
docker context ls
docker ps  # Now manages remote containers
```

## Conclusion

Migrating from Docker Desktop to Portainer eliminates licensing concerns and VM overhead while moving container management to a browser-accessible interface. The migration process preserves your images, volume data, and compose configurations. Portainer's web UI replaces Docker Desktop's local GUI with a more server-ready interface accessible from any browser.
