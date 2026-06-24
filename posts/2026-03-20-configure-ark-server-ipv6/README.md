# How to Configure ARK Server with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ARK Survival Evolved, IPv6, Game Server, Steam, Linux, Self-Hosted Gaming

Description: Set up and configure an ARK: Survival Evolved dedicated server to support IPv6 player connections, covering SteamCMD installation, GameUserSettings, and firewall rules.

---

ARK: Survival Evolved supports Linux dedicated servers. ARK: Survival Ascended does not support Linux natively, so the commands below apply to ARK: Survival Evolved. ARK's official server documentation is centered on the standard game, peer, query, and RCON ports; on dual-stack hosts you must also allow those same ports through your IPv6 firewall and verify connectivity on your own host.

## Installing ARK Dedicated Server

```bash
# Create server user

sudo useradd -m -s /bin/bash ark
sudo su - ark

# Install via SteamCMD
steamcmd +force_install_dir /home/ark/arkserver \
         +login anonymous \
         +app_update 376030 validate \
         +quit

# List server files
ls /home/ark/arkserver/
```

## Configuring ARK Server Settings

```ini
# /home/ark/arkserver/ShooterGame/Saved/Config/LinuxServer/GameUserSettings.ini

[ServerSettings]
ServerPassword=
ServerAdminPassword=YourAdminPassword
RCONEnabled=True
RCONPort=27020

[SessionSettings]
SessionName=My ARK Server
Port=7777
QueryPort=27015

[/Script/Engine.GameSession]
MaxPlayers=70

[MessageOfTheDay]
Message=Welcome to our ARK server!
Duration=20
```

## Starting ARK Server

```bash
# ARK uses a startup script
# /home/ark/arkserver/ShooterGame/Binaries/Linux/server_start.sh
#!/bin/bash

cd /home/ark/arkserver/ShooterGame/Binaries/Linux || exit 1

./ShooterGameServer \
  "TheIsland?SessionName=My ARK Server?Port=7777?QueryPort=27015" \
  -log

# ARK's documented Linux startup does not use a separate IPv6-specific bind flag
```

## Systemd Service for ARK

```ini
# /etc/systemd/system/ark.service
[Unit]
Description=ARK Dedicated Server
Wants=network-online.target
After=network-online.target

[Service]
Type=simple
User=ark
WorkingDirectory=/home/ark/arkserver/ShooterGame/Binaries/Linux

ExecStartPre=/usr/games/steamcmd \
  +force_install_dir /home/ark/arkserver \
  +login anonymous \
  +app_update 376030 validate \
  +quit

ExecStart=/home/ark/arkserver/ShooterGame/Binaries/Linux/ShooterGameServer \
  "TheIsland?SessionName=My ARK Server?Port=7777?QueryPort=27015" \
  -log

Restart=on-failure
RestartSec=30
KillSignal=SIGINT
TimeoutStopSec=300

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now ark
```

## Firewall Rules for ARK IPv6

```bash
# ARK uses the following ports
# Game port: 7777 UDP
# Peer port: 7778 UDP
# Query port: 27015 UDP
# RCON port: 27020 TCP

sudo ip6tables -A INPUT -p udp --dport 7777 -j ACCEPT
sudo ip6tables -A INPUT -p udp --dport 7778 -j ACCEPT
sudo ip6tables -A INPUT -p udp --dport 27015 -j ACCEPT
sudo ip6tables -A INPUT -p tcp --dport 27020 -j ACCEPT

# Persist these rules with your distro's firewall tooling
```

## Verifying IPv6 Connectivity

```bash
# Check if ARK is listening on the expected ports
sudo ss -lntup | grep -E "7777|7778|27015|27020"

# Check server logs while clients attempt to join
sudo journalctl -u ark -f

# Test IPv6 reachability if your host has a routable IPv6 address
nmap -6 -sU -p 7777,7778,27015 2001:db8::1
```

## ARK Auto-Update Script

```bash
#!/bin/bash
# ark_update.sh

echo "Stopping ARK server..."
sudo systemctl stop ark

echo "Updating ARK..."
/usr/games/steamcmd \
  +force_install_dir /home/ark/arkserver \
  +login anonymous \
  +app_update 376030 validate \
  +quit

echo "Starting ARK server..."
sudo systemctl start ark
echo "ARK server started. Status:"
sudo systemctl status ark --no-pager
```

ARK: Survival Evolved on Linux uses the standard ARK game, peer, query, and optional RCON ports. On dual-stack hosts, allow the same ports in your IPv6 firewall, but note that ARK's official Linux server documentation does not provide a separate IPv6-specific bind option.
