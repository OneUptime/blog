# How to Monitor MySQL with Zabbix

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Zabbix, Monitoring, Template, Alert

Description: Configure Zabbix to monitor MySQL using the official template, collecting metrics on queries, connections, InnoDB, and replication with automatic alerting.

---

## Prerequisites

This guide assumes Zabbix Server 6.x is already installed and the Zabbix Agent 2 is running on the MySQL host.

## Creating the MySQL Monitoring User

```sql
CREATE USER 'zbx_monitor'@'localhost' IDENTIFIED BY 'zabbix_secret';
GRANT REPLICATION CLIENT, PROCESS, SHOW DATABASES, SHOW VIEW ON *.* TO 'zbx_monitor'@'localhost';
FLUSH PRIVILEGES;
```

## Configuring the Zabbix Agent 2 MySQL Plugin

Zabbix Agent 2 includes a built-in MySQL plugin. Create the credentials file:

```bash
sudo mkdir -p /var/lib/zabbix
sudo tee /var/lib/zabbix/mysql.conf << 'EOF'
[client]
user=zbx_monitor
password=zabbix_secret
EOF
sudo chmod 400 /var/lib/zabbix/mysql.conf
sudo chown zabbix:zabbix /var/lib/zabbix/mysql.conf
```

Add the plugin configuration to `/etc/zabbix/zabbix_agent2.d/plugins.d/mysql.conf`:

```text
Plugins.MySQL.Sessions.local.Uri=tcp://localhost:3306
Plugins.MySQL.Sessions.local.User=zbx_monitor
Plugins.MySQL.Sessions.local.Password=zabbix_secret
```

Restart the agent:

```bash
sudo systemctl restart zabbix-agent2
```

## Applying the MySQL Template in Zabbix

1. In Zabbix UI, go to Configuration > Hosts and select your MySQL host.
2. Click the Templates tab and link the template "MySQL by Zabbix agent 2".
3. Set the macro `{$MYSQL.DSN}` to `tcp://localhost:3306`.
4. Save the host.

## Verifying Data Collection

Check the Latest Data view for your host and filter by "MySQL". You should see items like:

```text
MySQL: Queries per second
MySQL: Slow queries per second
MySQL: Connections used
MySQL: InnoDB buffer pool: pages free
MySQL: Replication: Seconds Behind Master
MySQL: Uptime
```

## Default Triggers Included in the Template

The official template includes triggers for common problems:

```text
MySQL: Service is down
MySQL: Refused connections
MySQL: Replication: Slave I/O thread is not running
MySQL: Replication: Slave SQL thread is not running
MySQL: Replication lag is too high (>30m)
MySQL: Buffer pool utilization is too low (<50%)
```

## Customizing Alert Thresholds

Override the default thresholds using host-level macros:

```text
Macro                              Default   Your value
{$MYSQL.REPL_LAG.MAX.WARN}        30m       10m
{$MYSQL.ABORTED_CONN.MAX.WARN}    3         5
{$MYSQL.BUFF_UTIL.MIN.WARN}       50        30
```

Set these under Host > Macros in the Zabbix UI.

## Testing with zabbix_get

Verify items are returning data from the command line:

```bash
zabbix_get -s 127.0.0.1 -p 10050 \
  -k "mysql.ping[tcp://localhost:3306,zbx_monitor,zabbix_secret]"
```

A return value of `1` means MySQL is reachable.

## Summary

Zabbix monitors MySQL through the Agent 2 MySQL plugin and the official template "MySQL by Zabbix agent 2". After creating a minimal-privilege monitoring user and configuring the plugin credentials, the template collects dozens of metrics automatically and provides pre-built triggers for common failure conditions. Override macro thresholds at the host level to tune alerts for your SLA requirements.
