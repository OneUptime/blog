# How to Set the System Timezone on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Timezone, System Administration, Timedatectl, Linux

Description: Configure the system timezone on Ubuntu using timedatectl, update /etc/timezone, and ensure applications and log files use the correct local time or UTC.

---

Setting the correct timezone on Ubuntu affects log timestamps, scheduled cron jobs, application behavior, and anything else that relies on the system clock. For servers, UTC is generally recommended to avoid complications with daylight saving time changes. For desktop or regional servers, the local timezone is appropriate.

## Checking Current Timezone

Before changing anything, see what's currently configured:

```bash
# Show current timezone and time settings
timedatectl

# Output example:
#                Local time: Mon 2026-03-02 14:30:00 EST
#            Universal time: Mon 2026-03-02 19:30:00 UTC
#                  RTC time: Mon 2026-03-02 19:30:00
#                 Time zone: America/New_York (EST, -0500)
# System clock synchronized: yes
#               NTP service: active
#           RTC in local TZ: no

# Just show the current timezone
timedatectl show --property=Timezone --value
# Or:
cat /etc/timezone

# Check via date command
date
date +%Z    # Just timezone abbreviation
date +%z    # Timezone offset
```

## Listing Available Timezones

Ubuntu uses the IANA timezone database. List available zones:

```bash
# List all available timezones
timedatectl list-timezones

# List timezones and pipe through less for paging
timedatectl list-timezones | less

# Search for a specific region
timedatectl list-timezones | grep America
timedatectl list-timezones | grep Europe
timedatectl list-timezones | grep Asia
timedatectl list-timezones | grep Australia

# Search for a specific city
timedatectl list-timezones | grep -i london
timedatectl list-timezones | grep -i tokyo
timedatectl list-timezones | grep -i new_york

# List US timezones
timedatectl list-timezones | grep "^US/"
timedatectl list-timezones | grep "America/New\|America/Los\|America/Chicago\|America/Denver"
```

## Setting the Timezone with timedatectl

The recommended method for Ubuntu 16.04 and later:

```bash
# Set timezone to UTC (recommended for servers)
sudo timedatectl set-timezone UTC

# Set to a specific timezone
sudo timedatectl set-timezone America/New_York
sudo timedatectl set-timezone America/Los_Angeles
sudo timedatectl set-timezone Europe/London
sudo timedatectl set-timezone Europe/Paris
sudo timedatectl set-timezone Asia/Tokyo
sudo timedatectl set-timezone Australia/Sydney

# Verify the change
timedatectl
date
```

## Alternative Method: Symlinking /etc/localtime

Directly creating the symlink works on all Linux distributions:

```bash
# Create symlink from /etc/localtime to the timezone file
sudo ln -sf /usr/share/zoneinfo/UTC /etc/localtime

# For a specific timezone
sudo ln -sf /usr/share/zoneinfo/America/New_York /etc/localtime

# Verify
ls -la /etc/localtime
# Should show: /etc/localtime -> /usr/share/zoneinfo/America/New_York

# Also update /etc/timezone file (some applications read this directly)
echo "America/New_York" | sudo tee /etc/timezone
```

## Setting Timezone Non-Interactively

For scripts and automation:

```bash
# Non-interactive timezone setting (useful in scripts)
sudo timedatectl set-timezone America/Chicago

# Alternative for cloud-init, docker, or automated setups
sudo ln -snf /usr/share/zoneinfo/UTC /etc/localtime
echo "UTC" | sudo tee /etc/timezone

# Using dpkg-reconfigure (interactive)
sudo dpkg-reconfigure tzdata

# Or non-interactive dpkg-reconfigure
DEBIAN_FRONTEND=noninteractive sudo dpkg-reconfigure tzdata
```

## Timezone in Docker Containers

For Docker containers running Ubuntu:

```bash
# In a Dockerfile
FROM ubuntu:22.04

# Set timezone without interactive prompt
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y tzdata
ENV TZ=America/New_York
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone
```

Or mount the host's timezone:

