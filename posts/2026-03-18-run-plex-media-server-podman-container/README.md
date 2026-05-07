# How to Run Plex Media Server in a Podman Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Plex, Podman, Container, Media Server, Streaming, Linux, Self-Hosted

Description: Set up Plex Media Server inside a Podman container to stream your personal media library across all your devices, with hardware transcoding support and persistent storage.

---

> Plex Media Server organizes your movies, TV shows, and music into a beautiful interface accessible from any device. Running it in a Podman container keeps your server clean and makes Plex easy to manage and upgrade.

Plex Media Server is one of the most popular self-hosted media platforms. It indexes your personal media files, fetches metadata and artwork, and streams content to Plex clients on TVs, phones, tablets, and web browsers. Running Plex inside a Podman container isolates it from the host system, simplifies updates, and lets you define the entire deployment in a single command. This guide covers basic setup, hardware transcoding, and production-ready configuration.

---

## Prerequisites

- A Linux host with Podman installed (version 4.0 or later).
- At least 2 GB of RAM (4 GB or more recommended for transcoding).
- A Plex account (free tier works; Plex Pass unlocks hardware transcoding).
- Media files stored on a local disk or mounted network share.

---

## Step 1: Obtain a Plex Claim Token

Plex uses a claim token to link a new server to your Plex account. Generate one before running the container:

1. Sign in to your Plex account at https://www.plex.tv/claim/
2. Copy the claim token (it looks like `claim-xxxxxxxxxxxxxxxxxxxx`).
3. Use it within 4 minutes, as it expires quickly.

---

## Step 2: Prepare Host Directories

Create directories for Plex configuration and organize your media:

```bash
# Create the Plex config directory for database and metadata

mkdir -p ~/plex/config

# Create directories for your media (adjust to match your library)
mkdir -p ~/plex/movies
mkdir -p ~/plex/tvshows
mkdir -p ~/plex/music

# Create a transcode directory (temporary files during transcoding)
mkdir -p ~/plex/transcode
```

If your media is already stored elsewhere (such as an external drive or NFS mount), you can skip creating the media directories and mount those paths directly.

---

## Step 3: Run the Plex Container

Start Plex Media Server with your claim token and media volumes:

```bash
# Run Plex Media Server in a container
podman run -d \
  --name plex \
  --network host \
  -v ~/plex/config:/config:Z \
  -v ~/plex/transcode:/transcode:Z \
  -v ~/plex/movies:/data/movies:Z \
  -v ~/plex/tvshows:/data/tvshows:Z \
  -v ~/plex/music:/data/music:Z \
  -e TZ=America/New_York \
  -e PLEX_CLAIM="claim-xxxxxxxxxxxxxxxxxxxx" \
  -e PUID=1000 \
  -e PGID=1000 \
  --restart unless-stopped \
  docker.io/linuxserver/plex:latest
```

Key flags explained:

| Flag | Purpose |
|------|---------|
| `--network host` | Allows Plex to be discovered by clients on your local network |
| `-v ~/plex/config:/config:Z` | Persists the Plex database, metadata, and settings |
| `-v ~/plex/transcode:/transcode:Z` | Provides a fast temporary directory for transcoding operations |
| `-e PLEX_CLAIM` | Links this server to your Plex account (one-time setup) |
| `-e PUID=1000` / `-e PGID=1000` | Runs Plex as your user to avoid file permission issues |

---

## Step 4: Access the Plex Web Interface

After the container starts, Plex needs a minute to initialize its database. Then open your browser:

```text
http://<your-host-ip>:32400/web
```

On first access you will:

1. Sign in with your Plex account.
2. Name your server.
3. Add media libraries by pointing them to `/data/movies`, `/data/tvshows`, and `/data/music` (the paths inside the container).

---

## Step 5: Enable Hardware Transcoding

Hardware transcoding uses your GPU or CPU's built-in media engine to transcode video efficiently. This requires a Plex Pass subscription.

### Intel Quick Sync (most common on Linux servers)

```bash
# Check if the render device exists on the host
ls -la /dev/dri/

# Stop and remove the existing container before recreating it with GPU access
podman stop plex
podman rm plex

# Run Plex with access to the Intel GPU for hardware transcoding
podman run -d \
  --name plex \
  --network host \
  --device /dev/dri:/dev/dri \
  -v ~/plex/config:/config:Z \
  -v ~/plex/transcode:/transcode:Z \
  -v ~/plex/movies:/data/movies:Z \
  -v ~/plex/tvshows:/data/tvshows:Z \
  -v ~/plex/music:/data/music:Z \
  -e TZ=America/New_York \
  -e PUID=1000 \
  -e PGID=1000 \
  --restart unless-stopped \
  docker.io/linuxserver/plex:latest
```

