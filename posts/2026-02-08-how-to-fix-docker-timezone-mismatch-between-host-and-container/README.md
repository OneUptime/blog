# How to Fix Docker TimeZone Mismatch Between Host and Container

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, timezone, configuration, troubleshooting, containers, linux, environment

Description: Fix timezone mismatches between Docker containers and the host system by mounting timezone files, setting environment variables, and configuring images.

---

Your host server runs in US Eastern time. Your Docker container thinks it is UTC. Timestamps in your logs do not match. Scheduled jobs fire at the wrong time. Database records show times that confuse your users. Timezone mismatches between the host and containers are surprisingly common because most Docker base images default to UTC, regardless of what timezone the host is set to.

Here is how to synchronize timezones between your host and containers, and which approach works best for different situations.

## Why Containers Default to UTC

Docker containers are isolated environments. They do not inherit the host's timezone setting automatically. Most base images (Alpine, Ubuntu, Debian) ship with UTC as the default timezone. The container does not read the host's `/etc/localtime` or `/etc/timezone` files unless you explicitly share them.

Check the current timezone inside a container:

```bash
# Check timezone in a running container
docker exec my-container date
docker exec my-container cat /etc/timezone 2>/dev/null || echo "No /etc/timezone file"
docker exec my-container ls -la /etc/localtime

# Compare with the host
date
cat /etc/timezone 2>/dev/null || echo "No /etc/timezone file"
```

## Fix 1: Set the TZ Environment Variable

The simplest and most portable approach is setting the `TZ` environment variable. Most applications and system libraries honor this variable.

```bash
# Run a container with a specific timezone
docker run -e TZ=America/New_York myimage

# Verify the timezone is applied
docker run -e TZ=America/New_York alpine date
```

In Docker Compose:

```yaml
# docker-compose.yml with timezone set via environment variable
services:
  webapp:
    image: myapp:latest
    environment:
      - TZ=America/New_York

  db:
    image: postgres:15
    environment:
      - TZ=America/New_York
      - PGTZ=America/New_York  # PostgreSQL-specific timezone setting

  redis:
    image: redis:7
    environment:
      - TZ=America/New_York
```

This approach works on most images. However, some minimal images (like scratch-based images) might not have timezone data installed, so the TZ variable alone will not work.

## Fix 2: Mount the Host's Timezone Files

For containers that need to match the host's timezone exactly, mount the timezone files from the host:

```bash
# Mount both timezone files as read-only volumes
docker run \
  -v /etc/localtime:/etc/localtime:ro \
  -v /etc/timezone:/etc/timezone:ro \
  myimage
```

In Docker Compose:

```yaml
# docker-compose.yml with host timezone mounted
services:
  webapp:
    image: myapp:latest
    volumes:
      - /etc/localtime:/etc/localtime:ro
      - /etc/timezone:/etc/timezone:ro
```

Note: `/etc/timezone` does not exist on all systems (it is missing on CentOS/RHEL). In that case, only mount `/etc/localtime`:

```yaml
# docker-compose.yml - compatible with systems without /etc/timezone
services:
  webapp:
    image: myapp:latest
    volumes:
      - /etc/localtime:/etc/localtime:ro
    environment:
      - TZ=America/New_York  # Fallback in case the mount doesn't work
```

## Fix 3: Install Timezone Data in the Dockerfile

Some minimal base images do not include timezone data. You need to install it during the build.

For Alpine-based images:

```dockerfile
# Dockerfile - Alpine with timezone support
FROM alpine:latest

# Install timezone data package
RUN apk add --no-cache tzdata

# Set the timezone
ENV TZ=America/New_York

# Copy the timezone file and clean up to keep the image small
RUN cp /usr/share/zoneinfo/$TZ /etc/localtime && \
    echo "$TZ" > /etc/timezone && \
    apk del tzdata

COPY app /app
CMD ["/app"]
```

For Debian/Ubuntu-based images:

```dockerfile
# Dockerfile - Debian/Ubuntu with non-interactive timezone setup
FROM ubuntu:22.04

# Prevent interactive timezone prompts during installation
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=America/New_York

# Install timezone data and configure it
RUN apt-get update && \
    apt-get install -y tzdata && \
    ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && \
    echo $TZ > /etc/timezone && \
    dpkg-reconfigure --frontend noninteractive tzdata && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*
```

