# How to Set Up a DLNA Media Server on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, DLNA, Media Server, Streaming, Home Network

Description: Guide to setting up a DLNA media server on Ubuntu using MiniDLNA and Plex, enabling media streaming to TVs, game consoles, and other DLNA-compatible devices on your local network.

---

DLNA (Digital Living Network Alliance) is a protocol standard that lets media devices on your network discover and stream content from a server. Smart TVs, game consoles (PS4/PS5, Xbox), Blu-ray players, and many media players support DLNA natively. Setting up a DLNA server on Ubuntu means your media library is accessible without manually copying files to USB drives.

## Choosing a DLNA Server

Two main options:

- **MiniDLNA (ReadyMedia)**: Lightweight, minimal setup, pure DLNA. Good for embedded systems and dedicated file servers.
- **Plex Media Server**: Full-featured, transcoding, web interface, mobile apps, remote access. More overhead but much better user experience.

## Option 1: MiniDLNA Setup

### Installation

```bash
sudo apt-get update
sudo apt-get install -y minidlna

# Check version
minidlnad -V
```

### Configuration

The main config file is at `/etc/minidlna.conf`:

```bash
sudo nano /etc/minidlna.conf
```

Configure the key options:

```ini
# Media directories - specify type before path
# A = audio, V = video, P = photos, or leave blank for all types
media_dir=V,/home/user/Videos
media_dir=A,/home/user/Music
media_dir=P,/home/user/Pictures

# Friendly name shown to DLNA clients
friendly_name=Ubuntu Media Server

# Network interface to listen on (leave blank for all)
network_interface=eth0

# Port for DLNA (default is fine for most setups)
port=8200

# Database location
db_dir=/var/cache/minidlna

# Log location
log_dir=/var/log/minidlna

# Enable notifications when new files are added
inotify=yes

# Notify interval in seconds
notify_interval=895

# Presentation URL (web status page)
# presentation_url=http://192.168.1.100:8200/

# Enable strict DLNA compliance
# strict_dlna=no

# Album art support
album_art_names=Cover.jpg/cover.jpg/AlbumArtSmall.jpg/albumartsmall.jpg
```

### Starting MiniDLNA

```bash
# Enable and start the service
sudo systemctl enable minidlna
sudo systemctl start minidlna

# Check status
sudo systemctl status minidlna

# Force rescan of media directories
sudo systemctl stop minidlna
sudo rm -f /var/cache/minidlna/files.db
sudo systemctl start minidlna

# Or trigger rescan without stopping
sudo minidlnad -R
```

### Setting Permissions

MiniDLNA needs read access to your media directories:

```bash
# Add the minidlna user to your user's group (or vice versa)
sudo usermod -aG $(id -gn) minidlna

# Make sure media directories are readable
chmod -R 755 /home/user/Videos
chmod -R 755 /home/user/Music
chmod -R 755 /home/user/Pictures

# Restart after permission changes
sudo systemctl restart minidlna
```

### Checking the Status Page

MiniDLNA has a basic web interface:

```bash
# Check what's accessible
curl http://localhost:8200/

# Or open in browser: http://YOUR_IP:8200/
# Shows files indexed, tasks, etc.
```

### Viewing Logs

```bash
# Watch MiniDLNA logs
sudo journalctl -u minidlna -f

# Or the direct log file
tail -f /var/log/minidlna/minidlna.log
```

## Option 2: Plex Media Server

Plex offers transcoding, a polished web interface, mobile apps, and remote access through Plex.tv. The free tier covers local streaming; Plex Pass adds additional features.

### Installation

```bash
# Download the latest .deb from https://www.plex.tv/media-server-downloads/
# Or add the Plex repository
curl https://downloads.plex.tv/plex-keys/PlexSign.key | sudo apt-key add -
echo "deb https://downloads.plex.tv/repo/deb public main" | sudo tee /etc/apt/sources.list.d/plexmediaserver.list

sudo apt-get update
sudo apt-get install -y plexmediaserver

# Enable and start Plex
sudo systemctl enable plexmediaserver
sudo systemctl start plexmediaserver
```

### Initial Setup

After installation, access the Plex web interface from the server itself:

```bash
# Open on the server machine
xdg-open http://localhost:32400/web
# Or from another machine: http://SERVER_IP:32400/web
```

Walk through the web setup wizard to:
1. Sign in to or create a Plex account
2. Add media libraries (Movies, TV Shows, Music)
3. Point each library to your media directories

### Configuring Plex Media Libraries

From the web interface, go to Settings -> Libraries -> Add Library:

