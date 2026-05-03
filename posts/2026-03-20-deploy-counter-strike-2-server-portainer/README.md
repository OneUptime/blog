# How to Deploy a Counter-Strike 2 Server via Portainer - Deploy Counter Strike

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Counter-Strike 2, CS2, Game Server, Portainer, Docker, Gaming, Steam

Description: Deploy a Counter-Strike 2 dedicated server using Portainer with persistent configuration, workshop maps, and competitive settings for your gaming community.

---

Counter-Strike 2 replaced CS:GO in 2023 and supports dedicated servers for competitive and casual play. This guide shows how to deploy a CS2 server via Portainer using SteamCMD.

## Step 1: Deploy CS2 Server Stack

```yaml
# cs2-stack.yml

version: "3.8"

services:
  cs2:
    image: joedwards32/cs2:latest
    environment:
      # Steam Game Server Account token - get one at steamcommunity.com/dev/managegameservers
      - SRCDS_TOKEN=your_game_server_login_token
      # Server settings
      - CS2_SERVERNAME=My CS2 Server | Portainer
      - CS2_PW=join_password
      - CS2_RCONPW=rcon_password_here
      - CS2_PORT=27015
      - CS2_MAXPLAYERS=10
      # Game settings
      - CS2_GAMETYPE=0     # 0=Classic, 1=Deathmatch, 4=Custom
      - CS2_GAMEMODE=1     # 0=Casual, 1=Competitive, 2=Wingman
      - CS2_MAPGROUP=mg_active
      - CS2_STARTMAP=de_dust2
      # Workshop and bot settings
      - CS2_BOT_DIFFICULTY=0
      - CS2_BOT_QUOTA=0
    volumes:
      - cs2-data:/home/steam/cs2-dedicated
    ports:
      - "27015:27015/tcp"
      - "27015:27015/udp"
      - "27020:27020/udp"    # SourceTV
    restart: unless-stopped

volumes:
  cs2-data:
```

## Step 2: Get a Game Server Login Token (GSLT)

CS2 requires a GSLT for public server registration:

1. Go to `https://steamcommunity.com/dev/managegameservers`
2. Log in with your Steam account
3. App ID: `730` (CS2)
4. Copy the generated token to `SRCDS_TOKEN` in your stack

## Step 3: Configure Competitive Settings

Create a competitive configuration file:

```bash
# /home/steam/cs2-dedicated/game/csgo/cfg/server.cfg
hostname "My CS2 Server"
sv_cheats 0
sv_lan 0
sv_region 3        # EU region

# Competitive settings
mp_autokick 1
mp_freezetime 15
mp_halftime 1
mp_maxrounds 30
mp_overtime_enable 1
mp_overtime_maxrounds 6
mp_roundtime 1.92
mp_roundtime_defuse 1.92
mp_c4timer 40
mp_buytime 20
mp_buy_anywhere 0
```

## Step 4: Workshop Map Support

Enable Steam Workshop maps:

```bash
# Add workshop collection ID to environment (uses the same SRCDS_TOKEN from Step 1)
- CS2_HOST_WORKSHOP_COLLECTION=your_workshop_collection_id
```

## Step 5: Monitor Server Status

Check active players and server state via the Portainer console:

```bash
# Via RCON
rcon -H localhost -P 27015 -p rcon_password_here status
rcon -H localhost -P 27015 -p rcon_password_here mp_restartgame 1
```

## Summary

CS2 dedicated servers via Portainer provide a stable, configurable competitive environment. The container approach ensures consistent game builds, and Portainer's log viewer and restart policies keep your server running reliably.
