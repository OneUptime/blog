# How to Deploy a Factorio Server via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Factorio, Game Server, Portainer, Docker, Self-Hosted, Gaming, Automation

Description: Deploy a dedicated Factorio server using Portainer with persistent save files, mod support, and automatic updates to the latest stable game version.

---

Factorio is a factory-building game with excellent multiplayer support. The official Factorio Docker image makes it easy to run a dedicated server via Portainer with mod support and automatic updates.

## Step 1: Deploy Factorio via Portainer Stack

```yaml
# factorio-stack.yml

version: "3.8"

services:
  factorio:
    image: factoriotools/factorio:stable
    environment:
      # Server identity on the Factorio multiplayer list
      - GENERATE_NEW_SAVE=false    # Set to true for first run
      - LOAD_LATEST_SAVE=true
    volumes:
      # All server data: saves, mods, config
      - factorio-data:/factorio
    ports:
      - "34197:34197/udp"    # Factorio game port
    restart: unless-stopped

volumes:
  factorio-data:
```

## Step 2: Configure the Server

After first run, edit `/factorio/config/server-settings.json` in the volume:

```json
{
  "name": "My Factorio Server",
  "description": "A server deployed with Portainer",
  "tags": ["modded", "coop"],
  "max_players": 8,
  "visibility": {
    "public": true,
    "lan": true
  },
  "username": "your_factorio_com_username",
  "password": "your_factorio_com_password",
  "token": "",
  "game_password": "join_password",
  "require_user_verification": true,
  "allow_commands": "admins-only",
  "autosave_interval": 10,
  "autosave_slots": 5,
  "afk_autokick_interval": 0
}
```

## Step 3: Install Mods

Download mods from the Factorio mod portal and place them in the mods directory:

```bash
# The mods directory is at /factorio/mods/ in the volume
# Download mods via the Factorio Mod Portal API

MOD_NAME="angelsrefining"
MOD_VERSION="0.12.2"

# 1. Query the mod portal API to get the download_url for the desired release
# 2. Append https://mods.factorio.com to download_url, plus your Factorio.com
#    username and token as query parameters
FACTORIO_USERNAME="your_factorio_com_username"
FACTORIO_TOKEN="your_factorio_com_token"
DOWNLOAD_PATH=$(curl -s "https://mods.factorio.com/api/mods/${MOD_NAME}/full" \
  | jq -r ".releases[] | select(.version==\"${MOD_VERSION}\") | .download_url")

wget "https://mods.factorio.com${DOWNLOAD_PATH}?username=${FACTORIO_USERNAME}&token=${FACTORIO_TOKEN}" \
  -O /var/lib/docker/volumes/factorio-data/_data/mods/${MOD_NAME}_${MOD_VERSION}.zip
```

Create a `mod-list.json` to enable specific mods:

```json
{
  "mods": [
    {"name": "base", "enabled": true},
    {"name": "angelsrefining", "enabled": true},
    {"name": "bobores", "enabled": true}
  ]
}
```

## Step 4: Automatic Updates

The `stable` tag always points to the latest stable release. Use Watchtower to auto-update:

```yaml
  watchtower:
    image: containrrr/watchtower:latest
    environment:
      - WATCHTOWER_SCHEDULE=0 0 4 * * *    # Check for updates at 4 AM
      - WATCHTOWER_CLEANUP=true
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
```

## Step 5: Console Access

Access the Factorio server console via Portainer's container console to run admin commands:

```text
/players                    # List connected players
/ban PlayerName reason      # Ban a player
/kick PlayerName reason     # Kick a player  
/promote PlayerName         # Promote to admin
/server-save                # Manually save the game (admins only)
```

## Summary

Factorio's dedicated server Docker image is well-maintained and straightforward to deploy via Portainer. Persistent volumes ensure your factory progress is always safe, and the Portainer log viewer gives you real-time visibility into server activity.
