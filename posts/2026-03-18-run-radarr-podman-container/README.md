# How to Run Radarr in a Podman Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Radarr, Podman, Container, Media Management, Movies, Linux, Self-Hosted, Automation

Description: Deploy Radarr in a Podman container to automatically search for, download, and organize your movie collection with proper naming and quality management.

---

> Radarr automates your movie library the way Sonarr automates TV shows. Running it in a Podman container keeps your setup clean, portable, and easy to maintain alongside other media tools.

Radarr is a movie collection manager that integrates with indexers and download clients to automate the process of finding, downloading, and organizing movies. It monitors your watchlist, searches for releases that match your quality preferences, and renames files into a consistent structure. If you are already running Sonarr for TV shows, Radarr follows the same design patterns and works with the same download clients and indexers. This guide covers deploying Radarr in a Podman container and configuring it end to end.

---

## Prerequisites

- A Linux host with Podman installed (version 4.0 or later).
- A download client (SABnzbd, NZBGet, Transmission, qBittorrent, or similar).
- An indexer or indexer manager (Prowlarr, Jackett, or direct indexer access).
- A directory for your movie library.

---

## Step 1: Create Host Directories

```bash
# Create the Radarr configuration directory

mkdir -p ~/radarr/config

# Ensure your movie library directory exists
mkdir -p ~/media/movies

# Ensure your download directory exists
mkdir -p ~/downloads
```

Radarr needs access to both the download location (to find completed files) and the movie library (to move and rename files into their final location).

---

## Step 2: Run the Radarr Container

```bash
# Run Radarr with persistent configuration and media access
podman run -d \
  --name radarr \
  -p 7878:7878 \
  -v ~/radarr/config:/config:Z \
  -v ~/media/movies:/movies:z \
  -v ~/downloads:/downloads:z \
  -e PUID=1000 \
  -e PGID=1000 \
  -e TZ=America/New_York \
  --restart unless-stopped \
  lscr.io/linuxserver/radarr:latest
```

Key flags explained:

| Flag | Purpose |
|------|---------|
| `-p 7878:7878` | Exposes the Radarr web interface |
| `-v ~/radarr/config:/config:Z` | Persists Radarr's database, settings, and logs |
| `-v ~/media/movies:/movies:z` | Gives Radarr access to your movie library |
| `-v ~/downloads:/downloads:z` | Allows Radarr to access completed downloads |
| `-e PUID=1000` / `-e PGID=1000` | Ensures files are created with your user's ownership |

---

## Step 3: Access the Web Interface

Open your browser:

```text
http://<your-host-ip>:7878
```

Radarr will present a clean dashboard. The first time you access it, you will need to configure a few things before adding movies.

---

## Step 4: Configure Radarr

### Add a Root Folder

```text
Settings > Media Management > Root Folders
  - Click "Add Root Folder"
  - Path: /movies
  - Save
```

### Configure Movie Naming

Consistent naming helps media servers like Plex and Jellyfin match metadata correctly:

```text
Settings > Media Management
  - Enable "Rename Movies"
  - Standard Movie Format:
    {Movie Title} ({Release Year}) [{Quality Title}]
  - Movie Folder Format:
    {Movie Title} ({Release Year})
  - Enable "Create empty movie folders"
```

### Add Indexers

```text
Settings > Indexers > Add
  - Select your indexer type (Newznab for Usenet, Torznab for torrents)
  - Enter the URL and API key
  - Set categories (typically 2000 for Movies on Usenet)
  - Test the connection
  - Save
```

If you use Prowlarr as an indexer manager, it can push indexer configurations to Radarr automatically, saving you from manual configuration.

### Add a Download Client

```text
Settings > Download Clients > Add
  - Select your download client type
  - Host: The IP or hostname of your client
    (use the container name if on a shared Podman network)
  - Port: The client's API port
  - Enter credentials or API key
  - Test and Save
```

### Set Quality Profiles

Radarr comes with default quality profiles, but you can customize them:

```text
Settings > Profiles
  - Edit an existing profile or create a new one
  - Drag quality tiers to set preference order
  - Set minimum and maximum file sizes
  - Choose whether to upgrade existing files when better quality is found
```

---

## Step 5: Add Movies

