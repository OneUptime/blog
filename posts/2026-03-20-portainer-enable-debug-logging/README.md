# How to Enable Debug Logging for Troubleshooting in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Debugging, Logging, Troubleshooting, CLI Flags, Docker

Description: Learn how to enable and use debug logging in Portainer to diagnose connection issues, authentication failures, and API errors during troubleshooting.

---

Debug logging in Portainer produces verbose output including API calls, internal state transitions, and detailed error messages. Exact fields and messages can vary by Portainer version and `--log-mode`. It is invaluable for diagnosing issues that INFO-level logs don't explain.

## Enabling Debug Logging

Add `--log-level DEBUG` to the Portainer startup command:

```bash
# Stop and remove the current Portainer container

docker stop portainer && docker rm portainer

# Start with debug logging
docker run -d \
  --name portainer \
  --restart=always \
  -p 8000:8000 \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:sts \
  --log-level DEBUG
```

## Capturing Debug Logs

```bash
# Follow debug logs in real-time
docker logs -f portainer

# Save to a file for analysis
docker logs portainer > portainer-debug.log 2>&1

# Filter for specific issues
docker logs portainer | grep -Ei 'error|failed|timeout'

# Watch for agent-specific debug messages
docker logs -f portainer | grep -Ei 'agent|tunnel|edge'
```

## What Debug Logs Show

Debug mode reveals more detail such as:

```bash
# Example debug log messages (exact fields vary by release and --log-mode):
# slow request | method=GET | url=/api/... | elapsed_ms=125.4
# starting proxy server | host=127.0.0.1:49231
# environment tunnel monitoring | endpoint_id=1 | last_activity_seconds=12.5
# starting to fetch container information | container_id=3d2f1c...
```

## Temporary Debug Session

For production systems, enable debug logging temporarily, capture what you need, then restore normal logging:

```bash
# 1. Enable debug logging
docker stop portainer && docker rm portainer
docker run -d \
  --name portainer \
  --restart=always \
  -p 8000:8000 \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:sts \
  --log-level DEBUG

# 2. Reproduce the issue and capture logs
docker logs --tail 200 portainer > debug-capture.log 2>&1

# 3. Restore normal logging (no --log-level flag; defaults to INFO)
docker stop portainer && docker rm portainer
docker run -d \
  --name portainer \
  --restart=always \
  -p 8000:8000 \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:sts
```

## JSON Debug Logs

Combine debug level with JSON format for structured analysis:

```bash
docker stop portainer && docker rm portainer
docker run -d \
  --name portainer \
  --restart=always \
  -p 8000:8000 \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:sts \
  --log-level DEBUG \
  --log-mode JSON

# Parse with jq to find slow operations
docker logs portainer | \
  jq -r 'select(.level == "debug" and .elapsed_ms != null) | "\(.elapsed_ms) \(.message)"' | \
  sort -n | tail -20
```
