# How to Deploy a Terraria Server via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraria, Game Server, Portainer, Docker, Self-Hosted, Gaming, TShock

Description: Deploy a dedicated Terraria server with TShock plugin support using Portainer for persistent world storage and easy server management.

---

Terraria is a beloved 2D adventure game with excellent multiplayer support. Running a dedicated server via Portainer with TShock gives you a managed, pluggable server with commands, permissions, and user management.

## Step 1: Deploy the Terraria Stack

```yaml
# terraria-stack.yml

version: "3.8"

services:
  terraria:
    image: ryshe/terraria:tshock-latest
    environment:
      - WORLD_FILENAME=MyWorld.wld
      - CONFIGPATH=/config
    command:
      - -autocreate
      - "3"               # 1=small, 2=medium, 3=large
      - -worldname
      - MyWorld
      - -difficulty
      - "0"               # 0=classic, 1=expert, 2=master, 3=journey
      - -maxplayers
      - "8"
      - -port
      - "7777"
      - -password
      - your_join_password
    volumes:
      # Persistent world, plugins, and TShock config
      - terraria-worlds:/root/.local/share/Terraria/Worlds
      - terraria-serverplugins:/tshock/ServerPlugins
      - terraria-config:/config
    ports:
      - "7777:7777/tcp"
      - "7777:7777/udp"
    restart: unless-stopped
    tty: true
    stdin_open: true

volumes:
  terraria-worlds:
    name: terraria-worlds
  terraria-serverplugins:
    name: terraria-serverplugins
  terraria-config:
    name: terraria-config
```

## Step 2: Configure TShock

After first run, configure TShock at `/config/config.json`:

```json
{
  "Settings": {
    "ServerPassword": "your_join_password",
    "ServerPort": 7777,
    "MaxSlots": 8,
    "DefaultRegistrationGroupName": "default",
    "DefaultGuestGroupName": "guest",
    "EnableGeoIP": false,
    "DisplayIPToAdmins": false,
    "EnableTokenEndpointAuthentication": false,
    "RespawnSeconds": 5,
    "MaxDamage": 1175,
    "MaxProjDamage": 1175,
    "SpawnProtection": true,
    "SpawnProtectionRadius": 10,
    "EnableWhitelist": false
  }
}
```

## Step 3: Set Up TShock Admin

The first time TShock runs, it outputs a setup code. Check the container logs in Portainer:

```text
To setup the server, join the game and type /setup 12345678
```

Use this code in-game to become an admin:
```text
/setup 12345678
/user add adminname adminpassword owner
/login adminname adminpassword
/setup
```

## Step 4: Install TShock Plugins

Copy plugin DLLs to the mounted `ServerPlugins` directory:

```bash
# Copy compatible plugin DLLs to the mounted ServerPlugins directory
cd /var/lib/docker/volumes/terraria-serverplugins/_data

cp /path/to/YourPlugin.dll .
cp /path/to/AnotherPlugin.dll .
```

Restart the container from Portainer to load the new plugins.

## Step 5: World Backups

Use a scheduled task on the Docker host:

```bash
#!/bin/bash
# terraria-backup.sh - run as a cron job on the Docker host
BACKUP_DIR=/opt/terraria/backups
mkdir -p "$BACKUP_DIR"

# Copy world files from the volume
docker run --rm \
  -v terraria-worlds:/worlds:ro \
  -v "$BACKUP_DIR":/backups \
  alpine tar czf "/backups/terraria-$(date +%Y%m%d-%H%M%S).tar.gz" -C / worlds

# Keep only the last 14 backups
ls -t "$BACKUP_DIR"/*.tar.gz | tail -n +15 | xargs -r rm
```

## Summary

Terraria with TShock on Portainer gives you a managed server with plugin support, permissions, and easy world management. Portainer's log viewer makes it easy to monitor player activity and server health.
