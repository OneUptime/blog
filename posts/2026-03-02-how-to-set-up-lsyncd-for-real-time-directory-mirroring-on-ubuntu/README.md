# How to Set Up Lsyncd for Real-Time Directory Mirroring on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, File Sync, rsync, Linux, DevOps

Description: Learn how to configure lsyncd on Ubuntu to perform real-time directory mirroring using inotify and rsync, keeping local or remote directories synchronized as files change.

---

Lsyncd watches a local directory using Linux's inotify facility and triggers rsync (or another transfer tool) whenever files change. The result is near-real-time mirroring: when a file is created, modified, or deleted in the source directory, lsyncd detects the event and pushes the change to the target.

This is useful for keeping a backup directory up-to-date, mirroring data to a standby server, or distributing files across multiple web servers without a shared filesystem. It's not truly instantaneous (there's a configurable settling delay to batch rapid changes), but for most use cases it's close enough.

## How lsyncd Works

lsyncd uses three things together:
1. **inotify** - Linux kernel facility for filesystem event notification
2. **rsync** - does the actual file transfer
3. **Lua scripting** - lsyncd's configuration is Lua code, which gives it flexibility

When files change, lsyncd accumulates events for a short delay (default 20 seconds) and then runs rsync to sync the changes. This batching avoids running rsync for every individual file write during rapid changes.

## Installing lsyncd

```bash
# Install from Ubuntu repositories
sudo apt update
sudo apt install lsyncd rsync

# Verify installation
lsyncd --version
```

## Basic Configuration

lsyncd's configuration file is Lua code. Create the main config file:

```bash
sudo mkdir -p /etc/lsyncd
sudo tee /etc/lsyncd/lsyncd.conf.lua << 'EOF'
-- lsyncd configuration file
-- Syntax is Lua

-- Settings block
settings {
    logfile    = "/var/log/lsyncd/lsyncd.log",
    statusFile = "/var/log/lsyncd/lsyncd.status",
    statusInterval = 20,  -- Update status file every 20 seconds

    -- Maximum number of rsync processes to run in parallel
    maxProcesses = 4,

    -- Maximum number of accumulated changes before forcing a sync
    maxDelays = 100,
}

-- Create the log directory
-- This needs to exist before starting lsyncd
EOF

sudo mkdir -p /var/log/lsyncd
```

## Syncing a Local Directory to Another Local Directory

The simplest use case - mirroring within the same machine:

```bash
sudo tee /etc/lsyncd/lsyncd.conf.lua << 'EOF'
settings {
    logfile    = "/var/log/lsyncd/lsyncd.log",
    statusFile = "/var/log/lsyncd/lsyncd.status",
    statusInterval = 30,
}

-- Mirror /var/www/html to /var/backup/www
sync {
    default.rsync,

    source = "/var/www/html",
    target = "/var/backup/www",

    delay = 5,  -- Wait 5 seconds after last change before syncing

    rsync = {
        archive = true,     -- Preserve permissions, timestamps, etc.
        compress = false,   -- No compression needed for local transfers
        verbose = true,
    },
}
EOF
```

## Syncing to a Remote Server via SSH

For remote mirroring, lsyncd uses rsync over SSH:

```bash
sudo tee /etc/lsyncd/lsyncd.conf.lua << 'EOF'
settings {
    logfile    = "/var/log/lsyncd/lsyncd.log",
    statusFile = "/var/log/lsyncd/lsyncd.status",
}

-- Mirror /var/www/html to a remote server
sync {
    default.rsyncssh,

    source  = "/var/www/html",
    host    = "backup-server.example.com",
    targetdir = "/var/www/html",

    -- SSH options
    rsync = {
        archive = true,
        compress = true,  -- Compression useful for remote transfers
        _extra = {
            "--delete",              -- Delete files removed from source
            "--exclude=*.tmp",       -- Exclude temp files
            "--exclude=.git/",       -- Exclude git directory
            "-e", "ssh -i /home/www/.ssh/lsyncd_key -o StrictHostKeyChecking=no",
        },
    },

    -- Batch delay in seconds
    delay = 15,
}
EOF
```

Set up SSH key authentication for the rsync connection:

```bash
# Create a dedicated SSH key for lsyncd (run as root or the user lsyncd runs as)
sudo ssh-keygen -t ed25519 -f /root/.ssh/lsyncd_key -N ""

# Copy the public key to the remote server
sudo ssh-copy-id -i /root/.ssh/lsyncd_key.pub user@backup-server.example.com

# Test the connection
sudo ssh -i /root/.ssh/lsyncd_key user@backup-server.example.com echo "connected"
```

## Mirroring to Multiple Targets

Sync to multiple destinations by adding multiple `sync` blocks:

