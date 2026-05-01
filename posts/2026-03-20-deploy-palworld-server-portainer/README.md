# How to Deploy a Palworld Server via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Palworld, Game Server, Portainer, Docker, Self-Hosted, Gaming

Description: Deploy a dedicated Palworld server using Portainer with persistent world data, configurable server settings, and automatic updates via SteamCMD.

---

Palworld is a creature-collecting survival game that took the gaming world by storm. Running your own dedicated server via Portainer gives your friends a stable, always-on world to explore together.

## Step 1: Deploy Palworld Stack

```yaml
# palworld-stack.yml

services:
  palworld:
    image: thijsvanloef/palworld-server-docker:latest
    environment:
      - PUID=1000
      - PGID=1000
      - PORT=8211
      - PLAYERS=16
      - MULTITHREADING=true
      - COMMUNITY=false    # Set to true to list on community servers
      - SERVER_NAME=My Palworld Server
      - SERVER_DESCRIPTION=Powered by Portainer
      - SERVER_PASSWORD=your_server_password
      - ADMIN_PASSWORD=your_admin_password
      # Game settings
      - EXP_RATE=1.000
      - PAL_CAPTURE_RATE=1.000
      - DEATH_PENALTY=All
      - ENABLE_PLAYER_TO_PLAYER_DAMAGE=false
      - ENABLE_FRIENDLY_FIRE=false
      - DAYTIME_SPEEDRATE=1.000
      - NIGHTTIME_SPEEDRATE=1.000
    volumes:
      - palworld-data:/palworld
    ports:
      - "8211:8211/udp"    # Game port
      - "27015:27015/udp"  # Steam query port
    restart: unless-stopped

volumes:
  palworld-data:
    name: palworld-data
```

## Step 2: Configure Server Settings

After first launch, stop the container, add `DISABLE_GENERATE_SETTINGS=true` in Portainer, and edit `PalWorldSettings.ini` in the volume at `/palworld/Pal/Saved/Config/LinuxServer/`. Make changes only while the server is stopped:

```ini
[/Script/Pal.PalGameWorldSettings]
OptionSettings=(Difficulty=None,DayTimeSpeedRate=1.000000,NightTimeSpeedRate=1.000000,ExpRate=1.500000,PalCaptureRate=1.500000,PalSpawnNumRate=1.000000,PalDamageRateAttack=1.000000,PalDamageRateDefense=1.000000,PlayerDamageRateAttack=1.000000,PlayerDamageRateDefense=1.000000,PlayerStomachDecreaceRate=1.000000,PlayerStaminaDecreaceRate=1.000000,PlayerAutoHPRegeneRate=1.000000,PlayerAutoHpRegeneRateInSleep=1.000000,PalAutoHPRegeneRate=1.000000,PalAutoHpRegeneRateInSleep=1.000000,BuildObjectDamageRate=1.000000,BuildObjectDeteriorationDamageRate=1.000000,CollectionDropRate=1.000000,CollectionObjectHpRate=1.000000,CollectionObjectRespawnSpeedRate=1.000000,EnemyDropItemRate=1.000000,DeathPenalty=All,bEnablePlayerToPlayerDamage=False,bEnableFriendlyFire=False,bEnableInvaderEnemy=True,bActiveUNKO=False,bEnableAimAssistPad=True,bEnableAimAssistKeyboard=False,DropItemMaxNum=3000,DropItemMaxNum_UNKO=100,BaseCampMaxNum=128,BaseCampWorkerMaxNum=15,DropItemAliveMaxHours=1.000000,bAutoResetGuildNoOnlinePlayers=False,AutoResetGuildTimeNoOnlinePlayers=72.000000,GuildPlayerMaxNum=20,PalEggDefaultHatchingTime=72.000000,WorkSpeedRate=1.000000,bIsMultiplay=False,bIsPvP=False,bCanPickupOtherGuildDeathPenaltyDrop=False,bEnableNonLoginPenalty=True,bEnableFastTravel=True,bIsStartLocationSelectByMap=True,bExistPlayerAfterLogout=False,bEnableDefenseOtherGuildPlayer=False,CoopPlayerMaxNum=4,ServerPlayerMaxNum=16,ServerName="My Palworld Server",ServerDescription="Powered by Portainer",AdminPassword="your_admin_password",ServerPassword="your_server_password",PublicPort=8211,PublicIP="",RCONEnabled=False,RCONPort=25575,Region="",bUseAuth=True,BanListURL="https://api.palworldgame.com/api/banlist.txt")
```

## Step 3: Auto-Updates

The image checks for Palworld updates on container startup. To force an update check, restart the container from Portainer.

## Step 4: Backup World Data

If you're using a Docker Standalone edge environment with Edge Compute enabled, schedule regular backups via a Portainer Edge Job:

```bash
#!/bin/bash
# palworld-backup.sh
BACKUP_DIR=/opt/palworld/backups
mkdir -p "$BACKUP_DIR"

docker run --rm \
  -v palworld-data:/palworld:ro \
  -v "$BACKUP_DIR":/backups \
  alpine tar czf "/backups/palworld-$(date +%Y%m%d-%H%M%S).tar.gz" /palworld/Pal/Saved

# Keep 7 days of backups
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +7 -delete
echo "Backup complete"
```

## Summary

Palworld on Portainer delivers a stable dedicated server for your gaming group. The Docker image handles SteamCMD installation and updates, while Portainer gives you easy restart, log access, and environment variable management.
