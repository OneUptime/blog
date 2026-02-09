# How to Run a Terraria Server in Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Terraria, Game Server, Containers, Self-Hosted, Gaming, Multiplayer, TShock

Description: Set up a dedicated Terraria multiplayer server in Docker using TShock, with world management, plugin support, and automated backups for your adventures.

---

Terraria is a 2D sandbox adventure game with combat, crafting, building, and exploration. Its multiplayer mode lets you explore procedurally generated worlds with friends. Running your own dedicated server means you control the world, the rules, and who gets to play. Docker simplifies the server setup by packaging everything into a container that works on any platform.

The most popular way to run a Terraria server in Docker is through TShock, a community-built server wrapper that adds permissions, groups, anti-cheat features, and plugin support on top of the vanilla server. This guide covers both the vanilla server approach and TShock.

## Prerequisites

You need:

- Docker Engine 20.10+
- Docker Compose v2
- At least 512MB of RAM (1GB recommended for larger worlds)
- Terraria client for testing

```bash
# Verify Docker
docker --version
docker compose version
```

## Quick Start with TShock

The fastest way to get a Terraria server running.

```bash
# Start a TShock Terraria server
docker run -d \
  --name terraria \
  -p 7777:7777 \
  -v terraria-data:/world \
  ryshe/terraria:latest \
  -world /world/myworld.wld \
  -autocreate 3 \
  -worldname "DockerWorld"
```

The `-autocreate 3` flag creates a large world. Use `1` for small, `2` for medium, and `3` for large.

## Docker Compose Configuration

For a more complete setup with persistent configuration.

```yaml
# docker-compose.yml - Terraria TShock server
version: "3.8"

services:
  terraria:
    image: ryshe/terraria:latest
    container_name: terraria-server
    ports:
      # Default Terraria server port
      - "7777:7777"
      # TShock REST API port
      - "7878:7878"
    volumes:
      # Persist world files and TShock configuration
      - terraria-worlds:/world
    # TShock server arguments
    command: >
      -world /world/docker_world.wld
      -autocreate 2
      -worldname "Docker World"
      -maxplayers 16
      -difficulty 0
      -pass secretpassword
      -secure 1
      -noupnp
    stdin_open: true
    tty: true
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 1G

volumes:
  terraria-worlds:
```

## World Configuration Options

Here is what each command-line flag does:

| Flag | Description | Values |
|------|-------------|--------|
| `-world` | Path to the world file | File path |
| `-autocreate` | Auto-create world size | 1 (small), 2 (medium), 3 (large) |
| `-worldname` | Name of the world | Any string |
| `-maxplayers` | Maximum concurrent players | 1-255 |
| `-difficulty` | World difficulty | 0 (normal), 1 (expert), 2 (master), 3 (journey) |
| `-pass` | Server password | Any string |
| `-secure` | Anti-cheat protection | 0 or 1 |
| `-noupnp` | Disable automatic UPnP | Flag only |

## Starting the Server

```bash
# Start the server
docker compose up -d

# Follow the logs
docker compose logs -f terraria

# Wait for the world generation and "Server started" message
```

World generation takes a minute or two on first launch, depending on world size.

## Server Console

Interact with the server console to manage the game.

```bash
# Attach to the server console
docker attach terraria-server
# Detach with Ctrl+P then Ctrl+Q

# Send individual commands
docker exec -i terraria-server send "say Hello everyone!"
docker exec -i terraria-server send "playing"
docker exec -i terraria-server send "time noon"
docker exec -i terraria-server send "settle"
```

## TShock Administration

TShock adds a powerful administration layer. When you first connect to the server as a player, TShock generates a setup code in the server logs.

```bash
# Find the TShock setup code in the logs
docker compose logs terraria | grep "setup-code"

# Use this code in-game by typing:
# /setup <code>
# Then register as superadmin:
# /user add YourName password superadmin
```

### Managing Groups and Permissions

TShock uses a group-based permission system.

```bash
# Common TShock console commands
docker exec -i terraria-server send "group addperm default tshock.world.time"
docker exec -i terraria-server send "group addperm default tshock.tp.home"
docker exec -i terraria-server send "user group PlayerName vip"
```

### TShock REST API

TShock includes a REST API for remote management.

