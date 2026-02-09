# How to Run an ARK: Survival Evolved Server in Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, ARK, Survival Evolved, Game Server, Steam, Containers, Self-Hosted, Gaming, Multiplayer

Description: Deploy a dedicated ARK Survival Evolved server in Docker with map configuration, mod support, cluster setup, and taming rate customization.

---

ARK: Survival Evolved is a massive open-world survival game where you tame dinosaurs, build bases, and fight to survive on mysterious islands. The game supports dedicated servers that let communities build persistent worlds. Setting up an ARK server the traditional way involves wrestling with SteamCMD, managing large binary downloads, and tuning dozens of configuration parameters. Docker simplifies this process dramatically.

This guide uses the `hermsi/ark-server` and similar community Docker images to get an ARK server running with minimal effort. The server files are large (around 30GB), so plan for storage and bandwidth.

## Prerequisites

You need:

- Docker Engine 20.10+
- Docker Compose v2
- At least 6GB of RAM (8GB+ recommended)
- At least 50GB of free disk space
- ARK: Survival Evolved on Steam

```bash
# Verify Docker is ready
docker --version
docker compose version
```

## Docker Compose Configuration

Here is a comprehensive Docker Compose setup for an ARK server.

```yaml
# docker-compose.yml - ARK: Survival Evolved dedicated server
version: "3.8"

services:
  ark:
    image: hermsi/ark-server:latest
    container_name: ark-server
    ports:
      # Game client port (UDP)
      - "7777:7777/udp"
      # Raw UDP socket port
      - "7778:7778/udp"
      # Steam query port
      - "27015:27015/udp"
      # RCON port
      - "27020:27020/tcp"
    environment:
      # Session name shown in server browser
      SESSION_NAME: "Docker ARK Server"

      # Server passwords
      SERVER_PASSWORD: ""
      ADMIN_PASSWORD: "arkadminpass"

      # Map selection
      # TheIsland, TheCenter, Ragnarok, Aberration_P, Extinction,
      # ScorchedEarth_P, Valguero_P, Genesis, CrystalIsles,
      # LostIsland, Fjordur
      MAP: "TheIsland"

      # Server settings
      MAX_PLAYERS: 20

      # Enable RCON for remote administration
      ENABLE_RCON: "true"

      # Automatic updates on container start
      UPDATE_ON_START: "true"

      # Game settings
      DIFFICULTY: 1.0

    volumes:
      # Server binaries and save data
      - ark-server:/ark
      # Game save files
      - ark-saves:/ark/server/ShooterGame/Saved
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 8G

volumes:
  ark-server:
  ark-saves:
```

## Alternative Image: Using ark-server-tools

Another popular approach uses a different Docker image with more built-in management tools.

```yaml
# docker-compose.yml - Using turzam/ark image
version: "3.8"

services:
  ark:
    image: turzam/ark:latest
    container_name: ark-server
    ports:
      - "7777:7777/udp"
      - "7778:7778/udp"
      - "27015:27015/udp"
      - "27020:27020/tcp"
    environment:
      SESSIONNAME: "Docker ARK Server"
      SERVERMAP: "TheIsland"
      SERVERPASSWORD: ""
      ADMINPASSWORD: "arkadminpass"
      NBPLAYERS: 20
      UPDATEONSTART: 1
      BACKUPONSTART: 1
      SERVERPORT: 27015
      TZ: "America/New_York"
    volumes:
      - ark-data:/ark
    restart: unless-stopped

volumes:
  ark-data:
```

## Starting the Server

```bash
# Start the server in the background
docker compose up -d

# Watch the download and startup process
docker compose logs -f ark

# The first startup downloads ~30GB of server files
# This takes a long time - be patient
```

The first startup is slow because the ARK server binary is approximately 30GB. Once downloaded, subsequent starts are much faster.

## Connecting to the Server

### Through the In-Game Browser

1. Open ARK: Survival Evolved
2. Click "Join ARK"
3. Filter by "Unofficial" servers
4. Search for your server name in the session filter
5. Click "Join"

### Direct Connection via Steam

1. Open Steam
2. Go to View > Game Servers
3. Click "Favorites" then "Add a Server"
4. Enter `YOUR_IP:27015`
5. Click "Add this address to favorites"
6. Connect through the server browser

### Console Command

Open the in-game console and type:

```
open YOUR_IP:7777
```

## Server Configuration

ARK has hundreds of configuration options. The most important ones go in `GameUserSettings.ini` and `Game.ini`.

### GameUserSettings.ini

```bash
# Access the configuration file inside the container
docker exec -it ark-server bash
# Edit: /ark/server/ShooterGame/Saved/Config/LinuxServer/GameUserSettings.ini
```

Common settings to adjust.

```ini
; GameUserSettings.ini - Key server settings
[ServerSettings]
DifficultyOffset=1.0
ServerPassword=
ServerAdminPassword=arkadminpass
MaxPlayers=20
MapPlayerLocation=True
AllowThirdPersonPlayer=True
ShowFloatingDamageText=True
RCONEnabled=True
RCONPort=27020

; XP and taming rates
XPMultiplier=2.0
TamingSpeedMultiplier=3.0
HarvestAmountMultiplier=2.0

; Breeding rates
MatingIntervalMultiplier=0.5
EggHatchSpeedMultiplier=3.0
BabyMatureSpeedMultiplier=5.0
BabyCuddleIntervalMultiplier=0.5

; Player stats
PlayerCharacterWaterDrainMultiplier=0.5
PlayerCharacterFoodDrainMultiplier=0.5
PlayerCharacterStaminaDrainMultiplier=0.5

; Dino settings
DinoCountMultiplier=1.0
DinoDamageMultiplier=1.0
DinoResistanceMultiplier=1.0

; Structure settings
StructureResistanceMultiplier=1.0
PvEStructureDecayPeriodMultiplier=1.0
PerPlatformMaxStructuresMultiplier=1.5

[/Script/ShooterGame.ShooterGameMode]
bDisableStructureDecayPvE=True
```

