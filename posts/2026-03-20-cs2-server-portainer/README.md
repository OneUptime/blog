# How to Deploy a Counter-Strike 2 Server via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Counter-Strike 2, Game Server, Docker, Self-Hosted

Description: Run a dedicated Counter-Strike 2 server using Portainer with automated updates and competitive settings.

## Introduction

Running your own dedicated game server gives you full control over game settings, mods, player management, and performance. This guide walks through deploying this server using Docker via Portainer, giving you a visual interface to manage your game server.

## Prerequisites

- Portainer installed with Docker
- At least 4-8 GB RAM (varies by game and player count)
- Adequate disk space (10-50 GB)
- Required ports open in firewall: 27015/udp and 27015/tcp

## Step 1: Open Required Firewall Ports

```bash
# Open game server ports

ufw allow 27015/udp
ufw allow 27015/tcp
ufw reload
```

## Step 2: Deploy via Portainer Stack

Create a new stack in Portainer > Stacks > Add Stack:

```yaml
# docker-compose.yml for Game Server
version: "3.8"

services:
  game-server:
    image: cm2network/cs2:latest
    container_name: game-server
    restart: unless-stopped
    ports:
      - "27015:27015/udp"
      - "27015:27015/tcp"
    volumes:
      # Persist game world and configuration data
      - cs2-data:/home/steam/cs2-dedicated
    environment:
      SRCDS_TOKEN: your-token
      CS2_MAXPLAYERS: 10
      CS2_CFG_URL: https://example.com/server.cfg
    healthcheck:
      test: ["CMD", "true"]
      interval: 60s
      timeout: 30s
      retries: 3
      start_period: 300s
    logging:
      driver: json-file
      options:
        max-size: "100m"
        max-file: "5"

  # Automated backup service
  game-backup:
    image: alpine:latest
    container_name: game-backup
    restart: "no"
    volumes:
      - cs2-data:/game-data:ro
      - backup-data:/backups
    command: >
      sh -c "
        while true; do
          DATE=$$(date +%Y%m%d_%H%M%S);
          tar czf /backups/world-$$DATE.tar.gz -C /game-data .;
          echo 'Backup created: world-'$$DATE'.tar.gz';
          ls -t /backups/*.tar.gz | tail -n +8 | xargs rm -f;
          sleep 21600;
        done
      "
    networks:
      - game-net

volumes:
  cs2-data:
  backup-data:

networks:
  game-net:
    driver: bridge
```

## Step 3: Configure Server Settings

Access the container via Portainer's console to configure settings:

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
- Memory: Configure server RAM to 70-80% of available
- Network: Monitor for unusual traffic spikes

## Step 5: Configure Automatic Updates

Many game server images support automatic updates:

```yaml
# Add to environment variables
environment:
  - AUTO_UPDATE=true
  - AUTO_REBOOT=true
  - CRON_AUTO_UPDATE="0 4 * * *"  # Update daily at 4 AM
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
mkdir -p $BACKUP_DIR

docker run --rm \
  -v cs2-data:/game-data:ro \
  -v $BACKUP_DIR:/backup \
  alpine tar czf /backup/world-$DATE.tar.gz -C /game-data .

echo "Backup saved: $BACKUP_DIR/world-$DATE.tar.gz"
```

## Step 7: Server Administration

Admin commands and management:

```bash
# Connect to server console (if supported)
docker attach game-server

# Restart server without full container restart
docker exec game-server /restart-server.sh

# Check connected players (if applicable)
docker logs game-server | grep "connected" | tail -20
```

## Security Considerations

- Use strong server passwords
- Enable whitelist or password protection
- Keep server software updated
- Monitor logs for suspicious activity
- Consider running behind a VPN for admin access

## Conclusion

Deploying this game server via Portainer provides a convenient, manageable dedicated server experience. With persistent volumes ensuring your world data survives container restarts, automated backups preventing data loss, and Portainer's visual interface simplifying server management, you can focus on playing rather than server administration. Regular updates keep your server secure and compatible with the latest game clients.
