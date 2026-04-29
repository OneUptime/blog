# How to Deploy a Minecraft Server via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Minecraft, Game Server, Docker, Self-Hosted

Description: Deploy and manage a Minecraft Java or Bedrock server using Portainer with persistent worlds, plugins, and automated backups.

## Introduction

Minecraft is one of the most popular games in the world, and running your own dedicated server lets you have full control over your world, mods, and player management. The `itzg/minecraft-server` Docker image is the gold standard for containerized Minecraft servers, and Portainer makes managing it incredibly simple with a visual interface.

## Prerequisites

- Portainer installed with Docker
- At least 2 GB RAM for small servers (4-8 GB for larger servers with mods)
- Port 25565 available (default Minecraft port)
- Sufficient disk space (worlds can grow large)

## Step 1: Deploy Minecraft Server via Portainer Stack

Create a new stack in Portainer:

```yaml
# docker-compose.yml for Minecraft Server

version: "3.8"

services:
  minecraft:
    image: itzg/minecraft-server:latest
    container_name: minecraft
    restart: unless-stopped
    tty: true
    stdin_open: true
    ports:
      - "25565:25565"     # Minecraft Java Edition
      - "25575:25575"     # RCON for remote console
    volumes:
      # Persist world data, plugins, configs
      - minecraft-data:/data
    environment:
      # Accept the Minecraft EULA (required)
      - EULA=TRUE
      
      # Server type: VANILLA, PAPER, SPIGOT, FABRIC, FORGE
      - TYPE=PAPER
      
      # Minecraft version
      - VERSION=1.21.1
      
      # Server settings
      - DIFFICULTY=normal
      - MODE=survival
      - MAX_PLAYERS=20
      - MAX_WORLD_SIZE=10000
      - ONLINE_MODE=true
      - PVP=true
      - SPAWN_PROTECTION=16
      - VIEW_DISTANCE=10
      - SIMULATION_DISTANCE=8
      
      # JVM memory settings
      - MEMORY=2G
      - JVM_OPTS=-XX:+UseG1GC -XX:+ParallelRefProcEnabled
      
      # Server message
      - MOTD=Welcome to our Minecraft Server!
      
      # RCON for remote admin
      - ENABLE_RCON=true
      - RCON_PASSWORD=${RCON_PASSWORD}
      - RCON_PORT=25575
      
      # Whitelist
      - ENABLE_WHITELIST=false
      
      # Automated backups
      - ENABLE_AUTOPAUSE=false
    healthcheck:
      test: mc-health
      interval: 60s
      timeout: 30s
      retries: 5
      start_period: 120s
    logging:
      driver: json-file
      options:
        max-size: "100m"
        max-file: "5"
    networks:
      - minecraft-net

  # RCON web interface for admin
  rcon-web:
    image: itzg/rcon:latest
    container_name: rcon-web
    restart: unless-stopped
    ports:
      - "4326:4326"     # RCON web UI
      - "4327:4327"     # RCON websocket
    environment:
      - RWA_PASSWORD=${RCON_WEB_PASSWORD}
      - RWA_ADMIN=true
    volumes:
      - rcon-data:/opt/rcon-web-admin/db
    networks:
      - minecraft-net

  # Automated backup service
  minecraft-backup:
    image: itzg/mc-backup:latest
    container_name: minecraft-backup
    restart: unless-stopped
    depends_on:
      - minecraft
    volumes:
      - minecraft-data:/data:ro
      - minecraft-backups:/backups
    environment:
      # Run backup every 6 hours
      - BACKUP_INTERVAL=6h
      - PRUNE_BACKUPS_DAYS=7
      - RCON_HOST=minecraft
      - RCON_PORT=25575
      - RCON_PASSWORD=${RCON_PASSWORD}
      # Pause server saves during backup
      - INITIAL_DELAY=120s
    networks:
      - minecraft-net

volumes:
  minecraft-data:
  rcon-data:
  minecraft-backups:

networks:
  minecraft-net:
    driver: bridge
```

## Step 2: Configure Server Properties

Customize your server settings via environment variables or by editing `server.properties`. Access via Portainer console:

```bash
# Access Minecraft container console
# Portainer > Containers > minecraft > Console

# Common server.properties settings
# These can also be set via environment variables in the compose file:
# LEVEL_SEED=your-world-seed
# ALLOW_NETHER=true
# GENERATE_STRUCTURES=true
# LEVEL_TYPE=DEFAULT
# RESOURCE_PACK=https://url-to-resource-pack.zip
```

## Step 3: Install Plugins (Paper/Spigot)

For Paper/Spigot servers, add plugins:

```yaml
# Additional environment variables for plugin management
environment:
  # Auto-download specific plugins from direct JAR URLs
  # Use YAML's literal block scalar (|) for newline-delimited URLs
  PLUGINS: |
    https://ci.lucko.me/job/LuckPerms/lastSuccessfulBuild/artifact/bukkit/loader/build/libs/LuckPerms-Bukkit.jar
```

Or copy plugins via Portainer volumes:

```bash
# Copy plugin JAR to the plugins directory
docker cp my-plugin.jar minecraft:/data/plugins/my-plugin.jar
# Restart or reload plugins
docker exec minecraft rcon-cli reload
```

## Step 4: Manage the Server

Common admin commands via RCON:

```bash
# Access RCON via Portainer console
docker exec -it minecraft rcon-cli

# Common admin commands
list                         # Show online players
whitelist add username       # Add to whitelist
op username                  # Give operator
gamemode creative username   # Change gamemode
give username diamond 64     # Give items
time set day                 # Set time
weather clear 600            # Clear weather
save-all                     # Save world
stop                         # Stop server
```

## Step 5: Monitor Server Performance

View server stats from Portainer:

1. Go to **Containers** > `minecraft`
2. Click **Stats** to see CPU/memory usage
3. Check logs for performance warnings

```bash
# Monitor TPS (ticks per second) - should be close to 20
# In RCON console
/tps

# Check memory via JVM
# Look for "JVM running for" in logs
docker logs minecraft | grep -E "(TPS|memory|Error|Warn)" | tail -50
```

## Step 6: Upgrade Minecraft Version

Safely update the server version:

1. Create a backup first (the backup service should have recent backups)
2. Edit the stack in Portainer
3. Update the `VERSION` environment variable
4. Click **Update the stack**
5. Monitor logs for successful startup

```bash
# Before updating, save the world
docker exec minecraft rcon-cli save-all
docker exec minecraft rcon-cli stop
```

## Step 7: Configure for Modded Minecraft (Forge/Fabric)

For modded servers, change the type:

```yaml
environment:
  - TYPE=FORGE
  - VERSION=1.20.1
  - FORGE_VERSION=47.1.3
  
  # Or for Fabric
  - TYPE=FABRIC
  - VERSION=1.20.1
  - FABRIC_LOADER_VERSION=0.15.0
  
  # Auto-install mods from CurseForge/Modrinth
  - CF_API_KEY=${CURSEFORGE_API_KEY}
  - MODRINTH_PROJECTS=sodium:latest,lithium:latest,iris:latest
```

## Conclusion

Deploying a Minecraft server via Portainer provides the perfect balance of simplicity and power. The `itzg/minecraft-server` image handles automatic updates, plugin management, and JVM optimization, while Portainer's visual interface makes it easy to configure, monitor, and manage your server. With automated backups included in the stack, you'll never lose your world data, making this setup suitable for long-running community servers.
