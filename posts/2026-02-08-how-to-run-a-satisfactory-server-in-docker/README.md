# How to Run a Satisfactory Server in Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Satisfactory, Game Server, Containers, Self-Hosted, Gaming, Multiplayer, Factory Building

Description: Deploy a dedicated Satisfactory server in Docker with save management, server settings, and automated maintenance for collaborative factory building.

---

Satisfactory is a first-person factory building game set on an alien planet. Players design and construct multi-story factories, automate production lines with conveyor belts, and explore a vast open world. The multiplayer mode lets teams collaborate on factory projects, and a dedicated server keeps the world available around the clock.

Docker makes hosting a Satisfactory dedicated server straightforward. The `wolveix/satisfactory-server` image handles the SteamCMD download, server binary management, and save file persistence. This guide walks through the complete setup.

## Prerequisites

You need:

- Docker Engine 20.10+
- Docker Compose v2
- At least 6GB of RAM (Satisfactory servers are memory-intensive)
- At least 15GB of free disk space
- Satisfactory game client on Steam or Epic Games

```bash
# Verify Docker
docker --version
docker compose version
```

## Quick Start

Run a Satisfactory server with one command.

```bash
# Start a Satisfactory dedicated server
docker run -d \
  --name satisfactory \
  -p 7777:7777/udp \
  -p 7777:7777/tcp \
  -v satisfactory-data:/config \
  -e MAXPLAYERS=8 \
  -e AUTOPAUSE=true \
  wolveix/satisfactory-server:latest
```

## Docker Compose Configuration

A complete Docker Compose setup with all relevant settings.

```yaml
# docker-compose.yml - Satisfactory dedicated server
version: "3.8"

services:
  satisfactory:
    image: wolveix/satisfactory-server:latest
    container_name: satisfactory-server
    hostname: satisfactory
    ports:
      # Game port (TCP and UDP required)
      - "7777:7777/udp"
      - "7777:7777/tcp"
    environment:
      # Maximum number of concurrent players
      MAXPLAYERS: 8

      # Auto-pause when no players are connected
      AUTOPAUSE: "true"

      # Auto-save interval in seconds (300 = 5 minutes)
      AUTOSAVEINTERVAL: 300

      # Maximum auto-save files to keep
      AUTOSAVENUM: 5

      # Crash reporting
      DISABLESEASONALEVENTS: "false"

      # Network quality: 0 = low, 1 = medium, 2 = high, 3 = ultra
      NETWORKQUALITY: 3

      # Server query port
      SERVERQUERYPORT: 15777

      # Beacon port
      BEACONPORT: 15000

      # Game port
      GAMEPORT: 7777

      # Set to true to skip update check on startup
      SKIPUPDATE: "false"

      # Timeout for SteamCMD updates (seconds)
      STEAMBETA: "false"

    volumes:
      # All server data including saves, configs, and binaries
      - satisfactory-data:/config
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 8G
        reservations:
          memory: 6G

volumes:
  satisfactory-data:
```

## Starting the Server

```bash
# Start the server
docker compose up -d

# Follow the logs to monitor the download and startup
docker compose logs -f satisfactory

# First startup downloads ~5GB of server files
# Wait for the "Server is ready" message
```

The first launch takes several minutes as SteamCMD downloads the Satisfactory dedicated server. Subsequent starts are much faster.

## Connecting to the Server

### Initial Setup Through the Game

1. Open Satisfactory
2. Click "Server Manager" from the main menu
3. Click "Add Server"
4. Enter your server IP address and port 7777
5. Click "Confirm"
6. The first time you connect, you need to set the admin password
7. Create a new game or upload a save file

This initial setup through the game client is required. The server starts in an unclaimed state and needs a player to claim it, set the admin password, and create or load a game session.

### Subsequent Connections

After initial setup, players can join through the Server Manager or through the in-game session list if the server is set to visible.

## Server Administration

Administration is primarily done through the in-game Server Manager interface. Connect to the server and access the admin panel.

### Admin Password

The admin password is set during initial server claim. To reset it, you can modify the server settings file.

```bash
# Find and edit the game settings file
docker exec -it satisfactory-server bash
# The settings are stored in:
# /config/gamefiles/FactoryGame/Saved/Config/LinuxServer/Game.ini
# /config/gamefiles/FactoryGame/Saved/Config/LinuxServer/ServerSettings.ini
```

### Server Settings File

```bash
# View the current server settings
docker exec satisfactory-server cat /config/gamefiles/FactoryGame/Saved/Config/LinuxServer/ServerSettings.ini
```

Key settings you can modify.

```ini
; ServerSettings.ini
[/Script/FactoryGame.FGServerSubsystem]
mAutoSaveInterval=300.000000
mServerName=Docker Factory Server
```

## Save Management

Satisfactory saves are stored inside the Docker volume.

```bash
# List available save files
docker exec satisfactory-server ls -la /config/gamefiles/FactoryGame/Saved/SaveGames/server/

# Copy a save to the host for backup
docker cp satisfactory-server:/config/gamefiles/FactoryGame/Saved/SaveGames ./satisfactory-saves-backup

# Upload a save from a local game
docker cp your-save-file.sav satisfactory-server:/config/gamefiles/FactoryGame/Saved/SaveGames/server/
```

