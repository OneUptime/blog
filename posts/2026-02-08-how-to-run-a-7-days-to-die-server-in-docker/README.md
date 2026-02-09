# How to Run a 7 Days to Die Server in Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, 7 Days to Die, Game Server, Containers, Self-Hosted, Gaming, Multiplayer, Survival, Zombie

Description: Deploy a dedicated 7 Days to Die server in Docker with world customization, blood moon settings, player management, and automated backups.

---

7 Days to Die combines survival horror, tower defense, and crafting in a zombie apocalypse setting. Every seven in-game days, a blood moon horde descends on players, making base building and resource management critical. Running a dedicated server lets your group maintain a persistent world where players can log in and out freely, and the game keeps running.

Docker takes the pain out of managing a 7 Days to Die server. Instead of installing SteamCMD, managing library dependencies, and editing XML configuration files by hand, you configure everything through Docker Compose and let the container handle the rest.

## Prerequisites

You need:

- Docker Engine 20.10+
- Docker Compose v2
- At least 4GB of RAM (8GB recommended for larger maps)
- 7 Days to Die on Steam

```bash
# Verify Docker
docker --version
docker compose version
```

## Docker Compose Configuration

Here is a complete Docker Compose setup for a 7 Days to Die server.

```yaml
# docker-compose.yml - 7 Days to Die dedicated server
version: "3.8"

services:
  7dtd:
    image: vinanrra/7dtd-server:latest
    container_name: 7dtd-server
    ports:
      # Game port (TCP and UDP)
      - "26900:26900/tcp"
      - "26900:26900/udp"
      # Additional game ports
      - "26901:26901/udp"
      - "26902:26902/udp"
      # Telnet port for server console
      - "8081:8081/tcp"
      # Web dashboard (Allocs server fixes)
      - "8080:8080/tcp"
    environment:
      # Start mode: 0 = update and start, 1 = just update, 2 = just start
      START_MODE: 0

      # Server version: latest, stable, or a specific build number
      VERSION: "latest"

      # Server configuration
      SERVER_NAME: "Docker 7DTD Server"
      SERVER_PASSWORD: ""
      SERVER_PORT: 26900
      MAX_PLAYERS: 8

      # World settings
      WORLD_GEN_SEED: "DockerWorld"
      WORLD_GEN_SIZE: 6144
      GAME_WORLD: "RWG"
      GAME_NAME: "Docker World"

      # Difficulty and gameplay
      GAME_DIFFICULTY: 2
      GAME_MODE: "GameModeSurvival"

      # Blood moon settings
      BLOOD_MOON_FREQUENCY: 7
      BLOOD_MOON_RANGE: 0
      BLOOD_MOON_ENEMY_COUNT: 8

      # Day/night cycle
      DAY_NIGHT_LENGTH: 60
      DAY_LIGHT_LENGTH: 18

      # Loot and experience
      LOOT_ABUNDANCE: 100
      LOOT_RESPAWN_DAYS: 7
      XP_MULTIPLIER: 100

      # Zombie settings
      ENEMY_SPAWN_MODE: "true"
      ENEMY_DIFFICULTY: 0

      # Drop on death: 0 = nothing, 1 = everything, 2 = toolbelt, 3 = backpack, 4 = delete all
      DROP_ON_DEATH: 1
      DROP_ON_QUIT: 0

      # Telnet access for remote console
      TELNET_ENABLED: "true"
      TELNET_PORT: 8081
      TELNET_PASSWORD: "telnet_pass"

      # Admin settings
      ADMIN_FILENAME: "serveradmin.xml"

      # Timezone
      TZ: "America/New_York"

    volumes:
      # Server data and saves
      - 7dtd-data:/home/sdtdserver
      # World saves
      - 7dtd-saves:/home/sdtdserver/.local/share/7DaysToDie
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 8G

volumes:
  7dtd-data:
  7dtd-saves:
```

## Starting the Server

```bash
# Start the server
docker compose up -d

# Follow the logs - the first startup downloads ~12GB of server files
docker compose logs -f 7dtd

# Look for "GameServer.Init successful" to confirm the server is ready
```

The first startup takes a while because SteamCMD needs to download the server binary and the world needs to be generated. Random World Generation (RWG) for a 6144-size map can take 10-15 minutes.

## Connecting to the Server

1. Open 7 Days to Die
2. Click "Join a Game"
3. Click "Connect to IP"
4. Enter your server's IP address and port 26900
5. Enter the password if one is set

For internet access, make sure port 26900 (TCP and UDP) is forwarded on your router.

## Server Console

Access the server console through Telnet for real-time management.

```bash
# Connect to the server console via Telnet
telnet localhost 8081
# Enter the telnet password when prompted

# Or use docker exec
docker exec -it 7dtd-server bash -c "telnet localhost 8081"
```

Common console commands.

```
# List connected players
listplayers

# Send a message to all players
say "Blood moon is coming tonight!"

# Give an item to a player
give PlayerName gunHandgunT3Magnum44 1

# Teleport a player
teleportplayer PlayerName 100 80 200

# Set time to day
settime day

# Set time to night
settime night

# Spawn entity
spawnentity PlayerName zombieBoe

# Kick a player
kick PlayerName "Reason"

# Ban a player
ban add PlayerName 1 year "Reason"

# Save the world
saveworld

# Shut down gracefully
shutdown
```

