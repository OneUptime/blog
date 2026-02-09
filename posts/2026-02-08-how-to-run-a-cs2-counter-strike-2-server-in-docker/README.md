# How to Run a CS2 (Counter-Strike 2) Server in Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, CS2, Counter-Strike, Game Server, Steam, Containers, Self-Hosted, Gaming, GSLT

Description: Deploy a Counter-Strike 2 dedicated server in Docker with game mode configuration, GSLT authentication, and custom server settings for competitive play.

---

Counter-Strike 2 replaced CS:GO as Valve's flagship competitive shooter. Running your own dedicated server lets you host practice sessions, community matches, and custom game modes without relying on Valve's matchmaking. Docker makes the deployment clean and repeatable, handling the SteamCMD download and server binary management automatically.

This guide covers setting up a CS2 dedicated server in Docker, configuring game modes, obtaining a Game Server Login Token (GSLT), and customizing the server for different play styles.

## Prerequisites

You need:

- Docker Engine 20.10+
- Docker Compose v2
- At least 2GB of RAM
- A Steam account with a Game Server Login Token (GSLT)
- CS2 installed on your client machine for testing

```bash
# Verify Docker is ready
docker --version
docker compose version
```

## Getting a Game Server Login Token (GSLT)

Valve requires a GSLT for CS2 servers to be listed publicly. Get one from the Steam Game Server Account Management page.

1. Go to https://steamcommunity.com/dev/managegameservers
2. Log in with your Steam account
3. Enter App ID `730` (CS2 uses the same app ID as CS:GO)
4. Enter a memo for your server
5. Copy the generated token

You need a separate GSLT for each server instance you run.

## Docker Compose Configuration

Here is a complete Docker Compose file for a CS2 server.

```yaml
# docker-compose.yml - Counter-Strike 2 dedicated server
version: "3.8"

services:
  cs2:
    image: joedwards32/cs2
    container_name: cs2-server
    ports:
      # Game traffic (TCP and UDP)
      - "27015:27015/tcp"
      - "27015:27015/udp"
      # RCON port
      - "27020:27020/udp"
      # Steam server browser
      - "27005:27005/udp"
    environment:
      # Server identity
      CS2_SERVERNAME: "My CS2 Server"
      CS2_PORT: 27015

      # GSLT from Steam - required for public servers
      CS2_GSLT: "YOUR_GSLT_TOKEN_HERE"

      # RCON password for remote administration
      CS2_RCONPW: "your_rcon_password"

      # Game mode settings
      # 0 = Casual, 1 = Competitive, 2 = Wingman, 3 = Deathmatch
      CS2_GAMETYPE: 0
      CS2_GAMEMODE: 1

      # Map settings
      CS2_STARTMAP: "de_dust2"
      CS2_MAPGROUP: "mg_active"

      # Player settings
      CS2_MAXPLAYERS: 10
      CS2_BOT_DIFFICULTY: 2
      CS2_BOT_QUOTA: 0
      CS2_BOT_QUOTA_MODE: "fill"

      # Network settings
      CS2_LAN: 0
      CS2_CHEATS: 0

      # Server password (empty for public)
      CS2_PW: ""

      # Additional server cvars
      CS2_ADDITIONAL_ARGS: ""

    volumes:
      # Persist server data for faster restarts
      - cs2-data:/home/steam/cs2-dedicated
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 4G

volumes:
  cs2-data:
```

## Game Mode Reference

CS2 uses a combination of `game_type` and `game_mode` values to set the play style.

| Game Mode | game_type | game_mode | Description |
|-----------|-----------|-----------|-------------|
| Casual | 0 | 0 | Relaxed rules, no ranked impact |
| Competitive | 0 | 1 | Standard 5v5 competitive rules |
| Wingman | 0 | 2 | 2v2 on smaller maps |
| Deathmatch | 1 | 2 | Free-for-all respawn mode |
| Arms Race | 1 | 0 | Gun progression on kill |
| Demolition | 1 | 1 | Similar to Arms Race with bomb sites |

## Starting the Server

```bash
# Start the server
docker compose up -d

# Watch the download and startup process
docker compose logs -f cs2

# First startup downloads ~35GB of server files
# This takes a while depending on your internet speed
```

The first launch requires downloading the full CS2 server binary through SteamCMD. This is roughly 35GB, so be patient.

## Connecting to the Server

### From the CS2 Console

1. Open CS2
2. Open the developer console (press ~)
3. Type: `connect YOUR_SERVER_IP:27015`
4. Enter the password if one is set

### From the Server Browser

