# How to Deploy a Team Fortress 2 Server via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Team Fortress 2, TF2, Game Server, Portainer, Docker, Gaming, Steam

Description: Deploy a Team Fortress 2 dedicated server using Portainer with SourceMod plugin support, custom maps, and automatic updates via SteamCMD.

---

Team Fortress 2 is a free-to-play class-based shooter with a vibrant community. Running your own TF2 server with Portainer lets you customize game modes, install plugins, and build a community around your server.

## Step 1: Deploy TF2 Server via Portainer Stack

```yaml
# tf2-stack.yml

services:
  tf2:
    image: cm2network/tf2:latest
    environment:
      # Server settings passed as startup args
      - SRCDS_TOKEN=steam_game_server_token_here
      - SRCDS_RCONPW=rcon_password_here
      - SRCDS_PW=join_password_here
      - SRCDS_PORT=27015
      - SRCDS_TV_PORT=27020
      - SRCDS_MAXPLAYERS=24
      - SRCDS_STARTMAP=cp_dustbowl
    volumes:
      - tf2-data:/home/steam/tf-dedicated
    ports:
      - "27015:27015/tcp"    # RCON
      - "27015:27015/udp"    # TF2 game traffic
      - "27020:27020/udp"    # SourceTV
    restart: unless-stopped

volumes:
  tf2-data:
```

## Step 2: Configure Server with server.cfg

Create `/home/steam/tf-dedicated/tf/cfg/server.cfg` in the TF2 data volume:

```cfg
hostname "My TF2 Server | Portainer"
sv_password "join_password_here" // Set to "" for a public server
rcon_password "rcon_password_here"
sv_lan 0
sv_region 1                     // 0=US East, 1=US West, 2=SA, 3=EU, 4=Asia, 5=AU, 6=ME, 7=Africa, 255=World
mp_timelimit 30
mp_maxrounds 5
sv_alltalk 0
sv_cheats 0
tf_weapon_criticals 1
log on
sv_logbans 1
sv_logecho 1
sv_logfile 1
sv_log_onefile 0
```

## Step 3: Install SourceMod and MetaMod

SourceMod is the plugin framework for Source engine games:

```bash
# Run these commands in the TF2 container or place files in the volume

# Download and install MetaMod:Source
cd /home/steam/tf-dedicated/tf
wget https://github.com/alliedmodders/metamod-source/releases/download/1.12.0.1224/mmsource-1.12.0-git1224-linux.tar.gz
tar -xzf mmsource-1.12.0-git1224-linux.tar.gz

# Download and install SourceMod
wget https://github.com/alliedmodders/sourcemod/releases/download/1.12.0.7230/sourcemod-1.12.0-git7230-linux.tar.gz
tar -xzf sourcemod-1.12.0-git7230-linux.tar.gz
```

## Step 4: Add Custom Maps

Place custom BSP map files in `/home/steam/tf-dedicated/tf/maps`.

Create `/home/steam/tf-dedicated/tf/cfg/mapcycle.txt` to rotate through your maps:

```text
cp_dustbowl
ctf_2fort
pl_badwater
koth_nucleus
cp_granary
```

## Step 5: Monitor via RCON

Use the RCON protocol to send admin commands:

```bash
# Example using the mcrcon client
mcrcon -H SERVER_IP -P 27015 -p rcon_password_here status
mcrcon -H SERVER_IP -P 27015 -p rcon_password_here "changelevel ctf_2fort"
mcrcon -H SERVER_IP -P 27015 -p rcon_password_here "sm plugins list"
```

## Summary

TF2 dedicated servers on Portainer give community managers full control over game settings, plugin configuration, and map rotation. The container approach means easy updates, consistent configurations, and simple backup/restore of server data.
