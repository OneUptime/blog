# How to Run a 7 Days to Die Server in Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, 7 Days to Die, Game Server, Container, Self-Hosted, Gaming, Multiplayer, Survival, Zombie

Description: Deploy a dedicated 7 Days to Die server in Docker with world customization, blood moon settings, player management, and automated backups.

---

7 Days to Die combines survival horror, tower defense, and crafting in a zombie apocalypse setting. Every seven in-game days, a blood moon horde descends on players, making base building and resource management critical. Running a dedicated server lets your group maintain a persistent world where players can log in and out freely, and the game keeps running.

Docker takes the pain out of managing a 7 Days to Die server. Instead of installing SteamCMD and managing library dependencies by hand, you use Docker Compose for the container lifecycle and edit the generated server XML files from a mounted host directory.

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
      # Web admin
      - "8080:8080/tcp"
      # Alloc Fixes map GUI, if enabled
      - "8082:8082/tcp"
    environment:
      # Start mode: 1 = start, 3 = update and start
      START_MODE: 1

      # Server branch/version
      VERSION: "stable"

      # Match these to your host user's UID/GID
      PUID: 1000
      PGID: 1000

      # Timezone
      TimeZone: "America/New_York"

      # Built-in backup scheduler
      BACKUP: "YES"
      BACKUP_HOUR: 5
      BACKUP_MAX: 7

    volumes:
      # World saves and generated maps
      - ./7DaysToDie:/home/sdtdserver/.local/share/7DaysToDie/
      # LinuxGSM configuration
      - ./LGSM-Config:/home/sdtdserver/lgsm/config-lgsm/sdtdserver/
      # Server files, including sdtdserver.xml and Mods
      - ./ServerFiles:/home/sdtdserver/serverfiles/
      # Logs and backups
      - ./logs:/home/sdtdserver/log/
      - ./backups:/home/sdtdserver/lgsm/backup/
    ulimits:
      nofile:
        soft: 10240
        hard: 10240
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 8G
```

Gameplay settings such as server name, world generation, blood moon frequency, loot, and Telnet settings are stored in `./ServerFiles/sdtdserver.xml` after the first install. Edit the matching XML properties there, then restart the container.

```xml
<property name="ServerName" value="Docker 7DTD Server"/>
<property name="ServerPassword" value=""/>
<property name="ServerPort" value="26900"/>
<property name="ServerMaxPlayerCount" value="8"/>

<property name="GameWorld" value="RWG"/>
<property name="WorldGenSeed" value="DockerWorld"/>
<property name="WorldGenSize" value="6144"/>
<property name="GameName" value="Docker World"/>
<property name="GameMode" value="GameModeSurvival"/>

<property name="GameDifficulty" value="2"/>
<property name="BloodMoonFrequency" value="7"/>
<property name="BloodMoonRange" value="0"/>
<property name="BloodMoonEnemyCount" value="8"/>
<property name="DayNightLength" value="60"/>
<property name="DayLightLength" value="18"/>
<property name="LootAbundance" value="100"/>
<property name="LootRespawnDays" value="7"/>
<property name="XPMultiplier" value="100"/>
<property name="EnemySpawnMode" value="true"/>
<property name="EnemyDifficulty" value="0"/>
<property name="DropOnDeath" value="1"/>
<property name="DropOnQuit" value="0"/>

<property name="TelnetEnabled" value="true"/>
<property name="TelnetPort" value="8081"/>
<property name="TelnetPassword" value="telnet_pass"/>
<property name="AdminFileName" value="serveradmin.xml"/>
```

## Starting the Server

```bash
# Start the server
docker compose up -d

# Follow the logs - the first startup downloads about 12GB of server files
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

For internet access, make sure ports 26900 TCP/UDP, 26901 UDP, and 26902 UDP are forwarded on your router.

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

