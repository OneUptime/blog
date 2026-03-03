# How to Set Up TeamSpeak Server on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, TeamSpeak, Voice Chat, Gaming, Self-Hosted

Description: A complete guide to installing and configuring a TeamSpeak 3 server on Ubuntu, including service setup, permissions, and firewall configuration.

---

TeamSpeak is a voice over IP (VoIP) application that gaming communities and remote teams have relied on for years. Running your own TeamSpeak server gives you full control over who connects, how channels are organized, and eliminates any monthly fees for larger user counts.

This guide covers installing TeamSpeak 3 Server on Ubuntu, running it as a systemd service, and setting up basic channel and permission structures.

## Prerequisites

- Ubuntu 22.04 or 24.04 server
- At least 1 GB RAM (512 MB minimum, but 1 GB gives headroom)
- The following UDP port open in your firewall: 9987 (voice)
- TCP port 10011 (ServerQuery) and 30033 (file transfers) if needed

## Creating a Dedicated User

Never run TeamSpeak as root. Create a dedicated system user:

```bash
# Create a system user with no login shell
sudo useradd -r -m -d /opt/teamspeak -s /bin/false teamspeak

# Switch to the teamspeak home directory
cd /opt/teamspeak
```

## Downloading TeamSpeak Server

Download the latest TeamSpeak 3 server package:

```bash
# Download as root, then transfer to the teamspeak user's directory
cd /tmp

# Get the latest version (check https://teamspeak.com/en/downloads/#server for current URL)
wget https://files.teamspeak-systems.com/releases/server/3.13.7/teamspeak3-server_linux_amd64-3.13.7.tar.bz2

# Extract the archive
tar xjf teamspeak3-server_linux_amd64-3.13.7.tar.bz2

# Move to the teamspeak directory and set ownership
sudo mv teamspeak3-server_linux_amd64/* /opt/teamspeak/
sudo chown -R teamspeak:teamspeak /opt/teamspeak/
```

## Accepting the License Agreement

TeamSpeak requires you to accept their license before the server will start:

```bash
# Create the license acceptance file
sudo -u teamspeak touch /opt/teamspeak/.ts3server_license_accepted
```

Alternatively, you can pass `license_accepted=1` as a command-line argument, but the file approach is cleaner for automated service starts.

## Running TeamSpeak for the First Time (Manually)

Before setting up the systemd service, run it once manually to capture the important first-run output containing your admin token:

```bash
# Run as the teamspeak user
sudo -u teamspeak /opt/teamspeak/ts3server_startscript.sh start
```

Watch the output carefully. You'll see something like:

```text
------------------------------------------------------------------
                      I M P O R T A N T
------------------------------------------------------------------
               Server Query Admin Account created
         loginname= "serveradmin", password= "AbCdEfGhIj"
         apikey= "BAK......"
------------------------------------------------------------------

------------------------------------------------------------------
                      I M P O R T A N T
------------------------------------------------------------------
      ServerAdmin privilege key created, please use it to gain
      temporary ServerAdmin access.
      Please view the logs for the key
------------------------------------------------------------------
```

The logs directory contains the privilege key you need:

```bash
# Find the privilege key in the logs
sudo grep -r "token=" /opt/teamspeak/logs/
```

**Save the serveradmin password and the privilege key.** You'll need both.

Stop the server after capturing these values:

```bash
sudo -u teamspeak /opt/teamspeak/ts3server_startscript.sh stop
```

## Creating the systemd Service

Set up TeamSpeak to start automatically with the system:

```bash
sudo nano /etc/systemd/system/teamspeak.service
```

```ini
[Unit]
Description=TeamSpeak 3 Server
After=network.target

[Service]
# Run as the dedicated teamspeak user
User=teamspeak
Group=teamspeak

# Working directory
WorkingDirectory=/opt/teamspeak

# Start and stop commands
ExecStart=/opt/teamspeak/ts3server_linux_amd64 \
  inifile=/opt/teamspeak/ts3server.ini \
  license_accepted=1

# Restart policy
Restart=on-failure
RestartSec=10s

# Resource limits
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable teamspeak
sudo systemctl start teamspeak
sudo systemctl status teamspeak
```

