# How to Use podman exec with Working Directory

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Exec, Working Directory

Description: Learn how to set the working directory when executing commands inside Podman containers using the -w flag for precise command execution context.

---

> Setting the working directory with -w ensures your commands run in exactly the right location inside the container.

When you execute a command inside a Podman container, it runs in the container's default working directory (usually `/` or whatever is set by the WORKDIR instruction in the Dockerfile). The `-w` flag lets you override this, running commands from any directory you choose. This guide demonstrates how to use this feature effectively.

---

## The -w Flag Basics

The `-w` or `--workdir` flag sets the working directory for the exec command:

```bash
# Start a test container

podman run -d --name my-app nginx:latest

# Check the default working directory
podman exec my-app pwd
# Output: / (or whatever the Dockerfile sets)

# Execute a command in a specific directory
podman exec -w /etc/nginx my-app pwd
# Output: /etc/nginx

# List files relative to the specified directory
podman exec -w /etc/nginx my-app ls
# Output: conf.d  fastcgi_params  mime.types  modules  nginx.conf  ...
```

## Why Working Directory Matters

The working directory affects relative paths in your commands:

```bash
# Without -w, relative paths resolve from the default directory
podman exec my-app ls conf.d
# Error: ls: cannot access 'conf.d': No such file or directory

# With -w, relative paths resolve from the specified directory
podman exec -w /etc/nginx my-app ls conf.d
# Output: default.conf
```

## Practical Examples

### Working with Application Code

```bash
# Start a Node.js container with an app
podman run -d --name node-app node:latest node -e "
const http = require('http');
http.createServer((req, res) => { res.end('OK'); }).listen(3000);
"

# Run commands from specific application directories
podman exec -w /usr/local/lib node-app ls
podman exec -w /usr/local/bin node-app /bin/sh -c 'ls node*'
```

### Navigating Log Directories

```bash
# List log files from the nginx log directory
podman exec -w /var/log/nginx my-app ls -la

# Tail the latest log from the log directory
podman exec -w /var/log/nginx my-app tail -20 access.log

# Count lines in all log files
podman exec -w /var/log/nginx my-app /bin/sh -c 'wc -l *.log'
```

### Creating Files in Specific Directories

```bash
# Create a file in a specific directory
podman exec -w /tmp my-app /bin/sh -c "echo 'test content' > testfile.txt && ls -la testfile.txt"

# Create a directory structure
podman exec -w /tmp my-app /bin/sh -c "mkdir -p project/src && touch project/src/main.py && find project -type f"
```

## Combining -w with Other Flags

The `-w` flag works alongside common exec options:

```bash
# Working directory + specific user
podman exec -w /var/log/nginx --user root my-app ls -la

# Working directory + environment variables
podman exec -w /tmp -e OUTPUT_FILE=results.txt my-app /bin/sh -c 'echo "output" > $OUTPUT_FILE && cat $OUTPUT_FILE'

# Working directory + interactive shell
podman exec -it -w /etc/nginx my-app /bin/sh
# Shell opens in /etc/nginx

# Working directory + detached mode
podman exec -d -w /var/log/nginx my-app /bin/sh -c "wc -l *.log > /tmp/log-counts.txt"
```

## Non-Existent Working Directories

If you specify a directory that does not exist, Podman returns an error:

```bash
# This will fail
podman exec -w /nonexistent/directory my-app ls
# Error: working directory "/nonexistent/directory" does not exist

# You can create it first
podman exec my-app mkdir -p /app/data
podman exec -w /app/data my-app pwd
# Output: /app/data
```

## Checking the Container's Default Working Directory

Find out what directory the container normally uses:

```bash
# Check the WORKDIR set in the image
podman inspect my-app --format '{{.Config.WorkingDir}}'

# Check with exec
podman exec my-app pwd
```

## Scripting with Working Directories

Use `-w` in scripts for reliable file operations:

```bash
# Backup script that operates in specific directories
#!/bin/bash
CONTAINER="my-app"
BACKUP_DIR="/tmp/backups"

# Create backup directory
podman exec "$CONTAINER" mkdir -p "$BACKUP_DIR"

# Backup nginx config from its own directory
podman exec -w /etc/nginx "$CONTAINER" /bin/sh -c \
    "tar czf ${BACKUP_DIR}/nginx-config.tar.gz ."

# Backup logs from the log directory
podman exec -w /var/log/nginx "$CONTAINER" /bin/sh -c \
    "tar czf ${BACKUP_DIR}/nginx-logs.tar.gz ."

# List the backups
podman exec -w "$BACKUP_DIR" "$CONTAINER" ls -lh
```

## Cleanup

```bash
podman stop my-app node-app 2>/dev/null
podman rm my-app node-app 2>/dev/null
```

## Summary

The `-w` flag on `podman exec` sets the working directory for your command, making relative paths resolve correctly and keeping commands clean. It works with common exec flags including `-it`, `--user`, `-e`, and `-d`. Always verify the directory exists inside the container before using it, or create it first.
