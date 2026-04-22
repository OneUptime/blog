# How to Set Up Debug Logging in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Logging, Debugging, Troubleshooting, Docker

Description: Enable debug logging in Portainer to capture detailed operational logs for troubleshooting authentication, connectivity, and configuration issues.

---

When Portainer behaves unexpectedly - authentication fails, environments won't connect, or deployments error out - debug logging provides the detailed output needed to diagnose the root cause.

## Enable Debug Logging at Startup

Pass the `--log-level` flag when starting Portainer:

```bash
# Start Portainer with debug logging enabled

# Valid levels: DEBUG, INFO, WARN, ERROR
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest \
  --log-level DEBUG
```

## View Debug Logs

```bash
# Stream live logs from the Portainer container
docker logs -f portainer

# View the last 200 log lines
docker logs --tail 200 portainer

# Filter for specific error patterns
docker logs portainer 2>&1 | grep -i "error\|warn\|ldap\|auth"
```

## Increase Logging for an Existing Container

To enable debug logging with the startup flag after the container has been created, recreate it with updated flags:

```bash
# Stop current container
docker stop portainer

# Check the current Portainer command arguments
docker inspect portainer --format '{{.Args}}'

# Restart with debug flag added
docker container rm portainer
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest \
  --log-level DEBUG
```

## Save Logs to a File

Redirect Docker logs to a file for analysis:

```bash
# Save Portainer logs with timestamps to a file
docker logs --timestamps portainer > /tmp/portainer_debug.log 2>&1

# Follow and save simultaneously
docker logs -f portainer 2>&1 | tee /tmp/portainer_live.log
```

## Configure Log Rotation

For long-running debug sessions, configure log rotation in the Docker run command:

```bash
# Start Portainer with log rotation configured
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  --log-driver json-file \
  --log-opt max-size=50m \
  --log-opt max-file=3 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest \
  --log-level DEBUG
```

## Common Debug Log Patterns to Look For

```bash
# Authentication issues
docker logs portainer 2>&1 | grep -i "auth\|login\|ldap\|oauth"

# Environment/agent connectivity
docker logs portainer 2>&1 | grep -i "agent\|endpoint\|connection\|timeout"

# TLS/certificate errors
docker logs portainer 2>&1 | grep -i "tls\|cert\|ssl\|x509"

# API errors
docker logs portainer 2>&1 | grep -i "error\|500\|failed"
```

## Disable Debug Logging

Remove the `--log-level DEBUG` flag and restart with default logging:

```bash
docker stop portainer && docker container rm portainer
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest
  # No --log-level flag = default INFO level
```

---

*Complement Portainer's debug logs with proactive monitoring from [OneUptime](https://oneuptime.com).*
