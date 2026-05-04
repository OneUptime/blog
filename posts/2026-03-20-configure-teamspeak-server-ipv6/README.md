# How to Configure TeamSpeak Server with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TeamSpeak, IPv6, Voice Chat, Game Server, Linux, Self-Hosted

Description: Install and configure a TeamSpeak 3 server to listen on IPv6 addresses, enabling voice communication for players connecting from IPv6 networks.

---

TeamSpeak 3 is a popular voice communication server for gaming communities. It has native IPv6 support and can be configured to listen on IPv6 interfaces either exclusively or alongside IPv4.

## Installing TeamSpeak Server

```bash
# Create TeamSpeak user

sudo useradd -m -s /bin/bash teamspeak
sudo su - teamspeak

# Download TeamSpeak server (check teamspeak.com for latest version)
wget https://files.teamspeak-services.com/releases/server/3.13.7/teamspeak3-server_linux_amd64-3.13.7.tar.bz2
tar xf teamspeak3-server_linux_amd64-3.13.7.tar.bz2
mv teamspeak3-server_linux_amd64 teamspeak

# Accept license
echo "I accept the terms of the license agreement." > /home/teamspeak/teamspeak/.ts3server_license_accepted
```

## Configuring TeamSpeak for IPv6

```ini
# /home/teamspeak/teamspeak/ts3server.ini

# Bind to all IPv6 and IPv4 interfaces
default_voice_port=9987
voice_ip=0.0.0.0,::

# For IPv6-only binding:
# voice_ip=::

# For specific IPv6 address:
# voice_ip=0.0.0.0,2001:db8::1

# File transfer
filetransfer_port=30033
filetransfer_ip=0.0.0.0,::

# Server query (TELNET)
query_port=10011
query_ip=127.0.0.1,::1

# Query SSH
query_ssh_port=10022
query_ssh_ip=127.0.0.1,::1
```

## Starting TeamSpeak Server

```bash
# Start with ini config
cd /home/teamspeak/teamspeak
./ts3server_startscript.sh start inifile=ts3server.ini

# First run generates admin token - save it!
# Look for: ServerAdmin privilege key created

# Check status
./ts3server_startscript.sh status
```

## Systemd Service for TeamSpeak

```ini
# /etc/systemd/system/teamspeak.service
[Unit]
Description=TeamSpeak 3 Server
After=network-online.target
Wants=network-online.target

[Service]
Type=forking
User=teamspeak
WorkingDirectory=/home/teamspeak/teamspeak

ExecStart=/home/teamspeak/teamspeak/ts3server_startscript.sh start inifile=ts3server.ini
ExecStop=/home/teamspeak/teamspeak/ts3server_startscript.sh stop
PIDFile=/home/teamspeak/teamspeak/ts3server.pid

Restart=on-failure
RestartSec=15

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now teamspeak
```

## Firewall Rules for TeamSpeak IPv6

```bash
# TeamSpeak voice port (UDP)
sudo ip6tables -A INPUT -p udp --dport 9987 -j ACCEPT

# File transfer port (TCP)
sudo ip6tables -A INPUT -p tcp --dport 30033 -j ACCEPT

# Server query (restrict to local/admin)
sudo ip6tables -A INPUT -p tcp -s ::1 --dport 10011 -j ACCEPT
sudo ip6tables -A INPUT -p tcp -s 2001:db8::a --dport 10011 -j ACCEPT

sudo ip6tables-save > /etc/iptables/rules.v6
```

## Verifying IPv6 Connectivity

```bash
# Check TeamSpeak is listening on IPv6
ss -6 -ulnp | grep 9987
ss -6 -tlnp | grep 30033

# Test UDP connectivity over IPv6
nmap -6 -sU -p 9987 2001:db8::1

# Check logs
tail -f /home/teamspeak/teamspeak/logs/ts3server*.log

# Query server via telnet over IPv6
telnet 2001:db8::1 10011
```

## DNS Setup for IPv6 TeamSpeak

```bash
# Add AAAA record
# ts3.example.com. IN AAAA 2001:db8::1

# Clients connect with:
# ts3.example.com

# Optional SRV record (clients auto-discover port):
# _ts3._udp.example.com. IN SRV 0 5 9987 ts3.example.com.
```

TeamSpeak 3's native IPv6 support via the `voice_ip` configuration directive enables gaming communities to host voice servers accessible to players on IPv6 networks, with comma-separated address lists allowing simultaneous binding to both IPv4 and IPv6 interfaces.
