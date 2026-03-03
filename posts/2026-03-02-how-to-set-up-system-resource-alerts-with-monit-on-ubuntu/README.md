# How to Set Up System Resource Alerts with monit on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Monitoring, System Administration, Linux, Alerting

Description: Learn how to install and configure monit on Ubuntu to monitor system resources, restart failed services automatically, and receive alerts when thresholds are exceeded.

---

`monit` is a lightweight process supervision and monitoring tool that watches over services, files, directories, and system resources. Unlike heavyweight monitoring stacks that require multiple components, monit is a single binary that can monitor CPU, memory, disk, and network - restart failing services automatically - and send email alerts when things go wrong.

## Installing monit

```bash
sudo apt update
sudo apt install monit -y
```

Enable and start the service:

```bash
sudo systemctl enable monit
sudo systemctl start monit
```

## Configuration Structure

Monit's main configuration is at `/etc/monit/monitrc`. Additional checks go in `/etc/monit/conf.d/` or `/etc/monit/conf-enabled/`. The `conf.d` approach keeps configuration organized:

```bash
# View existing configuration
sudo cat /etc/monit/monitrc

# List enabled configurations
ls /etc/monit/conf.d/
```

## Basic monit Configuration

Edit the main configuration:

```bash
sudo nano /etc/monit/monitrc
```

Key settings to configure:

```text
# Check interval (default: 30 seconds)
set daemon 60

# Log to syslog
set log syslog

# Alert email settings
set mailserver smtp.gmail.com port 587
    username "alerts@example.com"
    password "yourpassword"
    using tlsv12

set alert admin@example.com

# Web interface (optional but useful)
set httpd port 2812 and
    use address localhost
    allow localhost
    allow admin:secretpassword
```

After changes, reload:

```bash
sudo monit reload
```

## Monitoring System Resources

Create resource monitoring checks in `/etc/monit/conf.d/system`:

```bash
sudo nano /etc/monit/conf.d/system
```

```text
# System resource monitoring
check system myserver.example.com
    if loadavg (1min) per core > 2 for 3 cycles then alert
    if loadavg (5min) per core > 1.5 for 5 cycles then alert
    if cpu usage > 90% for 3 cycles then alert
    if memory usage > 85% then alert
    if swap usage > 25% then alert
```

Key points:
- `for N cycles` - Condition must persist for N check intervals before alerting (avoids false positives)
- `per core` - Load average divided by CPU count (more meaningful than raw load)
- `then alert` - Send email notification
- `then restart` - Restart the service (for process checks)

## Monitoring Specific Services

### Nginx

```bash
sudo nano /etc/monit/conf.d/nginx
```

```text
check process nginx with pidfile /run/nginx.pid
    start program = "/usr/bin/systemctl start nginx"
    stop program = "/usr/bin/systemctl stop nginx"
    if failed host 127.0.0.1 port 80 protocol http
        request "/" with timeout 10 seconds then restart
    if failed host 127.0.0.1 port 443 protocol https
        with timeout 10 seconds then restart
    if 3 restarts within 5 cycles then unmonitor
    if cpu > 70% for 3 cycles then alert
    if memory > 500 MB then alert
    alert admin@example.com only on { timeout, restart, nonexist }
```

The `if 3 restarts within 5 cycles then unmonitor` prevents monit from looping endlessly if a service is fundamentally broken.

### PostgreSQL

```bash
sudo nano /etc/monit/conf.d/postgresql
```

```text
check process postgresql with pidfile /var/run/postgresql/14-main.pid
    start program = "/usr/bin/systemctl start postgresql"
    stop program = "/usr/bin/systemctl stop postgresql"
    if failed host 127.0.0.1 port 5432 protocol pgsql
        with timeout 15 seconds then restart
    if 3 restarts within 5 cycles then unmonitor
    if cpu > 80% for 5 cycles then alert
    if memory > 2 GB then alert
```

### Redis

```bash
sudo nano /etc/monit/conf.d/redis
```

```text
check process redis with pidfile /var/run/redis/redis-server.pid
    start program = "/usr/bin/systemctl start redis"
    stop program = "/usr/bin/systemctl stop redis"
    if failed host 127.0.0.1 port 6379 then restart
    if 3 restarts within 5 cycles then unmonitor
    if memory > 1 GB then alert
```

