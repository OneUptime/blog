# How to Set Up a Container Update Strategy with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Update, Auto-Update, Container, Deployment

Description: Learn how to set up a reliable container update strategy with Podman using auto-update, Quadlet, rollback procedures, and staged deployment approaches.

---

> A solid container update strategy ensures your services run the latest patches and features while minimizing downtime and providing clear rollback paths when updates cause issues.

Keeping containers updated is critical for security and reliability. Podman provides built-in auto-update capabilities that can check for new image versions and restart containers automatically. Combined with Quadlet for service management and a structured rollback process, you can build an update strategy that keeps your services current without risking availability.

This guide covers setting up automated updates, managing update timing, and handling rollbacks.

---

## Podman Auto-Update Overview

Podman's auto-update feature checks if a newer version of a container's image is available in the registry and, if so, pulls the new image and restarts the container:

```bash
# Check for available updates (dry run)

podman auto-update --dry-run

# Apply updates
podman auto-update
```

For auto-update to work, containers must meet two requirements: they must be labeled with the auto-update policy, and they must run inside a systemd unit. Quadlet is the recommended approach; `podman generate systemd` also creates systemd units but is deprecated:

```bash
podman run -d \
  --name web \
  --label io.containers.autoupdate=registry \
  docker.io/library/nginx:stable
```

**Important:** The label alone is not sufficient. The container must be managed by a systemd service for `podman auto-update` to function. See the Quadlet section below for the recommended approach.

## Auto-Update Policies

Podman supports two auto-update policies:

```bash
# Registry policy: pull latest image from registry
podman run -d \
  --name web \
  --label io.containers.autoupdate=registry \
  docker.io/library/nginx:stable

# Local policy: check for new local image with same name
podman run -d \
  --name api \
  --label io.containers.autoupdate=local \
  my-api:latest
```

The `registry` policy connects to the image registry to check for updates and requires a fully qualified image reference such as `docker.io/library/nginx:stable`. The `local` policy checks if a newer local image exists, which is useful when your CI/CD pipeline pushes images to the local Podman storage.

## Setting Up the Auto-Update Timer

Podman includes a systemd timer for periodic auto-updates:

```bash
# Enable the timer (checks daily at midnight by default)
systemctl --user enable --now podman-auto-update.timer

# Check timer status
systemctl --user status podman-auto-update.timer

# View the timer schedule
systemctl --user list-timers podman-auto-update.timer
```

Customize the timer schedule:

```bash
# Override the timer for custom scheduling
mkdir -p ~/.config/systemd/user/podman-auto-update.timer.d/

cat > ~/.config/systemd/user/podman-auto-update.timer.d/schedule.conf << 'EOF'
[Timer]
OnCalendar=
OnCalendar=*-*-* 03:00:00
RandomizedDelaySec=30m
EOF

systemctl --user daemon-reload
systemctl --user restart podman-auto-update.timer
```

## Auto-Update with Quadlet

Configure auto-update in Quadlet files:

```ini
# ~/.config/containers/systemd/web.container
[Container]
Image=docker.io/library/nginx:stable
ContainerName=web
PublishPort=8080:80
AutoUpdate=registry

[Service]
Restart=always
TimeoutStartSec=30

[Install]
WantedBy=default.target
```

```ini
# ~/.config/containers/systemd/api.container
[Container]
Image=registry.example.com/myteam/my-api:stable
ContainerName=api
AutoUpdate=registry

[Service]
Restart=always
# Give the health check time to pass before considering the update failed
TimeoutStartSec=120

[Install]
WantedBy=default.target
```

## Health Check Integration

Combine auto-updates with health checks to detect broken updates:

```bash
podman run -d \
  --name api \
  --label io.containers.autoupdate=registry \
  --health-cmd="curl -f http://localhost:3000/health || exit 1" \
  --health-interval=30s \
  --health-retries=3 \
  --health-start-period=60s \
  --health-on-failure=kill \
  registry.example.com/myteam/my-api:stable
```

In a Quadlet file:

```ini
[Container]
Image=registry.example.com/myteam/my-api:stable
AutoUpdate=registry
HealthCmd=curl -f http://localhost:3000/health || exit 1
HealthInterval=30s
HealthRetries=3
HealthStartPeriod=60s
HealthOnFailure=kill
```

The `kill` action lets systemd observe the failed container and apply the service restart policy. For update rollback decisions, Podman can best detect startup failure when the container uses systemd readiness notification (`--sdnotify=container` or `Notify=true` in Quadlet) and the application sends `READY=1` only after it is ready.

## Rollback Procedure

Podman auto-update rolls back automatically by default if restarting the systemd unit fails after an image update. For a manual rollback, pin the Quadlet file to a known-good tag or digest and restart the systemd service:

