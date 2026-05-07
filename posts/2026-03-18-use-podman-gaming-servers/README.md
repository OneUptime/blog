# How to Use Podman for Gaming Servers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Gaming, Game Server, Container, Multiplayer

Description: Learn how to deploy and manage dedicated gaming servers using Podman containers for games like Minecraft, Valheim, and Terraria with persistent world data and automated backups.

---

> Podman makes running dedicated gaming servers simple and secure by packaging game server software in containers with persistent world data, automatic restarts, and resource limits.

Running a dedicated gaming server lets you control the gameplay experience, set custom rules, and play with friends without relying on third-party hosting. Podman containers simplify game server deployment by handling dependencies and providing isolation between multiple servers running on the same machine.

This guide covers setting up popular game servers with Podman, including Minecraft, Valheim, Terraria, and more, with a focus on persistence, performance, and management.

---

## Why Podman for Gaming Servers

Game servers have specific requirements: they need reliable persistence for world data, the ability to restart cleanly after crashes, and resource controls to prevent one server from consuming all available system resources. Podman provides all of this through named volumes, systemd integration, and cgroup resource limits. The rootless model also means game servers do not need root access.

## Minecraft Server

Deploy a Java Edition Minecraft server:

```bash
podman volume create minecraft-data

podman run -d \
  --name minecraft \
  --label type=gameserver \
  -p 25565:25565 \
  -e EULA=TRUE \
  -e MEMORY=2G \
  -e TYPE=PAPER \
  -e DIFFICULTY=normal \
  -e MAX_PLAYERS=20 \
  -e VIEW_DISTANCE=12 \
  -e MOTD="Podman Minecraft Server" \
  -v minecraft-data:/data:Z \
  --memory=3g \
  --cpus=2 \
  docker.io/itzg/minecraft-server:latest
```

Check server status:

```bash
podman exec minecraft mc-health
podman logs -f minecraft
```

## Minecraft Server with Mods

Run a modded Minecraft server using Forge:

```bash
podman run -d \
  --name minecraft-modded \
  --label type=gameserver \
  -p 25566:25565 \
  -e EULA=TRUE \
  -e MEMORY=4G \
  -e TYPE=FORGE \
  -e VERSION=1.20.4 \
  -v minecraft-modded-data:/data:Z \
  -v ~/minecraft-mods:/mods:ro,Z \
  --memory=5g \
  --cpus=3 \
  docker.io/itzg/minecraft-server:latest
```

Place mod `.jar` files in `~/minecraft-mods/` and restart the server.

## Valheim Server

Deploy a Viking survival game server:

```bash
podman volume create valheim-data

podman run -d \
  --name valheim \
  --label type=gameserver \
  -p 2456-2458:2456-2458/udp \
  -e SERVER_NAME="Podman Valheim" \
  -e WORLD_NAME="PodmanWorld" \
  -e SERVER_PASS="secretpass" \
  -e SERVER_PUBLIC=false \
  -v valheim-data:/config:Z \
  --memory=4g \
  --cpus=2 \
  docker.io/lloesche/valheim-server:latest
```

## Terraria Server

```bash
podman volume create terraria-data

podman run -it --rm \
  -p 7777:7777 \
  -v terraria-data:/root/.local/share/Terraria/Worlds:Z \
  docker.io/ryshe/terraria:latest \
  -world /root/.local/share/Terraria/Worlds/PodmanWorld.wld \
  -autocreate 2

podman run -d \
  --name terraria \
  --label type=gameserver \
  -p 7777:7777 \
  -e WORLD_FILENAME=PodmanWorld.wld \
  -v terraria-data:/root/.local/share/Terraria/Worlds:Z \
  docker.io/ryshe/terraria:latest
```

## Counter-Strike 2 Server

```bash
podman volume create cs2-data

podman run -d \
  --name cs2-server \
  --label type=gameserver \
  -p 27015:27015/tcp \
  -p 27015:27015/udp \
  -p 27020:27020/udp \
  -e SRCDS_TOKEN=your_gslt_token \
  -e CS2_SERVERNAME="Podman CS2" \
  -e CS2_PORT=27015 \
  -e CS2_MAXPLAYERS=16 \
  -e CS2_GAMETYPE=0 \
  -e CS2_GAMEMODE=1 \
  -v cs2-data:/home/steam/cs2-dedicated:Z \
  --memory=4g \
  docker.io/joedwards32/cs2:latest
```

