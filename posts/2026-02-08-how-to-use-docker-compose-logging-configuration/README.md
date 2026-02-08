# How to Use Docker Compose logging Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Docker Compose, Logging, Log Drivers, Observability, DevOps, Monitoring

Description: Configure Docker Compose logging drivers and options to control how container logs are collected, stored, and shipped.

---

Container logs are your first line of defense when something goes wrong. But without proper configuration, those logs can fill up your disk, get lost during restarts, or become impossible to search. Docker Compose's `logging` configuration lets you choose where logs go, how they are formatted, and how much space they consume.

## Docker Logging Architecture

Every Docker container has a logging driver that captures stdout and stderr from the container's main process. The driver determines where those logs end up and in what format. Docker supports several logging drivers out of the box:

- **json-file** - Default driver, writes JSON-formatted logs to disk
- **local** - Optimized local storage with automatic rotation
- **syslog** - Sends logs to a syslog server
- **journald** - Writes to the systemd journal
- **fluentd** - Ships logs to Fluentd
- **gelf** - Ships logs in GELF format (Graylog)
- **awslogs** - Ships logs to Amazon CloudWatch
- **gcplogs** - Ships logs to Google Cloud Logging
- **none** - Discards all logs

## Basic Logging Configuration

The `logging` directive sits under a service definition. The most common configuration sets the driver and its options.

```yaml
# Configure logging for a service with json-file driver
version: "3.8"

services:
  app:
    image: my-app:latest
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
```

This configuration tells Docker to use the `json-file` driver, keep each log file under 10 megabytes, and retain a maximum of 3 rotated files. Without these limits, log files grow indefinitely and will eventually fill your disk.

## The json-file Driver

This is Docker's default logging driver. It stores logs as JSON objects, one per line, in files on the host.

```yaml
# Comprehensive json-file logging configuration
services:
  web:
    image: nginx:alpine
    logging:
      driver: json-file
      options:
        max-size: "50m"       # Maximum size of each log file
        max-file: "5"         # Number of rotated files to keep
        compress: "true"      # Compress rotated log files
        labels: "service"     # Include container labels in log metadata
        tag: "{{.Name}}"      # Custom tag for log entries
```

The `tag` option supports Go template syntax. Here are some useful tag patterns.

```yaml
# Different tag templates for json-file driver
logging:
  driver: json-file
  options:
    # Container name
    tag: "{{.Name}}"
    # Image name and container ID
    # tag: "{{.ImageName}}/{{.ID}}"
    # Full image name with tag
    # tag: "{{.ImageFullID}}"
    # Custom combination
    # tag: "myapp/{{.Name}}/{{.ID}}"
```

Log files are stored on the host at `/var/lib/docker/containers/<container-id>/<container-id>-json.log`. You can find them with:

```bash
# Find log files for a specific container
docker inspect --format='{{.LogPath}}' my-container

# Check the size of all container log files
du -sh /var/lib/docker/containers/*/*-json.log
```

## The local Driver

The `local` driver is optimized for performance and disk usage. It uses a compressed internal format that is faster than json-file but cannot be read directly from disk.

```yaml
# Using the local driver for better performance
services:
  api:
    image: my-api:latest
    logging:
      driver: local
      options:
        max-size: "100m"
        max-file: "5"
        compress: "true"
```

The `local` driver is a solid choice when you only need to access logs through `docker logs` and do not need external tools to parse the log files directly.

## Shipping Logs to Fluentd

Fluentd is a popular log aggregator that can route logs to many destinations. The `fluentd` driver sends container logs to a Fluentd instance.

```yaml
# Ship logs to Fluentd for centralized logging
version: "3.8"

services:
  fluentd:
    image: fluent/fluentd:v1.16-1
    volumes:
      - ./fluentd/conf:/fluentd/etc
    ports:
      - "24224:24224"
      - "24224:24224/udp"

  app:
    image: my-app:latest
    logging:
      driver: fluentd
      options:
        fluentd-address: localhost:24224
        fluentd-async: "true"
        tag: "docker.{{.Name}}"
        fluentd-retry-wait: "1s"
        fluentd-max-retries: "30"
    depends_on:
      - fluentd

  worker:
    image: my-worker:latest
    logging:
      driver: fluentd
      options:
        fluentd-address: localhost:24224
        fluentd-async: "true"
        tag: "docker.{{.Name}}"
    depends_on:
      - fluentd
```

The `fluentd-async` option is important. Without it, if Fluentd is unavailable, your container will block on every log write and eventually hang.

## Shipping Logs to Syslog

The `syslog` driver sends logs to any syslog-compatible receiver.

