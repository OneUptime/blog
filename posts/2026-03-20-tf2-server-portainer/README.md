# How to Deploy a Team Fortress 2 Server via Portainer - Tf2

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Team Fortress 2, Game Server, Docker, Self-Hosted

Description: Deploy a dedicated Team Fortress 2 game server using Portainer with custom plugins and map management.

## Introduction

Running your own dedicated game server gives you full control over game settings, mods, player management, and performance. This guide walks through deploying this server using Docker via Portainer, giving you a visual interface to manage your game server.

## Prerequisites

- Portainer installed with Docker
- At least 4-8 GB RAM (varies by game and player count)
- Adequate disk space (10-50 GB)
- Required inbound firewall ports: 27015/udp and 27015/tcp

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
services:
  game-server:
    image: cm2network/tf2:latest
    container_name: game-server
    restart: unless-stopped
    stdin_open: true
    tty: true
    ports:
      - "27015:27015/udp"
      - "27015:27015/tcp"
    volumes:
      # Persist game server files and configuration data
      - tf2-data:/home/steam/tf-dedicated
    environment:
      SRCDS_TOKEN: "your-token"
      SRCDS_MAXPLAYERS: "24"
      SRCDS_TICKRATE: "66"
      SRCDS_STARTMAP: "ctf_2fort"
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
    restart: unless-stopped
    volumes:
      - tf2-data:/home/steam/tf-dedicated:ro
      - backup-data:/backups
    command: >
      sh -c "
        while true; do
          DATE=$$(date +%Y%m%d_%H%M%S);
          tar czf /backups/tf2-$$DATE.tar.gz -C /home/steam/tf-dedicated .;
          echo 'Backup created: tf2-'$$DATE'.tar.gz';
          ls -t /backups/*.tar.gz | tail -n +8 | xargs rm -f;
          sleep 21600;
        done
      "
    networks:
      - game-net

volumes:
  tf2-data:
    name: tf2-data
  backup-data:
    name: tf2-backups

networks:
  game-net:
    driver: bridge
```

## Step 3: Configure Server Settings

Access the container via Portainer's console to configure settings, or run Docker commands from the host:

```bash
# Access container console via Portainer
# Portainer > Containers > game-server > Console

# Edit server.cfg from the Docker host
docker exec -it game-server nano /home/steam/tf-dedicated/tf/cfg/server.cfg

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

## Step 5: Configure Updates

The `cm2network/tf2` image updates the game on container startup, so restart the container after a TF2 update is released:

```bash
docker restart game-server
```

The stack already sets `restart: unless-stopped`. If you configure a container manually in Portainer:
1. Go to **Containers** > edit container
2. Set **Restart Policy** to "Unless stopped"

## Step 6: Set Up Server Backups

Back up server files and configuration to prevent data loss:

```bash
#!/bin/bash
# Manual backup trigger
BACKUP_DIR="/game-backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"

docker run --rm \
  -v tf2-data:/home/steam/tf-dedicated:ro \
  -v "$BACKUP_DIR":/backup \
  alpine tar czf /backup/tf2-$DATE.tar.gz -C /home/steam/tf-dedicated .

echo "Backup saved: $BACKUP_DIR/tf2-$DATE.tar.gz"
```

## Step 7: Server Administration

Admin commands and management:

```bash
# Connect to server console (if supported)
docker attach game-server

# Restart server container
docker restart game-server

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

Deploying this game server via Portainer provides a convenient, manageable dedicated server experience. With persistent volumes ensuring your server files and configuration survive container restarts, automated backups preventing data loss, and Portainer's visual interface simplifying server management, you can focus on playing rather than server administration. Regular updates keep your server secure and compatible with the latest game clients.
