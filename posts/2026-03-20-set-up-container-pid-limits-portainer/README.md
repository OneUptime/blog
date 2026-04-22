# How to Set Up Container PID Limits in Portainer - Set

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, PID Limits, Security, Resource Limit, Fork Bomb Protection

Description: Configure container PID (process ID) limits in Portainer to prevent fork bombs and runaway processes from exhausting the host's process table and causing system-wide instability.

---

A container without PID limits can fork-bomb the host - creating so many processes that the host becomes unable to start new processes, affecting all containers and even the host OS. PID limits are an important security control.

## Why PID Limits Matter

Without PID limits:
- A compromised or buggy container can exhaust the host's process table
- A single container can prevent all other containers from spawning processes
- Fork bombs (intentional or accidental) can make the host unresponsive

The host typically has a `pid_max` of 32,768 or more. A container using all available PIDs is a host-wide denial of service.

## Setting PID Limits in Portainer Stacks

```yaml
services:
  webapp:
    image: myapp:1.2.3
    pids_limit: 100    # Maximum 100 processes in this container
    restart: unless-stopped

  worker:
    image: myworker:1.0
    pids_limit: 50     # Worker processes need fewer PIDs

  database:
    image: postgres:16
    pids_limit: 200    # PostgreSQL needs more processes (one per connection)
```

## Choosing the Right PID Limit

| Application Type | Typical PID Count | Recommended Limit |
|-----------------|------------------|------------------|
| Simple web app | 5-20 | 50-100 |
| Node.js app | 5-10 | 50 |
| Java/JVM app | 20-50 | 100-200 |
| PostgreSQL | 10 + connections | 200-500 |
| Celery workers | 10 + worker count | 100 |
| Build containers | Variable | 500-1000 |

To determine the right limit for your application:

```bash
# Check current process count inside a running container

docker exec webapp sh -c "ls /proc | grep -E '^[0-9]+$' | wc -l"

# Or use ps inside the container
docker exec webapp ps aux | wc -l

# Add a buffer (2-3x observed count) for the limit
```

## Behavior When PID Limit Is Reached

When a container tries to fork beyond its PID limit:

```bash
# Inside the container, fork() fails with:
# bash: fork: retry: Resource temporarily unavailable
# bash: fork: Resource temporarily unavailable

# The container continues running - only new process creation is blocked
# Existing processes are not killed
```

## PID Limit for Security (Fork Bomb Prevention)

Protect against intentional fork bombs:

```yaml
services:
  # Untrusted code execution (e.g., CI runners, sandboxes)
  sandbox:
    image: sandbox:1.0
    pids_limit: 25    # Very tight limit for sandboxed execution
    # Combined with other security controls
    read_only: true
    cap_drop:
      - ALL
    security_opt:
      - no-new-privileges:true
```

## Kubernetes PID Limits via Portainer

In Kubernetes, PID limits are not set in the Pod spec's container resources. They are configured at the node level by the kubelet:

```yaml
# kubelet-config.yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
podPidsLimit: 100  # Maximum PIDs in any pod on this node
```

For Kubernetes, configure PID limits at the node level via kubelet's `--pod-max-pids` flag or the kubelet `podPidsLimit` configuration field.

## Monitoring PID Usage

```bash
# Monitor PID count in a container
docker stats --no-stream --format "table {{.Name}}\t{{.PIDs}}" 

# Get exact PID count for a specific container
docker stats --no-stream --format "{{.PIDs}}" container_name
```

## Summary

PID limits are a defense-in-depth measure that prevents runaway containers from destabilizing the host. Set conservative limits based on observed process counts, apply very tight limits to containers running untrusted code, and monitor PID counts alongside CPU and memory in your container metrics.
