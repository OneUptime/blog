# How to Run a Container with Timezone Configuration in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Timezone, Configuration

Description: Learn how to configure the timezone inside Podman containers so that logs, scheduled tasks, and time-dependent operations use the correct local time.

---

> Getting the timezone right in your containers ensures that logs, cron jobs, and time-stamped data all reflect the correct local time.

By default, most container images use UTC as their timezone. While UTC is a reasonable default for servers, many applications need to operate in a specific local timezone. Incorrect timezone configuration leads to confusing log timestamps, missed scheduled jobs, and bugs in time-dependent business logic.

This guide covers multiple methods to set the timezone in Podman containers.

---

## Default Container Timezone

Most containers default to UTC:

```bash
# Check the default timezone

podman run --rm alpine sh -c "
  date
  cat /etc/localtime 2>/dev/null | head -1 || echo 'No localtime file'
  echo \$TZ
"
```

## Method 1: Using the TZ Environment Variable

The simplest approach is setting the `TZ` environment variable:

```bash
# Set timezone to US Eastern
podman run --rm -e TZ=America/New_York alpine sh -c "apk add --no-cache tzdata >/dev/null && date"

# Set timezone to Europe/London
podman run --rm -e TZ=Europe/London alpine sh -c "apk add --no-cache tzdata >/dev/null && date"

# Set timezone to Asia/Tokyo
podman run --rm -e TZ=Asia/Tokyo alpine sh -c "apk add --no-cache tzdata >/dev/null && date"

# Set timezone to US Pacific
podman run --rm -e TZ=America/Los_Angeles alpine sh -c "apk add --no-cache tzdata >/dev/null && date"
```

The `TZ` variable is widely supported by C libraries and most applications. Minimal images such as Alpine need the `tzdata` package installed for IANA timezone names like `America/New_York`.

## Method 2: Mounting the Host's Timezone Files

Bind-mount the host's timezone files into the container:

```bash
# Mount /etc/localtime from the host (read-only)
podman run --rm \
  -v /etc/localtime:/etc/localtime:ro \
  alpine date

# Mount both localtime and timezone files on hosts that provide /etc/timezone
podman run --rm \
  -v /etc/localtime:/etc/localtime:ro \
  -v /etc/timezone:/etc/timezone:ro \
  alpine sh -c "
    date
    cat /etc/timezone 2>/dev/null || echo 'No timezone file'
  "
```

This ensures the container uses exactly the same timezone as the host.

## Method 3: Using the --tz Flag

Podman has a dedicated `--tz` flag for timezone configuration:

```bash
# Set timezone using --tz
podman run --rm --tz America/Chicago alpine date

# Use local to match the host timezone
podman run --rm --tz local alpine date

# Use UTC explicitly
podman run --rm --tz UTC alpine date
```

The `--tz` flag is the cleanest Podman-specific approach.

## Comparing All Methods

```bash
echo "=== TZ environment variable ==="
podman run --rm -e TZ=America/New_York alpine sh -c "apk add --no-cache tzdata >/dev/null && date"

echo ""
echo "=== --tz flag ==="
podman run --rm --tz America/New_York alpine date

echo ""
echo "=== Host mount ==="
podman run --rm -v /etc/localtime:/etc/localtime:ro alpine date

echo ""
echo "=== Default (UTC) ==="
podman run --rm alpine date
```

## Setting Timezone for Long-Running Services

```bash
# Web server with timezone configured
podman run -d --name web \
  --tz America/New_York \
  -p 8080:80 \
  nginx:latest

# Database with timezone
podman run -d --name postgres \
  --tz America/New_York \
  -e POSTGRES_PASSWORD=secret \
  postgres:16

# Check timestamps in logs
podman logs web 2>&1 | head -3
podman logs postgres 2>&1 | head -3

podman stop web postgres && podman rm web postgres
```

## Timezone in Application Logs

