# How to Monitor Redis with Nagios

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Nagios, Monitoring

Description: Learn how to set up Nagios to monitor Redis health, memory usage, connection counts, and replication status using the check_redis plugin with alerting thresholds.

---

Nagios is a widely-used monitoring system that can monitor Redis using the `check_redis` plugin. It checks Redis availability, response time, memory usage, connected clients, and replication lag, alerting operators when thresholds are exceeded.

## Install Nagios Plugins

```bash
# Install Nagios and plugins
sudo apt update
sudo apt install nagios4 nagios-plugins nagios-nrpe-server -y

# Install check_redis (part of nagios-plugins-contrib or standalone)
sudo apt install nagios-plugins-contrib -y

# Or download check_redis separately
wget https://raw.githubusercontent.com/willixix/WL-NagiosPlugins/master/check_redis.pl \
  -O /usr/lib/nagios/plugins/check_redis.pl
chmod +x /usr/lib/nagios/plugins/check_redis.pl
sudo apt install libredis-perl -y
```

## Basic Redis Availability Check

```bash
/usr/lib/nagios/plugins/check_redis.pl -H 127.0.0.1 -p 6379
# OK: redis 127.0.0.1:6379 version:7.2.3 - connected clients: 5 - used memory: 2.50M
```

## Check with Thresholds

```bash
# Warn if used_memory_rss exceeds 1GB, critical at 2GB
/usr/lib/nagios/plugins/check_redis.pl \
  -H 127.0.0.1 -p 6379 \
  -a used_memory_rss \
  -w 1073741824 -c 2147483648

# Check connected clients
/usr/lib/nagios/plugins/check_redis.pl \
  -H 127.0.0.1 -p 6379 \
  -a connected_clients \
  -w 500 -c 900

# Check replication lag (seconds)
/usr/lib/nagios/plugins/check_redis.pl \
  -H 127.0.0.1 -p 6379 \
  -a master_last_io_seconds_ago \
  -w 5 -c 30
```

## Nagios Service Configuration

```text
# /etc/nagios4/conf.d/redis.cfg

define host {
  host_name               redis-server
  alias                   Redis Server
  address                 127.0.0.1
  check_command           check_ping!100.0,20%!500.0,60%
  max_check_attempts      3
  check_period            24x7
  notification_interval   30
  notification_period     24x7
}

define service {
  host_name               redis-server
  service_description     Redis Availability
  check_command           check_redis
  max_check_attempts      3
  check_interval          1
  retry_interval          1
  notification_interval   10
  check_period            24x7
  notification_period     workhours
}

define service {
  host_name               redis-server
  service_description     Redis Memory
  check_command           check_redis_memory!1073741824!2147483648
  max_check_attempts      3
  check_interval          5
  retry_interval          1
  notification_interval   30
  check_period            24x7
  notification_period     workhours
}
```

## Define Check Commands

```text
# /etc/nagios4/conf.d/redis_commands.cfg

define command {
  command_name  check_redis
  command_line  /usr/lib/nagios/plugins/check_redis.pl -H $HOSTADDRESS$ -p 6379
}

define command {
  command_name  check_redis_memory
  command_line  /usr/lib/nagios/plugins/check_redis.pl \
                -H $HOSTADDRESS$ -p 6379 \
                -a used_memory_rss \
                -w $ARG1$ -c $ARG2$
}

define command {
  command_name  check_redis_clients
  command_line  /usr/lib/nagios/plugins/check_redis.pl \
                -H $HOSTADDRESS$ -p 6379 \
                -a connected_clients \
                -w $ARG1$ -c $ARG2$
}
```

## Test Configuration and Reload

```bash
# Test config syntax
sudo nagios4 -v /etc/nagios4/nagios.cfg

# Reload Nagios
sudo systemctl reload nagios4
sudo systemctl status nagios4
```

## Using NRPE for Remote Monitoring

If Redis is on a remote host, use NRPE to run checks remotely:

```bash
# On Redis host - install NRPE
sudo apt install nagios-nrpe-server nagios-plugins -y

# /etc/nagios/nrpe.cfg
allowed_hosts=127.0.0.1,<nagios-server-ip>
command[check_redis]=/usr/lib/nagios/plugins/check_redis.pl -H 127.0.0.1 -p 6379
command[check_redis_mem]=/usr/lib/nagios/plugins/check_redis.pl -H 127.0.0.1 -p 6379 -a used_memory_rss -w 1073741824 -c 2147483648

sudo systemctl restart nagios-nrpe-server
```

```text
# On Nagios server - define remote service
define service {
  host_name           redis-server
  service_description Redis Remote Check
  check_command       check_nrpe!check_redis
}
```

## Summary

Nagios monitors Redis availability, memory, and replication using the `check_redis.pl` plugin with configurable warning and critical thresholds. Define services for each check type, use NRPE for remote hosts, and configure notification intervals to avoid alert fatigue. Nagios is ideal for teams that already use it for infrastructure monitoring and want to add Redis checks without a separate tool.
