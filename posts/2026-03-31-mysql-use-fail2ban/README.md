# How to Use fail2ban with MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Security, Fail2Ban, Firewall, Brute Force

Description: Configure fail2ban to automatically block IP addresses that make repeated failed MySQL login attempts by parsing the MySQL error log.

---

## What Is fail2ban?

fail2ban is a log-parsing intrusion prevention tool that monitors log files for patterns indicating attacks and then updates firewall rules to ban offending IP addresses for a configurable period. While fail2ban is commonly used with SSH and web servers, it can protect MySQL as well.

## Prerequisites

Install fail2ban on Ubuntu/Debian:

```bash
sudo apt-get update
sudo apt-get install -y fail2ban
```

Ensure MySQL logs failed connection attempts. In `/etc/mysql/mysql.conf.d/mysqld.cnf`:

```ini
[mysqld]
log_error = /var/log/mysql/error.log
```

Restart MySQL:

```bash
sudo systemctl restart mysql
```

## Creating a fail2ban Filter for MySQL

Create a filter file that matches MySQL access denied messages:

```bash
sudo nano /etc/fail2ban/filter.d/mysql-auth.conf
```

```ini
[Definition]
failregex = ^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+\S* \d+ \[Warning\] \[MY-\d+\] \[Server\] Access denied for user '.+'@'<HOST>' \(using password: \S+\)$
            ^.*Access denied for user .*@'<HOST>'.*$
ignoreregex =
```

Test the filter against your log:

```bash
sudo fail2ban-regex /var/log/mysql/error.log /etc/fail2ban/filter.d/mysql-auth.conf
```

## Creating the MySQL Jail

Create or edit `/etc/fail2ban/jail.d/mysql.conf`:

```ini
[mysql-auth]
enabled  = true
port     = 3306
protocol = tcp
filter   = mysql-auth
logpath  = /var/log/mysql/error.log
maxretry = 5
bantime  = 3600
findtime = 600
action   = iptables-multiport[name=mysql, port="3306", protocol=tcp]
```

This configuration bans an IP for 1 hour after 5 failed attempts within 10 minutes.

## Enabling and Starting fail2ban

```bash
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
sudo systemctl status fail2ban
```

## Checking Jail Status

```bash
# View all active jails
sudo fail2ban-client status

# View MySQL jail specifically
sudo fail2ban-client status mysql-auth
```

Sample output:

```text
Status for the jail: mysql-auth
|- Filter
|  |- Currently failed:	2
|  |- Total failed:	14
|  `- File list: /var/log/mysql/error.log
`- Actions
   |- Currently banned: 1
   |- Total banned: 3
   `- Banned IP list: 192.168.99.5
```

## Manually Banning and Unbanning IPs

```bash
# Manually ban an IP
sudo fail2ban-client set mysql-auth banip 203.0.113.42

# Unban an IP
sudo fail2ban-client set mysql-auth unbanip 203.0.113.42
```

## Viewing iptables Rules Created by fail2ban

```bash
sudo iptables -L f2b-mysql -n --line-numbers
```

## Sending Alerts on Ban Events

In `/etc/fail2ban/jail.local`, configure email alerting:

```ini
[DEFAULT]
destemail = ops@example.com
sender = fail2ban
mta = sendmail
action = %(action_mwl)s
```

## Summary

fail2ban adds a dynamic firewall layer in front of MySQL by watching the error log for access denied messages and automatically banning the source IP via iptables. Combined with MySQL's own `max_connect_errors` setting and the `CONNECTION_CONTROL` plugin, fail2ban provides defense-in-depth against brute force credential attacks on your database.