```bash
# Application that logs timestamps
podman run --rm --tz Europe/Berlin alpine sh -c "
  echo \"[\$(date '+%Y-%m-%d %H:%M:%S %Z')] Application started\"
  echo \"[\$(date '+%Y-%m-%d %H:%M:%S %Z')] Processing request\"
  echo \"[\$(date '+%Y-%m-%d %H:%M:%S %Z')] Request completed\"
"

# Compare UTC vs local time in logs
echo "=== UTC logs ==="
podman run --rm --tz UTC alpine date '+%Y-%m-%d %H:%M:%S %Z'

echo "=== Local timezone logs ==="
podman run --rm --tz America/New_York alpine date '+%Y-%m-%d %H:%M:%S %Z'
```

## Timezone for Cron Jobs

Scheduled tasks need the correct timezone:

```bash
# Container with cron-like scheduling
podman run --rm --tz America/Los_Angeles alpine sh -c "
  echo 'System time for scheduled tasks:'
  date
  echo ''
  echo 'A job scheduled for 9:00 AM Pacific will run when this time reads 09:00'
"
```

## Timezone with Python Applications

```bash
# Python respects the TZ environment variable
podman run --rm -e TZ=Asia/Tokyo python:3.12-slim python3 -c "
from datetime import datetime
import time

print(f'Current time: {datetime.now()}')
print(f'Timezone: {time.tzname}')
print(f'UTC offset: {time.timezone / -3600} hours')
"
```

## Timezone with Node.js Applications

```bash
# Node.js uses the TZ variable
podman run --rm -e TZ=Europe/Paris node:20-slim node -e "
console.log('Current time:', new Date().toString());
console.log('Timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
"
```

## Available Timezone Names

```bash
# List all available timezone names
podman run --rm alpine sh -c "
  apk add --no-cache tzdata >/dev/null
  ls /usr/share/zoneinfo/ | head -20
  echo '...'
  echo ''
  echo 'Example full timezone paths:'
  ls /usr/share/zoneinfo/America/ | head -10
  echo '...'
  ls /usr/share/zoneinfo/Europe/ | head -10
"
```

Common timezone identifiers:
- `America/New_York` - US Eastern
- `America/Chicago` - US Central
- `America/Denver` - US Mountain
- `America/Los_Angeles` - US Pacific
- `Europe/London` - UK
- `Europe/Berlin` - Central Europe
- `Asia/Tokyo` - Japan
- `Asia/Shanghai` - China
- `Asia/Kolkata` - India
- `Australia/Sydney` - Australia Eastern
- `UTC` - Coordinated Universal Time

## Timezone in Pods

```bash
# Set timezone for all containers in a pod
podman pod create --name tz-pod

podman run -d --pod tz-pod --name pod-app1 \
  --tz America/New_York \
  alpine sleep infinity

podman run -d --pod tz-pod --name pod-app2 \
  --tz America/New_York \
  alpine sleep infinity

# Both containers use the same timezone
podman exec pod-app1 date
podman exec pod-app2 date

podman pod stop tz-pod && podman pod rm tz-pod
```

## Verifying Timezone Configuration

```bash
# Comprehensive timezone verification
podman run --rm --tz America/Chicago alpine sh -c "
  echo 'Date output:'
  date
  echo ''
  echo 'TZ variable:' \$TZ
  echo ''
  echo '/etc/localtime links to:'
  ls -la /etc/localtime 2>/dev/null
  echo ''
  echo 'Timezone name from date:'
  date +%Z
  echo ''
  echo 'Full date format:'
  date '+%Y-%m-%d %H:%M:%S %Z (%z)'
"
```

## Summary

Timezone configuration in Podman ensures correct time handling across your containers:

- Use `--tz timezone` for the cleanest Podman-native approach
- Use `-e TZ=timezone` for broad application compatibility
- Use `-v /etc/localtime:/etc/localtime:ro` to match the host timezone
- Use `--tz local` to automatically match the host
- Always use IANA timezone names (e.g., `America/New_York`, not `EST`)
- Verify with `date` inside the container after configuration

Getting the timezone right is essential for log analysis, scheduled tasks, and any time-sensitive business logic in your containerized applications.
