# How to Run a Minecraft Bedrock Server in Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Minecraft, Bedrock, Game Server, Containers, Self-Hosted, Gaming, Cross-Platform

Description: Deploy a Minecraft Bedrock Edition dedicated server in Docker so players on mobile, console, and Windows 10/11 can connect to your self-hosted world.

---

Minecraft Bedrock Edition is the version of Minecraft that runs on mobile devices, consoles (Xbox, PlayStation, Nintendo Switch), and Windows 10/11. If you want friends across different platforms to play together on a private server, Bedrock is the way to go. The dedicated Bedrock server software is separate from the Java Edition server, and Docker makes it easy to run without dealing with platform-specific installation headaches.

The `itzg/minecraft-bedrock-server` Docker image is the community standard for containerized Bedrock servers. It handles downloading the server binary, applying your configuration, and managing the server lifecycle. This guide covers the full setup process.

## Prerequisites

You need:

- Docker Engine 20.10+
- Docker Compose v2
- At least 1GB of RAM (2GB recommended)
- Minecraft Bedrock Edition client on any supported device

```bash
# Verify Docker is ready
docker --version
docker compose version
```

## Quick Start

Get a Bedrock server running with a single command.

```bash
# Start a Minecraft Bedrock server
docker run -d \
  --name bedrock \
  -p 19132:19132/udp \
  -e EULA=TRUE \
  -v bedrock-data:/data \
  itzg/minecraft-bedrock-server
```

Connect from your Bedrock client by adding a server with the address `localhost` and port `19132`.

## Important Note About UDP

Bedrock uses UDP instead of TCP for its game protocol. Make sure your port mapping includes the `/udp` suffix. Forgetting this is the most common reason players cannot connect.

## Docker Compose Configuration

A complete Docker Compose file with all the common settings.

```yaml
# docker-compose.yml - Minecraft Bedrock Edition server
version: "3.8"

services:
  bedrock:
    image: itzg/minecraft-bedrock-server
    container_name: bedrock-server
    ports:
      # Bedrock uses UDP, not TCP
      - "19132:19132/udp"
      # IPv6 port (optional)
      - "19133:19133/udp"
    environment:
      # Accept the EULA (required)
      EULA: "TRUE"

      # Server identity
      SERVER_NAME: "My Bedrock Server"
      LEVEL_NAME: "My World"

      # Game settings
      GAMEMODE: "survival"
      DIFFICULTY: "normal"
      MAX_PLAYERS: 10
      VIEW_DISTANCE: 16

      # World generation
      LEVEL_SEED: ""
      LEVEL_TYPE: "DEFAULT"
      DEFAULT_PLAYER_PERMISSION_LEVEL: "member"

      # Network settings
      SERVER_PORT: 19132
      SERVER_PORT_V6: 19133
      ONLINE_MODE: "true"

      # Tick settings
      TICK_DISTANCE: 4
      MAX_THREADS: 8

      # Allow cheats for operators
      ALLOW_CHEATS: "false"

      # Player movement settings
      CORRECT_PLAYER_MOVEMENT: "false"
      SERVER_AUTHORITATIVE_MOVEMENT: "server-auth"

      # Version - leave blank for latest
      VERSION: "LATEST"

    volumes:
      # Persist world data and configuration
      - bedrock-data:/data
    stdin_open: true
    tty: true
    restart: unless-stopped

volumes:
  bedrock-data:
```

## Starting the Server

```bash
# Start the server
docker compose up -d

# Watch the logs for the startup sequence
docker compose logs -f bedrock

# Look for this line to confirm the server is ready:
# "Server started."
```

## Connecting to the Server

### From the Same Network (LAN)

1. Open Minecraft Bedrock Edition
2. Go to Play > Servers
3. Scroll to the bottom and click "Add Server"
4. Enter your host machine's IP address and port 19132
5. Click "Save" and then "Join Server"

### From the Internet

If you want players outside your network to connect, you need to:

1. Forward UDP port 19132 on your router to the host machine
2. Share your public IP address with players

```bash
# Find your public IP address
curl ifconfig.me
```

### Console Players

Xbox, PlayStation, and Switch players cannot add custom servers directly through the game UI. They need to use a workaround involving DNS redirection or the "BedrockConnect" tool.