## Factorio Server

```bash
podman volume create factorio-data

podman run -d \
  --name factorio \
  --label type=gameserver \
  -p 34197:34197/udp \
  -p 27015:27015/tcp \
  -v factorio-data:/factorio:Z \
  --memory=2g \
  docker.io/factoriotools/factorio:stable
```

Resource Management

Game servers can be resource-hungry. Use Podman's resource controls to prevent one server from starving others:

```bash
# Limit memory and CPU

podman run -d \
  --name game-server \
  --memory=4g \
  --memory-swap=8g \
  --cpus=2.0 \
  --cpu-shares=1024 \
  game-image

# Monitor resource usage
podman stats --no-stream minecraft valheim terraria

# Update limits on a running container
podman update --memory=6g --cpus=3 minecraft
```

## Automated World Backups

Create a backup script for your game worlds:

```bash
#!/bin/bash
# backup-game-worlds.sh
BACKUP_DIR=/srv/backups/games
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "${BACKUP_DIR}"

# Backup Minecraft
podman exec minecraft rcon-cli save-off
podman exec minecraft rcon-cli save-all
sleep 5
podman run --rm \
  -v minecraft-data:/source:ro \
  -v "${BACKUP_DIR}":/backup:Z \
  docker.io/library/alpine:latest \
  tar -czf "/backup/minecraft-${DATE}.tar.gz" -C /source .
podman exec minecraft rcon-cli save-on

# Backup Valheim
podman run --rm \
  -v valheim-data:/source:ro \
  -v "${BACKUP_DIR}":/backup:Z \
  docker.io/library/alpine:latest \
  tar -czf "/backup/valheim-${DATE}.tar.gz" -C /source .

# Clean up old backups (keep last 14 days)
find "${BACKUP_DIR}" -name "*.tar.gz" -mtime +14 -delete

echo "Game world backups completed at ${DATE}"
```

Schedule with cron or a systemd timer:

```bash
crontab -e
# Add: 0 */6 * * * /home/user/backup-game-worlds.sh
```

## Server Management Script

Create a management script for common operations:

```bash
#!/bin/bash
# game-server.sh - Manage game servers

case "$1" in
  start)
    echo "Starting $2 server..."
    podman start "$2"
    ;;
  stop)
    echo "Stopping $2 server..."
    podman stop -t 30 "$2"
    ;;
  restart)
    echo "Restarting $2 server..."
    podman restart "$2"
    ;;
  status)
    podman ps -a --filter "name=$2" --format "{{.Names}}: {{.Status}}"
    ;;
  logs)
    podman logs -f --tail 50 "$2"
    ;;
  all-status)
    echo "=== Game Server Status ==="
    podman ps -a --filter "label=type=gameserver" \
      --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|status|logs|all-status} [server-name]"
    ;;
esac
```

## Running as systemd Services

For a rootless user service that should start on boot, enable lingering once with `loginctl enable-linger "$USER"`, then use a Quadlet like:

```ini
# ~/.config/containers/systemd/minecraft.container
[Container]
Image=docker.io/itzg/minecraft-server:latest
ContainerName=minecraft
PublishPort=25565:25565
Environment=EULA=TRUE
Environment=MEMORY=2G
Environment=TYPE=PAPER
Volume=minecraft-data:/data:Z
PodmanArgs=--memory=3g --cpus=2
Label=type=gameserver

[Service]
Restart=always
TimeoutStopSec=60

[Install]
WantedBy=default.target
```

```bash
systemctl --user daemon-reload
systemctl --user enable --now minecraft.service
```

## Conclusion

Podman provides a clean and efficient way to run dedicated gaming servers. Containers handle the dependency management, rootless execution provides security, and systemd integration ensures your servers are always available. With resource controls, automated backups, and easy multi-server management, you can host multiple game worlds on a single machine without conflicts.
