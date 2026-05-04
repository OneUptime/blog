# How to Configure Rust Game Server with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, IPv6, Game Server, Steam, Linux, Self-Hosted Gaming

Description: Install and configure a Rust dedicated game server to accept player connections over IPv6, including SteamCMD setup, server configuration, and network rules.

---

Rust is a multiplayer survival game by Facepunch Studios. Its dedicated server can be configured to accept IPv6 connections by specifying the IP binding and opening the appropriate firewall ports.

## Installing Rust Dedicated Server

```bash
# Create server user

sudo useradd -m -s /bin/bash rust
sudo su - rust

# Install via SteamCMD
steamcmd +force_install_dir /home/rust/rustserver \
         +login anonymous \
         +app_update 258550 validate \
         +quit
```

## Configuring Rust Server for IPv6

```bash
# Start script: /home/rust/start_rust.sh
#!/bin/bash

cd /home/rust/rustserver

./RustDedicated \
  -batchmode \
  -nographics \
  +server.ip "::" \
  +server.port 28015 \
  +server.tickrate 30 \
  +server.hostname "My IPv6 Rust Server" \
  +server.identity "my_server" \
  +server.seed 12345 \
  +server.worldsize 3000 \
  +server.maxplayers 100 \
  +server.description "Rust server accessible over IPv6" \
  +server.headerimage "https://example.com/header.jpg" \
  +rcon.port 28016 \
  +rcon.password "YourRCONPassword" \
  +rcon.web 1

chmod +x /home/rust/start_rust.sh
```

## Systemd Service for Rust

```ini
# /etc/systemd/system/rust.service
[Unit]
Description=Rust Dedicated Server
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=rust
WorkingDirectory=/home/rust/rustserver

ExecStartPre=/usr/games/steamcmd \
  +force_install_dir /home/rust/rustserver \
  +login anonymous \
  +app_update 258550 validate \
  +quit

ExecStart=/home/rust/rustserver/RustDedicated \
  -batchmode \
  -nographics \
  +server.ip "::" \
  +server.port 28015 \
  +server.hostname "IPv6 Rust Server" \
  +server.identity "my_server" \
  +server.maxplayers 100 \
  +rcon.port 28016 \
  +rcon.password "YourRCONPassword" \
  +rcon.web 1

Restart=on-failure
RestartSec=30

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now rust
sudo systemctl status rust
```

## Firewall Rules for Rust IPv6

```bash
# Rust game port (UDP and TCP)
sudo ip6tables -A INPUT -p udp --dport 28015 -j ACCEPT
sudo ip6tables -A INPUT -p tcp --dport 28015 -j ACCEPT

# RCON port (restrict to admin IPs only)
sudo ip6tables -A INPUT -p tcp -s 2001:db8::1 --dport 28016 -j ACCEPT

# Save rules
sudo ip6tables-save > /etc/iptables/rules.v6
```

## Verifying IPv6 Connectivity

```bash
# Check if Rust server is listening on IPv6
ss -6 -ulnp | grep 28015
ss -6 -tlnp | grep 28016

# Test reachability over IPv6
nmap -6 -sU -p 28015 2001:db8::1
nmap -6 -sT -p 28016 2001:db8::1

# Monitor server logs
sudo journalctl -u rust -f

# Check current player connections
# Query via RCON
echo "status" | nc -6 2001:db8::1 28016
```

## Rust Oxide/uMod Plugins with IPv6

```bash
# Install Oxide/uMod for plugin support
cd /home/rust/rustserver
wget https://umod.org/games/rust/download -O oxide_rust.zip
unzip oxide_rust.zip -d .

# Plugins directory
ls /home/rust/rustserver/oxide/plugins/

# Popular IP management plugin configuration
# IP banning works with IPv6 addresses natively
# oxide/config/IPBan.json
```

Rust dedicated servers support IPv6 through the `+server.ip "::"` parameter, which binds the server to all available network interfaces including IPv6, enabling players from IPv6-only networks to connect without additional translation.
