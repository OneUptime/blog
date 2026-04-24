# How to Use the --log-level and --log-mode Flags in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, CLI Flags, Logging, Debugging, Configuration, Docker

Description: Learn how to use the --log-level and --log-mode flags to control Portainer's logging verbosity and output format for debugging and production log management.

---

Portainer's `--log-level` and `--log-mode` flags control how verbose and in what format the application logs are emitted. Proper configuration makes debugging faster and reduces log noise in production.

## Available Log Levels

| Level | Description |
|---|---|
| `DEBUG` | Most verbose - API calls, internal state transitions |
| `INFO` | Default - startup, connections, significant events |
| `WARN` | Only warnings and errors |
| `ERROR` | Only errors |

## Setting the Log Level

```bash
# Default (INFO level)

docker run -d \
  --name portainer \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest

# Enable DEBUG logging for troubleshooting
docker run -d \
  --name portainer \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest \
  --log-level DEBUG

# Minimize logging in production
docker run -d \
  --name portainer \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest \
  --log-level WARN
```

## Available Log Modes

| Mode | Description |
|---|---|
| `PRETTY` | Default - colored, human-readable output |
| `JSON` | Machine-parseable JSON - ideal for log aggregation systems |
| `NOCOLOR` | Human-readable without ANSI color codes - for plain log files |

## Setting the Log Mode

```bash
# JSON format for sending to Elasticsearch, Splunk, or Loki
docker run -d \
  --name portainer \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest \
  --log-mode JSON

# Plain text without colors for log files
docker run -d \
  --name portainer \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest \
  --log-mode NOCOLOR
```

## Combining Both Flags

```bash
# Debug level with JSON output (ideal for sending to a SIEM during troubleshooting)
docker run -d \
  --name portainer \
  -p 9000:9000 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest \
  --log-level DEBUG \
  --log-mode JSON
```

## Parsing JSON Logs with jq

```bash
# View structured JSON logs in a readable format
docker logs portainer 2>&1 | jq -r '"\(.time | todateiso8601) [\(.level)] \(.message)"'

# Filter for errors only
docker logs portainer 2>&1 | jq -r 'select(.level == "error") | .message'
```