```bash
#!/bin/bash
# rollback.sh

SERVICE=$1
GOOD_IMAGE=$2
QUADLET_FILE=$3

if [ -z "$SERVICE" ] || [ -z "$GOOD_IMAGE" ] || [ -z "$QUADLET_FILE" ]; then
  echo "Usage: $0 <service-name> <known-good-image> <quadlet-file>"
  exit 1
fi

echo "Rolling back $SERVICE to image: $GOOD_IMAGE"
podman pull "$GOOD_IMAGE"

# Update the Quadlet Image= line and restart the generated service.
sed -i "s|^Image=.*|Image=$GOOD_IMAGE|" "$QUADLET_FILE"
systemctl --user daemon-reload
systemctl --user restart "$SERVICE"

echo "Rollback complete"
```

## Staged Update Strategy

Update services in stages to catch issues before they affect all services:

```bash
#!/bin/bash
# staged-update.sh

echo "=== Stage 1: Update non-critical services ==="
podman auto-update --dry-run

# Update monitoring and logging first
for svc in prometheus grafana loki; do
  echo "Updating $svc..."
  image=$(podman inspect "$svc" --format '{{.ImageName}}')
  podman pull "$image"
  systemctl --user restart "${svc}.service"
done

echo "Waiting 5 minutes to verify Stage 1..."
sleep 300

echo "=== Stage 2: Update application services ==="
for svc in api worker; do
  echo "Updating $svc..."
  image=$(podman inspect "$svc" --format '{{.ImageName}}')
  podman pull "$image"

  # Save current config
  podman inspect "$svc" > "/tmp/${svc}-backup.json"

  systemctl --user restart "${svc}.service"
done

echo "Waiting 5 minutes to verify Stage 2..."
sleep 300

echo "=== Stage 3: Update data services ==="
echo "Database and cache updates require manual approval"
echo "Run: podman pull docker.io/library/postgres:16 && systemctl --user restart db.service"
```

## Image Pinning for Stability

Pin images to specific versions for critical services:

```ini
# Pin to specific digest for maximum stability
[Container]
Image=docker.io/library/postgres@sha256:abc123def456...
AutoUpdate=registry
```

```bash
# Get the digest of a specific version
skopeo inspect docker://docker.io/library/postgres:16 | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['Digest'])"

# Pin to digest
podman run -d --name db \
  docker.io/library/postgres@sha256:abc123def456...
```

## Update Notifications

Create a notification script that reports on updates:

```bash
#!/bin/bash
# update-report.sh

echo "=== Container Update Report ==="
echo "Date: $(date)"
echo ""

# Check for available updates
UPDATES=$(podman auto-update --dry-run --format json 2>/dev/null)

if [ -z "$UPDATES" ] || [ "$UPDATES" = "[]" ]; then
  echo "All containers are up to date."
  exit 0
fi

echo "Updates available:"
podman auto-update --dry-run --format "table {{.Unit}}\t{{.Container}}\t{{.Image}}\t{{.Policy}}\t{{.Updated}}"

# Count updates
UPDATE_COUNT=$(echo "$UPDATES" | python3 -c "import sys,json; data=json.load(sys.stdin); print(sum(1 for u in data if u.get('Updated')=='pending'))" 2>/dev/null)
echo ""
echo "Total updates available: ${UPDATE_COUNT:-0}"
```

## Version Locking

Lock specific containers to prevent unintended updates:

```bash
# Inspect auto-update labels before recreating or changing the Quadlet
podman container inspect db --format '{{.Config.Labels}}'
```

```ini
# For Quadlet, simply omit or disable AutoUpdate
[Container]
Image=docker.io/library/postgres:16-alpine
# AutoUpdate=registry  # Commented out = no auto-update
```

## Update Testing Workflow

Test updates before applying to production:

```bash
#!/bin/bash
# test-update.sh

IMAGE=$1
CONTAINER=$2

echo "Testing update for $CONTAINER..."

# Pull new image
podman pull "$IMAGE"

# Run test container
podman run -d --name "${CONTAINER}-test" \
  --network test-network \
  --health-cmd="curl -f http://localhost:3000/health || exit 1" \
  --health-interval=30s \
  --health-retries=3 \
  "$IMAGE"

# Wait for startup
sleep 10

# Run health check
if podman healthcheck run "${CONTAINER}-test"; then
  echo "Health check passed. Safe to update."
  podman stop "${CONTAINER}-test"
  podman rm "${CONTAINER}-test"
else
  echo "Health check FAILED. Do not update."
  podman logs "${CONTAINER}-test"
  podman stop "${CONTAINER}-test"
  podman rm "${CONTAINER}-test"
  exit 1
fi
```

## Conclusion

A robust container update strategy combines Podman's auto-update feature with health checks, staged rollouts, and clear rollback procedures. Use the auto-update timer for routine updates, pin critical services to specific versions, and test updates before applying them to production. The combination of Quadlet for service management and auto-update for image tracking gives you a maintainable system that stays current without manual intervention.