- **Movies**: Add `/home/user/Movies` - Plex auto-matches movie metadata
- **TV Shows**: Add `/home/user/TVShows` - Plex scans for series/season/episode structure
- **Music**: Add `/home/user/Music` - scans for music with embedded tags

For Plex to properly organize TV shows, use the naming convention:
```
/TVShows/Show Name/Season 01/Show Name - S01E01 - Episode Title.mkv
```

### Setting Permissions for Plex

```bash
# Add plex user to the group that owns your media
sudo usermod -aG $(id -gn) plex

# Ensure media is readable
find /home/user/Videos -type d -exec chmod 755 {} \;
find /home/user/Videos -type f -exec chmod 644 {} \;

# Restart Plex
sudo systemctl restart plexmediaserver
```

### Plex Transcoding

Plex can transcode media on-the-fly for clients that don't support the original codec. For hardware-accelerated transcoding (with Plex Pass):

```bash
# For Intel Quick Sync transcoding, add plex to render group
sudo usermod -aG render plex

# For NVIDIA transcoding
sudo usermod -aG video plex

# Check transcoding is working in Plex Dashboard -> Active Streams
```

## Configuring the Firewall

Allow DLNA traffic through the firewall:

```bash
# MiniDLNA ports
sudo ufw allow 8200/tcp    # HTTP status
sudo ufw allow 1900/udp    # SSDP discovery
sudo ufw allow 49152:65535/tcp  # UPnP random ports

# Plex ports
sudo ufw allow 32400/tcp   # Main Plex port
sudo ufw allow 1900/udp    # DLNA
sudo ufw allow 32469/tcp   # Plex DLNA server
sudo ufw allow 32410:32414/udp  # GDM network discovery
```

## Testing DLNA Discovery

From another device on the same network:

```bash
# Test SSDP discovery from Linux client
sudo apt-get install -y gupnp-tools

# Discover UPnP/DLNA devices
gssdp-discover -i eth0 --target urn:schemas-upnp-org:device:MediaServer:1

# Or use a dedicated DLNA client for testing
sudo apt-get install -y djmount

# Mount DLNA server as a filesystem
sudo mkdir /mnt/dlna
sudo djmount /mnt/dlna -o allow_other
ls /mnt/dlna
```

## Managing Media with Proper File Structure

Both MiniDLNA and Plex work better with organized media:

```
/home/user/
├── Videos/
│   ├── Movies/
│   │   ├── The Matrix (1999)/
│   │   │   └── The Matrix (1999).mkv
│   │   └── Inception (2010)/
│   │       └── Inception (2010).mp4
│   └── TV Shows/
│       └── Breaking Bad/
│           ├── Season 01/
│           │   ├── Breaking Bad - S01E01 - Pilot.mkv
│           │   └── Breaking Bad - S01E02 - Cat's in the Bag.mkv
│           └── Season 02/
├── Music/
│   └── Artist Name/
│       └── Album Name/
│           ├── 01 - Track Name.flac
│           └── 02 - Track Name.flac
└── Pictures/
    └── 2024/
        ├── vacation/
        └── events/
```

## Automation: Auto-Add New Media

Keep MiniDLNA's index current when new files are added:

```bash
# MiniDLNA with inotify=yes (set in config) auto-detects new files

# For Plex, schedule library scans
# In Plex Web: Settings -> Troubleshooting -> Clean Bundles / Empty Trash

# Or automate via Plex API
PLEX_TOKEN="your-plex-token"
curl "http://localhost:32400/library/sections/all/refresh?X-Plex-Token=${PLEX_TOKEN}"
```

## Troubleshooting

### DLNA server not visible on network

```bash
# Verify service is listening
sudo ss -tlnup | grep 8200

# Check firewall
sudo ufw status

# Verify multicast is working
sudo ip maddr show | grep 239.255.255

# Test discovery from same machine
curl http://localhost:8200/rootDesc.xml
```

### MiniDLNA shows 0 files

```bash
# Check the database
sudo systemctl stop minidlna
sudo rm /var/cache/minidlna/files.db
sudo systemctl start minidlna

# Watch the log during initial scan
sudo journalctl -u minidlna -f

# Verify minidlna can access the media directory
sudo -u minidlna ls /home/user/Videos
```

### Plex not finding media files

Check file naming conventions and permissions. Plex requires files to follow standard naming patterns to match metadata. Use the Plex Media Scanner tool:

```bash
sudo -u plex /usr/lib/plexmediaserver/Plex\ Media\ Scanner --analyze --section 1
```

With a properly configured DLNA server, any compatible device on your network can browse and stream your media library without additional software installation.
