# How to Run a Palworld Server in Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Palworld, Game Server, Containers, Self-Hosted, Gaming, Multiplayer, Steam

Description: Set up a dedicated Palworld server in Docker with custom world settings, player management, and automated backups for your creature-collecting adventures.

---

Palworld exploded in popularity as a survival crafting game where you capture, breed, and put creatures called Pals to work. The multiplayer experience is significantly better on a dedicated server because the world stays online and multiple players can explore and build simultaneously without the host needing to be connected.

Docker simplifies the Palworld server setup considerably. Instead of managing SteamCMD installations, library dependencies, and server binaries manually, you configure everything through environment variables and let the container handle the rest.

## Prerequisites

You need:

- Docker Engine 20.10+
- Docker Compose v2
- At least 8GB of RAM (Palworld servers are memory-hungry)
- Palworld game client on Steam

```bash
# Confirm Docker is installed
docker --version
docker compose version
```

Palworld's dedicated server has high memory requirements. Plan for at least 8GB of RAM for a server with several active players. The memory usage grows as players explore more of the world.

## Quick Start

Get a Palworld server running quickly.

```bash
# Start a Palworld dedicated server
docker run -d \
  --name palworld \
  -p 8211:8211/udp \
  -p 27015:27015/udp \
  -e PUID=1000 \
  -e PGID=1000 \
  -e PORT=8211 \
  -e PLAYERS=16 \
  -e MULTITHREADING=true \
  -e COMMUNITY=false \
  -v palworld-data:/palworld \
  thijsvanloef/palworld-server-docker:latest
```

## Docker Compose Configuration

A comprehensive Docker Compose setup with game settings.

```yaml
# docker-compose.yml - Palworld dedicated server
version: "3.8"

services:
  palworld:
    image: thijsvanloef/palworld-server-docker:latest
    container_name: palworld-server
    ports:
      # Game port (UDP)
      - "8211:8211/udp"
      # Query port for server browser
      - "27015:27015/udp"
      # RCON port for remote administration
      - "25575:25575/tcp"
    environment:
      # Linux user/group IDs for file permissions
      PUID: 1000
      PGID: 1000

      # Server network settings
      PORT: 8211
      PLAYERS: 16
      MULTITHREADING: "true"

      # Server identity
      SERVER_NAME: "Docker Palworld Server"
      SERVER_PASSWORD: "palpass123"
      ADMIN_PASSWORD: "adminpass456"
      SERVER_DESCRIPTION: "A friendly Palworld server running in Docker"

      # Community server listing
      COMMUNITY: "false"

      # RCON for remote management
      RCON_ENABLED: "true"
      RCON_PORT: 25575

      # Automatic updates
      UPDATE_ON_BOOT: "true"

      # Automatic backups
      BACKUP_ENABLED: "true"
      BACKUP_CRON_EXPRESSION: "0 */2 * * *"
      DELETE_OLD_BACKUPS: "true"
      OLD_BACKUP_DAYS: 7

      # Timezone
      TZ: "America/New_York"

      # Game world settings
      DIFFICULTY: "None"
      DAY_TIME_SPEED_RATE: 1.0
      NIGHT_TIME_SPEED_RATE: 1.0
      EXP_RATE: 1.0
      PAL_CAPTURE_RATE: 1.0
      PAL_SPAWN_NUM_RATE: 1.0
      PAL_DAMAGE_RATE_ATTACK: 1.0
      PAL_DAMAGE_RATE_DEFENSE: 1.0
      PLAYER_DAMAGE_RATE_ATTACK: 1.0
      PLAYER_DAMAGE_RATE_DEFENSE: 1.0
      PLAYER_STOMACH_DECREASE_RATE: 1.0
      PLAYER_STAMINA_DECREASE_RATE: 1.0
      PLAYER_AUTO_HP_REGEN_RATE: 1.0
      PLAYER_AUTO_HP_REGEN_RATE_IN_SLEEP: 1.0
      BUILD_OBJECT_DAMAGE_RATE: 1.0
      BUILD_OBJECT_DETERIORATION_DAMAGE_RATE: 1.0
      COLLECTION_DROP_RATE: 1.0
      COLLECTION_OBJECT_HP_RATE: 1.0
      COLLECTION_OBJECT_RESPAWN_SPEED_RATE: 1.0
      ENEMY_DROP_ITEM_RATE: 1.0
      DEATH_PENALTY: "All"
      ENABLE_PLAYER_TO_PLAYER_DAMAGE: "false"
      ENABLE_FRIENDLY_FIRE: "false"
      ENABLE_INVADER_ENEMY: "true"
      ACTIVE_UNKO: "false"
      ENABLE_AIM_ASSIST_PAD: "true"
      ENABLE_AIM_ASSIST_KEYBOARD: "false"
      DROP_ITEM_MAX_NUM: 3000
      BASE_CAMP_MAX_NUM: 128
      BASE_CAMP_WORKER_MAX_NUM: 15
      DROP_ITEM_ALIVE_MAX_HOURS: 1.0
      COOP_PLAYER_MAX_NUM: 4
      GUILD_PLAYER_MAX_NUM: 20

    volumes:
      - palworld-data:/palworld
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 12G

volumes:
  palworld-data:
```

## Starting the Server

```bash
# Start the server
docker compose up -d

# Watch the startup logs
docker compose logs -f palworld

# First startup downloads the server (~5GB)
# Wait for "Setting breakpad minidump AppID = 2394010"
```

The first startup downloads the Palworld dedicated server binary through SteamCMD, which is about 5GB. Subsequent starts are much faster.

## Connecting to the Server

