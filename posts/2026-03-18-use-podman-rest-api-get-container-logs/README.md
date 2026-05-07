# How to Use the Podman REST API to Get Container Logs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, REST API, Container Logs, DevOps, Container

Description: Learn how to retrieve container logs using the Podman REST API, including streaming logs, filtering by timestamp, and handling log output for monitoring and debugging.

---

> Retrieving container logs is one of the most common tasks in container management. The Podman REST API provides a powerful and flexible way to access logs programmatically, enabling you to build custom monitoring solutions and debug containerized applications.

When managing containers in production, having programmatic access to container logs is essential. Whether you are building a custom monitoring dashboard, integrating with a log aggregation system, or simply automating your debugging workflow, the Podman REST API gives you direct access to container log output without needing the Podman CLI installed on every machine.

In this guide, we will walk through how to use the Podman REST API to retrieve container logs, including real-time streaming, timestamp filtering, and tail options.

---

## Prerequisites

Before you begin, make sure the Podman API service is running. You can start it with the following command:

```bash
podman system service --time=0 unix:///run/podman/podman.sock
```

For rootless Podman, the socket is typically at:

```bash
podman system service --time=0 unix://$XDG_RUNTIME_DIR/podman/podman.sock
```

You can verify the service is running by checking the info endpoint:

```bash
curl --unix-socket /run/podman/podman.sock http://localhost/v4.0.0/libpod/info
```

## Understanding the Logs Endpoint

The Podman REST API exposes container logs through the following endpoint:

```text
GET /v4.0.0/libpod/containers/{name}/logs
```

This endpoint accepts several query parameters that control what log data is returned:

- **follow** (boolean): Stream logs in real time, similar to `podman logs -f`.
- **stdout** (boolean): Return stdout output.
- **stderr** (boolean): Return stderr output.
- **since** (string): Show logs since a given time. Podman accepts RFC 3339 timestamps, Unix timestamps, and duration strings such as `1h`.
- **until** (string): Show logs until a given time. Podman accepts RFC 3339 timestamps, Unix timestamps, and duration strings.
- **timestamps** (boolean): Prepend a timestamp to each log line.
- **tail** (string): Number of lines to show from the end of the logs.

You must set at least one of `stdout=true` or `stderr=true` on each logs request. The libpod logs endpoint returns a framed stream, so client code should demultiplex the response before treating it as plain text.

## Retrieving Basic Container Logs

To fetch all logs from a container, make a simple GET request to the logs endpoint:

```bash
curl --unix-socket /run/podman/podman.sock \
  "http://localhost/v4.0.0/libpod/containers/my-container/logs?stdout=true&stderr=true"
```

This returns the complete log stream from the container. For containers that have been running for a long time, this can return a large amount of data.

## Tailing Logs

To retrieve only the most recent log lines, use the `tail` parameter:

```bash
curl --unix-socket /run/podman/podman.sock \
  "http://localhost/v4.0.0/libpod/containers/my-container/logs?stdout=true&stderr=true&tail=100"
```

This returns the last 100 log entries from the selected streams, which is useful for checking the most recent activity without downloading the entire log history.

## Streaming Logs in Real Time

One of the most powerful features is the ability to stream logs as they are generated. Set the `follow` parameter to true:

```bash
curl --unix-socket /run/podman/podman.sock \
  --no-buffer \
  "http://localhost/v4.0.0/libpod/containers/my-container/logs?follow=true&stdout=true&stderr=true"
```

The `--no-buffer` flag ensures that curl outputs data as it arrives rather than buffering it. The connection remains open and new log lines are streamed to the client as the container produces them.

## Filtering Logs by Time

You can filter logs by timestamp using the `since` and `until` parameters:

```bash
# Logs since a specific timestamp
curl --unix-socket /run/podman/podman.sock \
  "http://localhost/v4.0.0/libpod/containers/my-container/logs?stdout=true&stderr=true&since=2026-03-18T10:00:00Z"

# Logs within a specific time window
curl --unix-socket /run/podman/podman.sock \
  "http://localhost/v4.0.0/libpod/containers/my-container/logs?stdout=true&stderr=true&since=2026-03-18T10:00:00Z&until=2026-03-18T11:00:00Z"
```

You can also use Unix epoch timestamps:

```bash
# Logs from the last 3600 seconds
SINCE=$(date -d '1 hour ago' +%s)
curl --unix-socket /run/podman/podman.sock \
  "http://localhost/v4.0.0/libpod/containers/my-container/logs?stdout=true&stderr=true&since=$SINCE"
```

## Adding Timestamps to Log Output

To include timestamps with each log line, set the `timestamps` parameter:

```bash
curl --unix-socket /run/podman/podman.sock \
  "http://localhost/v4.0.0/libpod/containers/my-container/logs?stdout=true&stderr=true&timestamps=true&tail=10"
```

After demultiplexing the response body, the output will include an RFC 3339 timestamp at the beginning of each line:

