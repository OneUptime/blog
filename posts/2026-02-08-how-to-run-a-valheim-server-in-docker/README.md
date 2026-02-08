# How to Run a Valheim Server in Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Valheim, Game Server, Containers, Self-Hosted, Gaming, Multiplayer, Steam, Linux

Description: Deploy a dedicated Valheim server in Docker with world persistence, password protection, and mod support for your Viking adventures.

---

Valheim is a Viking survival game that took the gaming world by storm. Its procedurally generated world, cooperative gameplay, and challenging boss fights make it a perfect game for playing with friends. Running a dedicated server lets your world stay online even when you are not playing, and your friends can hop in whenever they want.

Docker is an excellent way to run a Valheim dedicated server. It handles the SteamCMD installation, server binary updates, and process management. The `lloesche/valheim-server` Docker image is the most popular choice, offering automatic updates, backup support, and BepInEx mod compatibility.

## Prerequisites

You need:

- Docker Engine 20.10+
- Docker Compose v2
- At least 2GB of RAM (4GB recommended for larger worlds with more builds)
- Valheim game client on Steam

```bash
# Confirm Docker is installed
docker --version
docker compose version
```

## Quick Start

Get a Valheim server running with one command.

```bash
# Start a Valheim dedicated server
docker run -d \
  --name valheim \
  -p 2456-2458:2456-2458/udp \
  -e SERVER_NAME="My Valheim Server" \
  -e WORLD_NAME="DockerViking" \
  -e SERVER_PASS="vikingpass" \
  -v valheim-config:/config \
  -v valheim-data:/opt/valheim \
  lloesche/valheim-server
```

The server password must be at least 5 characters and cannot be part of the server name.

## Docker Compose Configuration

A full Docker Compose setup with all the important options.

```yaml
# docker-compose.yml - Valheim dedicated server
version: "3.8"

services:
  valheim:
    image: lloesche/valheim-server
    container_name: valheim-server
    ports:
      # Valheim uses three consecutive UDP ports
      - "2456:2456/udp"
      - "2457:2457/udp"
      - "2458:2458/udp"
    environment:
      # Server identity - shown in the server browser
      SERVER_NAME: "Docker Vikings"
      WORLD_NAME: "ValheimWorld"
      SERVER_PASS: "vikingpass123"

      # Server visibility
      # true = visible in community server list
      SERVER_PUBLIC: "true"

      # Automatic update settings
      UPDATE_CRON: "*/15 * * * *"
      UPDATE_IF_IDLE: "true"

      # Automatic backup settings
      BACKUPS: "true"
      BACKUPS_CRON: "0 */2 * * *"
      BACKUPS_DIRECTORY: "/config/backups"
      BACKUPS_MAX_AGE: 7
      BACKUPS_MAX_COUNT: 0
      BACKUPS_IF_IDLE: "true"

      # Timezone for cron schedules
      TZ: "America/New_York"

      # Server configuration
      SERVER_PORT: "2456"

      # Crossplay support (allows Xbox and PC players together)
      ENABLE_CROSSPLAY: "false"

    volumes:
      # Configuration, worlds, and backups
      - valheim-config:/config
      # Server binaries (cached for faster restarts)
      - valheim-data:/opt/valheim
    cap_add:
      - sys_nice
    restart: unless-stopped

volumes:
  valheim-config:
  valheim-data:
```

## Starting the Server

```bash
# Start the server
docker compose up -d

# Follow the logs to watch the server initialize
docker compose logs -f valheim

# The first startup downloads the server via SteamCMD
# This can take several minutes depending on your connection
# Look for: "Game server connected"
```

The first startup takes 5-10 minutes because SteamCMD needs to download the complete server binary (about 1GB).

## Connecting to the Server

### From the Server Browser

1. Open Valheim
2. Click "Start Game" and select your character
3. Click "Join Game"
4. Select the "Community" tab
5. Search for your server name
6. Enter the password when prompted

### Direct Connection

1. Click "Join Game"
2. Click "Join IP"
3. Enter `YOUR_IP:2457` (note: use port 2457, not 2456)
4. Enter the password

```bash
# Find your server's public IP
curl ifconfig.me
```

## Server Administration

Manage your server through the admin list and console.

```bash
# Find your Steam ID (needed for admin access)
# You can find it at steamid.io

# Add yourself as an admin by editing the adminlist
docker exec valheim-server bash -c 'echo "YOUR_STEAM_ID" >> /config/adminlist.txt'

# Add a player to the permitted list (whitelist equivalent)
docker exec valheim-server bash -c 'echo "PLAYER_STEAM_ID" >> /config/permittedlist.txt'

# Ban a player
docker exec valheim-server bash -c 'echo "PLAYER_STEAM_ID" >> /config/bannedlist.txt'
```

Once you are an admin in-game, press F5 to open the console and use admin commands.

```
# In-game console commands (press F5)
kick [name/steamID]
ban [name/steamID]
unban [steamID]
help
info
save
```

## World Management

Valheim worlds are stored in the config volume.

```bash
# List world files
docker exec valheim-server ls -la /config/worlds_local/

# Your world consists of two files:
# ValheimWorld.fwl - world metadata
# ValheimWorld.db  - world data
```

### Migrating an Existing World

If you have an existing world from a local game, you can import it.

```bash
# Copy your world files into the container
docker cp ValheimWorld.fwl valheim-server:/config/worlds_local/
docker cp ValheimWorld.db valheim-server:/config/worlds_local/

# Restart the server to load the imported world
docker compose restart valheim
```

## Backups

The server image handles backups automatically when configured. You can also create manual backups.

```bash
# List existing backups
docker exec valheim-server ls -la /config/backups/

# Create a manual backup by copying files to the host
docker cp valheim-server:/config/worlds_local ./valheim-backup-$(date +%Y%m%d)

# Restore from a backup
docker cp ./valheim-backup-20260101/. valheim-server:/config/worlds_local/
docker compose restart valheim
```

## Installing Mods with BepInEx

The server image supports BepInEx for mod loading.

```yaml
# Add these environment variables to enable BepInEx
environment:
  # Enable the BepInEx mod framework
  BEPINEX: "true"
  # Mods go in /config/bepinex/plugins
```

```bash
# After enabling BepInEx, place mod DLLs in the plugins directory
docker cp MyMod.dll valheim-server:/config/bepinex/plugins/

# Restart the server to load mods
docker compose restart valheim
```

Popular mods include Valheim Plus for quality-of-life improvements and various custom content mods.

## Updating the Server

Updates happen automatically if you configured the `UPDATE_CRON` setting. For manual updates, restart the container.

```bash
# Pull the latest server image
docker compose pull

# Restart - the container automatically updates the Valheim server
docker compose up -d

# Watch the update process in the logs
docker compose logs -f valheim
```

## Performance Monitoring

```bash
# Check resource usage
docker stats valheim-server

# View the server log for performance warnings
docker compose logs valheim | grep -i "warning\|error"
```

Valheim servers are CPU-intensive when the world has many structures. If you notice lag, consider giving the container more CPU resources.

## Stopping and Cleaning Up

```bash
# Stop the server (it saves automatically on shutdown)
docker compose down

# Remove everything including world data
docker compose down -v
```

## Summary

Docker makes hosting a Valheim dedicated server straightforward. The `lloesche/valheim-server` image handles SteamCMD updates, automatic backups, and even BepInEx mod support. Your world data persists in Docker volumes, and the server can update itself on a schedule. Whether you are running a private server for a few friends or a public community server, this Docker-based approach keeps everything organized and reproducible.
