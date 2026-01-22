# How to Fix ENOSPC Error (No Space Left on Device) in Node.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, Linux, Debugging, FileSystem, Inotify

Description: Learn how to diagnose and fix the ENOSPC error in Node.js including file watcher limits, disk space issues, and inotify configuration on Linux systems.

---

The `ENOSPC` error in Node.js is misleading. While it stands for "Error NO SPaCe", it often has nothing to do with disk space. Most commonly, it occurs because you have hit the limit of file watchers. This guide explains both causes and their solutions.

## Understanding the Error

You will typically see:

```bash
Error: ENOSPC: no space left on device, watch '/path/to/file'
    at FSWatcher.start
```

Or:

```bash
Error: ENOSPC: System limit for number of file watchers reached
```

## Quick Diagnosis

```bash
# Check disk space
df -h

# Check inode usage
df -i

# Check current watcher limit (Linux)
cat /proc/sys/fs/inotify/max_user_watches

# Check how many watches are currently used
find /proc/*/fd -lname anon_inode:inotify 2>/dev/null | wc -l
```

## Cause 1: File Watcher Limit (Most Common)

### The Problem

Node.js development tools like nodemon, webpack, Vite, and create-react-app use file watchers to detect changes. Linux limits the number of file watchers per user, defaulting to around 8192.

A large project with node_modules can easily exceed this limit:

```bash
# Count files in a project
find . -type f | wc -l
# Could be 50,000+ with node_modules!
```

### The Fix: Increase Watcher Limit

Temporary fix (until reboot):

```bash
sudo sysctl fs.inotify.max_user_watches=524288
```

Permanent fix:

```bash
# Add to /etc/sysctl.conf
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf

# Apply changes
sudo sysctl -p
```

### Verify the Change

```bash
cat /proc/sys/fs/inotify/max_user_watches
# Should show 524288
```

### Ubuntu/Debian Specific

On newer systems using systemd:

```bash
# Create config file
sudo nano /etc/sysctl.d/40-max-user-watches.conf

# Add this line
fs.inotify.max_user_watches=524288

# Apply
sudo sysctl --system
```

### macOS

macOS uses a different mechanism and rarely hits this issue. If needed:

```bash
# Check current limit
sysctl kern.maxfiles
sysctl kern.maxfilesperproc

# Increase limits
sudo sysctl -w kern.maxfiles=65536
sudo sysctl -w kern.maxfilesperproc=65536
```

## Cause 2: Actual Disk Space

### Check Disk Space

```bash
df -h
# Filesystem      Size  Used Avail Use% Mounted on
# /dev/sda1       100G   98G    2G  98% /

# If / or /tmp is full, that's the problem
```

### Quick Cleanup

```bash
# Clean npm cache
npm cache clean --force

# Remove node_modules (can be reinstalled)
rm -rf node_modules

# Clean package manager caches
yarn cache clean
pnpm store prune

# Clean Docker if installed
docker system prune -a

# Clean system logs (Linux)
sudo journalctl --vacuum-time=3d
```

### Find Large Files

```bash
# Find largest directories
du -sh */ | sort -hr | head -20

# Find largest files
find . -type f -exec du -h {} \; | sort -hr | head -20

# Find node_modules directories
find ~ -name "node_modules" -type d -prune | xargs du -sh | sort -hr
```

### Clean Old node_modules

```bash
# Find and optionally remove old node_modules
npx npkill

# Or manually
find ~/Projects -name "node_modules" -type d -prune -exec rm -rf {} +
```

## Cause 3: Inode Exhaustion

Disk space may be available, but inodes (file entries) are exhausted:

```bash
df -i
# Filesystem      Inodes   IUsed   IFree IUse% Mounted on
# /dev/sda1      6553600 6553600       0  100% /
```

### Fix Inode Exhaustion

```bash
# Find directories with most files
find / -xdev -printf '%h\n' | sort | uniq -c | sort -rn | head -20

# node_modules often has many small files
find ~/Projects -name "node_modules" -type d -prune -exec rm -rf {} +

# Clean /tmp
sudo rm -rf /tmp/*
```

## Workarounds in Code

### Ignore node_modules

Configure your watcher to ignore node_modules:

```javascript
// webpack.config.js
module.exports = {
  watchOptions: {
    ignored: /node_modules/,
  },
};
```

```javascript
// nodemon.json
{
  "ignore": [
    "node_modules/**/node_modules",
    ".git"
  ]
}
```