```bash
# Run BedrockConnect to allow console players to join custom servers
docker run -d \
  --name bedrockconnect \
  -p 19132:19132/udp \
  ghcr.io/pugmatt/bedrockconnect \
  --custom-servers '[{"name":"My Server","address":"YOUR_SERVER_IP","port":19132}]'
```

## Server Console Commands

Send commands to the server console.

```bash
# Attach to the server console
docker attach bedrock-server
# Detach without stopping: press Ctrl+P then Ctrl+Q

# Or execute individual commands
docker exec bedrock-server send-command "say Hello!"
docker exec bedrock-server send-command "list"
docker exec bedrock-server send-command "op YourGamertag"
docker exec bedrock-server send-command "gamerule showcoordinates true"
docker exec bedrock-server send-command "difficulty hard"
docker exec bedrock-server send-command "time set day"
```

## Managing Players

```bash
# Give operator permissions to a player
docker exec bedrock-server send-command "op PlayerName"

# Remove operator permissions
docker exec bedrock-server send-command "deop PlayerName"

# Kick a player
docker exec bedrock-server send-command "kick PlayerName Reason"

# Ban a player by name
docker exec bedrock-server send-command "ban PlayerName"

# Allow a banned player back
docker exec bedrock-server send-command "pardon PlayerName"
```

## Allowlist (Whitelist) Configuration

Restrict who can join your server.

```bash
# Turn on the allowlist
docker exec bedrock-server send-command "allowlist on"

# Add a player
docker exec bedrock-server send-command "allowlist add PlayerName"

# Remove a player
docker exec bedrock-server send-command "allowlist remove PlayerName"

# View the current allowlist
docker exec bedrock-server send-command "allowlist list"
```

You can also edit the allowlist file directly.

```bash
# View the current allowlist file
docker exec bedrock-server cat /data/allowlist.json
```

## Resource Packs and Behavior Packs

Add custom content to your server.

```bash
# Create directories for packs
mkdir -p resource_packs behavior_packs

# Copy resource packs into the server
docker cp ./resource_packs/my_texture_pack bedrock-server:/data/resource_packs/
docker cp ./behavior_packs/my_behavior_pack bedrock-server:/data/behavior_packs/

# Restart the server to load the packs
docker compose restart bedrock
```

## Backup and Restore

Back up your world data regularly.

```bash
# Tell the server to save and prepare for backup
docker exec bedrock-server send-command "save hold"
# Wait a few seconds
sleep 5
docker exec bedrock-server send-command "save query"

# Copy the world data out
docker cp bedrock-server:/data/worlds ./bedrock-worlds-backup-$(date +%Y%m%d)

# Resume saving
docker exec bedrock-server send-command "save resume"
```

For automated backups, set up a cron job.

```bash
# Add to crontab (crontab -e) - backs up every 6 hours
0 */6 * * * cd /path/to/project && docker exec bedrock-server send-command "save hold" && sleep 5 && docker cp bedrock-server:/data/worlds /backups/bedrock-$(date +\%Y\%m\%d-\%H\%M) && docker exec bedrock-server send-command "save resume"
```

## Updating the Server

```bash
# Pull the latest image
docker compose pull

# Recreate the container with the new version
docker compose up -d

# Check the logs to confirm the new version
docker compose logs bedrock | head -20
```

Your world data persists in the Docker volume, so updates are safe.

## Troubleshooting

### Players Cannot Connect

```bash
# Verify the UDP port is open
docker compose ps
# Make sure you see 19132/udp in the ports column

# Check if the server is listening
docker exec bedrock-server send-command "list"

# Verify firewall is not blocking UDP
# On Linux:
sudo ufw allow 19132/udp
```

### Server Crashes on Startup

```bash
# Check the full logs for error messages
docker compose logs bedrock

# Common fix: ensure EULA is accepted
# Make sure EULA: "TRUE" is set in your environment
```

## Stopping and Cleaning Up

```bash
# Gracefully stop the server
docker exec bedrock-server send-command "stop"
docker compose down

# Remove everything including world data
docker compose down -v
```

## Summary

Running a Minecraft Bedrock server in Docker lets players on mobile, console, and Windows connect to your private world. The `itzg/minecraft-bedrock-server` image handles the binary download, configuration, and lifecycle management. Remember that Bedrock uses UDP, not TCP, which is the key difference from the Java Edition setup. With Docker Compose, you get a reproducible configuration that is easy to back up, update, and share. Whether you are hosting a family server or a community world, Docker keeps the setup clean and manageable.