```text
# List connected players
listplayers

# Send a message to all players
say "Blood moon is coming tonight!"

# Give an item to a player (requires Alloc Fixes)
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
<?xml version="1.0" encoding="UTF-8"?>
<!-- serveradmin.xml - Admin, moderator, and whitelist configuration -->
<adminTools>
  <admins>
    <!-- Permission levels run from 0-1000; 0 is the highest level -->
    <user platform="Steam" userid="YOUR_STEAM_ID" name="YourName" permission_level="0" />
  </admins>
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

```xml
<!-- Smaller world for fewer players -->
<property name="WorldGenSize" value="4096"/>
<property name="WorldGenSeed" value="SmallWorld"/>

<!-- Large world for many players -->
<property name="WorldGenSize" value="8192"/>
<property name="WorldGenSeed" value="BigWorld"/>
```

World sizes must be multiples of 2048 between 2048 and 16384. Larger worlds use more RAM and take longer to generate.

## Blood Moon Configuration

The blood moon is the defining feature of 7 Days to Die. Customize it to your preference.

```xml
<!-- Weekly blood moon with moderate difficulty -->
<property name="BloodMoonFrequency" value="7"/>
<property name="BloodMoonRange" value="0"/>
<property name="BloodMoonEnemyCount" value="8"/>

<!-- Frequent blood moons for intense gameplay -->
<property name="BloodMoonFrequency" value="3"/>
<property name="BloodMoonRange" value="0"/>
<property name="BloodMoonEnemyCount" value="16"/>

<!-- Disable blood moons for a building-focused server -->
<property name="BloodMoonFrequency" value="0"/>
```

## Backup and Restore

Protect your world with regular backups.

```bash
# Run the container's backup script
docker exec 7dtd-server ./scripts/server_backup.sh

# Backups are written to ./backups as tar.gz archives

# Restore from a backup
docker compose down
mkdir -p ./restore
tar -xzf ./backups/sdtdserver-2026-01-01-050000.tar.gz -C ./restore
rm -rf ./7DaysToDie/*
cp -a ./restore/home/sdtdserver/.local/share/7DaysToDie/. ./7DaysToDie/
rm -rf ./restore
docker compose up -d
```

Automated backup script.

```bash
#!/bin/bash
# backup-7dtd.sh - Run this from cron every 4 hours
BACKUP_DIR="/backups/7dtd"
DATE=$(date +%Y%m%d-%H%M)

# Create the backup
docker exec 7dtd-server ./scripts/server_backup.sh
mkdir -p "$BACKUP_DIR"
LATEST_BACKUP=$(ls -t ./backups/*.tar.gz | head -n 1)
cp "$LATEST_BACKUP" "$BACKUP_DIR/sdtdserver-$DATE.tar.gz"

# Remove backups older than 7 days
find "$BACKUP_DIR" -type f -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/sdtdserver-$DATE.tar.gz"
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
# - ./mods:/home/sdtdserver/serverfiles/Mods
```

## Updating the Server

```bash
# Set START_MODE to 3 to update on startup
# Then recreate the container
docker compose up -d

# Or pull the latest image and recreate
docker compose pull
docker compose up -d

# Watch the update logs
docker compose logs -f 7dtd
```

## Performance Tips

- Reduce `WorldGenSize` if you have limited RAM
- Lower `BloodMoonEnemyCount` to reduce CPU load during horde nights
- Set `DayNightLength` to 120 for longer days (less frequent blood moons per real time)
- Limit `ServerMaxPlayerCount` to match your server's capacity

## Stopping and Cleaning Up

```bash
# Save and shut down gracefully
docker exec 7dtd-server ./sdtdserver stop
docker compose down

# Remove the container and network
docker compose down

# Bind-mounted world data remains in ./7DaysToDie, ./ServerFiles, and ./backups
```

## Summary

Docker simplifies running a 7 Days to Die dedicated server by handling the SteamCMD installation, server binary management, and process lifecycle. Configure your zombie apocalypse in `sdtdserver.xml`, from blood moon frequency to loot abundance. With proper backups and admin tools, you can run a reliable community server that keeps the hordes coming and the bases standing.