## Admin Configuration

Set up admin accounts by editing the admin file.

```bash
# Create or edit the server admin configuration
docker exec -it 7dtd-server bash

# Edit the admin file
# Located at: /home/sdtdserver/.local/share/7DaysToDie/Saves/serveradmin.xml
```

```xml
<!-- serveradmin.xml - Admin, moderator, and whitelist configuration -->
<?xml version="1.0" encoding="UTF-8"?>
<adminTools>
  <users>
    <!-- Permission levels: 0 = admin, 1 = moderator, 2 = elevated player -->
    <user platform="Steam" userid="YOUR_STEAM_ID" name="YourName" permission_level="0" />
  </users>
  <whitelist>
    <!-- Add players to the whitelist (only needed if whitelist is enabled) -->
    <user platform="Steam" userid="FRIEND_STEAM_ID" name="FriendName" />
  </whitelist>
  <blacklist>
    <!-- Banned players -->
  </blacklist>
</adminTools>
```

## Customizing World Generation

Adjust the Random World Generation settings to create different types of worlds.

```yaml
# Smaller world for fewer players
environment:
  WORLD_GEN_SIZE: 4096
  WORLD_GEN_SEED: "SmallWorld"

# Large world for many players
environment:
  WORLD_GEN_SIZE: 8192
  WORLD_GEN_SEED: "BigWorld"
```

Available world sizes: 2048, 3072, 4096, 5120, 6144, 7168, 8192. Larger worlds use more RAM and take longer to generate.

## Blood Moon Configuration

The blood moon is the defining feature of 7 Days to Die. Customize it to your preference.

```yaml
# Weekly blood moon with moderate difficulty
environment:
  BLOOD_MOON_FREQUENCY: 7
  BLOOD_MOON_RANGE: 0
  BLOOD_MOON_ENEMY_COUNT: 8

# Frequent blood moons for intense gameplay
environment:
  BLOOD_MOON_FREQUENCY: 3
  BLOOD_MOON_RANGE: 0
  BLOOD_MOON_ENEMY_COUNT: 16

# Disable blood moons for a building-focused server
environment:
  BLOOD_MOON_FREQUENCY: 0
```

## Backup and Restore

Protect your world with regular backups.

```bash
# Save the world first
docker exec -it 7dtd-server bash -c "echo 'saveworld' | telnet localhost 8081"

# Copy save files to the host
docker cp 7dtd-server:/home/sdtdserver/.local/share/7DaysToDie/Saves ./7dtd-backup-$(date +%Y%m%d)

# Restore from a backup
docker compose down
docker cp ./7dtd-backup-20260101/. 7dtd-server:/home/sdtdserver/.local/share/7DaysToDie/Saves/
docker compose up -d
```

Automated backup script.

```bash
#!/bin/bash
# backup-7dtd.sh - Run this from cron every 4 hours
BACKUP_DIR="/backups/7dtd"
DATE=$(date +%Y%m%d-%H%M)

# Save the world
docker exec 7dtd-server bash -c 'echo "saveworld" | telnet localhost 8081' 2>/dev/null
sleep 10

# Create the backup
mkdir -p "$BACKUP_DIR"
docker cp 7dtd-server:/home/sdtdserver/.local/share/7DaysToDie/Saves "$BACKUP_DIR/saves-$DATE"

# Remove backups older than 7 days
find "$BACKUP_DIR" -type d -mtime +7 -exec rm -rf {} +

echo "Backup completed: $BACKUP_DIR/saves-$DATE"
```

## Mods and Modlets

7 Days to Die supports modlets that can be placed in the Mods folder.

```bash
# Create a mods directory on the host
mkdir -p mods

# Copy modlet folders into the mods directory
# Each modlet should have a ModInfo.xml file

# Mount the mods directory in docker-compose.yml
# Add to volumes:
# - ./mods:/home/sdtdserver/.local/share/7DaysToDie/Mods
```

## Updating the Server

```bash
# Set START_MODE to 0 to update on startup
# Then restart the container
docker compose restart 7dtd

# Or pull the latest image and recreate
docker compose pull
docker compose up -d

# Watch the update logs
docker compose logs -f 7dtd
```

## Performance Tips

- Reduce `WORLD_GEN_SIZE` if you have limited RAM
- Lower `BLOOD_MOON_ENEMY_COUNT` to reduce CPU load during horde nights
- Set `DAY_NIGHT_LENGTH` to 120 for longer days (less frequent blood moons per real time)
- Limit `MAX_PLAYERS` to match your server's capacity

## Stopping and Cleaning Up

```bash
# Save and shut down gracefully
docker exec -it 7dtd-server bash -c 'echo "saveworld" | telnet localhost 8081'
sleep 5
docker compose down

# Remove everything including world data
docker compose down -v
```

## Summary

Docker simplifies running a 7 Days to Die dedicated server by handling the SteamCMD installation, server binary management, and process lifecycle. Configure your zombie apocalypse through environment variables, from blood moon frequency to loot abundance. With proper backups and admin tools, you can run a reliable community server that keeps the hordes coming and the bases standing.
