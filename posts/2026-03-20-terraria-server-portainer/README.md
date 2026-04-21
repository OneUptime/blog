# How to Deploy a Terraria Server via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Terraria, Game Server, Docker, Self-Hosted

Description: Deploy a dedicated Terraria server using Portainer for persistent multiplayer world management.

## Introduction

Running your own dedicated game server gives you full control over game settings, player access, backups, and performance. This guide walks through deploying this server using Docker via Portainer, giving you a visual interface to manage your game server.

## Prerequisites

- Portainer installed with Docker
- At least 4-8 GB RAM (varies by game and player count)
- Adequate disk space (10-50 GB)
- Required ports open in firewall: 7777/tcp

## Step 1: Open Required Firewall Ports

```bash
# Open game server ports

ufw allow 7777/tcp
ufw reload
```

## Step 2: Deploy via Portainer Stack

Create a new stack in Portainer > Stacks > Add Stack:

```yaml
# docker-compose.yml for Game Server
services:
  game-server:
    image: ryshe/terraria:vanilla-latest
    container_name: game-server
    restart: unless-stopped
    stdin_open: true
    tty: true
    ports:
      - "7777:7777/tcp"
    volumes:
      # Persist game world, configuration, and log data
      - terraria-worlds:/root/.local/share/Terraria/Worlds
      - terraria-config:/config
      - terraria-logs:/terraria-server/logs
    command:
      - "-world"
      - /root/.local/share/Terraria/Worlds/default.wld
      - "-autocreate"
      - "2"
      - "-maxplayers"
      - "16"
    logging:
      driver: json-file
      options:
        max-size: "100m"
        max-file: "5"

  # Automated backup service
  game-backup:
    image: alpine:latest
    container_name: game-backup
    restart: unless-stopped
    volumes:
      - terraria-worlds:/worlds:ro
      - backup-data:/backups
    command: >
      sh -c "
        while true; do
          DATE=\$(date +%Y%m%d_%H%M%S);
          tar czf /backups/world-\$DATE.tar.gz -C /worlds .;
          echo 'Backup created: world-'\$DATE'.tar.gz';
          ls -t /backups/*.tar.gz | tail -n +8 | xargs rm -f;
          sleep 21600;
        done
      "

volumes:
  terraria-worlds:
    name: terraria-worlds
  terraria-config:
    name: terraria-config
  terraria-logs:
    name: terraria-logs
  backup-data:
    name: terraria-backups
```

## Step 3: Configure Server Settings

Access the container via Portainer's console to inspect settings and logs:

The stack command sets the world path, auto-create size, and player limit. Change those values in the stack and redeploy when needed.

```bash
# Access container console via Portainer
# Portainer > Containers > game-server > Console

# View server logs
docker logs game-server -f --tail 100

# Check server status
docker stats game-server
```

## Step 4: Monitor Server Performance

Track server performance through Portainer:

1. Go to **Containers** > `game-server`
2. Click **Stats** to view real-time CPU/memory usage
3. Check **Logs** for server output and errors

Optimal resource usage:
- CPU: Below 80% under normal load
- Memory: Leave 20-30% of host memory available for the operating system and Docker
- Network: Monitor for unusual traffic spikes

## Step 5: Update the Server Image

Update the image and redeploy the stack when a new Terraria server image is available:

```bash
docker pull ryshe/terraria:vanilla-latest
```

Configure restart policy in Portainer:
1. Go to **Containers** > edit container
2. Set **Restart Policy** to "Unless stopped"

## Step 6: Set Up Player Backups

Automate world backups to prevent data loss:

```bash
#!/bin/bash
# Manual backup trigger
BACKUP_DIR="/game-backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"

docker run --rm \
  -v terraria-worlds:/worlds:ro \
  -v "$BACKUP_DIR":/backup \
  alpine tar czf /backup/world-$DATE.tar.gz -C /worlds .

echo "Backup saved: $BACKUP_DIR/world-$DATE.tar.gz"
```

## Step 7: Server Administration

Admin commands and management:

```bash
# Connect to server console (if supported)
docker attach game-server
# Detach without stopping the container with Ctrl-p, then Ctrl-q

# Restart the server container
docker restart game-server

# After attaching, type this in the Terraria server console:
playing
```

## Security Considerations

- Use strong server passwords
- Enable password protection
- Keep server software updated
- Monitor logs for suspicious activity
- Consider running behind a VPN for admin access

## Conclusion

Deploying this game server via Portainer provides a convenient, manageable dedicated server experience. With persistent volumes ensuring your world data survives container restarts, automated backups preventing data loss, and Portainer's visual interface simplifying server management, you can focus on playing rather than server administration. Regular updates keep your server secure and compatible with the latest game clients.
