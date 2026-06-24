# How to Inspect Container Filesystem Changes in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Debugging, Filesystem, Container Inspection, Diff

Description: Inspect what files have been added, modified, or deleted inside a running container since it was started, using Docker's diff command and Portainer's container interface.

---

When debugging containers or investigating unexpected behavior, it's often valuable to see what files have changed inside a container since it was created. Docker exposes these changes as a diff against the container's original filesystem state.

## The Docker Diff Command

`docker diff` shows all filesystem changes since the container was created:

```bash
docker diff container_name

# Output symbols:

# A = Added (new file or directory)
# C = Changed (modified file or directory)  
# D = Deleted

# Example output:
A /app/logs
A /app/logs/app.log
C /etc/nginx/nginx.conf
D /tmp/startup.sh
```

## Accessing diff for Portainer-managed containers

Use Portainer to identify the container name or ID, then run the diff command from the Docker host or another shell that has access to the Docker daemon:

```bash
# Find the container name or ID in Portainer, then run this on the Docker host:
docker diff webapp_container_1
```

Portainer's **Container Details**, **Inspect**, and **Console** views can help you find the right container and review its configuration, but the console itself runs inside the selected container rather than on the Docker host.

## Interpreting Common Filesystem Changes

Understanding what changes are normal vs. suspicious:

```bash
# Normal changes in a web application:
A /app/logs/access.log     # Log files created at runtime - expected
C /app/config/runtime.json # Configuration written on startup - check if intended
A /tmp/                    # Temp files - usually fine

# Potentially concerning changes:
C /etc/passwd              # Password file modified - investigate
C /etc/shadow              # Password hashes modified - investigate immediately
A /usr/bin/suspicious      # New binary in system paths - malware risk
C /etc/cron.d/             # Cron jobs modified - backdoor risk
```

## Auditing Container Changes for Security

Use `docker diff` as part of a security audit:

```python
#!/usr/bin/env python3
# container-audit.py - check containers for suspicious filesystem changes
import subprocess
import json

# Patterns that suggest security issues
SUSPICIOUS_PATHS = [
    "/etc/passwd",
    "/etc/shadow",
    "/etc/sudoers",
    "/usr/bin",
    "/usr/sbin",
    "/bin",
    "/sbin",
    "/etc/cron",
]

def get_container_ids():
    result = subprocess.run(
        ["docker", "ps", "-q"],
        capture_output=True, text=True
    )
    return result.stdout.strip().split('\n')

def check_container(container_id):
    result = subprocess.run(
        ["docker", "diff", container_id],
        capture_output=True, text=True
    )
    
    suspicious = []
    for line in result.stdout.strip().split('\n'):
        if not line:
            continue
        change_type, path = line[0], line[2:]
        # Check if the changed path matches suspicious patterns
        for suspicious_pattern in SUSPICIOUS_PATHS:
            if path.startswith(suspicious_pattern):
                suspicious.append(f"{change_type} {path}")
    
    return suspicious

for cid in get_container_ids():
    issues = check_container(cid)
    if issues:
        print(f"Container {cid} has suspicious changes:")
        for issue in issues:
            print(f"  {issue}")
```

## Committing Changes to a New Image

If you've made intentional changes to a container and want to preserve them:

```bash
# Commit the container's current state to a new image
docker commit \
  --author "your-name@example.com" \
  --message "Added custom nginx config" \
  container_name \
  myregistry/nginx-custom:v1.1

# This creates a new image from the container's writable-layer changes
```

Note: Committed images bake in runtime changes from the container's writable layer, but they do not include data from mounted volumes. For reproducibility, prefer building a proper Dockerfile instead.

## Limiting Filesystem Changes

To prevent containers from writing to unexpected locations, use read-only root filesystems:

```yaml
services:
  webapp:
    image: myapp:1.2.3
    read_only: true    # Root filesystem is read-only
    tmpfs:
      - /tmp           # Writable temp directory
      - /app/logs      # Writable logs directory
    volumes:
      - app-uploads:/app/uploads   # Writable via named volume
```

With `read_only: true`, writes to the root filesystem are blocked, so any writable paths must be provided explicitly via `tmpfs` or volumes. This reduces changes in the container's writable layer and makes auditing easier.

## Summary

`docker diff` is an underused diagnostic tool for understanding container runtime behavior. Combined with Portainer's container management, it helps identify configuration drift, debug unexpected application behavior, and audit containers for security issues. For production containers, consider read-only root filesystems to limit the scope of potential changes.
