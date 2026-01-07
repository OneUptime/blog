# How to Debug Failing Docker Containers Safely

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Troubleshooting, DevOps, Debugging, Security

Description: A repeatable workflow for diagnosing broken containers using `docker inspect`, `docker logs`, `docker cp`, and ephemeral debug shells-without corrupting running workloads.

---

When a container crashes at 2 a.m., the fastest fix comes from disciplined triage. These steps keep you from "just exec'ing bash" on production nodes and leaving them worse off.

## 1. Inspect First, Exec Later

Before jumping into a container shell, gather information non-invasively. These commands show container state without modifying anything, helping you understand what went wrong.

```bash
# List all containers (including stopped) that match the name filter
docker ps -a --filter "name=api"

# Extract specific state information using Go template formatting
# Shows current status and exit code (non-zero usually means error)
docker inspect api_web_1 --format '{{.State.Status}} {{.State.ExitCode}}'
```

`docker inspect` reveals exits, restart counts, mounts, capabilities, and environment variables. Look for:

- `State.OOMKilled` true (needs memory tuning).
- Incorrect entrypoint/cmd.
- Missing bind mounts or secrets.

## 2. Check Logs with Context

Container logs are your first line of defense for debugging. Use these commands to view recent output, filter by time, or follow logs in real-time.

```bash
# Show the last 200 lines of logs (useful for recent crashes)
docker logs --tail 200 api_web_1

# Show logs from the last 30 minutes only
docker logs --since 30m api_web_1

# Follow logs in real-time (like tail -f)
# Press Ctrl+C to stop following
docker logs -f api_web_1
```

For multi-container Compose stacks, `docker compose logs -f api` stitches multiple replicas.

## 3. Copy Artifacts Without Exec

Need config files or crash dumps? Use `docker cp` to safely extract files from a container to your local machine without opening a shell.

```bash
# Copy a file from container to local directory
# Syntax: docker cp <container>:<path> <local-path>
docker cp api_web_1:/app/logs/error.json ./artifacts/
```

No shell required, so there's no risk of editing files inside the container.

## 4. Exec with Read-Only Intent

If you must open a shell, set up your terminal properly for better readability. This command passes your terminal dimensions to the container for correct text wrapping.

```bash
# Open interactive shell with proper terminal sizing
# -i: Keep STDIN open for interactive input
# -t: Allocate a pseudo-TTY for terminal features
# --env: Pass terminal dimensions for proper text display
docker exec -it --env COLUMNS=$(tput cols) --env LINES=$(tput lines) api_web_1 sh
```

- Use `sh` or `bash` depending on the base image.
- Avoid installing packages-containers should remain immutable.

Enable read-only filesystem in production to discourage edits (`docker run --read-only -v /tmp`).

## 5. Launch Ephemeral Debug Containers

When the base image lacks shell tools (distroless), spin up a helper container sharing the same namespaces. This technique lets you debug minimal images without modifying them.

```bash
# Launch a debug container that shares the target's network and process namespaces
docker run --rm -it \
  --network container:api_web_1 \    # Share network namespace (same localhost, ports)
  --pid container:api_web_1 \        # Share PID namespace (see target's processes)
  -v /var/lib/docker/overlay2:/overlay2:ro \  # Read-only access to image layers
  alpine:3.20 sh                     # Alpine includes useful debug tools
```

Or use `docker debug` (BuildKit) / `docker run --privileged --pid=container:<id>` to examine processes without modifying the running container.

## 6. Dive into Layers

Understanding how your image was built helps identify bloat and potential issues. The history command shows each layer, its size, and the command that created it.

```bash
# Show the build history of an image with layer sizes
# Large layers may indicate opportunities for optimization
docker history ghcr.io/acme/api:sha-abc123
```

Large layers hint at missing multi-stage builds. Use `dive` or `syft` locally to inspect file diffs.

## 7. Trace Resource Issues

- `docker stats api_web_1` for live CPU/memory.
- `cat /sys/fs/cgroup/...` inside container to inspect cgroup limits.
- `docker events --since 1h` highlights restarts, health check failures, or OOM kills.

Pipe events into OneUptime via webhook for centralized alerting.

## 8. Snapshot and Reproduce Locally

Capture the current state of a problematic container as a new image. This allows you to reproduce issues on a different machine without affecting production.

```bash
# Create a new image from the container's current state
# The timestamp suffix ensures unique image tags
docker commit api_web_1 debug/api-failed:$(date +%s)

# Export the image to a tar file for transfer to another machine
docker save debug/api-failed > /tmp/api-debug.tar
```

Run the snapshot on a staging host to reproduce issues without touching production again.

## 9. Clean Up After Yourself

- Remove temporary containers: `docker rm -f debug-shell`.
- Delete snapshots once finished (`docker rmi debug/api-failed:...`).
- Document findings in the incident ticket; include `docker inspect` outputs for future reference.

---

By defaulting to inspect/log/cp before shell access, launching ephemeral helpers for distroless images, and exporting evidence for later analysis, you keep debugging disciplined and production-safe. Make this workflow part of your on-call runbooks so every engineer fixes containers the same way.
