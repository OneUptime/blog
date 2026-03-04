# How to Install Zabbix Agent 2 on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Zabbix, Monitoring, Agents, Linux

Description: Install and configure Zabbix Agent 2 on RHEL to collect system metrics and send them to a Zabbix server for centralized monitoring.

---

Zabbix Agent 2 is a rewrite of the original agent in Go, offering plugin support and improved performance. This guide covers installing and configuring it on RHEL.

## Install Zabbix Agent 2

```bash
# Add the Zabbix repository
sudo rpm -Uvh https://repo.zabbix.com/zabbix/7.0/rhel/9/x86_64/zabbix-release-latest-7.0.el9.noarch.rpm
sudo dnf clean all

# Install Zabbix Agent 2
sudo dnf install -y zabbix-agent2 zabbix-agent2-plugin-*
```

## Configure Zabbix Agent 2

```bash
# Edit the agent configuration
sudo tee /etc/zabbix/zabbix_agent2.conf << 'CONF'
# Zabbix Server IP address or hostname
Server=10.0.0.100

# Zabbix Server for active checks
ServerActive=10.0.0.100

# Hostname must match what is configured on the Zabbix Server
Hostname=rhel-server-01

# Listen on all interfaces (or bind to specific IP)
ListenIP=0.0.0.0
ListenPort=10050

# Log configuration
LogFile=/var/log/zabbix/zabbix_agent2.log
LogFileSize=10

# Enable remote commands (optional, disable for security)
AllowKey=system.run[*]
DenyKey=system.run[rm *]

# TLS encryption (optional but recommended)
# TLSConnect=psk
# TLSAccept=psk
# TLSPSKIdentity=rhel-server-01
# TLSPSKFile=/etc/zabbix/zabbix_agent2.psk

# Timeout for checks
Timeout=10

# Buffer size for active checks
BufferSize=1000
CONF
```

## Configure TLS Pre-Shared Key (Optional)

```bash
# Generate a PSK key
openssl rand -hex 32 | sudo tee /etc/zabbix/zabbix_agent2.psk
sudo chown zabbix:zabbix /etc/zabbix/zabbix_agent2.psk
sudo chmod 640 /etc/zabbix/zabbix_agent2.psk

# Uncomment the TLS lines in the config above
sudo sed -i 's/^# TLSConnect=psk/TLSConnect=psk/' /etc/zabbix/zabbix_agent2.conf
sudo sed -i 's/^# TLSAccept=psk/TLSAccept=psk/' /etc/zabbix/zabbix_agent2.conf
sudo sed -i 's/^# TLSPSKIdentity=.*/TLSPSKIdentity=rhel-server-01/' /etc/zabbix/zabbix_agent2.conf
sudo sed -i 's|^# TLSPSKFile=.*|TLSPSKFile=/etc/zabbix/zabbix_agent2.psk|' /etc/zabbix/zabbix_agent2.conf
```

## Start and Enable the Agent

```bash
sudo systemctl enable --now zabbix-agent2

# Verify the agent is running
sudo systemctl status zabbix-agent2

# Check the log for any errors
sudo tail -f /var/log/zabbix/zabbix_agent2.log
```

## Firewall Configuration

```bash
# Allow Zabbix agent port from the server
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="10.0.0.100/32" port port="10050" protocol="tcp" accept'
sudo firewall-cmd --reload
```

## Test the Agent Locally

```bash
# Test built-in items
zabbix_agent2 -t system.uptime
zabbix_agent2 -t system.cpu.util
zabbix_agent2 -t vm.memory.size[available]
zabbix_agent2 -t vfs.fs.size[/,pfree]
zabbix_agent2 -t net.if.in[eth0]

# Test from the Zabbix server
zabbix_get -s 10.0.0.50 -k system.uptime
```

## SELinux Configuration

```bash
# If SELinux blocks the agent, allow it
sudo setsebool -P zabbix_can_network 1

# Check for SELinux denials
sudo ausearch -m AVC -c zabbix_agent2 -ts recent
```

## Add the Host in Zabbix Server

1. Log into the Zabbix web interface
2. Go to Data collection > Hosts > Create host
3. Set the hostname to match the agent's Hostname value
4. Add the agent interface (IP: 10.0.0.50, Port: 10050)
5. Link the "Linux by Zabbix agent" template
6. If using TLS PSK, configure encryption in the host settings

After a few minutes, data should start flowing from the agent to the server.