If your GSLT is valid and `CS2_LAN` is set to 0, the server appears in the community server browser.

## Server Administration with RCON

RCON (Remote Console) lets you manage the server remotely.

```bash
# Connect to RCON from your CS2 client console
# rcon_address YOUR_SERVER_IP:27015
# rcon_password your_rcon_password
# rcon command_here

# Or use a command-line RCON tool
docker exec cs2-server rcon -a 127.0.0.1:27015 -p your_rcon_password "status"
```

Common RCON commands for server management.

```
# Change the map
rcon changelevel de_mirage

# Restart the round
rcon mp_restartgame 1

# Add bots
rcon bot_add_ct
rcon bot_add_t

# Kick all bots
rcon bot_kick

# Change to competitive mode
rcon game_mode 1
rcon game_type 0

# Pause/unpause a match
rcon mp_pause_match
rcon mp_unpause_match

# View server status
rcon status
rcon stats
```

## Map Management

Configure which maps are available on your server.

```bash
# The default map groups available in CS2:
# mg_active - Current active duty maps
# mg_dust - Dust maps only
# mg_hostage - Hostage rescue maps

# Change the map from outside the container
docker exec cs2-server rcon changelevel de_inferno
```

### Adding Workshop Maps

You can add Steam Workshop maps to your server.

```yaml
# Add these environment variables for workshop map support
environment:
  CS2_ADDITIONAL_ARGS: "+host_workshop_collection YOUR_COLLECTION_ID"
```

## Competitive Server Configuration

For running competitive matches with tournament settings.

```yaml
# Environment variables for competitive configuration
environment:
  CS2_GAMETYPE: 0
  CS2_GAMEMODE: 1
  CS2_MAXPLAYERS: 10
  CS2_BOT_QUOTA: 0
  CS2_ADDITIONAL_ARGS: >
    +mp_overtime_enable 1
    +mp_overtime_maxrounds 6
    +mp_freezetime 15
    +mp_roundtime 1.92
    +mp_roundtime_defuse 1.92
    +mp_halftime 1
    +mp_match_can_clinch 1
    +sv_deadtalk 0
    +mp_free_armor 0
    +mp_buytime 20
    +cash_team_bonus_shorthanded 0
```

## Practice Server Configuration

Set up a server for practice sessions with unlimited money and utility.

```yaml
# Environment variables for a practice server
environment:
  CS2_GAMETYPE: 0
  CS2_GAMEMODE: 1
  CS2_CHEATS: 1
  CS2_ADDITIONAL_ARGS: >
    +sv_infinite_ammo 1
    +mp_buy_anywhere 1
    +mp_buytime 9999
    +mp_freezetime 0
    +mp_roundtime 60
    +mp_roundtime_defuse 60
    +mp_warmup_end
    +mp_startmoney 16000
    +mp_maxmoney 16000
    +sv_grenade_trajectory_prac_pipreview 1
    +sv_showimpacts 1
    +mp_restartgame 1
```

## Updating the Server

CS2 receives frequent updates from Valve.

```bash
# Pull the latest Docker image
docker compose pull

# Recreate the container (server files update on startup)
docker compose up -d

# Check the logs for update progress
docker compose logs -f cs2
```

## Monitoring

```bash
# Check resource usage
docker stats cs2-server

# View active players
docker exec cs2-server rcon status

# Check server performance (tick rate, player count)
docker exec cs2-server rcon stats
```

## Troubleshooting

### Server Not Appearing in Browser

```bash
# Verify the GSLT is valid
# Check the logs for GSLT errors
docker compose logs cs2 | grep -i "token\|gslt\|error"

# Make sure ports are forwarded correctly
docker compose ps
```

### Players Getting Disconnected

```bash
# Check server performance
docker exec cs2-server rcon stats

# If the server is overloaded, increase resource limits
# Edit the deploy.resources.limits section in docker-compose.yml
```

### VAC Authentication Errors

Make sure your GSLT is valid and not shared across multiple servers. Each server needs its own token.

## Stopping and Cleaning Up

```bash
# Stop the server
docker compose down

# Remove everything including downloaded server files (35GB+)
docker compose down -v
```

## Summary

Running a CS2 server in Docker gives you full control over your competitive or casual gaming environment. The setup handles SteamCMD, server binaries, and updates automatically. With a valid GSLT, your server appears in the community browser for others to join. Whether you need a competitive match server, a practice environment, or a casual deathmatch server, changing the game mode is just an environment variable update away. Docker Compose keeps the entire configuration in one file, making it easy to reproduce the setup on any machine.
