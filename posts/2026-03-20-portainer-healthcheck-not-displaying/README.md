# How to Fix Docker Healthcheck Not Displaying in Portainer - Not Displaying

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Troubleshooting, Health Check, Container

Description: Fix issues where Docker healthcheck status doesn't display correctly in Portainer, including HEALTHCHECK definition, timing configuration, and display refresh issues.

## Introduction

Docker healthchecks provide a way for containers to report their own health status. In Portainer, healthcheck status should appear as a colored indicator next to containers - green for healthy, yellow for starting, red for unhealthy. When this indicator is missing or always shows as "unknown", it usually means the image or container has no Docker healthcheck, the container is still in its start period, or the Portainer view is stale.

## Step 1: Verify the Image Has a HEALTHCHECK

```bash
# Check if the image defines a HEALTHCHECK

docker image inspect your-image:tag | jq '.[0].Config.Healthcheck'

# Typical output for an image with healthcheck:
# {
#   "Test": ["CMD-SHELL", "curl -f http://localhost/ || exit 1"],
#   "Interval": 30000000000,
#   "Timeout": 10000000000,
#   "StartPeriod": 30000000000,
#   "Retries": 3
# }

# If null or empty - the image has no built-in healthcheck
```

## Step 2: Add a HEALTHCHECK via Dockerfile

```dockerfile
FROM nginx:alpine

# Install curl for healthcheck
RUN apk add --no-cache curl

# Define healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

EXPOSE 80
```

## Step 3: Add HEALTHCHECK in Docker Compose

```yaml
services:
  myapp:
    image: myapp:latest
    # Define healthcheck directly in compose file
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
      # start_period: time to wait before starting health checks
      # This prevents false "unhealthy" during container startup
```

## Step 4: Add HEALTHCHECK in Portainer Container Form

If your Portainer version exposes Healthcheck fields in the container form:

1. In Portainer, go to **Containers** → **Add Container**
2. Under **Advanced container settings**, look for **Healthcheck**
3. Configure:
   - **Health command**: `curl -f http://localhost/ || exit 1`
   - **Health interval**: `30s`
   - **Health retries**: `3`
   - **Health start period**: `30s`
   - **Health timeout**: `10s`

## Step 5: Check Current Healthcheck Status

```bash
# View container health status
docker container inspect container-name | jq '.[0].State.Health'

# Output shows health details when a healthcheck is configured:
# {
#   "Status": "healthy",  # or "unhealthy", "starting"
#   "FailingStreak": 0,
#   "Log": [...]
# }

# If no healthcheck is configured, State.Health is absent.
#
# Monitor health in real time
docker container inspect --format='{{.State.Health.Status}}' container-name
watch -n 5 "docker container inspect --format='{{.State.Health.Status}}' container-name"
```

## Step 6: Debug Unhealthy Containers

```bash
# View health check logs
docker container inspect container-name | jq '.[0].State.Health.Log'

# Output shows last N healthcheck outputs:
# [
#   {
#     "Start": "2024-01-01T00:00:00Z",
#     "End": "2024-01-01T00:00:05Z",
#     "ExitCode": 0,
#     "Output": ""
#   }
# ]

# ExitCode 0 = healthy
# ExitCode 1 = unhealthy
# ExitCode 2 = reserved
```

## Step 7: Fix Portainer Not Showing Updated Health Status

If the Portainer environment view looks stale, trigger a fresh environment snapshot:

```bash
# Replace with your Portainer URL. Current Portainer installs default to HTTPS on 9443.
PORTAINER_URL=https://localhost:9443

# Authenticate and get a JWT
TOKEN=$(curl -sk -X POST "$PORTAINER_URL/api/auth" \
  -H "Content-Type: application/json" \
  -d '{"Username":"admin","Password":"yourpassword"}' | jq -r .jwt)

# Force a fresh snapshot for environment ID 1
curl -sk -X POST \
  -H "Authorization: Bearer $TOKEN" \
  "$PORTAINER_URL/api/endpoints/1/snapshot"

# Then refresh the Portainer UI
```

## Step 8: Fix Healthcheck for Common Services

### PostgreSQL

```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}"]
  interval: 10s
  timeout: 5s
  retries: 5
  start_period: 30s
```

### Redis

```yaml
healthcheck:
  test: ["CMD", "redis-cli", "ping"]
  interval: 10s
  timeout: 5s
  retries: 5
```

### MySQL/MariaDB

```yaml
healthcheck:
  test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
  interval: 10s
  timeout: 5s
  retries: 5
  start_period: 30s
```

### HTTP API

```yaml
healthcheck:
  test: ["CMD-SHELL", "curl -f http://localhost:8080/health || exit 1"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 60s
```

### MongoDB

```yaml
healthcheck:
  test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
  interval: 10s
  timeout: 5s
  retries: 5
  start_period: 30s
```

## Step 9: Fix Healthcheck Timing for Slow-Starting Apps

Applications like Airflow or Superset take a long time to initialize:

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
  interval: 30s
  timeout: 30s
  retries: 10
  # Wait 3 minutes before starting health checks
  start_period: 180s
```

## Step 10: Disable Healthcheck (When Not Needed)

```yaml
# Explicitly disable healthcheck if not needed
healthcheck:
  disable: true
```

## Conclusion

Healthchecks not displaying in Portainer are almost always because the image or compose file doesn't define a `HEALTHCHECK` instruction. Add one to your Dockerfile or compose file using the appropriate test command for your service. Use the `start_period` parameter generously for slow-starting applications to avoid false "unhealthy" status during initialization. Portainer can display the health status once the healthcheck is defined and the view has refreshed.
