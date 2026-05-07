# How to Fix Podman Container Timezone Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, Timezone, Linux, DevOps

Description: Learn how to fix timezone mismatches in Podman containers by configuring the TZ environment variable, mounting host timezone data, and setting timezones in Dockerfiles.

---

> Podman containers default to UTC, which causes log timestamp mismatches, incorrect scheduled tasks, and application errors when your code expects a specific timezone. Here is how to fix it at every level.

You deploy an application in a Podman container and notice that all your log timestamps are hours off. Your cron jobs inside the container fire at the wrong time. Your application displays the wrong time to users. The problem is that containers default to UTC regardless of what timezone the host system uses.

This is intentional, as containers are meant to be portable and not inherit host-specific settings. But when you need the correct timezone, you need to configure it explicitly.

---

## Why Containers Default to UTC

Container images are built to be environment-agnostic. The base image typically sets the timezone to UTC via `/etc/localtime` and `/etc/timezone`. When you run a container, it does not inherit the host's timezone settings because the container has its own filesystem with its own timezone configuration.

You can verify the current timezone inside a container:

```bash
podman run --rm alpine date
podman run --rm alpine date +"%Z %z"
```

For a plain Alpine image, the output will show UTC time unless you configure another timezone.

## Fix 1: Set the TZ Environment Variable

The simplest and most portable fix is to set the `TZ` environment variable:

```bash
podman run -e TZ=America/New_York my-image
```

Most applications and system utilities respect the `TZ` environment variable. This works because the C library's timezone functions check `TZ` before falling back to `/etc/localtime`.

Common timezone values:

```text
America/New_York
America/Chicago
America/Denver
America/Los_Angeles
Europe/London
Europe/Berlin
Asia/Tokyo
Asia/Kolkata
Australia/Sydney
```

You can find the full list of timezone names on your host:

```bash
timedatectl list-timezones
```

Or inside an image that has the timezone database:

```bash
podman run --rm alpine sh -c "apk add --no-cache tzdata >/dev/null && ls /usr/share/zoneinfo/"
```

## Fix 2: Mount the Host's Timezone Files

You can bind-mount the host's timezone configuration into the container. This ensures the container uses whatever timezone the host is set to:

```bash
podman run -v /etc/localtime:/etc/localtime:ro \
           -v /etc/timezone:/etc/timezone:ro \
           my-image
```

The `:ro` flag mounts these files read-only, which is important since you do not want a container process to change the host's timezone.

Note that `/etc/timezone` is a Debian/Ubuntu convention. On RHEL/Fedora systems, you may only have `/etc/localtime`. In that case, just mount that file:

```bash
podman run -v /etc/localtime:/etc/localtime:ro my-image
```

## Fix 3: Set the Timezone in Your Dockerfile

For images you build yourself, set the timezone during the build. The approach varies by base image.

**For Debian/Ubuntu-based images:**

```dockerfile
FROM ubuntu:22.04

ENV TZ=America/New_York
RUN apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y tzdata \
    && ln -snf /usr/share/zoneinfo/$TZ /etc/localtime \
    && echo $TZ > /etc/timezone \
    && rm -rf /var/lib/apt/lists/*
```

**For Alpine-based images:**

```dockerfile
FROM alpine:3.23

RUN apk add --no-cache tzdata
ENV TZ=America/New_York
RUN cp /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone
```

**For RHEL/Fedora-based images:**

```dockerfile
FROM fedora:43

ENV TZ=America/New_York
RUN dnf install -y tzdata \
    && ln -snf /usr/share/zoneinfo/$TZ /etc/localtime \
    && dnf clean all
```

## Fix 4: Set the Timezone in Podman Compose

If you use Compose files, set the timezone through environment variables or volume mounts:

```yaml
services:
  my-app:
    image: my-application:latest
    environment:
      - TZ=America/New_York
```

Or using volume mounts:

