# How to Set Container Timezone in Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Timezone, Configuration, DevOps, Containers

Description: Learn how to configure timezones in Docker containers, synchronize time with the host, and handle timezone-aware applications for consistent behavior across environments.

---

By default, Docker containers use UTC timezone. While UTC is often preferred for servers, applications that log user-facing times or schedule jobs based on local time need proper timezone configuration.

## Quick Solutions

### Environment Variable (Most Common)

```bash
# Set timezone via environment variable
docker run -e TZ=America/New_York myimage

# Verify
docker run -e TZ=America/New_York alpine date
```

### Docker Compose

```yaml
services:
  app:
    image: myapp
    environment:
      - TZ=America/New_York
```

## How Timezone Works in Linux Containers

```
Timezone Configuration Flow

┌─────────────────────────────────────────────────────────────┐
│  Application reads time                                      │
│           │                                                  │
│           ▼                                                  │
│  Check TZ environment variable ─────► If set, use it        │
│           │                                                  │
│           ▼ (if not set)                                     │
│  Read /etc/localtime ───────────────► Timezone data file    │
│           │                                                  │
│           ▼ (if not exists)                                  │
│  Default to UTC                                              │
└─────────────────────────────────────────────────────────────┘
```

## Method 1: TZ Environment Variable

The simplest and most portable method.

```bash
# Docker run
docker run -e TZ=Europe/London myimage

# Works with most base images
docker run -e TZ=Asia/Tokyo ubuntu date
docker run -e TZ=America/Los_Angeles alpine date
```

### Valid Timezone Names

```bash
# List all available timezones (on host or in container)
timedatectl list-timezones

# Common examples:
# UTC
# America/New_York
# America/Los_Angeles
# America/Chicago
# Europe/London
# Europe/Paris
# Asia/Tokyo
# Asia/Shanghai
# Australia/Sydney
```

## Method 2: Mount Host Timezone Files

Share the host's timezone configuration with the container.

```bash
# Mount localtime (read-only)
docker run -v /etc/localtime:/etc/localtime:ro myimage

# Mount timezone name file too
docker run \
  -v /etc/localtime:/etc/localtime:ro \
  -v /etc/timezone:/etc/timezone:ro \
  myimage
```

### Docker Compose

```yaml
services:
  app:
    image: myapp
    volumes:
      - /etc/localtime:/etc/localtime:ro
      - /etc/timezone:/etc/timezone:ro
```

**Note**: `/etc/timezone` doesn't exist on all systems (missing on Alpine, some distros).

## Method 3: Configure in Dockerfile

Bake the timezone into the image.

### Debian/Ubuntu

```dockerfile
FROM ubuntu:22.04

# Set timezone non-interactively
ENV TZ=America/New_York
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Install tzdata if needed
RUN apt-get update && apt-get install -y tzdata && rm -rf /var/lib/apt/lists/*
```

### Alpine

```dockerfile
FROM alpine:3.19

# Install timezone data
RUN apk add --no-cache tzdata

# Set timezone
ENV TZ=America/New_York
RUN cp /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Optional: Remove tzdata to save space (timezone is now in /etc/localtime)
# RUN apk del tzdata
```

### Flexible Dockerfile with ARG

```dockerfile
FROM ubuntu:22.04

ARG TIMEZONE=UTC
ENV TZ=$TIMEZONE

RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Build with custom timezone
# docker build --build-arg TIMEZONE=Asia/Tokyo -t myapp .
```

## Language-Specific Considerations

### Node.js

```javascript
// Node.js uses TZ environment variable
// Set TZ=America/New_York before starting Node

// Or set programmatically (must be before any Date usage)
process.env.TZ = 'America/New_York';

// Verify
console.log(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
```

### Python

```python
import os
import datetime
from zoneinfo import ZoneInfo  # Python 3.9+

# Check current timezone
print(datetime.datetime.now().astimezone())

# TZ environment variable works
# TZ=America/New_York python script.py

# Or use explicit timezone in code
tz = ZoneInfo('America/New_York')
now = datetime.datetime.now(tz)
```

### Java

```java
// Java uses system timezone
// Set TZ=America/New_York or configure in application

// Or set JVM timezone
// java -Duser.timezone=America/New_York -jar app.jar

// Or programmatically
import java.util.TimeZone;
TimeZone.setDefault(TimeZone.getTimeZone("America/New_York"));
```

### PHP

```php
// php.ini
// date.timezone = America/New_York

// Or at runtime
date_default_timezone_set('America/New_York');

// Or via environment
// TZ=America/New_York php script.php
```

## Database Timezone Configuration

### PostgreSQL