```yaml
# Send logs to a remote syslog server
services:
  app:
    image: my-app:latest
    logging:
      driver: syslog
      options:
        syslog-address: "tcp://logs.mycompany.com:514"
        syslog-facility: "daemon"
        syslog-tls-cert: "/certs/client.pem"
        syslog-tls-key: "/certs/client-key.pem"
        tag: "myapp/{{.Name}}"
```

For local syslog with journald integration on systemd-based systems:

```yaml
# Use the journald driver for systemd integration
services:
  app:
    image: my-app:latest
    logging:
      driver: journald
      options:
        tag: "myapp"
```

Logs sent to journald can be queried with `journalctl`:

```bash
# Query container logs through journalctl
journalctl CONTAINER_NAME=myapp -f
journalctl CONTAINER_NAME=myapp --since "1 hour ago"
```

## GELF for Graylog

The GELF (Graylog Extended Log Format) driver is designed for Graylog but works with any GELF-compatible receiver.

```yaml
# Send logs in GELF format to Graylog
services:
  app:
    image: my-app:latest
    logging:
      driver: gelf
      options:
        gelf-address: "udp://graylog.mycompany.com:12201"
        tag: "myapp"
        labels: "environment,version"
        env: "NODE_ENV,APP_VERSION"
```

## AWS CloudWatch Logs

For applications running on AWS, the `awslogs` driver sends logs directly to CloudWatch.

```yaml
# Ship logs to AWS CloudWatch
services:
  app:
    image: my-app:latest
    logging:
      driver: awslogs
      options:
        awslogs-region: "us-east-1"
        awslogs-group: "my-application"
        awslogs-stream: "app-{{.Name}}"
        awslogs-create-group: "true"
```

You need AWS credentials available to the Docker daemon. Set them via environment variables or IAM roles.

## Disabling Logging

For containers that produce high-volume logs you do not need, disable logging entirely.

```yaml
# Disable logging for a noisy container
services:
  load-generator:
    image: load-test-tool:latest
    logging:
      driver: none
```

Use this sparingly. Losing all logs makes debugging very difficult.

## Applying Logging Across All Services

To avoid repeating logging configuration for every service, use YAML anchors or Docker Compose extension fields.

```yaml
# Use extension fields for shared logging config
version: "3.8"

x-logging: &default-logging
  driver: json-file
  options:
    max-size: "25m"
    max-file: "4"
    compress: "true"

services:
  app:
    image: my-app:latest
    logging: *default-logging

  api:
    image: my-api:latest
    logging: *default-logging

  worker:
    image: my-worker:latest
    logging: *default-logging

  # Override for a specific service that needs different settings
  debug-service:
    image: my-debug:latest
    logging:
      driver: json-file
      options:
        max-size: "100m"
        max-file: "10"
```

## Log Size Management

Without limits, Docker logs can consume enormous amounts of disk space. Here is how to keep them under control at different levels.

### Per-Service Limits

```yaml
# Strict size limits for a high-volume service
services:
  api:
    image: my-api:latest
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
        # Total max: 30MB per container
```

### Daemon-Level Defaults

Set global defaults in the Docker daemon configuration so every container gets reasonable limits even if the Compose file does not specify them.

```json
// /etc/docker/daemon.json - Global log settings
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "50m",
    "max-file": "3"
  }
}
```

### Checking Current Log Sizes

```bash
# Check log sizes for all containers
for container in $(docker ps -q); do
  name=$(docker inspect --format='{{.Name}}' $container)
  size=$(docker inspect --format='{{.LogPath}}' $container | xargs ls -lh 2>/dev/null | awk '{print $5}')
  echo "$name: $size"
done

# Or use docker system df for an overview
docker system df -v | grep -A 50 "CONTAINER ID"
```

## Troubleshooting Logging Issues

When logs are not appearing where you expect:

```bash
# Verify the logging driver for a container
docker inspect --format='{{.HostConfig.LogConfig.Type}}' my-container

# Check logging driver options
docker inspect --format='{{json .HostConfig.LogConfig}}' my-container | jq .

# Test that docker logs works (only works with json-file, local, and journald)
docker logs --tail 20 my-container
```

Note that `docker logs` only works with the `json-file`, `local`, and `journald` drivers. If you switch to `fluentd`, `gelf`, `syslog`, or `awslogs`, the `docker logs` command will not return any output. Plan accordingly, since losing `docker logs` access can complicate debugging.

Proper logging configuration is something you set up once and benefit from forever. Start with size limits on the json-file driver to prevent disk issues, then graduate to centralized logging with Fluentd, syslog, or a cloud provider as your infrastructure grows.
