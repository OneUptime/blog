# How to Deploy an ARK Server via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, ARK, Game Server, Docker, Self-Hosted

Description: Run a dedicated ARK Survival Evolved or ARK Survival Ascended server using Portainer.

## Introduction

Running your own dedicated game server gives you full control over game settings, mods, player management, and performance. This guide walks through deploying an ARK: Survival Evolved server using Docker via Portainer, giving you a visual interface to manage your game server.

## Prerequisites

- Portainer installed with Docker
- At least 4-8 GB RAM (varies by game and player count)
- Adequate disk space (10-50 GB)
- Required ports open in firewall: 7777/udp, 7778/udp, 27015/udp (and optionally 27020/tcp for RCON)

## Step 1: Open Required Firewall Ports

```bash
# Open game server ports

ufw allow 7777,7778,27015/udp
# Optional: open the RCON port if you plan to enable remote console access
ufw allow 27020/tcp
ufw reload
```

## Step 2: Deploy via Portainer Stack

Create a new stack in Portainer > Stacks > Add Stack:

```yaml
# docker-compose.yml for ARK: Survival Evolved

services:
  game-server:
    image: ich777/steamcmd:arkse
    container_name: game-server
    restart: unless-stopped
    ports:
      - "7777:7777/udp"
      - "7778:7778/udp"
      - "27015:27015/udp"
    volumes:
      # Persist game world and configuration data
      - ark-data:/serverdata/serverfiles
    environment:
      GAME_ID: "376030"
      MAP: "TheIsland"
      SERVER_NAME: "ARKServer"
      SRV_PWD: "secret"
      SRV_ADMIN_PWD: "adminpass"
      GAME_PARAMS: "?MaxPlayers=20"
      GAME_PARAMS_EXTRA: "-server -log"
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
      - ark-data:/serverdata/serverfiles:ro
      - backup-data:/backups
    command: >
      sh -c "
        while true; do
          if [ -d /serverdata/serverfiles/ShooterGame/Saved ]; then
            DATE=$$(date +%Y%m%d_%H%M%S);
            tar czf /backups/world-$$DATE.tar.gz -C /serverdata/serverfiles ShooterGame/Saved;
            echo 'Backup created: world-'$$DATE'.tar.gz';
            ls -t /backups/*.tar.gz | tail -n +8 | xargs rm -f;
          else
            echo 'Backup skipped: save directory not ready yet';
          fi;
          sleep 21600;
        done
      "

volumes:
  ark-data:
  backup-data:
```

## Step 3: Configure Server Settings

Use Portainer's console for in-container changes, and the Docker host for logs and stats:

```bash
# Open a shell inside the container
docker exec -it game-server bash

# View server logs
docker logs --tail 100 -f game-server

# Check server status
docker stats --no-stream game-server
```

## Step 4: Monitor Server Performance

Track server performance through Portainer:

1. Go to **Containers** > `game-server`
2. Click **Stats** to view real-time CPU/memory usage
3. Check **Logs** for server output and errors

Optimal resource usage:
- CPU: Sustained high CPU usage usually means the host is undersized
- Memory: Keep enough free RAM available on the host to avoid swapping or OOM kills
- Network: Monitor for unusual traffic spikes

## Step 5: Apply Game Updates

This image checks for game updates when the container starts, so restart or redeploy the container to apply the latest server build:

```bash
docker restart game-server
```

The stack already sets the restart policy to `unless-stopped`.

## Step 6: Set Up Player Backups

Automate world backups to prevent data loss:

```bash
#!/bin/bash
# Manual backup trigger
BACKUP_DIR="/game-backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"

docker run --rm \
  -v ark-data:/serverdata/serverfiles:ro \
  -v "$BACKUP_DIR":/backup \
  alpine tar czf /backup/world-$DATE.tar.gz -C /serverdata/serverfiles ShooterGame/Saved

echo "Backup saved: $BACKUP_DIR/world-$DATE.tar.gz"
```

## Step 7: Server Administration

Admin commands and management:

```bash
# Open a shell inside the container
docker exec -it game-server bash

# Restart the server container
docker restart game-server

# Check recent server output
docker logs --tail 200 game-server
```

## Security Considerations

- Use strong server passwords
- Enable whitelist or password protection
- Keep server software updated
- Monitor logs for suspicious activity
- Consider running behind a VPN for admin access

## Conclusion

Deploying this game server via Portainer provides a convenient, manageable dedicated server experience. With persistent volumes ensuring your world data survives container restarts, automated backups preventing data loss, and Portainer's visual interface simplifying server management, you can focus on playing rather than server administration. Regular updates keep your server secure and compatible with the latest game clients.
