# How to Run Sonarr in a Podman Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Sonarr, Podman, Container, Media Management, TV Shows, Linux, Self-Hosted, Automation

Description: Deploy Sonarr in a Podman container to automatically monitor, search for, and organize your TV show library with minimal setup.

---

> Sonarr automates TV show management by monitoring for new episodes, searching indexers, and organizing downloaded files. Running it in a Podman container keeps the setup clean and portable.

Sonarr is a PVR (Personal Video Recorder) application for TV shows. It monitors your favorite series, automatically searches configured indexers when new episodes air, sends downloads to your preferred client, and organizes the files into your media library with proper naming. Running Sonarr in a Podman container isolates its dependencies, makes upgrades painless, and pairs well with other containerized media tools like Jellyfin, Plex, and download clients. This guide covers the complete setup.

---

## Prerequisites

- A Linux host with Podman installed (version 4.0 or later, or 4.4 or later for the Quadlet systemd example).
- A download client (such as SABnzbd, NZBGet, Transmission, or qBittorrent) already running.
- An indexer (such as Jackett, Prowlarr, or a Usenet indexer).
- Disk space for your TV show library.

---

## Step 1: Create Host Directories

Sonarr needs a configuration directory and access to your media and download directories:

```bash
# Create the Sonarr configuration directory

mkdir -p ~/sonarr/config

# Ensure your TV show library directory exists
mkdir -p ~/media/tvshows

# Ensure your download directory exists (or use your existing one)
mkdir -p ~/downloads
```

The key design consideration is that Sonarr needs to see both the download directory and the final media directory to move and rename files after downloads complete.

---

## Step 2: Run the Sonarr Container

Use the LinuxServer.io Sonarr image, which includes a clean base and stores Sonarr's configuration outside the container:

```bash
# Run Sonarr with persistent configuration and media access
podman run -d \
  --name sonarr \
  -p 8989:8989 \
  -v ~/sonarr/config:/config:Z \
  -v ~/media/tvshows:/tv:z \
  -v ~/downloads:/downloads:z \
  -e PUID=1000 \
  -e PGID=1000 \
  -e TZ=America/New_York \
  --restart unless-stopped \
  lscr.io/linuxserver/sonarr:latest
```

Key flags explained:

| Flag | Purpose |
|------|---------|
| `-p 8989:8989` | Exposes the Sonarr web interface |
| `-v ~/sonarr/config:/config:Z` | Persists Sonarr database, settings, and logs |
| `-v ~/media/tvshows:/tv:z` | Gives Sonarr access to your TV show library |
| `-v ~/downloads:/downloads:z` | Allows Sonarr to find and import completed downloads |
| `-e PUID=1000` / `-e PGID=1000` | Runs as your user to match file ownership on the host |

---

## Step 3: Access the Web Interface

Open your browser and navigate to:

```text
http://<your-host-ip>:8989
```

On first launch, Sonarr will present a clean dashboard ready for configuration.

---

## Step 4: Configure Sonarr

### Add a Root Folder

The root folder tells Sonarr where your TV show library lives:

```text
Settings > Media Management > Root Folders
  - Click "Add Root Folder"
  - Path: /tv
  - Click Save
```

### Add an Indexer

Indexers are the search engines Sonarr uses to find episodes. If you use Prowlarr, it can sync indexers automatically. Otherwise, add them manually:

```text
Settings > Indexers > Add
  - Select your indexer type (Newznab, Torznab, etc.)
  - Enter the indexer URL and API key
  - Test the connection
  - Save
```

### Add a Download Client

Connect Sonarr to your download client:

```text
Settings > Download Clients > Add
  - Select your client (SABnzbd, NZBGet, Transmission, qBittorrent, etc.)
  - Host: Use the IP address of your download client
    (if also in a container, use the host IP or container network IP)
  - Port: Your download client's API port
  - Enter API key or credentials
  - Test and Save
```

### Configure Naming

Set up consistent file naming for imported episodes:

```text
Settings > Media Management
  - Enable "Rename Episodes"
  - Standard Episode Format:
    {Series Title} - S{season:00}E{episode:00} - {Episode Title} [{Quality Title}]
  - Season Folder Format: Season {season:00}
  - Enable "Create empty series folders"
```