The `--device /dev/dri:/dev/dri` flag passes the GPU rendering devices into the container.

### NVIDIA GPU

For NVIDIA GPUs, install the NVIDIA Container Toolkit on the host, make sure the CDI devices are available with `nvidia-ctk cdi list`, then use the CDI device flag. Podman 4.1 or later is required for CDI devices in `--device`:

```bash
# Stop and remove the existing container before recreating it with GPU access
podman stop plex
podman rm plex

# Run Plex with NVIDIA GPU access
podman run -d \
  --name plex \
  --network host \
  --device nvidia.com/gpu=all \
  --security-opt=label=disable \
  -v ~/plex/config:/config:Z \
  -v ~/plex/transcode:/transcode:Z \
  -v ~/plex/movies:/data/movies:Z \
  -v ~/plex/tvshows:/data/tvshows:Z \
  -e TZ=America/New_York \
  -e PUID=1000 \
  -e PGID=1000 \
  -e NVIDIA_VISIBLE_DEVICES=all \
  -e NVIDIA_DRIVER_CAPABILITIES=compute,video,utility \
  --restart unless-stopped \
  docker.io/linuxserver/plex:latest
```

After starting with GPU access, enable hardware transcoding in the Plex web interface under Settings > Transcoder > check "Use hardware acceleration when available."

---

## Step 6: Optimize Plex Settings

After initial setup, adjust these settings in the Plex web interface for better performance:

```text
Settings > Library
  - Enable "Scan my library automatically" for new media detection
  - Enable "Run a partial scan when changes are detected"

Settings > Transcoder
  - Set "Transcoder temporary directory" to /transcode
  - Set "Transcoder quality" to "Prefer higher speed encoding"

Settings > Network
  - Set "Secure connections" to "Preferred" for encrypted streaming
  - Configure "LAN Networks" to your local subnet (e.g., 192.168.1.0/24)
```

---

## Managing the Container

```bash
# View Plex logs
podman logs --tail 100 plex

# Stop Plex (current streams will be interrupted)
podman stop plex

# Start Plex
podman start plex

# Update Plex to the latest version
podman pull docker.io/linuxserver/plex:latest
podman stop plex
podman rm plex
# Re-run the podman run command from Step 3 (without PLEX_CLAIM since it is already linked)
```

---

## Running as a Systemd Service

Use Quadlet, the recommended way to run Podman containers under systemd (note that `podman generate systemd` is deprecated):

```bash
# Create the Quadlet directory
sudo mkdir -p /etc/containers/systemd

# Create a Quadlet container file
# Replace /home/your-user with your actual home directory.
sudo tee /etc/containers/systemd/plex.container > /dev/null <<'EOF'
[Unit]
Description=Plex Media Server Container

[Container]
ContainerName=plex
Image=docker.io/linuxserver/plex:latest
Network=host
Volume=/home/your-user/plex/config:/config:Z
Volume=/home/your-user/plex/transcode:/transcode:Z
Volume=/home/your-user/plex/movies:/data/movies:Z
Volume=/home/your-user/plex/tvshows:/data/tvshows:Z
Volume=/home/your-user/plex/music:/data/music:Z
Environment=TZ=America/New_York
Environment=PUID=1000
Environment=PGID=1000

[Service]
Restart=always

[Install]
WantedBy=default.target
EOF

# Reload systemd and start the service
sudo systemctl daemon-reload
sudo systemctl start plex.service

# Verify the service is running
sudo systemctl status plex.service
```

---

## Backing Up Plex

Your Plex database and metadata live in the config directory. Back it up regularly:

```bash
# Stop Plex to ensure a clean backup
podman stop plex

# Create a compressed backup of the config directory
tar czf ~/plex-backup-$(date +%Y%m%d).tar.gz ~/plex/config/

# Restart Plex
podman start plex
```

---

## Conclusion

Running Plex Media Server in a Podman container provides a clean, upgradable media streaming setup. Host networking ensures local clients can discover the server automatically, and volume mounts keep your configuration and media data safely on the host. With hardware transcoding enabled, even a modest server can handle multiple simultaneous streams. Combined with systemd integration, your media server will start automatically and run reliably for years.