```yaml
services:
  my-app:
    image: my-application:latest
    volumes:
      - /etc/localtime:/etc/localtime:ro
```

## Fix 5: Handle Applications That Ignore TZ

Some applications have their own timezone configuration and do not respect the `TZ` environment variable or `/etc/localtime`. You need to configure these applications individually.

**PostgreSQL:**

```bash
podman run -e TZ=America/New_York \
           -e POSTGRES_PASSWORD=secret \
           postgres:16 -c timezone=America/New_York
```

Inside PostgreSQL, verify:

```sql
SHOW timezone;
SET TIME ZONE 'America/New_York';
```

**MySQL/MariaDB:**

```bash
podman run --name my-mysql \
           -e TZ=America/New_York \
           -e MYSQL_ROOT_PASSWORD=secret \
           mysql:8.4

# Then set the timezone in MySQL

podman exec -it my-mysql mysql -u root -p -e "SET GLOBAL time_zone = 'America/New_York';"
```

For named MySQL timezone support, you also need to load the timezone tables:

```bash
podman exec -it my-mysql sh -c "mysql_tzinfo_to_sql /usr/share/zoneinfo | mysql -u root -p mysql"
```

**Java applications:**

Java uses its own timezone database. Set it via JVM arguments:

```dockerfile
CMD ["java", "-Duser.timezone=America/New_York", "-jar", "app.jar"]
```

Or in the environment:

```bash
podman run -e JAVA_OPTS="-Duser.timezone=America/New_York" my-java-app
```

**Node.js applications:**

Node.js respects the `TZ` environment variable, so Fix 1 works directly:

```bash
podman run -e TZ=America/New_York my-node-app
```

## Fix 6: Alpine Images Missing Timezone Data

Alpine images are minimal and often do not include the timezone database. If you set `TZ` but the timezone does not change, you likely need to install the `tzdata` package:

```dockerfile
FROM alpine:3.23
RUN apk add --no-cache tzdata
ENV TZ=America/New_York
```

Without `tzdata`, the `TZ` variable is ignored because there is no timezone data to reference. You can verify the package is installed:

```bash
podman exec my-container apk info tzdata
```

If you want to keep the image small, you can install tzdata, copy the timezone file, and then remove the package:

```dockerfile
FROM alpine:3.23
RUN apk add --no-cache --virtual .tz tzdata \
    && cp /usr/share/zoneinfo/America/New_York /etc/localtime \
    && echo "America/New_York" > /etc/timezone \
    && apk del .tz
```

## Verifying the Timezone

After applying any fix, verify the timezone is correct inside the container:

```bash
# Check the system date
podman exec my-container date

# Check the TZ variable
podman exec my-container printenv TZ

# Check /etc/localtime
podman exec my-container ls -la /etc/localtime

# Check what timezone the file points to
podman exec my-container readlink -f /etc/localtime
```

For application-specific verification, check your application logs and ensure timestamps match your expected timezone.

## Best Practices

When choosing a timezone strategy, consider these recommendations:

1. **Use UTC for servers and logs.** Store timestamps in UTC and convert to local time at the presentation layer. This avoids daylight saving time issues and makes log correlation across systems much easier.

2. **Use TZ environment variable over volume mounts.** The `TZ` variable is explicit and portable. Volume mounts tie your container to the host's timezone, which breaks portability.

3. **Set the timezone in the Dockerfile for application images.** This makes the timezone part of the image configuration and documents it clearly.

4. **Always install tzdata in Alpine images.** If your application needs timezone awareness, include the timezone database.

## Conclusion

Timezone issues in Podman containers stem from the container's isolation from the host. The `TZ` environment variable is the simplest and most portable fix. For images you build, set the timezone in the Dockerfile and ensure the timezone database is installed. For databases and Java applications, check their specific timezone configuration since they may not rely on the system timezone. Whichever approach you choose, always verify the timezone is correct inside the running container before deploying to production.
