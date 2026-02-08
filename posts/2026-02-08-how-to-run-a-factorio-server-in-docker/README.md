# How to Run a Factorio Server in Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Factorio, Game Server, Containers, Self-Hosted, Gaming, Multiplayer, Automation

Description: Deploy a dedicated Factorio multiplayer server in Docker with save management, mod support, RCON access, and automated backups for your factory empire.

---

Factorio is a game about building and maintaining automated factories on an alien planet. Its multiplayer mode lets teams collaborate on massive factory designs that would be overwhelming for a single player. Running a dedicated server keeps the factory running around the clock, so the assembly lines never stop.

The official Factorio Docker image, maintained by the Factorio team and community contributors, makes server setup trivial. The `factoriotools/factorio` image handles server binaries, save file management, and mod loading. This guide covers the complete setup process.

## Prerequisites

You need:

- Docker Engine 20.10+
- Docker Compose v2
- At least 1GB of RAM (more for megabases)
- A Factorio account (for downloading the server and using mods)
- Factorio game client for testing

```bash
# Check Docker
docker --version
docker compose version
```

## Quick Start

Get a Factorio server running with one command.

```bash
# Start a Factorio dedicated server
docker run -d \
  --name factorio \
  -p 34197:34197/udp \
  -p 27015:27015/tcp \
  -v factorio-data:/factorio \
  factoriotools/factorio
```

On first run, the server generates a new map and creates default configuration files.

## Docker Compose Configuration

A complete setup with all the important options.

```yaml
# docker-compose.yml - Factorio dedicated server
version: "3.8"

services:
  factorio:
    image: factoriotools/factorio:stable
    container_name: factorio-server
    ports:
      # Game port (UDP)
      - "34197:34197/udp"
      # RCON port (TCP)
      - "27015:27015/tcp"
    environment:
      # Generate a new save on first run
      GENERATE_NEW_SAVE: "true"
      SAVE_NAME: "docker-factory"

      # Server settings
      UPDATE_MODS_ON_START: "true"
      PORT: 34197
      RCON_PORT: 27015

      # RCON password for remote management
      RCON_PASSWORD: "factorio_rcon_pass"

      # Token for mod downloads (from factorio.com profile)
      # USERNAME: "your_factorio_username"
      # TOKEN: "your_factorio_token"

    volumes:
      - factorio-data:/factorio
    restart: unless-stopped

volumes:
  factorio-data:
```

## Starting the Server

```bash
# Start the server
docker compose up -d

# Watch the startup logs
docker compose logs -f factorio

# Look for: "Hosting game at"
```

The first startup generates a world and creates configuration files in the volume.

## Server Configuration

After the first run, configuration files are created in the volume. You can edit them to customize the server.

```bash
# Copy the config files to your host for editing
docker cp factorio-server:/factorio/config ./factorio-config

# Key files:
# server-settings.json - Main server configuration
# server-adminlist.json - Admin players
# server-banlist.json - Banned players
# map-gen-settings.json - World generation settings
# map-settings.json - Map runtime settings
```

### Server Settings

Edit `server-settings.json` to configure the server identity and gameplay rules.

```json
{
  "name": "Docker Factorio Server",
  "description": "A Factorio server running in Docker",
  "tags": ["docker", "vanilla"],

  "max_players": 0,
  "visibility": {
    "public": false,
    "lan": true
  },

  "username": "",
  "password": "",
  "token": "",

  "game_password": "factory_pass",

  "require_user_verification": true,
  "max_upload_in_kilobytes_per_second": 0,
  "max_upload_slots": 5,

  "minimum_latency_in_ticks": 0,
  "max_heartbeats_per_second": 60,
  "ignore_player_limit_for_returning_players": false,

  "allow_commands": "admins-only",
  "autosave_interval": 10,
  "autosave_slots": 5,
  "afk_autokick_interval": 0,
  "auto_pause": true,

  "only_admins_can_pause_the_game": true,
  "autosave_only_on_server": true,

  "non_blocking_saving": false
}
```

### Map Generation Settings

Customize world generation by editing `map-gen-settings.json`.

```json
{
  "terrain_segmentation": 1,
  "water": 1,
  "width": 0,
  "height": 0,
  "starting_area": 1,
  "peaceful_mode": false,
  "autoplace_controls": {
    "coal": {"frequency": 1, "size": 1, "richness": 1},
    "stone": {"frequency": 1, "size": 1, "richness": 1},
    "copper-ore": {"frequency": 1, "size": 1, "richness": 1},
    "iron-ore": {"frequency": 1, "size": 1, "richness": 1},
    "uranium-ore": {"frequency": 1, "size": 1, "richness": 1},
    "crude-oil": {"frequency": 1, "size": 1, "richness": 1},
    "trees": {"frequency": 1, "size": 1, "richness": 1},
    "enemy-base": {"frequency": 1, "size": 1, "richness": 1}
  },
  "seed": null,
  "property_expression_names": {
    "control-setting:moisture:bias": "0",
    "control-setting:aux:bias": "0"
  }
}
```