---

## Step 5: Add a TV Series

From the Sonarr dashboard:

1. Click "Add New" in the left sidebar.
2. Search for the TV show by name.
3. Select the correct series from the search results.
4. Choose the root folder (`/tv`).
5. Select a quality profile (such as "HD-1080p" or "Any").
6. Choose whether to monitor all episodes, future episodes only, or specific seasons.
7. Click "Add."

Sonarr will scan your library for existing episodes and begin monitoring for missing ones.

---

## Step 6: Networking with Other Containers

If your download client and indexer are also Podman containers, create a shared network so they can communicate:

```bash
# Create a dedicated network for media containers
podman network create media-net

# Run Sonarr on the shared network
podman run -d \
  --name sonarr \
  --network media-net \
  -p 8989:8989 \
  -v ~/sonarr/config:/config:Z \
  -v ~/media/tvshows:/tv:z \
  -v ~/downloads:/downloads:z \
  -e PUID=1000 \
  -e PGID=1000 \
  -e TZ=America/New_York \
  --restart unless-stopped \
  lscr.io/linuxserver/sonarr:latest

# Run your download client on the same network
# Containers can reach each other by name (e.g., http://transmission:9091)
```

When containers share a Podman network, they can reach each other using container names as hostnames. In the download client settings, use the container name instead of an IP address.

---

## Managing the Container

```bash
# View Sonarr logs
podman logs --tail 100 sonarr

# Follow logs in real time
podman logs -f sonarr

# Restart Sonarr after configuration changes
podman restart sonarr

# Update Sonarr to the latest version
podman pull lscr.io/linuxserver/sonarr:latest
podman stop sonarr
podman rm sonarr
# Re-run the podman run command with the same flags

# Back up Sonarr configuration
tar czf ~/sonarr-backup-$(date +%Y%m%d).tar.gz ~/sonarr/config/
```

---

## Running as a Systemd Service

> **Note:** `podman generate systemd` is deprecated in Podman 4.4 and later. The recommended approach is to use Quadlet files. The legacy method is shown first, followed by the Quadlet approach.

### Legacy Method (podman generate systemd)

```bash
# Generate the systemd unit file (deprecated)
podman generate systemd --name sonarr --new --files

# Install and enable the service
sudo mv container-sonarr.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable container-sonarr.service
sudo systemctl start container-sonarr.service
```

### Recommended Method (Quadlet)

Create a file at `~/.config/containers/systemd/sonarr.container` for a rootless container. For a root container, use `/etc/containers/systemd/sonarr.container` and replace `%h` with the absolute host paths you want to mount:

```ini
[Unit]
Description=Sonarr Container

[Container]
ContainerName=sonarr
Image=lscr.io/linuxserver/sonarr:latest
PublishPort=8989:8989
Volume=%h/sonarr/config:/config:Z
Volume=%h/media/tvshows:/tv:z
Volume=%h/downloads:/downloads:z
Environment=PUID=1000
Environment=PGID=1000
Environment=TZ=America/New_York

[Service]
Restart=always

[Install]
WantedBy=default.target
```

Then reload and start the rootless service:

```bash
systemctl --user daemon-reload
systemctl --user start sonarr.service
systemctl --user enable sonarr.service

# Allow the rootless service to start at boot without an active login session
sudo loginctl enable-linger "$USER"
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Cannot connect to download client | Ensure both containers share a network or use the host IP |
| Permission denied on media files | Verify PUID/PGID match the owner of the host directories |
| Sonarr cannot find downloaded files | Mount the same download path in both Sonarr and the download client containers |
| Series not found in search | Check your indexer configuration and test the connection |

---

## Conclusion

Sonarr in a Podman container provides automated TV show management with minimal host-level changes. The container keeps Sonarr and its dependencies isolated, while volume mounts give it access to your media library and download directories. By sharing a Podman network with your download client and indexer, all the components communicate seamlessly. Combined with systemd, the entire system starts on boot and runs hands-free.
