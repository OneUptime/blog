# How to Deploy a Factorio Server via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Factorio, Game Server, Docker, Self-Hosted

Description: Set up a dedicated Factorio server using Portainer with automatic updates and save game persistence.

## Introduction

Running your own dedicated game server gives you full control over game settings, mods, player management, and performance. This guide walks through deploying this server using Docker via Portainer, giving you a visual interface to manage your game server.

## Prerequisites

- Portainer installed with Docker
- At least 4 GB RAM (8 GB recommended for larger factories)
- At least 3 GB of disk space, plus room for saves and mods
- Required ports open in firewall: 34197/udp and, if you want remote RCON access, 27015/tcp

## Step 1: Open Required Firewall Ports

```bash
# Open game server ports

sudo ufw allow 34197/udp
# Optional: open RCON for remote administration
sudo ufw allow 27015/tcp
sudo ufw reload
```

## Step 2: Deploy via Portainer Stack

Create a new stack in Portainer > Stacks > Add Stack:

```yaml
services:
  game-server:
    image: factoriotools/factorio:stable
    container_name: game-server
    restart: unless-stopped
    ports:
      - "34197:34197/udp"
      # Optional: expose RCON for remote administration
      - "27015:27015/tcp"
    volumes:
      # Persist game world and configuration data
      - factorio-data:/factorio
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
      - factorio-data:/factorio:ro
      - backup-data:/backups
    command: >
      sh -c "
        while true; do
          DATE=$(date +%Y%m%d_%H%M%S);
          tar czf /backups/world-$DATE.tar.gz -C /factorio .;
          echo 'Backup created: world-'$DATE'.tar.gz';
          ls -t /backups/*.tar.gz | tail -n +8 | xargs rm -f;
          sleep 21600;
        done
      "
    networks:
      - game-net

volumes:
  factorio-data:
  backup-data:

networks:
  game-net:
    driver: bridge
```

## Step 3: Configure Server Settings

Access the container via Portainer's console to inspect the generated configuration:

```bash
# Access container console via Portainer
# Portainer > Containers > game-server > Console

# View the generated configuration files
ls /factorio/config

# Review the main server settings file
cat /factorio/config/server-settings.json
```

After editing the file, restart the container from Portainer or from the Docker host with `docker restart game-server`.

## Step 4: Monitor Server Performance

Track server performance through Portainer:

1. Go to **Containers** > `game-server`
2. Click **Stats** to view real-time CPU/memory usage
3. Check **Logs** for server output and errors

General resource guidance:
- CPU: Watch for sustained spikes during autosaves or large factory updates
- Memory: Leave headroom for the host OS and other containers
- Network: Monitor for unusual traffic spikes

## Step 5: Configure Mod Updates

The `factoriotools/factorio` image can update installed mods on server start when you provide your Factorio credentials:

```yaml
# Add to environment variables if you use mods
environment:
  USERNAME: your-factorio-username
  TOKEN: your-factorio-token
  UPDATE_MODS_ON_START: "true"
  UPDATE_IGNORE: mod1,mod2
```

Keep `restart: unless-stopped` in the stack file rather than editing the container directly, so Portainer keeps the stack definition consistent.

## Step 6: Set Up Player Backups

Automate world backups to prevent data loss:

```bash
#!/bin/bash
# Manual backup trigger
BACKUP_DIR="/game-backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"

docker run --rm \
  -v factorio-data:/factorio:ro \
  -v "$BACKUP_DIR":/backup \
  alpine tar czf /backup/world-"$DATE".tar.gz -C /factorio .

echo "Backup saved: $BACKUP_DIR/world-$DATE.tar.gz"
```

## Step 7: Server Administration

Admin commands and management:

```bash
# Show available RCON commands (2.0.18+)
docker exec game-server rcon /h

# Show the current admins list
docker exec game-server rcon /admins

# Follow recent server logs
docker logs --tail 20 --follow game-server
```

## Security Considerations

- Use strong server passwords
- Enable whitelist or password protection
- Keep server software updated
- Monitor logs for suspicious activity
- Consider running behind a VPN for admin access

## Conclusion

Deploying this game server via Portainer provides a convenient, manageable dedicated server experience. With persistent volumes ensuring your world data survives container restarts, automated backups preventing data loss, and Portainer's visual interface simplifying server management, you can focus on playing rather than server administration. Regular updates keep your server secure and compatible with the latest game clients.