```yaml
services:
  postgres:
    image: postgres:15
    environment:
      - TZ=America/New_York
      - POSTGRES_PASSWORD=secret
    command: postgres -c timezone=America/New_York
```

### MySQL

```yaml
services:
  mysql:
    image: mysql:8
    environment:
      - TZ=America/New_York
      - MYSQL_ROOT_PASSWORD=secret
    command: --default-time-zone=America/New_York
```

### MongoDB

```yaml
services:
  mongo:
    image: mongo:7
    environment:
      - TZ=America/New_York
```

## Time Synchronization

### Container Time vs Host Time

Containers share the host's system clock. The timezone only affects how that time is displayed.

```bash
# Check time on host
date

# Check time in container (UTC by default)
docker run alpine date

# Same moment, different display (with TZ)
docker run -e TZ=America/New_York alpine date
```

### NTP and Time Sync

Containers use the host's clock. Ensure the host is synchronized:

```bash
# Check host time synchronization
timedatectl status

# If NTP is not synced, enable it
sudo timedatectl set-ntp on
```

## Complete Example: Multi-Service Application

```yaml
version: '3.8'

x-timezone: &timezone
  TZ: America/New_York

services:
  app:
    image: node:20-alpine
    environment:
      <<: *timezone
      DATABASE_URL: postgres://user:pass@db:5432/myapp
    volumes:
      - ./app:/app
    command: node /app/server.js

  worker:
    image: python:3.11-slim
    environment:
      <<: *timezone
      CELERY_BROKER: redis://redis:6379
    volumes:
      - ./worker:/app
    command: celery -A tasks worker

  db:
    image: postgres:15
    environment:
      <<: *timezone
      POSTGRES_PASSWORD: pass
      POSTGRES_USER: user
      POSTGRES_DB: myapp
    command: postgres -c timezone=America/New_York

  redis:
    image: redis:7-alpine
    environment:
      <<: *timezone

  nginx:
    image: nginx:alpine
    environment:
      <<: *timezone
    volumes:
      - /etc/localtime:/etc/localtime:ro
```

## Verify Timezone Configuration

### Check Current Timezone

```bash
# Inside container
docker exec mycontainer date
docker exec mycontainer cat /etc/timezone
docker exec mycontainer ls -la /etc/localtime

# Check TZ variable
docker exec mycontainer printenv TZ
```

### Test Timezone-Aware Code

```bash
# Run date in different timezones
docker run --rm -e TZ=UTC alpine date
docker run --rm -e TZ=America/New_York alpine date
docker run --rm -e TZ=Asia/Tokyo alpine date

# Should show same moment, different local times
```

## Troubleshooting

### TZ Variable Not Working

```bash
# Ensure tzdata is installed
docker exec mycontainer ls /usr/share/zoneinfo

# If missing, install it
# Debian/Ubuntu: apt-get install tzdata
# Alpine: apk add tzdata
```

### Time Shows UTC Despite Configuration

```bash
# Check if TZ is set
docker exec mycontainer printenv TZ

# Check if /etc/localtime exists
docker exec mycontainer ls -la /etc/localtime

# Check timezone data files exist
docker exec mycontainer ls /usr/share/zoneinfo/America/
```

### Application Ignores System Timezone

Some applications have their own timezone configuration:

```yaml
# Ensure application-level timezone is also set
services:
  app:
    environment:
      - TZ=America/New_York
      # Java
      - JAVA_OPTS=-Duser.timezone=America/New_York
      # Node.js uses TZ automatically
```

## Best Practices

### 1. Use UTC for Servers

Store timestamps in UTC, convert for display:

```yaml
services:
  app:
    environment:
      - TZ=UTC
      - DISPLAY_TIMEZONE=America/New_York
```

### 2. Be Consistent Across Services

```yaml
# Use YAML anchor for consistency
x-timezone: &tz
  TZ: ${TIMEZONE:-UTC}

services:
  app:
    environment:
      <<: *tz
  worker:
    environment:
      <<: *tz
  db:
    environment:
      <<: *tz
```

### 3. Allow Runtime Configuration

```yaml
services:
  app:
    environment:
      - TZ=${TZ:-America/New_York}
```

```bash
# Override at runtime
TZ=Europe/London docker compose up
```

## Summary

| Method | Use Case |
|--------|----------|
| `TZ=timezone` env var | Most portable, recommended |
| Mount `/etc/localtime` | Match host timezone |
| Dockerfile configuration | Bake into image |
| Application config | Language-specific needs |

Setting the `TZ` environment variable is the simplest and most portable solution. For databases and other services that need timezone-aware queries, also configure the service's native timezone settings. Always ensure the host's system clock is synchronized via NTP for accurate time.

