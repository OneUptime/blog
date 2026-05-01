# How to Fix Docker Healthcheck Not Displaying in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Troubleshooting, Docker Healthcheck, Container Health, Monitoring

Description: Learn how to fix Docker container health status not displaying correctly in Portainer, including healthcheck configuration and Portainer snapshot refresh issues.

---

Portainer displays container health status (Healthy/Unhealthy/Starting) based on Docker's built-in HEALTHCHECK instruction. When health status shows as "N/A" or is missing, first verify that the container has a healthcheck configured and that Portainer has had time to refresh its environment snapshot.

## Step 1: Verify the Container Has a Healthcheck

```bash
# Check if the container has a healthcheck configured

docker inspect <container-name> --format '{{json .Config.Healthcheck}}'

# If output is "null", the container has no healthcheck configured
# You need to add one via Portainer or Compose
```

## Step 2: Add a Healthcheck via Portainer Stack

Add a healthcheck to your Compose stack:

```yaml
services:
  webapp:
    image: nginx:alpine
    ports:
      - "8080:80"
    healthcheck:
      # Command to run inside the container to check health
      test: ["CMD", "wget", "-q", "--spider", "http://localhost/"]
      interval: 30s      # How often to run the check
      timeout: 10s       # How long to wait for a response
      retries: 3         # Failures before marking unhealthy
      start_period: 10s  # Grace period after container start
```

## Step 3: Check Current Health Status via CLI

```bash
# Check health status directly (do not rely solely on Portainer UI)
docker inspect <container-name> --format '{{.State.Health.Status}}'

# View recent health check results
docker inspect <container-name> --format '{{range .State.Health.Log}}{{.Output}}{{end}}'
```

## Step 4: Fix Snapshot Delay in Portainer

Portainer snapshots environment data on an interval that defaults to 5 minutes. Dashboard health status changes may not appear immediately:

```bash
# Force a snapshot refresh by restarting Portainer
docker restart portainer

# Or recreate Portainer with a shorter snapshot interval (default: 5m)
docker stop portainer
docker rm portainer
docker run -d -p 8000:8000 -p 9443:9443 --name portainer --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:sts --snapshot-interval 30s
```

## Step 5: Fix Healthcheck Command Errors

If health shows "Unhealthy," debug the actual check command. The healthcheck runs inside the container, so the binary used by the check must exist in the image:

```bash
# Run the healthcheck command manually inside the container
docker exec <container-name> wget -q --spider http://localhost/

# Check exit code (0 = healthy, non-zero = unhealthy)
echo $?

# View detailed healthcheck log
docker inspect <container-name> | python3 -c "
import json, sys
data = json.load(sys.stdin)
for log in data[0]['State']['Health']['Log']:
    print(f'Exit: {log[\"ExitCode\"]} | Output: {log[\"Output\"]}')"
```

## Common Healthcheck Patterns

```yaml
# HTTP endpoint check
test: ["CMD", "curl", "-f", "http://localhost/health"]

# TCP port check
test: ["CMD-SHELL", "nc -z localhost 5432"]

# Process check
test: ["CMD-SHELL", "pgrep nginx || exit 1"]
```
