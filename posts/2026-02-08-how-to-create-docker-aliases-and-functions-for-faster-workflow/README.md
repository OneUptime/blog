# How to Create Docker Aliases and Functions for Faster Workflow

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, aliases, bash, shell, productivity, workflow, CLI, docker compose

Description: Speed up your Docker workflow with shell aliases and functions that replace long, repetitive commands.

---

Docker commands are verbose. Typing `docker compose up -d --build` dozens of times a day adds up. Remembering the exact flags for `docker exec -it`, the format string for `docker ps`, or the filter syntax for `docker logs` slows you down.

Shell aliases and functions fix this. A good set of Docker aliases can cut your typing by 70% and make common operations feel instant. This guide provides a complete, battle-tested collection of aliases and functions for daily Docker work, organized by task.

## Setting Up Your Aliases File

Keep Docker aliases in a separate file so they are easy to manage and share across machines.

Create the aliases file:

```bash
# Create a dedicated file for Docker aliases
touch ~/.docker_aliases
```

Source it from your shell configuration:

```bash
# Add this line to ~/.bashrc or ~/.zshrc
source ~/.docker_aliases
```

After adding or modifying aliases, reload your shell:

```bash
# Reload shell configuration
source ~/.bashrc
# or for zsh
source ~/.zshrc
```

## Essential Docker Aliases

These cover the commands you run most often.

Basic container operations:

```bash
# ~/.docker_aliases - Core Docker shortcuts

# Container listing
alias dps='docker ps'
alias dpsa='docker ps -a'
alias dpsq='docker ps -q'

# Container lifecycle
alias dstart='docker start'
alias dstop='docker stop'
alias drestart='docker restart'
alias drm='docker rm'
alias drmf='docker rm -f'

# Logs
alias dlogs='docker logs'
alias dlogsf='docker logs -f'
alias dlogst='docker logs --tail 100 -f'

# Images
alias dimages='docker images'
alias drmi='docker rmi'
alias dpull='docker pull'

# System
alias ddf='docker system df'
alias dprune='docker system prune -f'
```

## Docker Compose Aliases

Docker Compose commands are even longer than plain Docker commands. These aliases save the most time:

```bash
# Docker Compose shortcuts
alias dc='docker compose'
alias dcu='docker compose up -d'
alias dcub='docker compose up -d --build'
alias dcd='docker compose down'
alias dcdv='docker compose down -v'
alias dcr='docker compose restart'
alias dcl='docker compose logs -f'
alias dcps='docker compose ps'
alias dce='docker compose exec'
alias dcb='docker compose build'
alias dcpull='docker compose pull'

# Rebuild and restart a specific service
alias dcrebuild='docker compose up -d --build --no-deps'
```

Usage becomes much faster:

```bash
# Before: 34 characters
docker compose up -d --build

# After: 4 characters
dcub
```

## Shell Functions for Complex Operations

Aliases work for fixed commands. Functions handle commands that take arguments or need logic.

### Interactive Shell into a Container

Open a shell in any container with a single command:

```bash
# Open a bash or sh shell in a container (falls back to sh if bash unavailable)
dsh() {
  docker exec -it "$1" bash 2>/dev/null || docker exec -it "$1" sh
}
```

Usage:

```bash
# Open a shell in the "web" container
dsh web
```

### Quick Container Inspection

Get the most useful information about a container in one view:

```bash
# Show key details about a container: status, IP, ports, mounts
dinspect() {
  local container="$1"
  echo "=== Status ==="
  docker inspect "$container" --format 'State: {{.State.Status}} | Started: {{.State.StartedAt}}'
  echo ""
  echo "=== Network ==="
  docker inspect "$container" --format '{{range $net, $conf := .NetworkSettings.Networks}}{{$net}}: {{$conf.IPAddress}}{{"\n"}}{{end}}'
  echo ""
  echo "=== Ports ==="
  docker port "$container" 2>/dev/null || echo "No published ports"
  echo ""
  echo "=== Mounts ==="
  docker inspect "$container" --format '{{range .Mounts}}{{.Type}}: {{.Source}} -> {{.Destination}}{{"\n"}}{{end}}'
}
```

### Follow Logs with Timestamps

View logs with timestamps and a reasonable tail length:

```bash
# Follow container logs with timestamps, starting from the last 50 lines
dlogtime() {
  docker logs -f --tail "${2:-50}" --timestamps "$1"
}
```

### Stop and Remove a Container

Combine stop and remove into one action:

```bash
# Stop and remove a container in one command
dstoprem() {
  docker stop "$1" && docker rm "$1"
  echo "Stopped and removed $1"
}
```

### Clean Up Everything

A comprehensive cleanup function:

```bash
# Remove all stopped containers, unused images, networks, and build cache
dclean() {
  echo "Removing stopped containers..."
  docker container prune -f

  echo "Removing unused images..."
  docker image prune -f

  echo "Removing unused networks..."
  docker network prune -f

  echo "Removing build cache..."
  docker builder prune -f

  echo ""
  echo "Disk usage after cleanup:"
  docker system df
}

# Nuclear option: remove absolutely everything including volumes
dcleanall() {
  read -p "This will remove ALL Docker data including volumes. Continue? [y/N] " confirm
  if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
    docker system prune -a -f --volumes
    echo "All Docker data removed."
  else
    echo "Cancelled."
  fi
}
```

## Docker Compose Functions

### Rebuild a Single Service

Rebuild and restart just one service without touching others:

```bash
# Rebuild and restart a single Compose service
dcservice() {
  docker compose up -d --build --no-deps "$1"
}
```

