# How to Access the Container Console (Exec) in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Container, Debugging, DevOps

Description: Learn how to open an interactive shell inside a running Docker container using Portainer's built-in console (exec) feature.

## Introduction

Portainer's container console (Exec) gives you an interactive shell inside a running container - directly from the browser, without needing SSH access to the host or Docker CLI. This is invaluable for debugging, running ad-hoc commands, and inspecting container state.

## Prerequisites

- Portainer installed with a connected Docker environment
- A running container
- The container image must include a shell (`/bin/sh`, `/bin/bash`, etc.)

## Step 1: Open the Container Console

1. Navigate to **Containers** in Portainer.
2. Click on your running container.
3. Click the **Console** button on the container details page.

## Step 2: Configure the Console Session

A dialog appears before the console opens:

### Choose a Shell

Select the shell available in the container:

| Command | Description | Availability |
|-------|------|-------------|
| `/bin/bash` | Full-featured bash | Ubuntu, Debian, CentOS, most full distros |
| `/bin/sh` | POSIX shell | Many Linux and minimal images |
| `/bin/ash` | BusyBox shell | Alpine Linux |
| `/bin/zsh` | Z shell | Images with zsh installed |

For Alpine-based images, select `/bin/ash` in Portainer - bash is not included by default.

### Choose a User

Optionally specify which user to run the shell as:
- Leave blank to run as the container's default user.
- Enter `root` to run as root (useful for debugging permission issues).
- Enter a username like `appuser` or a UID like `1000`.

## Step 3: Use the Console

Click **Connect** to open the terminal:

```bash
# You now have a shell inside the container

# Example session for debugging a web app:

# Check which directory you're in
pwd
# /app

# List files
ls -la
# total 48
# drwxr-xr-x 1 appuser appuser  512 Mar 20 10:00 .
# drwxr-xr-x 1 root    root     512 Mar 20 09:00 ..
# -rw-r--r-- 1 appuser appuser  156 Mar 20 09:00 package.json
# -rw-r--r-- 1 appuser appuser 4096 Mar 20 09:00 server.js

# Check environment variables
env | sort

# Check if a service port is listening
ss -tlnp | grep :8080
# Or:
netstat -tlnp | grep :8080

# Test database connectivity
pg_isready -h postgres -U myuser -d mydb

# View running processes
ps aux

# Check disk space
df -h

# Check memory usage
free -h
```

## Step 4: Common Debug Tasks via Console

### Check File Contents

```bash
# View a config file:
cat /app/config.yaml

# View log files inside the container:
tail -f /var/log/app/error.log

# Check if a file exists:
ls -la /app/config/database.yml || echo "File not found!"
```

### Test Network Connectivity

```bash
# Test DNS resolution:
nslookup google.com
dig postgres.internal

# Test HTTP endpoint:
curl -s http://backend-service:8080/health
wget -qO- http://backend-service:8080/health

# Ping another container:
ping -c 4 database

# Check which ports are open:
ss -tlnp
```

### Inspect Application State

```bash
# For Node.js apps - check if server is running:
ps aux | grep node
curl http://localhost:3000/health

# For Python apps - activate environment:
python3 -c "import sys; print(sys.version)"
python3 manage.py check --database default

# For Java apps - list JVM processes:
jps -lv
# Check JVM memory:
jstat -gc <pid>
```

### Database Operations

```bash
# PostgreSQL container:
psql -U myuser -d mydb
  \l   -- list databases
  \dt  -- list tables
  SELECT COUNT(*) FROM users;

# MySQL container:
mysql -u root -p mydb
  SHOW TABLES;
  SELECT COUNT(*) FROM orders;

# Redis container:
redis-cli
  PING
  INFO server
  KEYS "*"
```

### File Debugging

```bash
# Find configuration files:
find / -name "*.conf" -not -path "/proc/*" 2>/dev/null

# Check permissions:
stat /app/data
ls -la /app/data

# Check what's using a file:
fuser /app/data/database.db

# View the last 50 lines of a log file:
tail -n 50 /var/log/app.log
```

## Step 5: Non-Interactive Commands via Exec

For one-off commands without an interactive session:

```bash
# Docker CLI: run a single command
docker exec my-container ls -la /app
docker exec my-container env
docker exec my-container pg_dump -U postgres mydb > backup.sql

# Run as specific user:
docker exec --user root my-container cat /etc/shadow
docker exec -u 1000 my-container whoami
```

In Portainer, toggle **Use custom command** and enter a command like `/bin/sh -c "your command here"` for single commands.

## Step 6: Console Not Available - Troubleshooting

### "Cannot use console"

Possible causes:
- **No shell in image**: Distroless images don't have a shell. Use a debug image.
- **Container is stopped**: Console only works on running containers.
- **Interactive & TTY not enabled**: If Portainer reports that the interactive flag and TTY flag are not set, edit the container and enable **Interactive & TTY** in the advanced container settings.
- **Portainer permissions**: Your Portainer role may not allow console access.

### Distroless Image Debug

```bash
# Docker CLI: use Docker Debug when the image has no shell
docker debug my-distroless-app
```

## Conclusion

Portainer's container console provides browser-based shell access to running containers, eliminating the need for SSH access. Use it for debugging application issues, verifying configuration, testing connectivity, and running maintenance commands. Always prefer debugging via logs and health checks first - the console is for deep investigation when logs aren't enough.
