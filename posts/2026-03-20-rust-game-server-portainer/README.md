# How to Deploy a Rust Game Server via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Rust, Game Server, Docker, Self-Hosted

Description: Deploy a dedicated Rust survival game server using Portainer with Oxide plugins and automatic wipes.

## Introduction

Running your own dedicated game server gives you full control over game settings, mods, player management, and performance. This guide walks through deploying this server using Docker via Portainer, giving you a visual interface to manage your game server.

## Prerequisites

- Portainer installed with Docker
- At least 4-8 GB RAM (varies by game and player count)
- Adequate disk space (10-50 GB)
- Required ports open in firewall: 28015/udp for the game server, 28017/udp for server queries, and 28016/tcp for RCON admin access

## Step 1: Open Required Firewall Ports

```bash
# Open game server ports

ufw allow 28015/udp
ufw allow 28017/udp
ufw allow 28016/tcp
ufw reload
```

## Step 2: Deploy via Portainer Stack

Create a new stack in Portainer > Stacks > Add Stack:

```yaml
# docker-compose.yml for Game Server
services:
  game-server:
    image: didstopia/rust-server:latest
    container_name: game-server
    restart: unless-stopped
    ports:
      - "28015:28015/udp"
      - "28017:28017/udp"
      - "28016:28016/tcp"
    volumes:
      # Persist game world and configuration data
      - rust-data:/steamcmd/rust
    environment:
      RUST_SERVER_NAME: "My Rust Server"
      RUST_SERVER_SEED: "12345"
      RUST_SERVER_QUERYPORT: "28017"
      RUST_SERVER_MAXPLAYERS: "50"
      RUST_RCON_PASSWORD: "change-this-password"
      RUST_OXIDE_ENABLED: "1"
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
      - rust-data:/steamcmd/rust:ro
      - backup-data:/backups
    command:
      - /bin/sh
      - -c
      - |
        while true; do
          DATE=$$(date +%Y%m%d_%H%M%S)
          tar czf /backups/world-$$DATE.tar.gz -C /steamcmd/rust .
          echo "Backup created: world-$$DATE.tar.gz"
          ls -t /backups/*.tar.gz 2>/dev/null | tail -n +8 | xargs rm -f
          sleep 21600
        done
    networks:
      - game-net

volumes:
  rust-data:
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
docker logs -f --tail 100 game-server

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

The didstopia image updates on startup and can also check for updates automatically:

```yaml
# Add to environment variables
environment:
  RUST_UPDATE_CHECKING: "1"
  RUST_UPDATE_BRANCH: "public"
  RUST_OXIDE_UPDATE_ON_BOOT: "1"
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
  -v rust-data:/steamcmd/rust:ro \
  -v "$BACKUP_DIR:/backup" \
  alpine tar czf /backup/world-$DATE.tar.gz -C /steamcmd/rust .

echo "Backup saved: $BACKUP_DIR/world-$DATE.tar.gz"
```

## Step 7: Server Administration

Admin commands and management:

```bash
# Send a command through the image's RCON helper
docker exec game-server rcon say "Hello from RCON"

# Save and stop the Rust process; the restart policy starts it again
docker exec game-server rcon server.save
docker exec game-server rcon quit

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