```text
2026-03-18T14:23:45.123456789Z Starting application server...
2026-03-18T14:23:45.234567890Z Listening on port 8080
2026-03-18T14:23:46.345678901Z Connected to database
```

## Separating stdout and stderr

You can retrieve stdout and stderr independently by toggling the respective parameters:

```bash
# Only stdout
curl --unix-socket /run/podman/podman.sock \
  "http://localhost/v4.0.0/libpod/containers/my-container/logs?stdout=true&stderr=false"

# Only stderr
curl --unix-socket /run/podman/podman.sock \
  "http://localhost/v4.0.0/libpod/containers/my-container/logs?stdout=false&stderr=true"
```

This is helpful when you want to separate application output from error messages for different processing pipelines.
When you use the libpod endpoint, each response is still returned as a framed stream.

## Handling Log Output in a Script

Here is a practical example of a bash script that collects logs from multiple containers and saves them to files:

```bash
#!/bin/bash

SOCKET="/run/podman/podman.sock"
API_VERSION="v4.0.0"
LOG_DIR="/var/log/container-logs"
mkdir -p "$LOG_DIR"

# Decode Podman's framed log stream into plain text.
decode_podman_logs() {
  python3 -c '
import struct
import sys

src = sys.stdin.buffer
dst = sys.stdout.buffer

while True:
    header = src.read(8)
    if not header:
        break
    if len(header) < 8:
        raise SystemExit("short log frame header")
    size = struct.unpack(">I", header[4:8])[0]
    chunk = src.read(size)
    if len(chunk) < size:
        raise SystemExit("short log frame payload")
    dst.write(chunk)
'
}

# Get list of running containers
CONTAINERS=$(curl -s --unix-socket "$SOCKET" \
  "http://localhost/$API_VERSION/libpod/containers/json" | jq -r '.[].Names[0]')

for CONTAINER in $CONTAINERS; do
  echo "Collecting logs for $CONTAINER..."
  curl -s --unix-socket "$SOCKET" \
    "http://localhost/$API_VERSION/libpod/containers/$CONTAINER/logs?stdout=true&stderr=true&timestamps=true" \
    | decode_podman_logs \
    > "$LOG_DIR/${CONTAINER}_$(date +%Y%m%d_%H%M%S).log"
done

echo "Logs collected in $LOG_DIR"
```

## Using the Compat API

Podman also provides a Docker-compatible API endpoint for logs:

```bash
curl --unix-socket /run/podman/podman.sock \
  "http://localhost/v1.40/containers/my-container/logs?stdout=true&stderr=true&tail=50"
```

Note the differences in the URL path: the compat API omits `/libpod/` from the path and uses the documented Docker-compatible API version (for example, `v1.40`) instead of the Podman API version. This is useful when you are migrating from Docker and want to reuse existing tooling. For non-TTY containers, the compat endpoint follows Docker's framed log-stream behavior.

## Error Handling

When requesting logs, you may encounter several error conditions:

- **404 Not Found**: The container does not exist.
- **500 Internal Server Error**: The container may be in a bad state or logs are unavailable.

Always check the HTTP status code before processing the response:

```bash
BODY_FILE=$(mktemp)
HTTP_CODE=$(curl -s -o "$BODY_FILE" -w "%{http_code}" --unix-socket /run/podman/podman.sock \
  "http://localhost/v4.0.0/libpod/containers/my-container/logs?stdout=true&stderr=true&tail=10")

if [ "$HTTP_CODE" -eq 200 ]; then
  python3 - "$BODY_FILE" <<'PY'
import struct
import sys

with open(sys.argv[1], "rb") as src:
    while True:
        header = src.read(8)
        if not header:
            break
        if len(header) < 8:
            raise SystemExit("short log frame header")
        size = struct.unpack(">I", header[4:8])[0]
        chunk = src.read(size)
        if len(chunk) < size:
            raise SystemExit("short log frame payload")
        sys.stdout.buffer.write(chunk)
PY
else
  echo "Error fetching logs: HTTP $HTTP_CODE"
  cat "$BODY_FILE"
fi

rm -f "$BODY_FILE"
```

## Performance Considerations

When working with container logs through the API, keep these points in mind:

- Avoid fetching the full log output from long-running containers. Use `tail` to limit the response size.
- When streaming logs with `follow=true`, implement proper timeout handling on the client side.
- If you are polling for new logs, use the `since` parameter with the timestamp of your last request to avoid fetching duplicate data.
- Consider implementing log rotation at the container level to prevent log files from growing indefinitely.

## Conclusion

The Podman REST API provides a complete and flexible interface for retrieving container logs. Whether you need to fetch recent log lines for a quick check, stream logs in real time for monitoring, or collect logs across multiple containers for aggregation, the API has you covered. By combining the query parameters effectively, you can build robust log collection and monitoring workflows that integrate seamlessly with your existing infrastructure.
