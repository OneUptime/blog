# How to Set Up Zabbix Proxy for Distributed Monitoring on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Zabbix, Proxy, Distributed Monitoring, Linux

Description: Deploy a Zabbix Proxy on RHEL to distribute monitoring load across remote sites and reduce traffic between monitored hosts and the central Zabbix server.

---

Zabbix Proxy collects monitoring data on behalf of the Zabbix Server, reducing bandwidth between remote sites and the central server. It is essential for distributed monitoring architectures.

## Install the Zabbix Repository

```bash
# On the proxy server
sudo rpm -Uvh https://repo.zabbix.com/zabbix/7.0/rhel/9/x86_64/zabbix-release-latest-7.0.el9.noarch.rpm
sudo dnf clean all
```

## Install Zabbix Proxy

```bash
# Install Zabbix Proxy with SQLite (simplest for proxy)
sudo dnf install -y zabbix-proxy-sqlite3

# Or with MySQL for larger environments
sudo dnf install -y zabbix-proxy-mysql zabbix-sql-scripts
```

## Configure with SQLite (Simple Setup)

```bash
# Create the database directory
sudo mkdir -p /var/lib/zabbix
sudo chown zabbix:zabbix /var/lib/zabbix

# Edit the proxy configuration
sudo tee /etc/zabbix/zabbix_proxy.conf << 'CONF'
# Proxy mode: 0 = active (proxy connects to server), 1 = passive
ProxyMode=0

# Zabbix Server address
Server=10.0.0.100

# Proxy hostname (must match name configured on the server)
Hostname=proxy-site-b

# Database type and location
DBName=/var/lib/zabbix/zabbix_proxy.db

# How often proxy sends data to the server (seconds)
ProxyLocalBuffer=0
ProxyOfflineBuffer=1

# Data collection frequency
DataSenderFrequency=10
ConfigFrequency=60

# Logging
LogFile=/var/log/zabbix/zabbix_proxy.log
LogFileSize=10

# Performance tuning
StartPollers=10
StartPollersUnreachable=5
StartTrappers=5
StartPingers=2
StartDiscoverers=2

# Cache sizes
CacheSize=128M
HistoryCacheSize=64M
CONF
```

## Configure with MySQL (Larger Environments)

```bash
# Set up MySQL database
sudo dnf install -y mysql-server
sudo systemctl enable --now mysqld

sudo mysql -u root -p << 'SQL'
CREATE DATABASE zabbix_proxy CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE USER 'zabbixproxy'@'localhost' IDENTIFIED BY 'ProxyDBPass123!';
GRANT ALL PRIVILEGES ON zabbix_proxy.* TO 'zabbixproxy'@'localhost';
SET GLOBAL log_bin_trust_function_creators = 1;
FLUSH PRIVILEGES;
SQL

# Import the proxy schema
sudo zcat /usr/share/zabbix-sql-scripts/mysql/proxy.sql.gz | \
  mysql -u zabbixproxy -p'ProxyDBPass123!' zabbix_proxy

# Update proxy config for MySQL
sudo sed -i 's|^DBName=.*|DBName=zabbix_proxy|' /etc/zabbix/zabbix_proxy.conf
echo "DBUser=zabbixproxy" | sudo tee -a /etc/zabbix/zabbix_proxy.conf
echo "DBPassword=ProxyDBPass123!" | sudo tee -a /etc/zabbix/zabbix_proxy.conf
```

## Start the Proxy

```bash
sudo systemctl enable --now zabbix-proxy

# Verify it is running
sudo systemctl status zabbix-proxy
sudo tail -f /var/log/zabbix/zabbix_proxy.log
```

## Firewall Configuration

```bash
# Allow Zabbix proxy to accept connections from agents
sudo firewall-cmd --permanent --add-port=10051/tcp
sudo firewall-cmd --reload
```

## Register the Proxy on the Zabbix Server

1. On the Zabbix Server web interface, go to Administration > Proxies
2. Click "Create proxy"
3. Set the Proxy name to match the Hostname in the proxy config (e.g., `proxy-site-b`)
4. Set Proxy mode to "Active" (the proxy connects to the server)
5. Save

## Assign Hosts to the Proxy

When adding or editing hosts on the Zabbix Server:
1. Go to Data collection > Hosts
2. Edit a host
3. Under "Monitored by proxy", select `proxy-site-b`
4. Save

The proxy will now collect data from that host and forward it to the central server.

## Verify Proxy Operation

```bash
# Check proxy status on the server web interface
# Administration > Proxies - the "Last seen" column should update regularly

# Check proxy logs for errors
sudo grep -i error /var/log/zabbix/zabbix_proxy.log
```

Zabbix Proxy is particularly useful when monitoring across WAN links, multiple data centers, or cloud environments where direct agent-to-server communication is impractical.