```bash
sudo tee /etc/lsyncd/lsyncd.conf.lua << 'EOF'
settings {
    logfile    = "/var/log/lsyncd/lsyncd.log",
    statusFile = "/var/log/lsyncd/lsyncd.status",
    maxProcesses = 6,
}

-- Common rsync options, reused in multiple syncs
local rsync_opts = {
    archive = true,
    compress = true,
    _extra = { "--delete", "--exclude=*.log" },
}

-- Mirror to primary backup
sync {
    default.rsyncssh,
    source    = "/data/uploads",
    host      = "backup1.example.com",
    targetdir = "/data/uploads",
    rsync     = rsync_opts,
    delay     = 10,
}

-- Mirror to secondary backup in a different datacenter
sync {
    default.rsyncssh,
    source    = "/data/uploads",
    host      = "backup2.example.com",
    targetdir = "/data/uploads",
    rsync     = rsync_opts,
    delay     = 10,
}

-- Also keep a local backup copy
sync {
    default.rsync,
    source = "/data/uploads",
    target = "/backup/uploads",
    delay  = 60,  -- Less urgent for local backup, can wait longer
    rsync  = {
        archive = true,
        _extra  = { "--delete", "--backup", "--backup-dir=/backup/old" },
    },
}
EOF
```

## Excluding Files and Directories

```bash
-- In a sync block, use the excludeFrom or exclude options:
sync {
    default.rsync,
    source = "/var/www/html",
    target = "/var/backup/www",

    -- List of patterns to exclude
    exclude = {
        "*.tmp",
        "*.swp",
        ".git",
        "node_modules",
        "__pycache__",
        "*.log",
    },

    -- Or point to an rsync exclude file
    -- excludeFrom = "/etc/lsyncd/excludes.txt",
}
```

Create an excludes file:

```bash
cat > /etc/lsyncd/excludes.txt << 'EOF'
*.tmp
*.swp
.git/
node_modules/
__pycache__/
*.pyc
.DS_Store
Thumbs.db
EOF
```

## Creating the systemd Service

lsyncd doesn't always install a systemd service on Ubuntu, so create one:

```bash
sudo tee /etc/systemd/system/lsyncd.service << 'EOF'
[Unit]
Description=Live Syncing Daemon (lsyncd)
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/lsyncd /etc/lsyncd/lsyncd.conf.lua
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now lsyncd

# Check status
systemctl status lsyncd
```

If lsyncd is already packaged with a service file, just enable it:

```bash
sudo systemctl enable --now lsyncd
```

## Monitoring lsyncd

```bash
# Watch the log file
tail -f /var/log/lsyncd/lsyncd.log

# Check the status file (shows pending events and sync state)
cat /var/log/lsyncd/lsyncd.status

# Journal logs
journalctl -u lsyncd -f

# Send SIGUSR1 to force a status update
sudo kill -USR1 $(pgrep lsyncd)
```

The status file output looks like:

```text
Lsyncd status report at Mon Mar  2 12:00:00 2026

Sync1 source=/var/www/html
        Delays: 0 delays
        Processes: 0 processes

Sync2 source=/data/uploads
        Delays: 3 delays
        Processes: 1 processes
```

## Handling inotify Limits

For directories with many files or active filesystems, you may hit inotify watch limits:

```bash
# Check the current limit
cat /proc/sys/fs/inotify/max_user_watches

# Increase the limit
echo "fs.inotify.max_user_watches=524288" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Check if lsyncd is approaching the limit
journalctl -u lsyncd | grep -i "inotify"
```

## Testing the Configuration

```bash
# Test the config file syntax without starting
sudo lsyncd --nodaemon /etc/lsyncd/lsyncd.conf.lua

# Run in foreground to see activity
sudo lsyncd --log all /etc/lsyncd/lsyncd.conf.lua

# Create a test file to verify sync is working
touch /var/www/html/test-lsyncd.txt
# Wait a few seconds (up to your configured delay)
# Then check if it appeared on the target
ls /var/backup/www/test-lsyncd.txt
```

## Performance Tuning

```bash
-- For directories with heavy write activity:
settings {
    logfile    = "/var/log/lsyncd/lsyncd.log",
    statusFile = "/var/log/lsyncd/lsyncd.status",

    -- Increase delay to reduce rsync frequency
    -- Useful if many small files change rapidly
    maxDelays = 500,  -- Trigger sync after this many accumulated events
}

sync {
    default.rsync,
    source = "/data/busy-directory",
    target = "/backup/busy-directory",
    delay = 60,  -- Wait up to 60 seconds before syncing

    rsync = {
        archive    = true,
        bwlimit    = 50000,  -- Limit bandwidth to 50 MB/s
        inplace    = true,   -- Use in-place updates for large files
    },
}
```

Lsyncd is a practical tool for keeping directories synchronized in real-time without the overhead of a full distributed filesystem. It's particularly well-suited for web content distribution and backup scenarios where you want changes propagated quickly but don't need strict consistency guarantees.