Copy the edited files back into the container.

```bash
# Copy updated config files back to the container
docker cp ./factorio-config/server-settings.json factorio-server:/factorio/config/
docker cp ./factorio-config/map-gen-settings.json factorio-server:/factorio/config/

# Restart to apply changes
docker compose restart factorio
```

## Connecting to the Server

### Direct Connection

1. Open Factorio
2. Click "Multiplayer"
3. Click "Connect to address"
4. Enter `YOUR_IP:34197`
5. Enter the game password if one is set

### LAN Connection

If the server is on your local network and `lan` visibility is `true`, it appears automatically in the LAN games list.

## RCON Administration

Manage the server remotely using RCON.

```bash
# Using mcrcon (install separately) or any RCON client
mcrcon -H localhost -P 27015 -p factorio_rcon_pass

# Common RCON commands:

# Send a message to all players
/server-message "Server will restart in 5 minutes"

# List connected players
/players

# Promote a player to admin
/promote PlayerName

# Demote an admin
/demote PlayerName

# Kick a player
/kick PlayerName "Reason for kick"

# Ban a player
/ban PlayerName "Reason for ban"

# Unban a player
/unban PlayerName

# Save the game
/server-save

# View evolution factor (how strong enemies are)
/evolution
```

## Installing Mods

Factorio supports mods from the mod portal. Set your credentials to enable mod downloads.

```yaml
# Add your Factorio account credentials to docker-compose.yml
environment:
  USERNAME: "your_factorio_username"
  TOKEN: "your_factorio_token"
  UPDATE_MODS_ON_START: "true"
```

### Managing Mods

```bash
# Create a mod-list.json file
# Place it in the mods directory inside the volume

# Example mod-list.json
cat > mod-list.json << 'EOF'
{
  "mods": [
    {"name": "base", "enabled": true},
    {"name": "YARM", "enabled": true},
    {"name": "Bottleneck", "enabled": true},
    {"name": "even-distribution", "enabled": true}
  ]
}
EOF

# Copy it to the container
docker cp mod-list.json factorio-server:/factorio/mods/mod-list.json

# Restart to download and load mods
docker compose restart factorio
```

## Save Management

```bash
# List available saves
docker exec factorio-server ls -la /factorio/saves/

# Create a manual save
docker exec factorio-server rcon /server-save

# Copy a save to your host
docker cp factorio-server:/factorio/saves/docker-factory.zip ./factory-backup-$(date +%Y%m%d).zip

# Upload a save from your host
docker cp my-save.zip factorio-server:/factorio/saves/my-save.zip
```

To load a specific save, set the `SAVE_NAME` environment variable.

```yaml
environment:
  SAVE_NAME: "my-save"
```

## Generating a New Map

To start fresh with a new world.

```bash
# Remove the current save (back it up first!)
docker exec factorio-server rm /factorio/saves/docker-factory.zip

# Restart - the server generates a new map
docker compose restart factorio
```

Or use custom generation settings.

```bash
# Generate a map with custom settings
docker exec factorio-server /factorio/bin/x64/factorio \
  --create /factorio/saves/custom-map.zip \
  --map-gen-settings /factorio/config/map-gen-settings.json \
  --map-settings /factorio/config/map-settings.json
```

## Updating the Server

```bash
# Pull the latest stable image
docker compose pull

# Restart with the new version
docker compose up -d

# Check logs for update confirmation
docker compose logs factorio | head -20
```

## Troubleshooting

### Players Cannot Connect

```bash
# Verify the server is listening
docker compose ps
docker compose logs factorio | grep "Hosting"

# Check firewall rules for UDP port
sudo ufw allow 34197/udp
```

### Desync Issues

Desyncs happen when client and server states diverge. Common fixes include:

- Ensure all players have the same mod versions
- Reduce the number of active mods
- Update Factorio to the latest version

## Stopping and Cleaning Up

```bash
# Stop the server gracefully (it auto-saves on shutdown)
docker compose down

# Remove everything including saves
docker compose down -v
```

## Summary

Factorio's dedicated server runs perfectly in Docker. The `factoriotools/factorio` image handles server binaries, save management, and mod downloads. Configure your factory world through JSON settings files, manage players through RCON, and let Docker handle the infrastructure. Whether you are running a small factory with friends or hosting a megabase for dozens of players, Docker keeps the setup clean, portable, and easy to update.
