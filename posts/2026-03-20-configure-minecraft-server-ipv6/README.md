# How to Configure Minecraft Server with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Minecraft, IPv6, Game Server, Java, Networking, Self-Hosted

Description: Configure a Minecraft Java Edition server to accept player connections over IPv6, including server.properties configuration, firewall rules, and DNS setup.

---

Minecraft Java Edition supports IPv6 natively. Players can connect using IPv6 addresses or hostnames with AAAA DNS records. This guide covers configuring the server to listen on IPv6 and enabling players to connect.

## Prerequisites

```bash
# Install Java

sudo apt install openjdk-21-jre-headless -y
java -version

# Verify IPv6 is available
ip -6 addr show | grep "scope global"
```

## Downloading and Configuring Minecraft Server

```bash
# Download Minecraft server JAR
mkdir -p /opt/minecraft/server
cd /opt/minecraft/server
wget https://launcher.mojang.com/v1/objects/HASH/server.jar -O server.jar

# Accept EULA
echo "eula=true" > eula.txt

# First run to generate server.properties
java -Xmx2G -Xms1G -jar server.jar nogui
```

## server.properties Configuration for IPv6

```properties
# /opt/minecraft/server/server.properties

# Server IP - use :: to listen on all interfaces (IPv4 + IPv6)
# Or specify a specific IPv6 address
server-ip=::

# Server port (default 25565)
server-port=25565

# Other important settings
online-mode=true
max-players=20
difficulty=normal
gamemode=survival

# View distance
view-distance=10
simulation-distance=8

# MOTD - server description
motd=IPv6 Minecraft Server

# Enable RCON for remote management
enable-rcon=true
rcon.port=25575
rcon.password=YourRCONPassword
```

## Systemd Service for Minecraft

```ini
# /etc/systemd/system/minecraft.service
[Unit]
Description=Minecraft Server
After=network-online.target

[Service]
Type=simple
User=minecraft
WorkingDirectory=/opt/minecraft/server

# Start with screen for interactive access
ExecStart=/usr/bin/java \
  -Xmx4G -Xms2G \
  -jar server.jar nogui

ExecStop=/usr/bin/java \
  -jar /opt/minecraft/rcon-cli.jar \
  --host localhost --password YourRCONPassword \
  --command "stop"

Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Create minecraft user
sudo useradd -r -m -s /sbin/nologin minecraft
sudo chown -R minecraft:minecraft /opt/minecraft

sudo systemctl enable --now minecraft
```

## Firewall Rules for Minecraft IPv6

```bash
# Allow Minecraft port over IPv6
sudo ip6tables -A INPUT -p tcp --dport 25565 -j ACCEPT
sudo ip6tables -A INPUT -p udp --dport 25565 -j ACCEPT

# If using Bedrock Edition (port 19132)
sudo ip6tables -A INPUT -p udp --dport 19132 -j ACCEPT

# RCON (restrict to trusted IPs only)
sudo ip6tables -A INPUT -p tcp -s ::1 --dport 25575 -j ACCEPT

sudo ip6tables-save > /etc/iptables/rules.v6
```

## DNS Configuration for IPv6 Minecraft

```bash
# Add AAAA record for your Minecraft server
# minecraft.example.com. IN AAAA 2001:db8::1

# Optionally add SRV record to use non-default port
# _minecraft._tcp.example.com. IN SRV 0 5 25565 minecraft.example.com.

# Test DNS resolution
dig AAAA minecraft.example.com +short
```

## Connecting to IPv6 Minecraft Server

Players can connect using:
- IPv6 address directly: `[2001:db8::1]:25565`
- Hostname with AAAA record: `minecraft.example.com`

```bash
# Test server is reachable over IPv6
nc -6 -w 3 2001:db8::1 25565 && echo "Minecraft port open over IPv6"

# Check server status with ping
# mcstatus (pip install mcstatus)
mcstatus "[2001:db8::1]:25565" status
```

## Paper/Spigot Server with IPv6

```bash
# Paper server (recommended over vanilla)
wget https://api.papermc.io/v2/projects/paper/versions/LATEST/builds/LATEST/downloads/paper-LATEST.jar \
  -O paper.jar

# Start with Paper
java -Xmx4G -Xms2G \
  -XX:+UseG1GC \
  -XX:G1HeapRegionSize=4M \
  -jar paper.jar nogui
```

Minecraft's native IPv6 support via the `server-ip=::` setting enables players to connect over IPv6 without any proxy or translation layer, particularly beneficial for players on IPv6-only mobile networks.
