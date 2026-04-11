# How to Monitor MySQL with Nagios

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Nagios, Monitoring, Plugin, Alert

Description: Set up Nagios to monitor MySQL availability, connections, replication, and query performance using the check_mysql and check_mysql_health plugins.

---

## Prerequisites

This guide assumes Nagios Core or Nagios XI is installed. The `check_mysql` plugin is included in the `monitoring-plugins-standard` package. For deeper metrics, we also use `check_mysql_health` by Gerhard Lausser.

## Installing MySQL Plugins

```bash
# Nagios built-in MySQL check
sudo apt-get install -y monitoring-plugins-standard

# check_mysql_health for extended checks
wget https://labs.consol.de/assets/downloads/nagios/check_mysql_health-2.3.2.tar.gz
tar xzf check_mysql_health-2.3.2.tar.gz
cd check_mysql_health-2.3.2
./configure --prefix=/usr/local/nagios
make && sudo make install
```

## Creating the Nagios MySQL User

```sql
CREATE USER 'nagios'@'<nagios-server-ip>' IDENTIFIED BY 'nagios_secret';
GRANT REPLICATION CLIENT, PROCESS, SHOW DATABASES ON *.* TO 'nagios'@'<nagios-server-ip>';
FLUSH PRIVILEGES;
```

## Basic Availability Check

Test the basic check manually:

```bash
/usr/lib/nagios/plugins/check_mysql \
  -H 192.168.1.10 -u nagios -p nagios_secret
```

Add the service definition to `/etc/nagios3/conf.d/mysql_services.cfg`:

```text
define service {
  host_name               mysql-primary
  service_description     MySQL Availability
  check_command           check_mysql!nagios!nagios_secret
  max_check_attempts      3
  check_interval          1
  retry_interval          1
  notification_interval   30
  check_period            24x7
}

define command {
  command_name  check_mysql
  command_line  $USER1$/check_mysql -H $HOSTADDRESS$ -u $ARG1$ -p $ARG2$
}
```

## Extended Monitoring with check_mysql_health

`check_mysql_health` uses `--mode` to target specific metrics:

```bash
# Connection usage
/usr/local/nagios/libexec/check_mysql_health \
  --hostname 192.168.1.10 --username nagios --password nagios_secret \
  --mode threads-connected --warning 70 --critical 90

# Replication lag
/usr/local/nagios/libexec/check_mysql_health \
  --hostname 192.168.1.11 --username nagios --password nagios_secret \
  --mode slave-lag --warning 10 --critical 30

# Slow queries per second
/usr/local/nagios/libexec/check_mysql_health \
  --hostname 192.168.1.10 --username nagios --password nagios_secret \
  --mode slow-queries --warning 1 --critical 5
```

## Service Definitions for Extended Checks

```text
define command {
  command_name  check_mysql_health
  command_line  /usr/local/nagios/libexec/check_mysql_health \
    --hostname $HOSTADDRESS$ --username $ARG1$ --password $ARG2$ \
    --mode $ARG3$ --warning $ARG4$ --critical $ARG5$
}

define service {
  host_name            mysql-primary
  service_description  MySQL Connections
  check_command        check_mysql_health!nagios!nagios_secret!threads-connected!70!90
}

define service {
  host_name            mysql-replica1
  service_description  MySQL Replication Lag
  check_command        check_mysql_health!nagios!nagios_secret!slave-lag!10!30
}
```

## Reloading Nagios

```bash
sudo systemctl reload nagios3
```

Check the Nagios web interface at `http://<nagios-host>/nagios3/` to verify services are turning green.

## Summary

Nagios monitors MySQL through the `check_mysql` plugin for basic availability and `check_mysql_health` for metrics like connection utilization, replication lag, and slow query rate. Define services with appropriate warning and critical thresholds, then use Nagios notifications to alert your team via email or PagerDuty when thresholds are crossed. The `check_mysql_health` tool supports over 40 modes, making it flexible enough to cover most MySQL monitoring requirements.
