# How to Set Up Monit for Process Monitoring on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Monit, Process Monitoring, System Administration, DevOps

Description: Learn how to install and configure Monit on Ubuntu to automatically monitor processes, services, files, and system resources, with automatic restart capabilities and alerting.

---

Monit is a small, lightweight process supervision tool that monitors the health of services and automatically restarts them when they fail. It's been around for decades and remains one of the most practical tools for keeping a Linux server's services running reliably. Unlike complex monitoring stacks, Monit installs in one command, has a configuration format that reads like English, and handles the most common operational need: "restart this service if it dies."

## What Monit Does

Monit can monitor:
- Process status - is it running? Is the PID file correct?
- Resource usage - CPU, memory, file descriptors
- File and directory status - existence, permissions, checksums, modification times
- Network connections - can it connect to a port?
- System resources - overall CPU, memory, disk space

When a check fails, Monit can restart services, send email alerts, execute custom scripts, or any combination of these.

## Installing Monit

```bash
sudo apt update
sudo apt install monit

# Check the version
monit --version

# The service starts automatically
sudo systemctl status monit
```

## Configuration Structure

The main configuration file is `/etc/monit/monitrc`. Drop-in files go in `/etc/monit/conf.d/` and `/etc/monit/conf-enabled/`. Ubuntu's package-installed Monit includes these directories already.

```bash
# View the main config
sudo cat /etc/monit/monitrc | grep -v "^#\|^$"
```

Key global settings to configure:

```bash
sudo nano /etc/monit/monitrc
```

```text
# Check interval (default: 120 seconds)
set daemon 60

# Email alert destination
set alert admin@example.com

# Mail server for sending alerts
set mailserver smtp.gmail.com port 587
    username "your-email@gmail.com"
    password "your-app-password"
    using tls

# Include all config files
include /etc/monit/conf.d/*
include /etc/monit/conf-enabled/*

# Web interface (optional but useful)
set httpd port 2812 and
    use address localhost
    allow localhost
    allow admin:secretpassword
```

## Monitoring Processes

### Basic Process Monitoring

```bash
sudo nano /etc/monit/conf.d/nginx
```

```text
# Monitor nginx
check process nginx
    with pidfile /var/run/nginx.pid
    start program = "/bin/systemctl start nginx"
    stop program  = "/bin/systemctl stop nginx"
    if failed host 127.0.0.1 port 80 protocol http
        and request "/"
        and status 200
        then restart
    if 5 restarts within 5 cycles then alert
    alert admin@example.com
```

### Monitoring with Resource Limits

```bash
sudo nano /etc/monit/conf.d/application
```

```text
# Monitor a custom application
check process myapp with pidfile /var/run/myapp/myapp.pid
    start program = "/bin/systemctl start myapp"
    stop program  = "/bin/systemctl stop myapp"

    # Restart if it's not running
    if not exist then restart

    # Alert and restart if using too much memory
    if memory > 80% then restart

    # Alert if CPU is high for two consecutive checks
    if cpu > 80% for 2 cycles then alert

    # Maximum number of auto-restarts before giving up
    if 3 restarts within 5 cycles then alert
```

### Monitoring Without a PID File

Many modern services don't use PID files. Use the matching syntax instead:

```bash
sudo nano /etc/monit/conf.d/redis
```

```text
# Match by process name from the process table
check process redis matching "redis-server"
    start program = "/bin/systemctl start redis-server"
    stop program  = "/bin/systemctl stop redis-server"
    if failed host 127.0.0.1 port 6379 then restart
    if 5 restarts within 5 cycles then alert
```

## Common Service Configurations

### MySQL/MariaDB

```text
check process mysql with pidfile /var/run/mysqld/mysqld.pid
    start program = "/bin/systemctl start mysql"
    stop program  = "/bin/systemctl stop mysql"
    if failed host 127.0.0.1 port 3306 protocol mysql then restart
    if 5 restarts within 10 cycles then alert
```

### PostgreSQL

```text
check process postgresql with pidfile /var/run/postgresql/15-main.pid
    start program = "/bin/systemctl start postgresql"
    stop program  = "/bin/systemctl stop postgresql"
    if failed host 127.0.0.1 port 5432 protocol pgsql then restart
    if 5 restarts within 10 cycles then alert
```

### SSH

```text
check process sshd with pidfile /var/run/sshd.pid
    start program = "/bin/systemctl start ssh"
    stop program  = "/bin/systemctl stop ssh"
    if failed port 22 protocol ssh then restart
    if 3 restarts within 5 cycles then alert
```

### Elasticsearch