Usage:

```bash
# Rebuild only the api service
dcservice api
```

### Exec into a Compose Service

Open a shell in a Compose service by service name:

```bash
# Open a shell in a Docker Compose service
dcsh() {
  docker compose exec "$1" bash 2>/dev/null || docker compose exec "$1" sh
}
```

### View Logs for a Specific Service

Follow logs for one service with a tail:

```bash
# Follow logs for a Compose service, last 100 lines
dclog() {
  docker compose logs -f --tail "${2:-100}" "$1"
}
```

### Restart with Fresh Volumes

Tear down a Compose stack and bring it back with clean volumes:

```bash
# Full reset: down with volumes, rebuild, and start fresh
dcreset() {
  docker compose down -v --remove-orphans
  docker compose up -d --build
}
```

## Monitoring Functions

### Formatted Container Stats

Get a cleaner view of resource usage:

```bash
# Show container resource usage in a clean format
dstats() {
  docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"
}

# Live monitoring of container stats
dstatswatch() {
  docker stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"
}
```

### Quick Port Check

Find which port a container uses:

```bash
# Show port mappings for a container
dports() {
  if [ -z "$1" ]; then
    # Show ports for all running containers
    docker ps --format "{{.Names}}\t{{.Ports}}"
  else
    docker port "$1"
  fi
}
```

### Container IP Address

Get a container's IP address quickly:

```bash
# Get the IP address of a container
dip() {
  docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}} {{end}}' "$1"
}
```

## Development Workflow Functions

### Run a One-Off Command

Run a command in a fresh container with the current directory mounted:

```bash
# Run a command in a container with the current directory mounted
drun() {
  local image="$1"
  shift
  docker run --rm -it -v "$(pwd):/work" -w /work "$image" "$@"
}
```

Usage:

```bash
# Run a Python script in a Python container
drun python:3.12 python myscript.py

# Run npm install in a Node container
drun node:20 npm install
```

### Database Quick Connect

Functions for connecting to common databases:

```bash
# Connect to PostgreSQL in a container
dpg() {
  local container="${1:-postgres}"
  local user="${2:-postgres}"
  local db="${3:-postgres}"
  docker exec -it "$container" psql -U "$user" -d "$db"
}

# Connect to MySQL in a container
dmysql() {
  local container="${1:-mysql}"
  local user="${2:-root}"
  docker exec -it "$container" mysql -u "$user" -p
}

# Connect to Redis CLI in a container
dredis() {
  local container="${1:-redis}"
  docker exec -it "$container" redis-cli
}
```

Usage:

```bash
# Connect to the default postgres container
dpg

# Connect to a specific container, user, and database
dpg my-postgres myuser mydb
```

## Network Debugging Functions

```bash
# Test connectivity from one container to another
dping() {
  docker exec "$1" ping -c 3 "$2"
}

# Check DNS resolution inside a container
ddns() {
  docker exec "$1" nslookup "$2"
}

# List all containers on a specific network
dnet() {
  docker network inspect "$1" --format '{{range .Containers}}{{.Name}} ({{.IPv4Address}}){{"\n"}}{{end}}'
}
```

## The Complete Aliases File

Here is the full file ready to copy:

```bash
# ~/.docker_aliases - Complete Docker shortcuts collection
# Source this from your .bashrc or .zshrc

# ---- Basic Docker Aliases ----
alias dps='docker ps'
alias dpsa='docker ps -a'
alias dstart='docker start'
alias dstop='docker stop'
alias drestart='docker restart'
alias drm='docker rm'
alias drmf='docker rm -f'
alias dlogs='docker logs'
alias dlogsf='docker logs -f'
alias dimages='docker images'
alias drmi='docker rmi'
alias dpull='docker pull'
alias ddf='docker system df'
alias dprune='docker system prune -f'

# ---- Docker Compose Aliases ----
alias dc='docker compose'
alias dcu='docker compose up -d'
alias dcub='docker compose up -d --build'
alias dcd='docker compose down'
alias dcdv='docker compose down -v'
alias dcr='docker compose restart'
alias dcl='docker compose logs -f'
alias dcps='docker compose ps'
alias dce='docker compose exec'
alias dcb='docker compose build'

# ---- Functions ----
dsh() { docker exec -it "$1" bash 2>/dev/null || docker exec -it "$1" sh; }
dcsh() { docker compose exec "$1" bash 2>/dev/null || docker compose exec "$1" sh; }
dclog() { docker compose logs -f --tail "${2:-100}" "$1"; }
dcservice() { docker compose up -d --build --no-deps "$1"; }
dcreset() { docker compose down -v --remove-orphans && docker compose up -d --build; }
dip() { docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}} {{end}}' "$1"; }
dstats() { docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"; }
dports() { [ -z "$1" ] && docker ps --format "{{.Names}}\t{{.Ports}}" || docker port "$1"; }
dclean() { docker container prune -f && docker image prune -f && docker network prune -f && docker builder prune -f && docker system df; }
```

## Testing Your Aliases

After setting up, verify everything works:

```bash
# Reload your shell
source ~/.bashrc

# Test basic aliases
dps
dimages

# Test functions
dstats
dports
```

## Summary

Shell aliases and functions transform the Docker CLI from a verbose, repetitive tool into a fast, ergonomic workflow. Start with the basic aliases for commands you use every day, then build up functions for multi-step operations. Keep everything in a dedicated `~/.docker_aliases` file for easy management. Share the file across machines by including it in your dotfiles repository. The upfront investment of 15 minutes setting these up pays back every single day you work with Docker.
