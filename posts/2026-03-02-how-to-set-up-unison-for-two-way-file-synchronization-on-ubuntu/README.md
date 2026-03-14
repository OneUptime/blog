# How to Set Up Unison for Two-Way File Synchronization on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, File Sync, Linux, Backup, Rsync

Description: Learn how to configure Unison for bidirectional file synchronization on Ubuntu, enabling reliable two-way sync between local directories and remote servers over SSH.

---

Unison is a file synchronization tool that handles bidirectional sync - it propagates changes from either side to the other, detects conflicts when both sides have changed the same file, and asks you what to do. This distinguishes it from rsync, which is fundamentally one-directional.

The most common use case is keeping two directories in sync across two machines, where both machines might modify files independently. Unison detects changes since the last sync, compares both sides, and syncs non-conflicting changes automatically. Conflicts (same file modified on both sides) are flagged for manual resolution.

## Installing Unison

```bash
# Install Unison on Ubuntu
sudo apt update
sudo apt install unison

# Check version - both sides must run the same version of Unison
unison -version

# If syncing with a remote server, install Unison on that server too
# The versions must match exactly or Unison will refuse to sync
```

## Basic Usage: Local to Local Sync

The simplest case - syncing two local directories:

```bash
# Create two test directories
mkdir -p /tmp/dir-a /tmp/dir-b

# Create some test files
echo "hello" > /tmp/dir-a/file1.txt
echo "world" > /tmp/dir-a/file2.txt

# Sync them - on first run, Unison creates an archive and does initial sync
unison /tmp/dir-a /tmp/dir-b

# On first run, Unison asks you to confirm the initial sync
# Press 'f' for "follow" to accept all changes in one direction
# Press 'y' for individual confirmations
```

After the first sync, both directories are identical and Unison has saved a record of the state. On subsequent runs, it only transfers changes.

## Syncing Over SSH

The practical case is syncing between two machines:

```bash
# Syntax: unison local-dir ssh://user@host/path/to/remote-dir

# Sync a local directory with a remote directory
# The remote side needs Unison installed and accessible
unison ~/projects ssh://ubuntu@server.example.com//home/ubuntu/projects

# Note the double slash: one for the ssh:// prefix, one for the absolute path
# Single slash would be relative to the home directory:
unison ~/projects ssh://ubuntu@server.example.com/projects
# (equivalent to /home/ubuntu/projects)
```

The first sync requires key-based SSH authentication (no password prompts allowed in automated sync):

```bash
# Set up key-based SSH auth first
ssh-keygen -t ed25519 -f ~/.ssh/unison_key -N ""
ssh-copy-id -i ~/.ssh/unison_key.pub ubuntu@server.example.com

# Test that it works without a password prompt
ssh -i ~/.ssh/unison_key ubuntu@server.example.com echo "connected"
```

## Creating a Unison Profile

Unison profiles save configuration so you don't have to specify options on every run. Profiles live in `~/.unison/`:

```bash
mkdir -p ~/.unison

# Create a profile for syncing a project directory
cat > ~/.unison/myproject.prf << 'EOF'
# Source and destination
root = /home/ubuntu/projects/myproject
root = ssh://ubuntu@server.example.com/projects/myproject

# Use a specific SSH key
sshargs = -i /home/ubuntu/.ssh/unison_key

# Don't prompt for confirmations on non-conflicting changes
auto = true

# Batch mode - exit with error if there are conflicts
# Set to false if you want interactive conflict resolution
batch = false

# Files and directories to ignore
ignore = Name *.o
ignore = Name *.pyc
ignore = Name __pycache__
ignore = Name .git
ignore = Name node_modules
ignore = Name .DS_Store
ignore = Name Thumbs.db

# Sync deletion - delete files on target that were deleted on source
# Default is true
deletelast = true

# Log file
log = true
logfile = /home/ubuntu/.unison/myproject.log

# Compare file contents, not just timestamps/sizes
fastcheck = false
EOF
```

Run the profile:

```bash
# Run using the profile name (without .prf extension)
unison myproject

# Or specify the profile file explicitly
unison -profile ~/.unison/myproject.prf
```

## Handling Conflicts

When the same file has been modified on both sides since the last sync:

```bash
# Unison detects and reports conflicts
# In interactive mode, it shows each conflict and asks what to do:
# < - accept the version from the left (local)
# > - accept the version from the right (remote)
# m - merge the files (if a merge tool is configured)
# / - skip this conflict

# Configure a merge tool in your profile
mergetool = diff3 -m CURRENT2 CURRENT1 CURRENTARCH > NEW && echo 'Merged'

# Or use a GUI merge tool
mergeprogram = meld
```

In batch mode with auto:

```bash
# With batch=true and auto=true, Unison syncs non-conflicting changes
# and exits with an error code on conflicts
# You can then check the log to see which files conflicted
unison myproject -batch -auto

# Exit code 0 = success, 1 = no changes needed, 2 = conflicts detected
echo "Exit code: $?"
```

## Automating with Cron

For regular automatic sync:

```bash
# Add to crontab
crontab -e

# Sync every 15 minutes, log to file
*/15 * * * * /usr/bin/unison myproject -batch -auto >> /home/ubuntu/.unison/cron.log 2>&1
```

For a systemd timer instead of cron:

```bash
# Create a service unit
sudo tee /etc/systemd/system/unison-sync.service << 'EOF'
[Unit]
Description=Unison file sync
After=network.target

[Service]
Type=oneshot
User=ubuntu
ExecStart=/usr/bin/unison myproject -batch -auto
StandardOutput=journal
StandardError=journal
EOF

# Create the timer unit
sudo tee /etc/systemd/system/unison-sync.timer << 'EOF'
[Unit]
Description=Run Unison sync every 15 minutes

[Timer]
OnBootSec=5min
OnUnitActiveSec=15min
Persistent=true

[Install]
WantedBy=timers.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now unison-sync.timer

# Check the timer
systemctl status unison-sync.timer
systemctl list-timers | grep unison
```

## Fine-Tuning Ignore Rules

```bash
# Profile ignore options:

# Ignore by name pattern
ignore = Name *.log
ignore = Name .gitignore

# Ignore by path (relative to sync root)
ignore = Path build
ignore = Path .git

# Ignore a regex on the full path
ignore = Regex .*/node_modules/.*

# Exclude from one direction only
# These use different syntax and are less common
# See: unison -help | grep ignorenot
```

## Checking What Would Change

Before actually syncing, preview the changes:

```bash
# Dry run - show what would be done without doing it
unison myproject -testenv

# More detailed output
unison myproject -dumbtty -terse

# Show all differences
unison -diff myproject
```

## Monitoring Sync Results

```bash
# Check the Unison log file
tail -f ~/.unison/myproject.log

# Log format shows:
# - Timestamp
# - Which direction each file was propagated
# - Any errors or conflicts

# Check sync archive (Unison stores state here)
ls ~/.unison/
# Files like ar-hash-of-roots are the archives
```

## Troubleshooting Version Mismatches

```bash
# If you get "fatal error: server says Unknown message: UVersion..."
# It usually means Unison versions don't match between client and server

# Check versions on both machines
unison -version
ssh ubuntu@server.example.com unison -version

# Install the same version on both
# If apt provides different versions, build from source or use the pre-built binary:
# https://github.com/bcpierce00/unison/releases
```

## Using Unison with rsync Transport

For large syncs, Unison can use rsync's delta transfer algorithm to only transfer the changed parts of files:

```bash
# Install rsync support
sudo apt install unison-gtk  # Includes rsync support on some systems

# In your profile, enable rsync transfer
# Note: this requires rsync on both ends
# The rsync option depends on your Unison build
rsync = true
```

Unison is a reliable choice for bidirectional sync when you need more than rsync's one-way approach but don't want the complexity of a full distributed sync system. Its conflict detection and archive-based change tracking are well-tested, and it has been maintained since the late 1990s.