```text
check process elasticsearch matching "elasticsearch"
    start program = "/bin/systemctl start elasticsearch"
    stop program  = "/bin/systemctl stop elasticsearch"
    if failed host 127.0.0.1 port 9200 protocol http
        and request "/_cluster/health"
        and status 200
        then restart
    if memory > 85% for 3 cycles then alert
    if 3 restarts within 5 cycles then alert
```

## File and Directory Monitoring

Monit can watch files for changes - useful for detecting configuration tampering or monitoring log growth:

```bash
sudo nano /etc/monit/conf.d/files
```

```text
# Alert if /etc/passwd is modified
check file passwd with path /etc/passwd
    if changed checksum then alert

# Alert if /etc/sudoers is modified
check file sudoers with path /etc/sudoers
    if changed checksum then alert

# Alert if the SSL certificate is about to expire
check file ssl-cert with path /etc/ssl/certs/myapp.crt
    if changed checksum then alert

# Watch for suspicious changes to crontab
check file root-crontab with path /var/spool/cron/crontabs/root
    if changed checksum then alert

# Monitor log file - alert if it stops growing (stuck application)
check file app-log with path /var/log/myapp/app.log
    if not changed for 10 minutes then alert

# Alert if a log file gets too large
check file nginx-access-log with path /var/log/nginx/access.log
    if size > 100 MB then alert
```

## System Resource Monitoring

```bash
sudo nano /etc/monit/conf.d/system
```

```text
# Monitor the system itself
check system myhostname
    if memory usage > 85% for 5 cycles then alert
    if cpu usage (user) > 80% for 10 cycles then alert
    if cpu usage (system) > 30% for 10 cycles then alert
    if loadavg (1min) > 10 for 3 cycles then alert
    if loadavg (5min) > 8 for 5 cycles then alert

# Disk space monitoring
check device rootfs with path /
    if space usage > 80% then alert
    if space usage > 90% then exec "/usr/local/bin/disk-full-emergency.sh"

check device data-disk with path /data
    if space usage > 85% then alert
    if inode usage > 80% then alert
```

## Network/Port Monitoring

```text
# Monitor an external service (without a local process)
check host google-dns with address 8.8.8.8
    if failed icmp type echo count 5 with timeout 10 seconds then alert

# Monitor a web application
check host webapp with address app.example.com
    if failed port 443 protocol https
        and certificate valid > 30 days
        and request "/health"
        and status 200
        then alert

# Monitor database accessible from this host
check host database-host with address 192.168.1.60
    if failed port 5432 then alert
```

## Using the Web Interface

The web interface gives you a quick overview of everything Monit is watching:

```bash
# If you configured the web interface as shown above
# Access it via SSH tunnel:
ssh -L 2812:localhost:2812 your-server

# Then open: http://localhost:2812
# Login with admin:secretpassword (as configured)
```

## Controlling Monit

```bash
# Check Monit's syntax
sudo monit -t

# Reload configuration without restart
sudo monit reload

# Check status of all monitored items
sudo monit status

# Check status of a specific item
sudo monit status nginx

# Force an immediate check
sudo monit monitor nginx

# Stop monitoring something temporarily
sudo monit unmonitor nginx

# Start, stop, restart a monitored service
sudo monit start nginx
sudo monit stop nginx
sudo monit restart nginx

# View the Monit log
sudo tail -f /var/log/monit.log
```

## Handling False Restart Cycles

If Monit keeps restarting a service that appears to be working, check the check conditions:

```bash
# View what Monit sees
sudo monit status nginx

# Check the logs for what triggered the restart
sudo grep "restart" /var/log/monit.log | tail -20
```

Common false-positive causes:
- PID file path is wrong - verify with `cat /path/to/pidfile`
- Port check timing out because the service takes time to start
- HTTP check failing because the URL requires authentication

Fix by adding a startup delay:

```text
check process nginx with pidfile /var/run/nginx.pid
    start program = "/bin/systemctl start nginx"
        with timeout 60 seconds   # Wait up to 60s for startup
    stop program  = "/bin/systemctl stop nginx"
    ...
```

## Alerting Configuration Examples

```text
# Global alert settings
set alert admin@example.com
    not on { nonexist, pid, ppid, size }   # Don't alert for these specific conditions

# Per-service overrides
check process nginx ...
    alert devops@example.com on { restart, nonexist }
    alert security@example.com on { checksum }

# Reminder alerts - resend alert every N cycles if still in error
set alert admin@example.com reminder on 10 cycles
```

Monit's sweet spot is the gap between "systemd manages my services" (no automatic recovery beyond simple restarts) and full-blown monitoring systems like Nagios or Prometheus. For most standalone Ubuntu servers, Monit provides a significant reliability improvement for very little operational overhead.
