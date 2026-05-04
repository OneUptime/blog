# How to Configure Valheim Server with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Valheim, IPv6, Game Server, Steam, Linux, Self-Hosted Gaming

Description: Set up and configure a Valheim dedicated game server to accept player connections over IPv6, covering SteamCMD installation, server startup, and network configuration.

---

Valheim is a Viking survival game with dedicated server support. Its dedicated server can be configured to listen on IPv6 interfaces, enabling players to connect from IPv6 networks.

## Installing Valheim Dedicated Server

```bash
# Create server user and directories

sudo useradd -m -s /bin/bash valheim
sudo su - valheim

# Install via SteamCMD
steamcmd +force_install_dir /home/valheim/server \
         +login anonymous \
         +app_update 896660 validate \
         +quit

# List server files
ls /home/valheim/server/
```

## Configuring Valheim Server for IPv6

```bash
# Start Valheim server with IPv6
# Valheim uses the -bind parameter for network binding
/home/valheim/server/valheim_server.x86_64 \
  -name "My IPv6 Valheim Server" \
  -port 2456 \
  -world "WorldName" \
  -password "ServerPassword" \
  -public 1

# Note: Valheim may not have explicit IPv6 binding flag
# Use system-level binding via :: (all interfaces)
```

## Systemd Service for Valheim

```ini
# /etc/systemd/system/valheim.service
[Unit]
Description=Valheim Dedicated Server
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=valheim
WorkingDirectory=/home/valheim/server

Environment="SteamAppId=892970"
Environment="LD_LIBRARY_PATH=/home/valheim/server/linux64:$LD_LIBRARY_PATH"

ExecStartPre=/home/valheim/server/steamcmd.sh \
  +force_install_dir /home/valheim/server \
  +login anonymous \
  +app_update 896660 validate \
  +quit

ExecStart=/home/valheim/server/valheim_server.x86_64 \
  -name "IPv6 Valheim" \
  -port 2456 \
  -nographics \
  -batchmode \
  -world "MyWorld" \
  -password "SecretPassword" \
  -public 1 \
  -logFile /var/log/valheim/valheim.log

Restart=on-failure
RestartSec=30

[Install]
WantedBy=multi-user.target
```

```bash
sudo mkdir -p /var/log/valheim
sudo chown valheim:valheim /var/log/valheim
sudo systemctl daemon-reload
sudo systemctl enable --now valheim
```

## Firewall Rules for Valheim IPv6

```bash
# Valheim uses ports 2456-2458 (UDP only)
sudo ip6tables -A INPUT -p udp --dport 2456:2458 -j ACCEPT

sudo ip6tables-save > /etc/ip6tables/rules.v6
```

## Verifying IPv6 Connectivity

```bash
# Check if Valheim is listening
ss -ulnp | grep "2456\|2457\|2458"

# Test port reachability over IPv6
nmap -6 -sU -p 2456-2458 2001:db8::valheim

# Check server logs
sudo journalctl -u valheim -f
```

## Auto-Update Script for Valheim Server

```bash
#!/bin/bash
# valheim_update.sh - Update and restart Valheim server

echo "Stopping Valheim server..."
sudo systemctl stop valheim

echo "Updating Valheim..."
/home/valheim/server/steamcmd.sh \
  +force_install_dir /home/valheim/server \
  +login anonymous \
  +app_update 896660 validate \
  +quit

echo "Starting Valheim server..."
sudo systemctl start valheim

echo "Update complete. Server status:"
sudo systemctl status valheim --no-pager
```

## Monitoring Valheim Server

```bash
# Check player connections
sudo journalctl -u valheim | grep "Got handshake from client\|Closing socket"

# Monitor server resource usage
top -p $(pgrep valheim_server)

# Check if server advertises to Steam over IPv6
sudo tcpdump -i eth0 -n ip6 and udp and port 8765 -v
```

Valheim dedicated servers work with IPv6 infrastructure through the underlying system networking, and configuring firewall rules on UDP ports 2456-2458 ensures players on IPv6-only connections can join your Viking world.