## Configuring the Firewall

Open the necessary ports with UFW:

```bash
# TeamSpeak voice traffic (UDP)
sudo ufw allow 9987/udp comment "TeamSpeak Voice"

# ServerQuery interface (TCP) - restrict this to your IP if possible
sudo ufw allow from YOUR_IP_ADDRESS to any port 10011/tcp comment "TeamSpeak ServerQuery"

# File transfer port (TCP)
sudo ufw allow 30033/tcp comment "TeamSpeak File Transfer"

# Apply changes
sudo ufw reload
```

If you don't need remote ServerQuery access (you can use a TeamSpeak client to manage the server instead), skip the 10011 rule.

## Initial Server Configuration via TeamSpeak Client

Download the TeamSpeak 3 client on your local machine and connect:

1. Open TeamSpeak client
2. Go to Connections > Connect
3. Enter your server's IP address, port 9987
4. Leave the password blank initially
5. Connect and use the privilege key when prompted

After using the privilege key, you'll have ServerAdmin rights. From here you can:

- Rename the default server
- Create channels and channel groups
- Set up server groups (Admin, Moderator, Member, Guest)
- Configure a server password

## Setting Up Channel Structure

A typical community server channel layout:

```text
[General]
  - Lobby
  - AFK

[Gaming]
  - Squad 1
  - Squad 2
  - Squad 3

[Private]
  - Officer Chat (requires specific server group)

[Support]
  - Help Desk
```

Create channels by right-clicking in the channel list and selecting "Create Channel". For permanent channels, right-click the channel and set it to permanent in the properties.

## Configuring Permissions

TeamSpeak's permission system is detailed but powerful. Key permission groups to configure:

```text
Server Admin:  Full control (assign only to trusted people)
Moderator:     Can kick/ban, move users, create temporary channels
Member:        Can talk, create temporary channels
Guest:         Can listen only
```

Access the permission system via Permissions > Server Groups in the TeamSpeak client.

## Server Configuration File

The server settings are stored in `/opt/teamspeak/ts3server.ini`:

```ini
# /opt/teamspeak/ts3server.ini

# Network binding - listen on all interfaces
machine_id=
default_voice_port=9987
voice_ip=0.0.0.0
licensepath=

# ServerQuery port
query_port=10011
query_ip=127.0.0.1

# File transfer
filetransfer_port=30033
filetransfer_ip=0.0.0.0

# Database
dbplugin=ts3db_sqlite3
dbpluginparameter=ts3db_sqlite3.ini
dbsqlpath=sql/
dbsqlcreatepath=create_tables/
dbconnections=10

# Log settings
logpath=logs/
logquerycommands=0
```

After editing, restart the service:

```bash
sudo systemctl restart teamspeak
```

## Backup and Restore

Back up the TeamSpeak data regularly:

```bash
# Stop the server before backing up the database
sudo systemctl stop teamspeak

# Create a backup
tar czf /opt/backups/teamspeak_backup_$(date +%Y%m%d).tar.gz \
  /opt/teamspeak/ts3server.sqlitedb \
  /opt/teamspeak/files/ \
  /opt/teamspeak/ts3server.ini

# Restart the server
sudo systemctl start teamspeak
```

## Monitoring TeamSpeak

Check the service logs for connection issues or errors:

```bash
# View systemd journal
journalctl -u teamspeak -f

# View TeamSpeak's own logs
ls -la /opt/teamspeak/logs/
tail -f /opt/teamspeak/logs/ts3server_*.log
```

For production servers, monitor the TeamSpeak process with [OneUptime](https://oneuptime.com) to get notified if it crashes or becomes unreachable.