## Monitoring Disk Space

```bash
sudo nano /etc/monit/conf.d/filesystem
```

```text
# Monitor root filesystem
check filesystem rootfs with path /
    if space usage > 80% then alert
    if space usage > 90% then exec "/usr/local/bin/cleanup-old-logs.sh"
    if inode usage > 80% then alert

# Monitor /var separately (common place for log growth)
check filesystem varfs with path /var
    if space usage > 75% then alert

# Monitor /tmp
check filesystem tmpfs with path /tmp
    if space usage > 60% then alert
```

## Monitoring Files and Directories

```bash
sudo nano /etc/monit/conf.d/files
```

```text
# Alert if a critical config file changes
check file nginx-config with path /etc/nginx/nginx.conf
    if changed checksum then alert

# Alert if an SSL certificate is expiring
check file ssl-cert with path /etc/ssl/certs/mysite.crt
    if timestamp > 60 days then alert

# Alert if error log grows too fast
check file nginx-error-log with path /var/log/nginx/error.log
    if size > 100 MB then alert
    if size > 100 MB then exec "/usr/bin/truncate -s 0 /var/log/nginx/error.log"
```

## Monitoring Network Services

```bash
sudo nano /etc/monit/conf.d/network
```

```text
# Check if port 25 (SMTP) is accessible
check network eth0 with interface eth0
    if download > 100 MB/s then alert
    if upload > 100 MB/s then alert
    if saturation > 90% then alert

# Check external service reachability
check host google-dns with address 8.8.8.8
    if failed ping count 5 with timeout 5 seconds then alert
```

## Managing monit

```bash
# Check monit status
sudo monit status

# Check status for a specific service
sudo monit status nginx

# Start monitoring a service
sudo monit start nginx

# Stop monitoring a service
sudo monit stop nginx

# Restart a monitored service
sudo monit restart nginx

# Test configuration syntax
sudo monit -t

# Reload configuration
sudo monit reload

# Run a manual check cycle now
sudo monit -I
```

## Web Interface

If you configured the web interface, access it at:

```text
http://localhost:2812
```

It shows a dashboard with all monitored items and their status. For remote access:

```text
set httpd port 2812 and
    use address 0.0.0.0
    allow admin:yourpassword
```

Then access from a browser with `http://server-ip:2812`. Consider adding SSL or putting it behind an Nginx reverse proxy with authentication for production use.

## Viewing monit Logs

```bash
# If logging to syslog
sudo journalctl -u monit -f

# Or check dedicated log file if configured
sudo tail -f /var/log/monit.log
```

## Testing Alert Configuration

Force an alert to verify email delivery works:

```bash
# Temporarily set a threshold that will definitely trigger
sudo monit -v

# Or manually exec the alert test
sudo monit alert
```

## Example: Complete System Monitoring Setup

Here's a production-ready configuration combining all the pieces:

```bash
sudo nano /etc/monit/conf.d/production-setup
```

```text
# System resources
check system $HOST
    if loadavg (1min) per core > 3 for 3 cycles then alert
    if cpu usage (user) > 85% for 3 cycles then alert
    if memory usage > 90% then alert
    if swap usage > 50% then alert

# Disk space
check filesystem root-disk with path /
    if space usage > 85% then alert
    if inode usage > 85% then alert

# Web server
check process nginx with pidfile /run/nginx.pid
    start program = "/bin/systemctl start nginx"
    stop program = "/bin/systemctl stop nginx"
    if failed port 80 protocol http then restart
    if 3 restarts within 5 cycles then unmonitor

# Application server
check process myapp with matching "myapp"
    start program = "/bin/systemctl start myapp"
    stop program = "/bin/systemctl stop myapp"
    if failed port 8080 then restart
    if cpu > 80% for 5 cycles then alert
    if memory > 1 GB then alert
    if 3 restarts within 5 cycles then unmonitor
```

Monit strikes the right balance between complexity and capability for many environments. It handles service restarts automatically, which reduces 3 AM wake-up calls significantly, and its threshold-based alerts give you early warning before minor resource pressure becomes a critical incident.
