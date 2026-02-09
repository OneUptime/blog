# How to List All Docker Containers (Running and Stopped)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Containers, Docker PS, Listing, DevOps, Docker Commands

Description: Master the docker ps command to list all containers including running, stopped, and exited ones with filters and custom formatting.

---

Docker keeps track of every container on your system, whether it is currently running or has exited hours ago. Knowing how to list, filter, and format container information is one of the most frequently used skills in everyday Docker work. The `docker ps` command is your primary tool, and it is far more powerful than most people realize.

This guide covers everything from the basics to advanced filtering and formatting techniques.

## Listing Running Containers

The default `docker ps` command shows only running containers.

```bash
# List all currently running containers
docker ps
```

The output includes these columns:

```
CONTAINER ID   IMAGE          COMMAND                  CREATED         STATUS         PORTS                  NAMES
a1b2c3d4e5f6   nginx:latest   "/docker-entrypoint..."  2 hours ago     Up 2 hours     0.0.0.0:80->80/tcp     web
b2c3d4e5f6a7   redis:7        "docker-entrypoint..."   3 hours ago     Up 3 hours     0.0.0.0:6379->6379/tcp redis
```

## Listing All Containers (Including Stopped)

Add the `-a` (or `--all`) flag to include containers in every state.

```bash
# List all containers regardless of state
docker ps -a
```

This shows running, stopped, exited, created, and paused containers. Stopped containers appear with an "Exited" status:

```
CONTAINER ID   IMAGE          STATUS                     NAMES
a1b2c3d4e5f6   nginx:latest   Up 2 hours                 web
c3d4e5f6a7b8   python:3.12    Exited (0) 5 hours ago     task-runner
d4e5f6a7b8c9   node:20        Exited (137) 1 day ago     build-job
e5f6a7b8c9d0   alpine:3.19    Created                    pending-setup
```

## Getting Only Container IDs

The `-q` (quiet) flag outputs only container IDs, which is essential for scripting.

```bash
# Get IDs of running containers
docker ps -q

# Get IDs of all containers (running and stopped)
docker ps -aq

# Use in combination with other commands
docker stop $(docker ps -q)          # Stop all running containers
docker rm $(docker ps -aq)           # Remove all containers
```

## Showing the Latest Container

The `-l` (latest) flag shows only the most recently created container.

```bash
# Show the last created container
docker ps -l

# Show the last container even if it has exited
docker ps -l -a
```

The `-n` flag shows the last N containers:

```bash
# Show the 5 most recently created containers
docker ps -n 5
```

## Showing Container Sizes

The `-s` flag adds a SIZE column showing how much disk space each container uses.

```bash
# List running containers with their disk usage
docker ps -s

# List all containers with sizes
docker ps -as
```

The SIZE column shows two values: the writable layer size and the virtual size (total image size plus writable layer).

## Filtering Containers

The `--filter` (or `-f`) flag lets you narrow results by various criteria.

### Filter by Status

```bash
# Show only running containers
docker ps --filter "status=running"

# Show only exited containers
docker ps --filter "status=exited"

# Show only paused containers
docker ps --filter "status=paused"

# Show containers that exited with a specific exit code
docker ps -a --filter "exited=0"      # Clean exits
docker ps -a --filter "exited=137"    # Killed by SIGKILL
docker ps -a --filter "exited=1"      # Application errors
```

Available status values: `created`, `restarting`, `running`, `removing`, `paused`, `exited`, `dead`.

### Filter by Name

```bash
# Find containers whose name contains "web"
docker ps -a --filter "name=web"

# Find containers with exact name prefix
docker ps -a --filter "name=^myapp"
```

### Filter by Image

```bash
# Show all containers based on the nginx image
docker ps -a --filter "ancestor=nginx"

# Show containers from a specific image tag
docker ps -a --filter "ancestor=nginx:1.25"

# Show containers from a specific image ID
docker ps -a --filter "ancestor=sha256:a1b2c3d4"
```

### Filter by Label

```bash
# Show containers with a specific label
docker ps --filter "label=environment=production"

# Show containers that have a label (any value)
docker ps --filter "label=com.mycompany.project"
```

### Filter by Network

```bash
# Show containers connected to a specific network
docker ps --filter "network=myapp_default"
```

### Filter by Volume

```bash
# Show containers using a specific volume
docker ps --filter "volume=pgdata"
```

### Combining Multiple Filters

```bash
# Show running containers on the production network with the web label
docker ps \
  --filter "status=running" \
  --filter "network=production" \
  --filter "label=role=web"
```

Multiple filters of different types use AND logic. Multiple filters of the same type use OR logic.

```bash
# Show containers that are either running OR paused (OR logic, same filter type)
docker ps --filter "status=running" --filter "status=paused"
```