1. Open Palworld
2. Select "Join Multiplayer Game"
3. Enter your server IP and port: `YOUR_IP:8211`
4. Enter the server password when prompted

For LAN play, use the host machine's local IP address. For internet play, forward UDP port 8211 on your router.

## Server Administration with RCON

RCON lets you manage the server remotely.

```bash
# Install an RCON client (or use the built-in one)
# Using the container's built-in RCON
docker exec palworld-server rcon-cli "ShowPlayers"

# Broadcast a message to all players
docker exec palworld-server rcon-cli "Broadcast Hello_Everyone"

# Save the world
docker exec palworld-server rcon-cli "Save"

# Kick a player by Steam ID
docker exec palworld-server rcon-cli "KickPlayer STEAM_ID"

# Ban a player
docker exec palworld-server rcon-cli "BanPlayer STEAM_ID"

# Shut down the server gracefully (with 30 second warning)
docker exec palworld-server rcon-cli "Broadcast Server_shutting_down_in_30_seconds"
sleep 30
docker exec palworld-server rcon-cli "Shutdown 1"
```

## Customizing World Settings

The game world settings control the difficulty and gameplay experience. Here are some popular configuration presets.

### Relaxed/Casual Settings

```yaml
# Easier gameplay with higher rates
environment:
  EXP_RATE: 2.0
  PAL_CAPTURE_RATE: 1.5
  COLLECTION_DROP_RATE: 2.0
  ENEMY_DROP_ITEM_RATE: 2.0
  PLAYER_DAMAGE_RATE_DEFENSE: 0.5
  PLAYER_STOMACH_DECREASE_RATE: 0.5
  PLAYER_STAMINA_DECREASE_RATE: 0.5
  DEATH_PENALTY: "None"
```

### Hardcore Settings

```yaml
# Challenging gameplay with lower rates
environment:
  EXP_RATE: 0.5
  PAL_CAPTURE_RATE: 0.7
  PLAYER_DAMAGE_RATE_DEFENSE: 2.0
  PLAYER_STOMACH_DECREASE_RATE: 2.0
  PLAYER_STAMINA_DECREASE_RATE: 1.5
  DEATH_PENALTY: "All"
  ENABLE_PLAYER_TO_PLAYER_DAMAGE: "true"
  ENABLE_INVADER_ENEMY: "true"
```

## Backup and Restore

The server creates automatic backups if configured. You can also manage backups manually.

```bash
# Create a manual backup
docker exec palworld-server backup

# List available backups
docker exec palworld-server ls -la /palworld/backups/

# Copy a backup to the host
docker cp palworld-server:/palworld/backups ./palworld-backups

# Restore from a specific backup
docker exec palworld-server restore BACKUP_FILE_NAME
```

## Updating the Server

Palworld receives frequent updates, especially in early access.

```bash
# The server updates automatically on boot if UPDATE_ON_BOOT is true
# To force an update, restart the container
docker compose restart palworld

# Or pull the latest Docker image and recreate
docker compose pull
docker compose up -d

# Watch the update process
docker compose logs -f palworld
```

## Monitoring Server Performance

```bash
# Check memory and CPU usage
docker stats palworld-server

# View current players
docker exec palworld-server rcon-cli "ShowPlayers"

# Check the server logs for warnings
docker compose logs palworld | tail -50
```

Palworld servers can use significant memory. If you see the server crashing or becoming unresponsive, increase the memory limit in the Docker Compose file.

## Running Multiple Servers

You can run multiple Palworld servers on different ports.

```yaml
# docker-compose.yml - Multiple Palworld servers
version: "3.8"

services:
  palworld-pve:
    image: thijsvanloef/palworld-server-docker:latest
    container_name: palworld-pve
    ports:
      - "8211:8211/udp"
      - "27015:27015/udp"
    environment:
      SERVER_NAME: "PvE Server"
      ENABLE_PLAYER_TO_PLAYER_DAMAGE: "false"
      PORT: 8211
      PLAYERS: 16
    volumes:
      - pve-data:/palworld
    restart: unless-stopped

  palworld-pvp:
    image: thijsvanloef/palworld-server-docker:latest
    container_name: palworld-pvp
    ports:
      - "8212:8211/udp"
      - "27016:27015/udp"
    environment:
      SERVER_NAME: "PvP Server"
      ENABLE_PLAYER_TO_PLAYER_DAMAGE: "true"
      PORT: 8211
      PLAYERS: 16
    volumes:
      - pvp-data:/palworld
    restart: unless-stopped

volumes:
  pve-data:
  pvp-data:
```

## Troubleshooting

### Server Not Appearing in Browser

```bash
# Check if the server is running
docker compose ps

# Verify UDP ports are mapped correctly
docker compose logs palworld | grep -i "port\|listen"

# Make sure COMMUNITY is set to true for public listing
```

### High Memory Usage

Palworld servers leak memory over time. Scheduled restarts help.

```bash
# Add a cron job to restart the server daily at 4 AM
0 4 * * * cd /path/to/project && docker compose restart palworld
```

## Stopping and Cleaning Up

```bash
# Save and stop gracefully
docker exec palworld-server rcon-cli "Save"
docker exec palworld-server rcon-cli "Shutdown 1"
sleep 10
docker compose down

# Remove everything including world data
docker compose down -v
```

## Summary

Running a Palworld dedicated server in Docker gives you a persistent world for multiplayer adventures. The setup handles SteamCMD downloads, automatic updates, and periodic backups. Customize the world settings through environment variables to create the exact gameplay experience you want. With RCON support, you can manage players and administer the server remotely. Just remember that Palworld servers are memory-intensive, so allocate at least 8GB of RAM and consider scheduled restarts to keep performance stable.
