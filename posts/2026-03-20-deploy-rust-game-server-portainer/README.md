# How to Deploy a Rust Game Server via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Game Server, Portainer, Docker, Self-Hosted, Gaming, Steam

Description: Deploy a dedicated Rust game server using Portainer with persistent world data, uMod plugin support, and configurable map seeds for your gaming community.

---

Rust is a multiplayer survival game known for its brutal gameplay and active modding community. Running your own server via Portainer gives you full control over wipe schedules, map seeds, and plugin configurations.

## Step 1: Deploy Rust Server Stack

```yaml
# rust-stack.yml

services:
  rust:
    image: didstopia/rust-server:latest
    container_name: rust-server
    environment:
      # Server identity
      - RUST_SERVER_STARTUP_ARGUMENTS=-batchmode -load -nographics +server.secure 1
      - RUST_SERVER_IDENTITY=rust
      - RUST_SERVER_NAME=My Rust Server
      - RUST_SERVER_DESCRIPTION=A Rust server powered by Portainer
      - RUST_SERVER_URL=https://example.com
      - RUST_SERVER_BANNER_URL=https://example.com/banner.png
      # Connection settings
      - RUST_SERVER_PORT=28015
      - RUST_SERVER_QUERYPORT=28017
      - RUST_RCON_WEB=1
      - RUST_RCON_PORT=28016
      - RUST_RCON_PASSWORD=rcon_password_here
      - RUST_SERVER_MAXPLAYERS=100
      # World settings
      - RUST_SERVER_WORLDSIZE=4000    # Map size in meters
      - RUST_SERVER_SEED=12345        # Random seed for world generation
      - RUST_SERVER_SAVE_INTERVAL=300 # Save every 5 minutes
      # uMod/Oxide plugin framework
      - RUST_OXIDE_ENABLED=1
      # Auto-update
      - RUST_UPDATE_CHECKING=1
      - RUST_UPDATE_BRANCH=public
    volumes:
      - rust-data:/steamcmd/rust
    ports:
      - "28015:28015/udp"
      - "28017:28017/udp"    # Query port
    restart: unless-stopped

volumes:
  rust-data:
    name: rust-data
```

## Step 2: Configure the Server

After first boot, edit `/steamcmd/rust/server/rust/cfg/server.cfg`:

```bash
server.hostname "My Rust Server"
server.description "A community Rust server. Join our Discord!"
server.url "https://discord.gg/yourserver"
server.maxplayers 100
server.worldsize 4000
server.seed 12345
server.pvp true
decay.scale 0.5
airdrop.min_players 25
antihack.enabled true
antihack.speedhack_protection 1
```

## Step 3: Install uMod (Oxide) Plugins

Place plugin `.cs` files in the plugins directory:

```bash
# The plugins directory is at /steamcmd/rust/oxide/plugins/
# Download popular plugins

# Kits - predefined item kits
docker exec rust-server sh -lc \
  'curl -fsSL https://umod.org/plugins/Kits.cs -o /steamcmd/rust/oxide/plugins/Kits.cs'

# Clans - team/clan system
docker exec rust-server sh -lc \
  'curl -fsSL https://umod.org/plugins/Clans.cs -o /steamcmd/rust/oxide/plugins/Clans.cs'
```

Plugins auto-reload when files are placed in the directory.

## Step 4: Set Up Scheduled Wipes

Rust servers typically wipe on a schedule. If you're using Portainer Edge Jobs on a Docker Standalone environment, you can run a wipe script like this:

```bash
#!/bin/bash
# rust-wipe.sh - run monthly via a Portainer Edge Job

# Stop server gracefully
docker stop rust-server

# Delete world data (keeps player data/blueprints)
docker run --rm -v rust-data:/data alpine sh -c \
  'rm -f /data/server/rust/*.map /data/server/rust/*.sav*'

# If you want a new seed, update RUST_SERVER_SEED in Portainer before restarting
# A changed seed triggers a fresh procedural map generation on next boot

# Restart server
docker start rust-server
echo "Wipe completed. Server restarting."
```

## Step 5: Monitor via RCON

```bash
# Use the image's bundled RCON relay to run server commands
docker exec rust-server rcon status
docker exec rust-server rcon server.save
docker exec rust-server rcon say "Server will restart in 10 minutes!"
```

## Summary

Rust dedicated servers via Portainer give gaming communities a manageable, configurable server environment. The containerized approach makes wipe management, plugin updates, and server restarts straightforward, and Portainer's persistent volumes ensure world data survives container rebuilds.