### Game.ini

```ini
; Game.ini - Per-level stat multipliers and engram overrides
[/script/shootergame.shootergamemode]
MatingIntervalMultiplier=0.5
EggHatchSpeedMultiplier=3.0
BabyMatureSpeedMultiplier=5.0
bAllowFlyerCarryPvE=True
MaxTribeLogs=200
```

## RCON Administration

Use RCON to manage the server remotely.

```bash
# Install mcrcon for RCON access
# Or use a graphical RCON client

# Common RCON commands
# List online players
docker exec ark-server arkmanager rconcmd "ListPlayers"

# Broadcast a message
docker exec ark-server arkmanager rconcmd "ServerChat Hello everyone!"

# Save the world
docker exec ark-server arkmanager rconcmd "SaveWorld"

# White-list a player
docker exec ark-server arkmanager rconcmd "AllowPlayerToJoinNoCheck STEAM_ID"

# Ban a player
docker exec ark-server arkmanager rconcmd "BanPlayer STEAM_ID"

# Force a wild dino wipe (respawns all wild dinos)
docker exec ark-server arkmanager rconcmd "DestroyWildDinos"
```

## Adding Mods

ARK supports Steam Workshop mods on dedicated servers.

```bash
# Add mod IDs to the server startup configuration
# Find mod IDs on the Steam Workshop page for ARK

# Set the ActiveMods parameter in GameUserSettings.ini
# Example with S+ (731604991) and Awesome SpyGlass (1404697612)
docker exec ark-server bash -c 'echo "ActiveMods=731604991,1404697612" >> /ark/server/ShooterGame/Saved/Config/LinuxServer/GameUserSettings.ini'

# Restart the server to download and install mods
docker compose restart ark
```

## Backup and Restore

ARK worlds take a long time to build, so regular backups are essential.

```bash
# Save the world first
docker exec ark-server arkmanager rconcmd "SaveWorld"
sleep 10

# Create a backup of the save files
docker cp ark-server:/ark/server/ShooterGame/Saved ./ark-backup-$(date +%Y%m%d)

# Set up automated daily backups with cron
# Add to crontab (crontab -e):
0 4 * * * docker exec ark-server arkmanager rconcmd "SaveWorld" && sleep 10 && docker cp ark-server:/ark/server/ShooterGame/Saved /backups/ark-$(date +\%Y\%m\%d)
```

## Running a Cluster

ARK clusters let players transfer characters and dinos between maps.

```yaml
# docker-compose.yml - ARK cluster with two maps
version: "3.8"

services:
  ark-island:
    image: hermsi/ark-server:latest
    container_name: ark-island
    ports:
      - "7777:7777/udp"
      - "7778:7778/udp"
      - "27015:27015/udp"
    environment:
      SESSION_NAME: "Cluster - The Island"
      MAP: "TheIsland"
      ADMIN_PASSWORD: "arkadminpass"
      MAX_PLAYERS: 20
    volumes:
      - ark-island:/ark
      # Shared cluster directory for character transfers
      - ark-cluster:/ark/server/ShooterGame/Saved/clusters
    restart: unless-stopped

  ark-ragnarok:
    image: hermsi/ark-server:latest
    container_name: ark-ragnarok
    ports:
      - "7779:7777/udp"
      - "7780:7778/udp"
      - "27016:27015/udp"
    environment:
      SESSION_NAME: "Cluster - Ragnarok"
      MAP: "Ragnarok"
      ADMIN_PASSWORD: "arkadminpass"
      MAX_PLAYERS: 20
    volumes:
      - ark-ragnarok:/ark
      # Same shared cluster directory
      - ark-cluster:/ark/server/ShooterGame/Saved/clusters
    restart: unless-stopped

volumes:
  ark-island:
  ark-ragnarok:
  ark-cluster:
```

## Updating the Server

```bash
# Pull the latest image
docker compose pull

# Recreate containers - server updates on startup
docker compose up -d

# Monitor the update
docker compose logs -f ark
```

## Troubleshooting

### Server Not Showing in Browser

```bash
# Check that all ports are correctly mapped
docker compose ps

# Verify the server is fully started
docker compose logs ark | tail -20

# Ensure Steam query port 27015 is open
```

### Out of Memory

ARK servers use a lot of memory. If the container keeps restarting, increase the memory limit.

```bash
# Check current memory usage
docker stats ark-server
```

## Stopping and Cleaning Up

```bash
# Save the world before stopping
docker exec ark-server arkmanager rconcmd "SaveWorld"
sleep 10
docker compose down

# Remove everything including the 30GB+ server files
docker compose down -v
```

## Summary

Running an ARK: Survival Evolved server in Docker tames the complexity of managing a 30GB+ game server. Docker Compose provides a declarative configuration for maps, mods, player limits, and game rates. The container handles SteamCMD updates automatically, and shared volumes enable cluster setups where players can transfer between maps. With proper backup routines and RCON administration, you can run a reliable ARK server for your community.
