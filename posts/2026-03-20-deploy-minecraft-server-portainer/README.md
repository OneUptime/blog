# How to Deploy a Minecraft Server via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Minecraft, Game Server, Portainer, Docker, Self-Hosted, Gaming

Description: Deploy a Minecraft Java Edition server using Portainer with persistent world data, configurable server properties, and support for mods and plugins.

---

Running your own Minecraft server on Docker via Portainer gives you full control over the game version, mods, and world data - all with easy updates and backups through the Portainer interface.

## Step 1: Deploy via Portainer Stack

The `itzg/minecraft-server` image is the community standard for Dockerized Minecraft:

```yaml
# minecraft-stack.yml

version: "3.8"

services:
  minecraft:
    image: itzg/minecraft-server:latest
    environment:
      # Accept the EULA (required by Mojang)
      - EULA=TRUE
      # Server type: VANILLA, SPIGOT, PAPER, FORGE, FABRIC
      - TYPE=PAPER
      # Minecraft version
      - VERSION=1.20.4
      # Memory allocation
      - MEMORY=4G
      # Server properties
      - MAX_PLAYERS=20
      - DIFFICULTY=normal
      - MODE=survival
      - SERVER_NAME=My Portainer Server
      - MOTD=A Minecraft server deployed with Portainer!
      - PVP=true
      - ENABLE_WHITELIST=false
      # Enable RCON for admin commands
      - RCON_PASSWORD=rcon_secure_password
      - ENABLE_RCON=true
    volumes:
      # Persistent world and configuration data
      - minecraft-data:/data
    ports:
      - "25565:25565"    # Java Edition game port
      - "25575:25575"    # RCON admin port (restrict to trusted IPs)
    restart: unless-stopped
    tty: true
    stdin_open: true

volumes:
  minecraft-data:
```

## Step 2: Install Plugins (Paper/Spigot)

For Paper servers, place plugin JARs in the plugins directory. Map a local directory to install plugins:

```yaml
    volumes:
      - minecraft-data:/data
      # Mount a local plugins directory for easy plugin management
      - /opt/minecraft/plugins:/data/plugins
```

Download popular plugins to `/opt/minecraft/plugins/`:

```bash
# EssentialsX - essential commands
wget -O /opt/minecraft/plugins/EssentialsX.jar \
  https://github.com/EssentialsX/Essentials/releases/download/2.20.1/EssentialsX-2.20.1.jar

# LuckPerms - permissions management
wget -O /opt/minecraft/plugins/LuckPerms.jar \
  https://ci.lucko.me/job/LuckPerms/lastSuccessfulBuild/artifact/bukkit/loader/build/libs/LuckPerms-Bukkit-5.5.42.jar
```

## Step 3: Manage the Server via RCON

Send admin commands without accessing the container console:

```bash
# Connect to the RCON console via the docker exec or a client
docker exec -it minecraft-minecraft-1 rcon-cli

# Or use the mcrcon client
# mcrcon -H localhost -P 25575 -p rcon_secure_password "list"
# mcrcon -H localhost -P 25575 -p rcon_secure_password "time set day"
# mcrcon -H localhost -P 25575 -p rcon_secure_password "give playerName diamond 64"
```

## Step 4: Automated Backups

Add a backup service to the stack:

```yaml
  minecraft-backup:
    image: itzg/mc-backup:latest
    environment:
      - BACKUP_INTERVAL=2h          # Backup every 2 hours
      - PRUNE_BACKUPS_DAYS=7        # Keep 7 days of backups
      - RCON_HOST=minecraft
      - RCON_PASSWORD=rcon_secure_password
      - SERVER_PORT=25565
    volumes:
      - minecraft-data:/data:ro
      - /opt/minecraft/backups:/backups
    depends_on:
      - minecraft
```

## Step 5: Monitor Server Health

The image exposes a health check endpoint. Monitor it with Portainer's health check display or query it manually:

```bash
# Check if the server accepts connections
docker exec minecraft-minecraft-1 mc-monitor status --host localhost
```

## Version Updates

To update the Minecraft version, update the `VERSION` environment variable in Portainer's stack editor and redeploy. The world data persists in the `minecraft-data` volume.

## Summary

Portainer makes Minecraft server management approachable - update plugins, change server properties, view logs, and back up world data without command-line access. The `itzg/minecraft-server` image handles version management, mod installation, and Paper/Forge/Fabric setup automatically.