```bash
# In docker run command
docker run -v /etc/localtime:/etc/localtime:ro myimage

# In docker-compose.yml
services:
  myapp:
    image: myapp
    volumes:
      - /etc/localtime:/etc/localtime:ro
      - /etc/timezone:/etc/timezone:ro
```

## Verifying Timezone Configuration

After setting the timezone, verify everything is consistent:

```bash
# Check timedatectl output
timedatectl

# Check /etc/timezone file
cat /etc/timezone

# Check /etc/localtime symlink
ls -la /etc/localtime

# Check with date command
date
date -u   # UTC time regardless of timezone

# Verify timezone files exist
ls /usr/share/zoneinfo/ | head -10

# Check the timezone file content
zdump /etc/localtime
zdump America/New_York

# Check what timezone the system actually uses
python3 -c "import datetime; print(datetime.datetime.now().astimezone())"
```

## Impact on Existing Log Files

Changing the timezone doesn't rewrite existing log files - their timestamps remain as originally written. Only new log entries reflect the new timezone:

```bash
# Timestamps in syslog after timezone change
tail /var/log/syslog

# The journal handles this differently - it stores UTC internally
# journalctl always shows times in the current system timezone
journalctl --since "1 hour ago"

# Show journal times in UTC regardless of local timezone
journalctl --utc --since "1 hour ago"

# Show journal times in a specific timezone
TZ=America/New_York journalctl --since "1 hour ago"
```

## Timezone for Cron Jobs

cron uses the system timezone by default. When you change the timezone, existing cron jobs will run at different UTC times:

```bash
# View cron tab
crontab -l

# If you have a job set to "run at 9 AM" and you change from UTC to EST,
# the job will run at 9 AM EST (2 PM UTC) instead of 9 AM UTC (4 AM EST)

# To run a cron job in a specific timezone regardless of system setting:
# Prepend the timezone variable to the cron command
TZ=America/New_York 0 9 * * * /usr/local/bin/my-script.sh

# Or use a per-crontab timezone declaration (some cron implementations support this)
sudo crontab -e
# Add at the top of the crontab:
CRON_TZ=UTC
# Then all time specifications in this crontab use UTC
```

## Timezone for Specific Applications

Some applications have their own timezone configuration:

```bash
# PostgreSQL timezone
sudo nano /etc/postgresql/14/main/postgresql.conf
# timezone = 'UTC'

# MySQL timezone
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf
# [mysqld]
# default_time_zone = '+00:00'

# Reload MySQL after change
sudo systemctl restart mysql

# Verify MySQL timezone
mysql -u root -p -e "SELECT @@global.time_zone, @@session.time_zone;"

# PHP timezone (affects date/time functions)
sudo nano /etc/php/8.1/cli/php.ini
# date.timezone = "America/New_York"

# Java timezone (via JVM argument)
# Add to application startup: -Duser.timezone=UTC
```

## Servers Should Use UTC

For production servers, using UTC is strongly recommended:

1. No daylight saving time transitions that can cause duplicate or missing log entries
2. Consistent timestamps across servers in different regions
3. Easier cross-referencing of logs from different systems
4. Standard for most cloud providers and services

```bash
# Set all servers to UTC
sudo timedatectl set-timezone UTC

# Verify
timedatectl | grep "Time zone"
# Should show: Time zone: UTC (UTC, +0000)
```

## Checking for Common Issues

```bash
# Check if system time and hardware clock match
timedatectl
# Both "Local time" and "RTC time" should be close (within a few seconds)

# Hardware clock in UTC or local time?
cat /etc/adjtime | head -3
# Third line: UTC = hardware clock is UTC (correct for most systems)
#             LOCAL = hardware clock uses local time (can cause issues)

# Set hardware clock to UTC if it isn't
sudo timedatectl set-local-rtc 0
# This sets RTC (hardware clock) to UTC mode

# Sync hardware clock from system clock
sudo hwclock --systohc

# Read hardware clock
sudo hwclock --show
```

Setting the correct timezone is a foundational system configuration step that should be done immediately after provisioning a new server. Combined with proper NTP synchronization, it ensures that all logs, scheduled tasks, and application behavior are based on accurate and consistent time information.
