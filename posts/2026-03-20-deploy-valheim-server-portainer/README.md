# How to Deploy a Valheim Server via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Valheim, Game Server, Portainer, Docker, Self-Hosted, Gaming, Viking

Description: Deploy a dedicated Valheim server using Portainer with persistent world saves, auto-updates, and the Valheim Plus mod for enhanced gameplay.

---

Valheim is a Viking survival game that supports dedicated servers for multiplayer. Running your own server via Portainer gives you control over world settings, mods, and gives your friends a reliable place to play.

## Step 1: Deploy Valheim Server Stack

```yaml
# valheim-stack.yml

services:
  valheim:
    image: ghcr.io/community-valheim-tools/valheim-server:latest
    cap_add:
      - SYS_NICE    # Allows nice priority adjustment for better performance
    environment:
      # Server settings
      - 'SERVER_NAME=My Valheim Server'
      - SERVER_PORT=2456
      - WORLD_NAME=MyWorld
      # Password to join the server (min 5 characters)
      - SERVER_PASS=your_server_password
      # Auto-update settings
      - 'UPDATE_CRON=0 */3 * * *' # Check for updates every 3 hours
      - 'RESTART_CRON=0 5 * * *'  # Restart daily at 5 AM
      # Valheim Plus mod (optional)
      - VALHEIM_PLUS=true
    volumes:
      # Persistent world data and configuration
      - valheim-data:/opt/valheim
      - valheim-config:/config
    ports:
      - "2456:2456/udp"    # Game port
      - "2457:2457/udp"    # Game port +1 (required)
      - "2458:2458/udp"    # Optional: needed for crossplay or mods that use gameport+2
    restart: unless-stopped
    stop_grace_period: 2m    # Allow time for world save on shutdown

volumes:
  valheim-data:
  valheim-config:
```

## Step 2: Configure Server Settings

Valheim server permissions can be customized in `/config/adminlist.txt` and `/config/bannedlist.txt`:

```bash
# adminlist.txt - one Platform User ID per line (copy the exact value from F2 or the server log)
[Platform]_[UserID]

# bannedlist.txt - banned players
# [Platform]_[UserID]
```

## Step 3: Enable Valheim Plus

Valheim Plus adds quality-of-life features - set `VALHEIM_PLUS=true` and configure it:

```ini
# /config/valheimplus/valheim_plus.cfg (auto-created)
[Server]
enabled=true
enforceMod=false          # Disable version enforcement; most Valheim Plus features still require the mod on clients
serverSyncsConfig=true    # Sync the server's Valheim Plus config to connecting clients

[Map]
enabled=true
shareMapProgression=true    # Share map between all players

[Player]
enabled=true
baseMaximumWeight=600       # Increase carry weight
```

## Step 4: Backups

Use the image's built-in backup settings:

```yaml
    environment:
      # Built-in backup configuration
      - BACKUPS=true
      - 'BACKUPS_CRON=0 * * * *' # Backup every hour
      - BACKUPS_DIRECTORY=/config/backups
      - BACKUPS_MAX_AGE=3        # Keep backups for 3 days
```

## Step 5: Monitor Server Status

Check server status via Portainer's log viewer. Look for the startup message:

```text
Game server connected
```

## Summary

Valheim on Portainer gives you a stable, auto-updating dedicated server with persistent worlds. The `ghcr.io/community-valheim-tools/valheim-server` image handles SteamCMD installation, auto-updates, and mod management, while Portainer handles the container lifecycle.
