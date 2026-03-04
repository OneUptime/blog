# How to Run a Minecraft Server in Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Minecraft, Game Server, Java, Containers, Self-Hosted, Gaming, DevOps

Description: Set up and run a Minecraft Java Edition dedicated server in Docker with custom world settings, mod support, and automated backups.

---

Running a Minecraft server has always been a rite of passage for anyone who enjoys both gaming and tinkering with servers. The traditional approach involves installing Java, downloading the server JAR, configuring properties files, and hoping your Java version matches. Docker cuts through all of that complexity. With one container, you get a fully configured Minecraft server that is easy to update, back up, and manage.

The community-maintained `itzg/minecraft-server` Docker image is the gold standard for running Minecraft in containers. It supports vanilla servers, Forge, Fabric, Paper, Spigot, and many other server types. This guide covers everything from a basic vanilla setup to modded servers with plugins.

## Prerequisites

You need:

- Docker Engine 20.10+
- Docker Compose v2
- At least 2GB of RAM (4GB recommended for a comfortable experience)
- Minecraft Java Edition client for testing

```bash
# Verify Docker is installed
docker --version
docker compose version
```

## Quick Start

The fastest way to get a Minecraft server running.

```bash
# Start a vanilla Minecraft server with a single command
docker run -d \
  --name minecraft \
  -p 25565:25565 \
  -e EULA=TRUE \
  -e MEMORY=2G \
  -v mc-data:/data \
  itzg/minecraft-server
```

That is it. Connect to `localhost:25565` from your Minecraft client.

## Docker Compose Setup

For a more manageable setup with persistent configuration, use Docker Compose.

```yaml
# docker-compose.yml - Minecraft Java Edition server
version: "3.8"

services:
  minecraft:
    image: itzg/minecraft-server
    container_name: minecraft-server
    ports:
      # Default Minecraft port
      - "25565:25565"
    environment:
      # Accept the Minecraft EULA (required)
      EULA: "TRUE"

      # Server type: VANILLA, FORGE, FABRIC, PAPER, SPIGOT, BUKKIT
      TYPE: "VANILLA"

      # Minecraft version - use LATEST for the newest release
      VERSION: "LATEST"

      # Memory allocation for the JVM
      MEMORY: "2G"

      # Server configuration
      SERVER_NAME: "My Docker Server"
      MOTD: "Welcome to our Minecraft server!"
      MAX_PLAYERS: 20
      DIFFICULTY: "normal"
      MODE: "survival"
      VIEW_DISTANCE: 10
      SPAWN_PROTECTION: 0

      # World settings
      LEVEL_TYPE: "minecraft:normal"
      SEED: ""
      GENERATE_STRUCTURES: "true"

      # Whitelist and ops
      ENABLE_WHITELIST: "false"
      OPS: "YourMinecraftUsername"

      # Performance settings
      MAX_TICK_TIME: 60000
      ENABLE_COMMAND_BLOCK: "true"

    volumes:
      # Persist all server data including worlds
      - mc-data:/data
    restart: unless-stopped

    # Resource limits prevent the server from consuming all host resources
    deploy:
      resources:
        limits:
          memory: 3G

volumes:
  mc-data:
```

## Starting the Server

```bash
# Start the server in the background
docker compose up -d

# Watch the server logs - wait for "Done" message
docker compose logs -f minecraft

# You should see something like:
# [Server thread/INFO]: Done (12.345s)! For help, type "help"
```

The first startup takes longer because it downloads the Minecraft server JAR and generates the world.

## Server Console Access

You can interact with the Minecraft server console directly through Docker.

```bash
# Attach to the server console (type commands directly)
docker attach minecraft-server

# Detach from the console without stopping: press Ctrl+P then Ctrl+Q

# Or send individual commands without attaching
docker exec minecraft-server rcon-cli say Hello everyone!
docker exec minecraft-server rcon-cli list
docker exec minecraft-server rcon-cli op YourUsername
docker exec minecraft-server rcon-cli difficulty hard
```

## Running a Paper Server

Paper is a high-performance fork of Spigot that supports plugins and has better performance.

