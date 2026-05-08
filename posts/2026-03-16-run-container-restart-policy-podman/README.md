# How to Run a Container with a Restart Policy in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Restart Policy, Reliability

Description: Learn how to configure restart policies for Podman containers so they automatically recover from crashes and survive system reboots.

---

> A proper restart policy is the difference between a service that self-heals and one that requires manual intervention at 3 AM.

In production, containers can stop for various reasons: application crashes, resource exhaustion, host reboots, or manual intervention. Restart policies tell Podman what to do when a container stops, letting you automate recovery without external supervision.

This guide covers the commonly used restart policies in Podman and how to use them effectively.

---

## Available Restart Policies

Podman supports these restart policy values:

| Policy | Behavior |
|--------|----------|
| `no` / `never` | Never restart (`no` is the default; `never` is a synonym) |
| `on-failure[:max]` | Restart only if the container exits with a non-zero code |
| `always` | Always restart regardless of exit code |
| `unless-stopped` | Restart when the container exits, but do not restart after a reboot if the container was explicitly stopped by the user |

## Using the "no" Policy (Default)

By default, containers do not restart when they stop:

```bash
# This container runs once and stops - no restart

podman run -d --name one-shot --restart no alpine echo "Done"

# Check the status after it exits
podman ps -a --filter name=one-shot --format "table {{.Names}}\t{{.Status}}"
```

## Using the "on-failure" Policy

Restart the container only when it exits with an error:

```bash
# Restart on failure, unlimited retries
podman run -d --name resilient-app \
  --restart on-failure \
  alpine sh -c "exit 1"

# Restart on failure with a maximum of 5 retries
podman run -d --name careful-app \
  --restart on-failure:5 \
  alpine sh -c "exit 1"

# Successful exits (code 0) will NOT trigger a restart
podman run -d --name clean-exit \
  --restart on-failure \
  alpine sh -c "echo 'Success'; exit 0"
```

Check the restart count:

```bash
# View how many times a container has been restarted
podman inspect careful-app --format '{{.RestartCount}}'
```

## Using the "always" Policy

Always restart the container regardless of exit status:

```bash
# Always restart - good for long-running services
podman run -d --name web-server \
  --restart always \
  nginx:latest

# Even a clean exit triggers a restart
podman run -d --name forever \
  --restart always \
  alpine sh -c "echo 'Will restart'; sleep 5; exit 0"

# Check that it keeps restarting
sleep 15
podman inspect forever --format 'RestartCount: {{.RestartCount}}'
```

## Using the "unless-stopped" Policy

Like `always`, but it preserves explicit user stops across reboots when Podman's `podman-restart.service` handles boot-time restarts:

```bash
# Start with unless-stopped policy
podman run -d --name my-service \
  --restart unless-stopped \
  nginx:latest

# Manually stop it - it will NOT restart
podman stop my-service

# It stays stopped
podman ps -a --filter name=my-service --format "table {{.Names}}\t{{.Status}}"

# Start it again - it will auto-restart if it crashes
podman start my-service
```

## Restart Policies with systemd Integration

For containers that should survive host reboots, use Quadlet unit files (the current recommended approach; `podman generate systemd` is deprecated):

```bash
# Create a Quadlet container unit file
mkdir -p ~/.config/containers/systemd

cat > ~/.config/containers/systemd/production-web.container << 'EOF'
[Container]
Image=nginx:latest
PublishPort=8080:80

[Service]
Restart=always

[Install]
WantedBy=default.target
EOF

# Reload systemd to pick up the new unit
systemctl --user daemon-reload

# The [Install] section handles boot startup; start the service now
systemctl --user start production-web.service

# Enable user lingering so services run without login
loginctl enable-linger $(whoami)
```

## Practical Example: Restart Policy for a Database

```bash
# Run PostgreSQL with on-failure restart and a retry limit
podman run -d \
  --name postgres-db \
  --restart on-failure:10 \
  --memory 1g \
  --cpus 2 \
  -e POSTGRES_PASSWORD=secretpassword \
  -v pgdata:/var/lib/postgresql/data:Z \
  -p 5432:5432 \
  postgres:16

# Verify the restart policy
podman inspect postgres-db --format '{{.HostConfig.RestartPolicy}}'
```

## Simulating Failures to Test Restart Policies

```bash
# Create a container that randomly fails
podman run -d --name flaky-app \
  --restart on-failure:3 \
  alpine sh -c '
    echo "Starting... attempt"
    sleep 2
    # Simulate random failure
    exit $((RANDOM % 2))
  '

# Watch the restart behavior
for i in $(seq 1 5); do
  sleep 5
  echo "--- Check $i ---"
  podman inspect flaky-app --format 'Status: {{.State.Status}}, RestartCount: {{.RestartCount}}, ExitCode: {{.State.ExitCode}}'
done
```

## Changing Restart Policy on Existing Containers

Update the restart policy without recreating the container:

```bash
# Change from "no" to "always"
podman update --restart always my-service

# Change to on-failure with max retries
podman update --restart on-failure:5 my-service

# Verify the change
podman inspect my-service --format '{{.HostConfig.RestartPolicy.Name}} (max {{.HostConfig.RestartPolicy.MaximumRetryCount}})'
```

## Choosing the Right Restart Policy

Use this decision guide:

```bash
# One-off tasks, batch jobs, CI pipelines
podman run --restart no ...

# Services that should recover from crashes but not restart on clean exit
podman run --restart on-failure:5 ...

# Critical long-running services (web servers, databases)
podman run --restart always ...

# Services managed manually but should auto-recover from crashes
podman run --restart unless-stopped ...
```

## Viewing Restart Behavior in Logs

When debugging restart loops, check the container logs:

```bash
# View logs including timestamps to see restart patterns
podman logs --timestamps flaky-app

# Follow logs in real-time during restarts
podman logs -f flaky-app

# View events related to container restarts
podman events --filter container=flaky-app --filter event=restart
```

## Summary

Restart policies keep your containers running without manual intervention:

- `no` / `never`: Default, no automatic restarts
- `on-failure[:max]`: Restart only on errors, with optional retry limit
- `always`: Always restart regardless of exit code
- `unless-stopped`: Like `always` but respects manual stops
- Use Quadlet unit files for boot-persistent services (preferred over the deprecated `podman generate systemd`)
- Use `podman update --restart` to change policies on running containers

For production services, `always` or `unless-stopped` combined with systemd integration provides the most reliable operation.
