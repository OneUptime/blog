# How to Run Commands as a Specific User in Container Console

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Container, Security, Linux

Description: Learn how to run commands as a specific user in the Docker container console from Portainer, including running as root for debugging and non-root for security.

## Introduction

Portainer's container console lets you run commands as the container's configured user or specify a different one when needed - as root to debug permission issues, or as a specific application user to test permissions or run user-specific commands.

## Prerequisites

- Portainer installed with a connected Docker environment
- A running container
- Understanding of Linux users and UIDs

## Step 1: Specify User in Portainer Console Dialog

1. Navigate to **Containers** in Portainer.
2. Click on the container name.
3. Click **Console**.
4. In the console configuration dialog:
   - **Shell**: `/bin/sh`, `/bin/bash`, or `/bin/ash` for Alpine containers
   - **User**: Enter the user to run as
5. Click **Connect**.

User field accepts:
```text
root           → Run as root (UID 0)
www-data       → Run as www-data user (name)
1000           → Run as UID 1000
1000:1000      → Run as UID 1000, GID 1000
appuser        → Run as named user 'appuser'
nobody         → Run as 'nobody' (very restricted)
```

## Step 2: Running as Root for Debugging

Running as root gives you broad access inside the container:

```bash
# In Portainer console dialog:

User: root

# Now inside the container:
whoami
# root

# Install debugging tools (temporary):
apt-get update && apt-get install -y strace lsof htop

# Inspect files owned by any user:
ls -la /run/app/
cat /etc/shadow   # Can read sensitive files as root

# Check what the app user can and can't access:
su - appuser -c "ls /data"

# Check file permissions:
stat /app/config.yaml

# Kill any process:
kill -9 <pid>
```

Common root-required debug tasks:

```bash
# Some of these still depend on the container's Linux capabilities and security profile:

# Install a debugging tool:
# Alpine:
apk add --no-cache curl wget strace tcpdump

# Debian/Ubuntu:
apt-get install -y -q netcat-openbsd dnsutils

# Check open files:
lsof -u appuser

# Trace system calls of a running process:
strace -p $(pgrep app) 2>&1 | head -50

# Capture network traffic:
tcpdump -i eth0 -n -w /tmp/capture.pcap port 5432

# Check kernel parameters:
sysctl -a 2>/dev/null | grep net.core
```

## Step 3: Running as the App User

Test what the application can and cannot do:

```bash
# In Portainer console dialog:
User: appuser  (or the user your app runs as)

# Verify you're the correct user:
whoami
id
# uid=1000(appuser) gid=1000(appgroup) groups=1000(appgroup)

# Test file access:
cat /app/config.yaml
ls -la /data/

# Test database connectivity as app user:
psql -h postgres -U appuser -d mydb

# Run the application manually to see errors:
cd /app && node server.js

# Test environment:
env | grep -v PASSWORD | grep -v SECRET
```

## Step 4: Switching Users Inside the Console

Once connected to the console, you can also switch users:

```bash
# Switch to root (if su is available and you started as root):
su -

# Switch to another user:
su - appuser
# Now running as appuser

# Run a single command as another user:
su - www-data -c "php artisan config:cache"

# For containers without su, disconnect and open a new Portainer console
# session with the target user instead
```

## Step 5: Running as User by UID/GID

Useful when the user name doesn't exist but the UID matters:

```bash
# In Portainer console dialog:
User: 1000

# Inside container:
id
# Shows UID 1000; the username and primary GID depend on the image/runtime configuration
# Note: the username may not be in /etc/passwd for this UID
```

For UID:GID format:

```bash
# In Portainer console dialog:
User: 1000:1000

# Inside container:
id
# uid=1000 gid=1000 groups=1000
```

## Step 6: Debugging Permission Issues

The most common reason to run as root:

```bash
# Step 1: Run as root to diagnose
# User: root (in Portainer dialog)

# Check file permissions:
ls -la /data/
# drwxr-x--- 2 root appgroup 4096 Mar 20 10:00 /data/

# Check who the app runs as:
ps aux | grep app
# 1000      1234  0.0  0.1  node server.js
# App runs as UID 1000

# The issue: /data is owned by root with mode 750
# UID 1000 in group appgroup can read but not write

# Fix as root:
chown -R 1000:appgroup /data/
chmod -R 775 /data/

# Step 2: Test as app user
# Open a new console session:
# User: 1000

ls -la /data/
echo "test" > /data/test.txt   # Should now work
```

## Step 7: Security Considerations

Running as root in containers has risks:

```bash
# Audit which users can access the console in Portainer:
# In Portainer Business Edition, RBAC controls console access by role
# Environment Administrators, Operators, and Standard Users with access to
# the container can open consoles; Helpdesk and Read-only users cannot

# In production, consider:
# 1. Restricting who has console-capable access to the environment and container
# 2. Reviewing Activity logs in Portainer Business Edition
# 3. Setting sensitive containers to administrators-only ownership when appropriate

# For sensitive containers, restrict the container or environment to
# administrators only using Portainer access control settings
```

## Step 8: Docker CLI Equivalent

```bash
# Run as a specific user via Docker CLI:
docker exec -it -u root my-container /bin/sh
docker exec -it -u 1000 my-container /bin/sh
docker exec -it -u appuser my-container /bin/sh
docker exec -it -u 0:0 my-container /bin/sh   # root:root

# Run a single command as specific user:
docker exec -u root my-container apt-get install -y curl
docker exec -u appuser my-container ls -la /data
```

## Conclusion

Specifying the user when opening a container console in Portainer is a small but important feature for both debugging and security verification. Run as root when you need broad access inside the container for diagnosing permission issues, installing tools, or inspecting sensitive files. Run as the application user to verify that your application has the correct permissions and can access the resources it needs. Always return to proper security practices after debugging - avoid leaving root console sessions open unnecessarily.
