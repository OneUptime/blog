# How to Deploy an ARK Server via Portainer - Deploy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ARK, Survival Evolved, Game Server, Portainer, Docker, Gaming, Self-Hosted

Description: Deploy a dedicated ARK: Survival Evolved or ARK: Survival Ascended server using Portainer with persistent world data, mod support, and configurable game settings.

---

ARK: Survival Evolved (and its Unreal Engine 5 successor ARK: Survival Ascended) supports dedicated servers that you can run on your own hardware. This guide covers deploying ARK: Survival Evolved via Portainer with the popular `thmhoag/arkserver` Docker image, which wraps the community-maintained `arkmanager` (`ark-server-tools`).

## Step 1: Deploy ARK Server Stack

ARK requires substantial resources: at least 6GB RAM and 50GB+ disk space.

```yaml
# ark-stack.yml

version: "3.8"

services:
  ark:
    image: thmhoag/arkserver:latest
    environment:
      - am_ark_SessionName=My ARK Server
      - am_serverMap=TheIsland     # Map: TheIsland, Ragnarok, Aberration, etc.
      - am_ark_ServerPassword=join_password
      - am_ark_ServerAdminPassword=admin_password
      - am_ark_MaxPlayers=20
      # Performance settings
      - am_ark_GameModIds=        # Comma-separated mod workshop IDs
      # Auto-backup settings
      - am_arkBackupPreUpdate=true
      - am_arkAutoUpdateOnStart=true
      - am_arkWarnOnRestartSeconds=60
    volumes:
      - ark-data:/ark
    ports:
      - "7777:7777/udp"     # Game port
      - "7778:7778/udp"     # Game port +1
      - "27015:27015/udp"   # Steam query port
      - "32330:32330/tcp"   # RCON
    restart: unless-stopped

volumes:
  ark-data:
```

## Step 2: Configure Game Settings

Edit `/ark/server/ShooterGame/Saved/Config/LinuxServer/GameUserSettings.ini`:

```ini
[ServerSettings]
ServerPassword=join_password
ServerAdminPassword=admin_password
MaxPlayers=20
RCONEnabled=True
RCONPort=32330
TheMaxStructuresInRange=10500
OfficialDifficulty=1
DifficultyOffset=0.2
AutoSavePeriodMinutes=15

[SessionSettings]
SessionName=My ARK Server

[/Script/ShooterGame.ShooterGameSession]
MaxPlayers=20
```

## Step 3: Enable Admin Commands

Connect via RCON to run admin commands:

```bash
# ARK admin commands via RCON
rcon -H localhost -P 32330 -p admin_password "ListPlayers"
rcon -H localhost -P 32330 -p admin_password "SaveWorld"
rcon -H localhost -P 32330 -p admin_password "SetTimeOfDay 12:00"
rcon -H localhost -P 32330 -p admin_password "Broadcast Welcome to the server!"
```

## Step 4: Install Workshop Mods

Add Steam Workshop mod IDs to the environment:

```yaml
- am_ark_GameModIds=731604991,812655342,1404697612
```

Mods are automatically downloaded on server startup.

## Step 5: Cluster Setup

For running multiple ARK maps in a cluster (players can transfer between maps):

```yaml
  ark-ragnarok:
    image: thmhoag/arkserver:latest
    environment:
      - am_serverMap=Ragnarok
      - am_ark_SessionName=My ARK Cluster - Ragnarok
      - am_arkopt_clusterid=my-ark-cluster
      - am_arkopt_ClusterDirOverride=/cluster
    volumes:
      - ark-ragnarok-data:/ark
      - ark-cluster:/cluster    # Shared cluster directory
    ports:
      - "7779:7777/udp"
      - "7780:7778/udp"
      - "27016:27015/udp"
```

## Summary

ARK dedicated servers via Portainer give you full control over your prehistoric world. Mod installation, cluster configuration, and auto-backup are all manageable through environment variables, and Portainer keeps the server running reliably.