From the Radarr dashboard:

1. Click the "Add New" button.
2. Search for a movie by title.
3. Select the correct movie from the results.
4. Choose the root folder (`/movies`).
5. Select a quality profile.
6. Choose the minimum availability (announced, in cinemas, released, or pre-DB).
7. Optionally toggle "Start search for missing movie" to begin looking immediately.
8. Click "Add Movie."

### Import an Existing Library

If you already have movies on disk:

```text
Movies > Library Import
  - Point it to /movies
  - Radarr will scan the directory and match folders to movies
  - Review the matches and confirm the import
```

---

## Step 6: Set Up a Shared Network with Other Containers

For a full media stack, put Radarr, your download client, and your indexer on the same Podman network:

```bash
# Create a shared network (skip if you already created one for Sonarr)
podman network create media-net

# Run Radarr on the shared network
podman run -d \
  --name radarr \
  --network media-net \
  -p 7878:7878 \
  -v ~/radarr/config:/config:Z \
  -v ~/media/movies:/movies:z \
  -v ~/downloads:/downloads:z \
  -e PUID=1000 \
  -e PGID=1000 \
  -e TZ=America/New_York \
  --restart unless-stopped \
  lscr.io/linuxserver/radarr:latest
```

On a shared network, use container names as hostnames. For example, if your download client container is named `transmission`, set the host field in Radarr to `transmission`.

---

## Step 7: Configure Notifications (Optional)

Radarr can notify you when movies are grabbed, downloaded, or upgraded:

```text
Settings > Connect > Add
  - Choose a notification type (Email, Slack, Discord, Telegram, etc.)
  - Configure the connection details
  - Select which events trigger notifications:
    - On Grab (download started)
    - On Import (file moved to library)
    - On Upgrade (better quality found)
  - Test and Save
```

---

## Managing the Container

```bash
# View Radarr logs
podman logs --tail 100 radarr

# Follow logs in real time
podman logs -f radarr

# Restart Radarr
podman restart radarr

# Update to the latest version
podman pull lscr.io/linuxserver/radarr:latest
podman stop radarr
podman rm radarr
# Re-run the podman run command with the same flags

# Back up configuration
tar czf ~/radarr-backup-$(date +%Y%m%d).tar.gz ~/radarr/config/
```

---

## Running as a Systemd Service

> **Note:** `podman generate systemd` is deprecated in Podman 4.4 and later. The recommended approach is to use Quadlet files. The legacy method is shown first, followed by the Quadlet approach.

### Legacy Method (podman generate systemd)

```bash
# Generate the systemd unit file (deprecated)
podman generate systemd --name radarr --new --files

# Install and enable
sudo mv container-radarr.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable container-radarr.service
sudo systemctl start container-radarr.service
```

### Recommended Method (Quadlet)

Create a file at `~/.config/containers/systemd/radarr.container` for a rootless service. For a root service, place the file in `/etc/containers/systemd/radarr.container` and replace `%h` with absolute host paths:

```ini
[Unit]
Description=Radarr Container

[Container]
ContainerName=radarr
Image=lscr.io/linuxserver/radarr:latest
PublishPort=7878:7878
Volume=%h/radarr/config:/config:Z
Volume=%h/media/movies:/movies:z
Volume=%h/downloads:/downloads:z
Environment=PUID=1000
Environment=PGID=1000
Environment=TZ=America/New_York

[Service]
Restart=always

[Install]
WantedBy=default.target
```

Then reload and start:

```bash
systemctl --user daemon-reload
systemctl --user start radarr.service
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Downloads complete but are not imported | Ensure the download path is mounted identically in both Radarr and the download client containers |
| Permission errors on files | Verify PUID/PGID match the ownership of host directories |
| Movie not found by indexer | Try a different indexer or check the movie's availability status |
| Connection refused to download client | Use the host IP or container name on a shared network |

---

## Conclusion

Radarr in a Podman container gives you automated movie collection management with a clean separation from the host system. Volume mounts provide access to your downloads and movie library, while a shared Podman network connects Radarr to your download clients and indexers. The result is a hands-off system that monitors your watchlist, finds the quality you want, and organizes everything into a consistent library structure ready for Plex or Jellyfin to serve.