For distroless or scratch-based images, you need to copy the timezone data from a builder stage:

```dockerfile
# Dockerfile - Multi-stage build for minimal images
FROM alpine:latest AS tz-builder
RUN apk add --no-cache tzdata

FROM scratch
# Copy timezone data from the builder
COPY --from=tz-builder /usr/share/zoneinfo/America/New_York /etc/localtime
COPY myapp /myapp
CMD ["/myapp"]
```

## Fix 4: Configure Timezone at Runtime with a Build Argument

Make the timezone configurable at build time while providing a sensible default:

```dockerfile
# Dockerfile with configurable timezone
FROM python:3.11-slim

# Accept timezone as a build argument with a default
ARG TZ=UTC
ENV TZ=${TZ}

# Install timezone data and configure
RUN apt-get update && \
    apt-get install -y tzdata && \
    ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && \
    echo $TZ > /etc/timezone && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

COPY . /app
WORKDIR /app
CMD ["python", "app.py"]
```

Build with a specific timezone:

```bash
# Build with a custom timezone
docker build --build-arg TZ=Europe/London -t myapp .

# Or with the default (UTC)
docker build -t myapp .
```

## Fix 5: Database-Specific Timezone Configuration

Databases often have their own timezone settings that are separate from the system timezone.

PostgreSQL:

```yaml
# docker-compose.yml with PostgreSQL timezone
services:
  db:
    image: postgres:15
    environment:
      - TZ=America/New_York
      - PGTZ=America/New_York
    command: postgres -c timezone=America/New_York -c log_timezone=America/New_York
```

MySQL:

```yaml
# docker-compose.yml with MySQL timezone
services:
  db:
    image: mysql:8
    environment:
      - TZ=America/New_York
    command: --default-time-zone=America/New_York
    volumes:
      - /etc/localtime:/etc/localtime:ro
```

MongoDB:

```yaml
# docker-compose.yml - MongoDB uses the system timezone
services:
  mongo:
    image: mongo:7
    environment:
      - TZ=America/New_York
    volumes:
      - /etc/localtime:/etc/localtime:ro
```

## Best Practice: Use UTC Everywhere

Before you set every container to your local timezone, consider whether you actually should. The industry best practice is to run everything in UTC and convert to local timezones only at the display layer.

Benefits of UTC across all containers:
- No ambiguity with daylight saving time transitions
- Consistent timestamps across distributed systems
- Simplified log correlation between services
- No timezone conversion errors in data pipelines

```yaml
# docker-compose.yml - all services in UTC (recommended for production)
services:
  webapp:
    image: myapp:latest
    environment:
      - TZ=UTC

  api:
    image: myapi:latest
    environment:
      - TZ=UTC

  db:
    image: postgres:15
    environment:
      - TZ=UTC
      - PGTZ=UTC
```

Then handle timezone conversion in your application code:

```python
# Python example: store in UTC, display in local time
from datetime import datetime, timezone
import zoneinfo

# Store timestamps in UTC
utc_now = datetime.now(timezone.utc)

# Convert to local time only for display
eastern = zoneinfo.ZoneInfo("America/New_York")
local_time = utc_now.astimezone(eastern)
print(f"UTC: {utc_now}")
print(f"Local: {local_time}")
```

## Verifying Timezone Configuration

After applying your fix, verify that all containers agree on the time:

```bash
#!/bin/bash
# check-timezones.sh - Verify timezone consistency across containers

echo "Host timezone:"
date "+%Z %z - %Y-%m-%d %H:%M:%S"

echo ""
echo "Container timezones:"
for container in $(docker ps --format "{{.Names}}"); do
    tz=$(docker exec "$container" date "+%Z %z - %Y-%m-%d %H:%M:%S" 2>/dev/null)
    if [ -n "$tz" ]; then
        echo "  $container: $tz"
    else
        echo "  $container: unable to check (date command not available)"
    fi
done
```

## Summary

Docker containers default to UTC because they do not inherit the host's timezone. The easiest fix is setting the `TZ` environment variable. For containers that need to match the host exactly, mount `/etc/localtime` as a read-only volume. For minimal images, install the `tzdata` package during the build. But before changing everything to your local timezone, consider sticking with UTC for all services and converting only at the display layer. This avoids daylight saving time bugs and makes log correlation across services much simpler.
