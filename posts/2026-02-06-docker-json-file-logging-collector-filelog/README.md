# How to Configure the Docker JSON-File Logging Driver with the Collector Filelog Receiver at /var/lib/docker/containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Docker, Logging, Filelog Receiver

Description: Learn how to configure the Docker JSON-file logging driver and use the OpenTelemetry Collector filelog receiver to ingest container logs from /var/lib/docker/containers.

Docker's default logging driver writes structured JSON log lines to disk at `/var/lib/docker/containers/<container-id>/<container-id>-json.log`. Each line contains the log message, stream (stdout or stderr), and a timestamp. The OpenTelemetry Collector's filelog receiver can tail these files and parse them into proper log records for downstream processing and export.

In this post, we will walk through the full setup: confirming your Docker logging driver, configuring the Collector, and verifying log ingestion.

## Confirming the Docker Logging Driver

First, verify that your Docker daemon is using the `json-file` driver. Run:

```bash
docker info --format '{{.LoggingDriver}}'
```

If the output is `json-file`, you are good. If it shows something else, you can set it in `/etc/docker/daemon.json`:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "50m",
    "max-file": "3"
  }
}
```

Restart Docker after making changes:

```bash
sudo systemctl restart docker
```

The `max-size` and `max-file` options prevent logs from consuming all available disk space. Without these, a single chatty container can fill your volume.

## Understanding the Log File Structure

Each container gets its own directory under `/var/lib/docker/containers/`. The log file path follows this pattern:

```
/var/lib/docker/containers/<container-id>/<container-id>-json.log
```

Each line in the file looks like this:

```json
{"log":"2026-02-06T10:15:32.001Z INFO  Starting application\n","stream":"stdout","time":"2026-02-06T10:15:32.001234567Z"}
```

The `log` field holds the actual message, `stream` indicates stdout or stderr, and `time` is the timestamp.

## Configuring the Filelog Receiver

Create an OpenTelemetry Collector configuration file called `otel-collector-config.yaml`:

```yaml
receivers:
  filelog:
    # Use a glob pattern to match all container log files
    include:
      - /var/lib/docker/containers/*/*-json.log
    # Start reading from the end of the file to avoid replaying old logs
    start_at: end
    # Parse the JSON structure of each log line
    operators:
      - type: json_parser
        # The timestamp is in the "time" field
        timestamp:
          parse_from: attributes.time
          layout: '%Y-%m-%dT%H:%M:%S.%LZ'
      # Move the actual log message to the body
      - type: move
        from: attributes.log
        to: body
      # Preserve the stream (stdout/stderr) as an attribute
      - type: move
        from: attributes.stream
        to: attributes["log.iostream"]

processors:
  batch:
    # Batch logs before exporting for better throughput
    timeout: 5s
    send_batch_size: 1000

exporters:
  otlp:
    endpoint: "your-backend:4317"
    tls:
      insecure: false

service:
  pipelines:
    logs:
      receivers: [filelog]
      processors: [batch]
      exporters: [otlp]
```

There are a few things worth noting here. The `json_parser` operator handles the JSON structure of each log line automatically. We move the `log` field to the log body because that is where the actual message content belongs. The `stream` field gets renamed to `log.iostream` to follow OpenTelemetry semantic conventions.

## Extracting the Container ID from the File Path

You can also extract the container ID from the file path itself. Add a regex parser to your operators list:

```yaml
operators:
  # Extract container ID from the file path
  - type: regex_parser
    regex: '/var/lib/docker/containers/(?P<container_id>[a-f0-9]+)/'
    parse_from: attributes["log.file.path"]
  # ... rest of your operators
```

This gives you a `container_id` attribute on every log record, which is useful for correlating logs with container metadata.

## Running the Collector with Docker

If you run the Collector itself as a Docker container, you need to mount the log directory:

```bash
docker run -d \
  --name otel-collector \
  -v /var/lib/docker/containers:/var/lib/docker/containers:ro \
  -v ./otel-collector-config.yaml:/etc/otelcol/config.yaml \
  otel/opentelemetry-collector-contrib:latest \
  --config /etc/otelcol/config.yaml
```

The `:ro` flag mounts the directory as read-only since the Collector only needs to read log files. Make sure the Collector container has permissions to read the Docker log files. Running it as root or adjusting the file permissions may be necessary depending on your environment.

## Handling Log Rotation

Docker rotates logs based on the `max-size` and `max-file` settings. The filelog receiver handles this automatically through its internal file tracking. It watches for file rotations and follows new files as they appear. However, you should set `poll_interval` if you need faster detection:

```yaml
receivers:
  filelog:
    include:
      - /var/lib/docker/containers/*/*-json.log
    poll_interval: 200ms
```

The default poll interval is 200ms, which works well for most use cases.

## Verifying the Setup

Start a test container and check that logs flow through:

```bash
# Run a container that produces logs
docker run --name log-test alpine sh -c 'while true; do echo "test log $(date)"; sleep 1; done'
```

Check the Collector's own logs for any errors, and verify that your backend receives the log records with the expected attributes.

## Summary

Using the Docker JSON-file logging driver with the Collector filelog receiver gives you a straightforward way to collect container logs without modifying application code. The key steps are: confirm the json-file driver is active, configure the filelog receiver to parse the JSON structure, and mount the container log directory when running the Collector in Docker. This approach works well for single-host setups and development environments where you want full control over log collection.