## Custom Output Formatting

The `--format` flag uses Go templates to customize output.

```bash
# Show only names and status
docker ps -a --format "table {{.Names}}\t{{.Status}}"

# Show names, image, and ports
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Ports}}"
```

Available template fields:
- `{{.ID}}` - Container ID
- `{{.Image}}` - Image name
- `{{.Command}}` - Command
- `{{.CreatedAt}}` - Creation time
- `{{.RunningFor}}` - Time since created
- `{{.Ports}}` - Port mappings
- `{{.State}}` - Container state
- `{{.Status}}` - Status with details
- `{{.Size}}` - Disk size (requires `-s`)
- `{{.Names}}` - Container name
- `{{.Networks}}` - Connected networks
- `{{.Mounts}}` - Volume mounts
- `{{.Labels}}` - All labels

### JSON Output

```bash
# Output as JSON for programmatic use
docker ps -a --format json

# Pretty-print with jq
docker ps -a --format json | jq .

# Extract specific fields
docker ps -a --format json | jq '{name: .Names, status: .Status, image: .Image}'
```

### Creating a Dashboard View

```bash
# Compact dashboard showing key information
docker ps -a --format "table {{.Names}}\t{{.State}}\t{{.Image}}\t{{.RunningFor}}\t{{.Ports}}"
```

## Counting Containers

```bash
# Count running containers
docker ps -q | wc -l

# Count all containers
docker ps -aq | wc -l

# Count containers by status
docker ps -a --format '{{.State}}' | sort | uniq -c | sort -rn

# Count containers by image
docker ps -a --format '{{.Image}}' | sort | uniq -c | sort -rn
```

## Monitoring Container Status

Watch container status changes in real time.

```bash
# Refresh the container list every 2 seconds
watch -n 2 'docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"'
```

For a more informative view:

```bash
# Live dashboard with resource usage
watch -n 5 'echo "=== Running Containers ===" && docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}" && echo "" && echo "=== Resource Usage ===" && docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"'
```

## Scripting with Container Lists

Build scripts that work with container lists.

```bash
#!/bin/bash
# container-report.sh - Generate a report of all containers

echo "Docker Container Report - $(date)"
echo "================================="
echo ""

RUNNING=$(docker ps -q | wc -l)
STOPPED=$(docker ps -aq --filter "status=exited" | wc -l)
TOTAL=$(docker ps -aq | wc -l)

echo "Summary: $RUNNING running, $STOPPED stopped, $TOTAL total"
echo ""

echo "Running Containers:"
docker ps --format "  {{.Names}} ({{.Image}}) - up {{.RunningFor}}"

echo ""
echo "Stopped Containers:"
docker ps -a --filter "status=exited" --format "  {{.Names}} ({{.Image}}) - {{.Status}}"

echo ""
echo "Containers Using Most Disk Space:"
docker ps -as --format "{{.Size}}\t{{.Names}}" | sort -rh | head -5
```

## Finding Containers That Restarted

Identify containers that have been restarting, which might indicate application issues.

```bash
# Show containers in restarting state
docker ps --filter "status=restarting"

# Check restart counts for all running containers
docker ps -q | xargs -I{} docker inspect --format '{{.Name}} - Restarts: {{.RestartCount}}' {}
```

## Cleaning Up Based on Container Lists

Use filtered lists to drive cleanup operations.

```bash
# Remove all containers that exited with an error
docker rm $(docker ps -aq --filter "exited=1")

# Remove all stopped containers older than 7 days
docker ps -a --filter "status=exited" --format '{{.ID}} {{.CreatedAt}}' | while read id created; do
    created_ts=$(date -d "${created%% *}" +%s 2>/dev/null || date -j -f "%Y-%m-%d" "${created%% *}" +%s 2>/dev/null)
    now_ts=$(date +%s)
    age_days=$(( (now_ts - created_ts) / 86400 ))
    if [ "$age_days" -gt 7 ]; then
        docker rm "$id"
    fi
done
```

## Useful Aliases

Add these to your `.bashrc` or `.zshrc` for quick access.

```bash
# Container listing aliases
alias dps='docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"'
alias dpsa='docker ps -a --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"'
alias dpsq='docker ps -q'
alias dpsc='docker ps -q | wc -l'
```

## Conclusion

The `docker ps` command is deceptively simple but remarkably flexible. Combine the `-a` flag to see all containers, `--filter` to narrow results, and `--format` to customize output. Build aliases for your common queries. Use the quiet mode (`-q`) for scripting. These techniques turn container management from a guessing game into a precise, efficient workflow. For cleanup of the stopped containers you find, check out our guide on [removing all stopped Docker containers](https://oneuptime.com/blog/post/2026-02-08-how-to-remove-all-stopped-docker-containers/view).