```yaml
# docker-compose.yml - Paper server with plugins support
version: "3.8"

services:
  minecraft:
    image: itzg/minecraft-server
    container_name: minecraft-paper
    ports:
      - "25565:25565"
    environment:
      EULA: "TRUE"
      TYPE: "PAPER"
      VERSION: "1.21"
      MEMORY: "3G"
      MOTD: "Paper Server - High Performance"
      MAX_PLAYERS: 30
    volumes:
      - mc-data:/data
      # Mount a local plugins directory
      - ./plugins:/data/plugins
    restart: unless-stopped

volumes:
  mc-data:
```

Download plugin JAR files into the `./plugins` directory on your host, and Paper will load them on startup.

## Running a Forge Modded Server

Forge lets you run modpacks with custom content.

```yaml
# docker-compose.yml - Forge modded server
version: "3.8"

services:
  minecraft:
    image: itzg/minecraft-server
    container_name: minecraft-forge
    ports:
      - "25565:25565"
    environment:
      EULA: "TRUE"
      TYPE: "FORGE"
      VERSION: "1.20.1"
      MEMORY: "4G"
      # You can specify a specific Forge version
      FORGE_VERSION: "47.2.0"
    volumes:
      - mc-data:/data
      # Place mod files in this directory
      - ./mods:/data/mods
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 5G

volumes:
  mc-data:
```

Place your `.jar` mod files in the `./mods` directory before starting the server.

## Whitelist Management

Control who can join your server.

```bash
# Enable the whitelist
docker exec minecraft-server rcon-cli whitelist on

# Add a player to the whitelist
docker exec minecraft-server rcon-cli whitelist add PlayerName

# Remove a player from the whitelist
docker exec minecraft-server rcon-cli whitelist remove PlayerName

# View the current whitelist
docker exec minecraft-server rcon-cli whitelist list
```

## Automated Backups

Set up automated backups using a companion container.

```yaml
# Add this service to your docker-compose.yml
services:
  # Backup service - creates periodic world backups
  backup:
    image: itzg/mc-backup
    container_name: minecraft-backup
    environment:
      # Back up every 2 hours
      BACKUP_INTERVAL: "2h"
      # Keep backups from the last 7 days
      PRUNE_BACKUPS_DAYS: 7
      # Pause saving during backup to prevent corruption
      RCON_HOST: minecraft
      RCON_PORT: 25575
      RCON_PASSWORD: minecraft
    volumes:
      - mc-data:/data:ro
      - mc-backups:/backups
    depends_on:
      - minecraft

volumes:
  mc-backups:
```

You can also create manual backups.

```bash
# Create a manual backup by copying the world directory
docker compose exec minecraft rcon-cli save-all
docker compose exec minecraft rcon-cli save-off

# Copy the world data out to your host
docker cp minecraft-server:/data/world ./world-backup-$(date +%Y%m%d)

# Re-enable saving
docker compose exec minecraft rcon-cli save-on
```

## Performance Tuning

Optimize your server for better performance.

```bash
# Monitor server performance with TPS (ticks per second)
docker exec minecraft-server rcon-cli tps

# Adjust view distance in server.properties for better performance
# Lower values reduce server load - 6-8 is good for constrained setups
docker exec minecraft-server rcon-cli gamerule viewDistance 8
```

For Paper servers, you can tune additional settings in the `paper-global.yml` and `paper-world-defaults.yml` files located in the `/data/config` directory.

## Updating the Server

Updating is simple because Docker handles the version management.

```bash
# Stop the server gracefully
docker compose exec minecraft rcon-cli stop

# Pull the latest image
docker compose pull

# Start with the new version
docker compose up -d
```

Your world data is preserved in the Docker volume, so updates are safe.

## Monitoring Server Health

```bash
# Check if the server is responding
docker exec minecraft-server mc-health

# View current players
docker exec minecraft-server rcon-cli list

# Check resource usage
docker stats minecraft-server
```

## Stopping and Cleaning Up

```bash
# Stop the server gracefully
docker compose exec minecraft rcon-cli stop
docker compose down

# Remove everything including worlds (careful!)
docker compose down -v
```

## Summary

Docker makes running a Minecraft server incredibly straightforward. The `itzg/minecraft-server` image handles Java versions, server downloads, and configuration through environment variables. Whether you want a simple vanilla server for friends, a Paper server with plugins, or a Forge modded setup, the process starts with a Docker Compose file and a single command. Add automated backups and resource limits, and you have a production-ready game server that is easy to maintain and update.