```bash
# Create a REST API token first through the console
docker exec -i terraria-server send "rest createtoken"

# Use the REST API to check server status
curl "http://localhost:7878/v2/server/status?token=YOUR_TOKEN"

# List online players
curl "http://localhost:7878/v2/players/list?token=YOUR_TOKEN"

# Send a broadcast message
curl "http://localhost:7878/v2/server/broadcast?msg=Server+restarting+in+5+minutes&token=YOUR_TOKEN"
```

## Installing Plugins

TShock supports plugins that extend server functionality.

```bash
# Create a plugins directory on the host
mkdir -p plugins

# Download a plugin (example: InfiniteChestsV2)
# Place .dll files in the plugins directory

# Mount the plugins directory in docker-compose.yml
# Add to the volumes section:
# - ./plugins:/world/ServerPlugins
```

Updated Docker Compose with plugins support.

```yaml
# Updated volumes section for plugin support
services:
  terraria:
    image: ryshe/terraria:latest
    container_name: terraria-server
    ports:
      - "7777:7777"
      - "7878:7878"
    volumes:
      - terraria-worlds:/world
      # Mount local plugins directory
      - ./plugins:/world/ServerPlugins
    command: >
      -world /world/docker_world.wld
      -autocreate 2
      -worldname "Docker World"
      -maxplayers 16
    stdin_open: true
    tty: true
    restart: unless-stopped
```

## Backup and Restore

World files are the most important data to back up.

```bash
# Save the world before backing up
docker exec -i terraria-server send "save"
sleep 3

# Copy world files to the host
docker cp terraria-server:/world ./terraria-backup-$(date +%Y%m%d)

# List all world files in the container
docker exec terraria-server ls -la /world/
```

Set up automated backups with cron.

```bash
# Add to crontab (crontab -e) - back up every 4 hours
0 */4 * * * docker exec -i terraria-server send "save" && sleep 3 && docker cp terraria-server:/world /backups/terraria-$(date +\%Y\%m\%d-\%H\%M)
```

## Running Multiple Worlds

You can run multiple Terraria servers on different ports.

```yaml
# docker-compose.yml - Multiple Terraria worlds
version: "3.8"

services:
  terraria-survival:
    image: ryshe/terraria:latest
    container_name: terraria-survival
    ports:
      - "7777:7777"
    volumes:
      - survival-data:/world
    command: -world /world/survival.wld -autocreate 3 -worldname "Survival" -difficulty 1
    stdin_open: true
    tty: true
    restart: unless-stopped

  terraria-creative:
    image: ryshe/terraria:latest
    container_name: terraria-creative
    ports:
      - "7778:7777"
    volumes:
      - creative-data:/world
    command: -world /world/creative.wld -autocreate 2 -worldname "Creative" -difficulty 3
    stdin_open: true
    tty: true
    restart: unless-stopped

volumes:
  survival-data:
  creative-data:
```

## Updating the Server

```bash
# Stop the server gracefully
docker exec -i terraria-server send "exit"

# Pull the latest image
docker compose pull

# Start with the updated server
docker compose up -d
```

## Troubleshooting

### Players Cannot Connect

```bash
# Check the server is running and the port is mapped
docker compose ps

# Verify the server port is accessible
docker compose logs terraria | grep "Listening"

# Check firewall settings
sudo ufw allow 7777/tcp
```

### World Corruption

If a world file gets corrupted, TShock creates backup files automatically.

```bash
# List available world backups
docker exec terraria-server ls -la /world/*.bak

# Restore from a backup by renaming
docker exec terraria-server cp /world/docker_world.wld.bak /world/docker_world.wld
docker compose restart terraria
```

## Stopping and Cleaning Up

```bash
# Gracefully stop and save the world
docker exec -i terraria-server send "exit"
docker compose down

# Remove everything including world data
docker compose down -v
```

## Summary

Running a Terraria server in Docker gives you a portable, easy-to-manage multiplayer setup. TShock adds administration tools, permissions, plugins, and a REST API on top of the base server. Docker Compose makes the configuration declarative and reproducible. With automated backups and the ability to run multiple worlds on different ports, you can host a complete Terraria community from a single machine. The setup takes minutes, and updates are as simple as pulling a new image.