```javascript
// vite.config.js
export default {
  server: {
    watch: {
      ignored: ['**/node_modules/**', '**/.git/**'],
    },
  },
};
```

### Polling Instead of Native Watchers

Use polling as a fallback:

```javascript
// webpack.config.js
module.exports = {
  watchOptions: {
    poll: 1000, // Check for changes every second
    ignored: /node_modules/,
  },
};
```

```bash
# nodemon with polling
nodemon --legacy-watch app.js

# Or in nodemon.json
{
  "legacyWatch": true
}
```

```javascript
// chokidar (used by many tools)
const chokidar = require('chokidar');

const watcher = chokidar.watch('src', {
  usePolling: true,
  interval: 1000,
  ignored: /node_modules/,
});
```

### Graceful Error Handling

```javascript
const chokidar = require('chokidar');

const watcher = chokidar.watch('src');

watcher.on('error', (error) => {
  if (error.code === 'ENOSPC') {
    console.error('File watcher limit reached. Try:');
    console.error('echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf && sudo sysctl -p');
    
    // Fall back to polling
    watcher.close();
    const pollingWatcher = chokidar.watch('src', { usePolling: true });
  }
});
```

## Docker Containers

### Problem in Docker

Docker containers share the host's inotify limit:

```dockerfile
# This won't work in Dockerfile
RUN sysctl fs.inotify.max_user_watches=524288
```

### Solution: Configure Host

Set the limit on the Docker host:

```bash
# On the host machine
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### Docker Compose with Polling

```yaml
# docker-compose.yml
services:
  app:
    build: .
    volumes:
      - .:/app
    environment:
      - CHOKIDAR_USEPOLLING=true
      - WATCHPACK_POLLING=true
```

## WSL (Windows Subsystem for Linux)

WSL has additional considerations:

```bash
# In WSL terminal
sudo nano /etc/sysctl.conf

# Add
fs.inotify.max_user_watches=524288

# Apply
sudo sysctl -p
```

For WSL2, you may need to restart:

```powershell
# In PowerShell
wsl --shutdown
wsl
```

## CI/CD Environments

In CI, you might need to increase limits or use polling:

```yaml
# GitHub Actions
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Increase watchers
        run: echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf && sudo sysctl -p
      
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run build
```

## Prevention Tips

### 1. Keep node_modules Clean

```bash
# Remove unused dependencies
npm prune

# Use npm dedupe
npm dedupe
```

### 2. Use pnpm

pnpm uses hard links, resulting in fewer files:

```bash
npm install -g pnpm
pnpm install
```

### 3. Exclude Unnecessary Directories

```javascript
// webpack.config.js
module.exports = {
  watchOptions: {
    ignored: [
      '**/node_modules',
      '**/.git',
      '**/dist',
      '**/build',
      '**/*.log',
    ],
  },
};
```

### 4. Set System Limits at Boot

```bash
# /etc/security/limits.conf
* soft nofile 65536
* hard nofile 65536
```

## Diagnostic Script

Create a script to check system limits:

```bash
#!/bin/bash
# diagnose-enospc.sh

echo "=== Disk Space ==="
df -h /

echo -e "\n=== Inode Usage ==="
df -i /

echo -e "\n=== Inotify Watches Limit ==="
cat /proc/sys/fs/inotify/max_user_watches

echo -e "\n=== Current Watch Count (approx) ==="
find /proc/*/fd -lname anon_inode:inotify 2>/dev/null | wc -l

echo -e "\n=== Largest Directories ==="
du -sh */ 2>/dev/null | sort -hr | head -5

echo -e "\n=== node_modules Directories ==="
find ~ -name "node_modules" -type d -prune 2>/dev/null | head -10

echo -e "\n=== Recommendation ==="
current=$(cat /proc/sys/fs/inotify/max_user_watches)
if [ "$current" -lt 524288 ]; then
  echo "Consider increasing max_user_watches:"
  echo "echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf"
  echo "sudo sysctl -p"
else
  echo "max_user_watches is already set to $current"
fi
```

## Summary

| Cause | Diagnosis | Fix |
|-------|-----------|-----|
| File watcher limit | `cat /proc/sys/fs/inotify/max_user_watches` | Increase to 524288 |
| Disk full | `df -h` | Clean up disk |
| Inodes exhausted | `df -i` | Remove small files (node_modules) |
| Docker | Host limit too low | Configure host, not container |
| WSL | Default limits low | Configure in /etc/sysctl.conf |

The most common fix is increasing the inotify watcher limit. Add it to your sysctl.conf to make it permanent, and you will likely never see this error again.