### Uploading a Single-Player Save

If you want to migrate a single-player world to the dedicated server, follow these steps.

1. Find your save file (usually in `%LOCALAPPDATA%/FactoryGame/Saved/SaveGames/` on Windows)
2. Copy it into the server

```bash
# Copy your single-player save into the server
docker cp "MySave_autosave_0.sav" satisfactory-server:/config/gamefiles/FactoryGame/Saved/SaveGames/server/

# Restart the server
docker compose restart satisfactory

# Then load the save through the Server Manager in-game
```

## Automated Backups

Set up a cron job for regular backups.

```bash
#!/bin/bash
# backup-satisfactory.sh - Automated backup script
BACKUP_DIR="/backups/satisfactory"
DATE=$(date +%Y%m%d-%H%M)
SAVE_DIR="/config/gamefiles/FactoryGame/Saved/SaveGames"

mkdir -p "$BACKUP_DIR"

# Copy saves from the container
docker cp satisfactory-server:"$SAVE_DIR" "$BACKUP_DIR/saves-$DATE"

# Remove backups older than 14 days
find "$BACKUP_DIR" -type d -mtime +14 -exec rm -rf {} +

echo "Satisfactory backup completed: $DATE"
```

```bash
# Add to crontab (crontab -e) - run every 6 hours
0 */6 * * * /path/to/backup-satisfactory.sh
```

## Performance Optimization

Satisfactory servers use significant resources, especially as factories grow.

### Memory Management

```yaml
# For small factories (1-4 players)
deploy:
  resources:
    limits:
      memory: 6G

# For large factories (5-8 players)
deploy:
  resources:
    limits:
      memory: 12G

# For megabases
deploy:
  resources:
    limits:
      memory: 16G
```

### Network Quality

Set the network quality based on your server's bandwidth.

| Setting | Value | Recommended For |
|---------|-------|----------------|
| Low | 0 | Limited bandwidth |
| Medium | 1 | Standard connections |
| High | 2 | Good bandwidth |
| Ultra | 3 | Dedicated hosting |

### Auto-Pause

Enable auto-pause to reduce resource usage when no one is playing.

```yaml
environment:
  AUTOPAUSE: "true"
```

This pauses the game simulation when no players are connected, saving CPU and preventing unnecessary world updates.

## Updating the Server

Satisfactory receives regular updates during early access.

```bash
# The server checks for updates on startup by default
# To force an update, restart the container
docker compose restart satisfactory

# Or pull the latest Docker image and recreate
docker compose pull
docker compose up -d

# Watch the update process
docker compose logs -f satisfactory
```

For major game updates, it is a good idea to back up your saves first.

```bash
# Back up before updating
docker cp satisfactory-server:/config/gamefiles/FactoryGame/Saved/SaveGames ./pre-update-backup
docker compose pull
docker compose up -d
```

## Running Multiple Servers

You can run multiple Satisfactory servers on different ports.

```yaml
# docker-compose.yml - Multiple Satisfactory servers
version: "3.8"

services:
  satisfactory-main:
    image: wolveix/satisfactory-server:latest
    container_name: satisfactory-main
    ports:
      - "7777:7777/udp"
      - "7777:7777/tcp"
    environment:
      MAXPLAYERS: 8
      AUTOPAUSE: "true"
    volumes:
      - main-data:/config
    restart: unless-stopped

  satisfactory-creative:
    image: wolveix/satisfactory-server:latest
    container_name: satisfactory-creative
    ports:
      - "7778:7777/udp"
      - "7778:7777/tcp"
    environment:
      MAXPLAYERS: 4
      AUTOPAUSE: "true"
    volumes:
      - creative-data:/config
    restart: unless-stopped

volumes:
  main-data:
  creative-data:
```

## Troubleshooting

### Cannot Connect to Server

```bash
# Verify the server is running
docker compose ps

# Check for errors in the logs
docker compose logs satisfactory | tail -50

# Make sure both TCP and UDP on port 7777 are open
# This is a common mistake - Satisfactory needs both protocols
```

### Server Crashes Under Load

Increase the memory limit. Large factories with many conveyor belts and machines consume a lot of RAM.

```bash
# Check current memory usage
docker stats satisfactory-server
```

### Saves Not Loading

If saves fail to load after an update, check version compatibility in the logs.

```bash
docker compose logs satisfactory | grep -i "save\|version\|error"
```

## Stopping and Cleaning Up

```bash
# Stop the server (it auto-saves on shutdown)
docker compose down

# Remove everything including all factory data
docker compose down -v
```

## Summary

Running a Satisfactory dedicated server in Docker keeps your factory world alive around the clock. The container handles SteamCMD updates, save persistence, and auto-saving. Initial setup requires connecting through the in-game Server Manager to claim the server and create a game session. Plan for generous memory allocation because Satisfactory factories grow fast and consume RAM accordingly. With automated backups and the auto-pause feature, you get a reliable server that is efficient to run and easy to maintain.
