# How to Configure systemd-tmpfiles for Temporary Directory Management on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, systemd, System Administration, File Management

Description: Learn how to use systemd-tmpfiles to create, manage, and automatically clean temporary files and directories on Ubuntu with persistent configuration across reboots.

---

On a traditional Linux system, managing temporary directories - creating them at boot, setting the right permissions, and cleaning up old files - required custom init scripts or cron jobs. systemd-tmpfiles handles all of this through declarative configuration files. It runs at boot to create necessary paths and can also run periodically to clean up stale files.

## What systemd-tmpfiles Does

systemd-tmpfiles serves three functions:
1. Creates directories, files, symlinks, and devices at boot (via `systemd-tmpfiles-setup.service`)
2. Cleans up old files from designated directories (via `systemd-tmpfiles-clean.service`, which runs daily)
3. Removes directories that no longer need to exist

This is used heavily by the system itself. The contents of `/tmp`, `/run`, and `/var/tmp` are all managed through tmpfiles configuration.

## Configuration File Locations

tmpfiles configuration files go in:

```text
/etc/tmpfiles.d/          # Local overrides (highest priority)
/run/tmpfiles.d/          # Runtime-generated configuration
/usr/lib/tmpfiles.d/      # Package-installed configuration (do not edit)
```

Files in `/etc/tmpfiles.d/` override files with the same name in `/usr/lib/tmpfiles.d/`.

## Configuration File Format

Each line in a tmpfiles.d configuration file specifies one action:

```text
Type  Path              Mode  User  Group  Age  Argument
```

The fields are:
- **Type**: The action to take (d, f, L, z, Z, etc.)
- **Path**: The filesystem path
- **Mode**: Permissions (octal) or `-` for default
- **User**: Owner or `-` for root
- **Group**: Group owner or `-` for root
- **Age**: For cleanup, how old files must be before removal (e.g., `10d`, `1w`, `-` to disable)
- **Argument**: Content or target for some types

## Common Type Codes

| Type | Action |
|------|--------|
| `d` | Create directory, clean old files if age is set |
| `D` | Create directory and remove contents on boot |
| `f` | Create file if it does not exist |
| `F` | Create or truncate file |
| `L` | Create symlink |
| `z` | Set ownership/permissions on existing paths |
| `Z` | Set ownership/permissions recursively |
| `r` | Remove path if it exists |
| `R` | Remove path and all contents recursively |
| `e` | Adjust mode/ownership/age for cleanup only (no creation) |

## Creating Application Directories

A common use case is ensuring an application's directories exist with the right permissions at boot:

```bash
# Create a tmpfiles.d configuration for myapp
sudo tee /etc/tmpfiles.d/myapp.conf << 'EOF'
# Type  Path                    Mode  User    Group   Age  Argument

# Create runtime directory for PID files and sockets
d  /run/myapp                   0755  myapp   myapp   -

# Create log directory
d  /var/log/myapp               0755  myapp   myapp   -

# Create data directory
d  /var/lib/myapp               0750  myapp   myapp   -

# Create cache directory and clean files older than 30 days
d  /var/cache/myapp             0755  myapp   myapp   30d

# Create a temp directory and clean files older than 1 day
d  /tmp/myapp                   0770  myapp   myapp   1d
EOF
```

Apply immediately without rebooting:

```bash
# Create the paths defined in the configuration
sudo systemd-tmpfiles --create /etc/tmpfiles.d/myapp.conf

# Verify the directories were created
ls -la /run/myapp /var/log/myapp /var/lib/myapp
```

## Setting Up Automatic Cleanup

The `Age` field controls when files are eligible for automatic cleanup:

```bash
sudo tee /etc/tmpfiles.d/cleanup.conf << 'EOF'
# Clean log files older than 30 days from /var/log/myapp
d  /var/log/myapp               0755  myapp   myapp   30d

# Clean all files in /tmp/uploads older than 7 days
e  /tmp/uploads                 -     -       -       7d

# Clean files in /var/cache/reports older than 2 weeks
d  /var/cache/reports           0755  www-data www-data  14d
EOF
```

The `e` type (adjust) only applies cleanup without trying to create the directory. Use it when the directory is created by the application itself but you want systemd to handle cleanup.

## Time Specifications for Age

```bash
# Available time units:
# s = seconds, m = minutes, h = hours
# d = days, w = weeks

# Clean files older than 10 minutes
e  /tmp/uploads   -  -  -  10m

# Clean files older than 7 days
e  /var/cache/old   -  -  -  7d

# Clean files older than 2 weeks
e  /var/log/archive   -  -  -  2w

# Dash means never clean automatically
d  /var/lib/important   0755  app   app   -
```

## Creating Files and Setting Content

```bash
sudo tee /etc/tmpfiles.d/config.conf << 'EOF'
# Create a file with specific content if it does not exist
f  /etc/myapp/default.conf  0644  root  root  -  # This is a default config

# Create or truncate a file (F overwrites)
F  /run/myapp/version        0444  root  root  -  1.2.3

# Create a symlink
L  /etc/myapp/active.conf   -     -     -     -  /etc/myapp/production.conf
EOF
```

## Fixing Permissions on Existing Paths

Use `z` and `Z` to correct ownership and permissions:

```bash
sudo tee /etc/tmpfiles.d/permissions.conf << 'EOF'
# Fix ownership on an existing directory (not recursive)
z  /var/lib/myapp            0750  myapp   myapp   -

# Fix ownership recursively on all files
Z  /var/lib/myapp            0640  myapp   myapp   -
EOF
```

This is useful when a package creates files with wrong permissions, or after restoring from backup.

## Running tmpfiles Actions Manually

```bash
# Create all paths defined in all configuration files
sudo systemd-tmpfiles --create

# Create paths from a specific configuration file
sudo systemd-tmpfiles --create /etc/tmpfiles.d/myapp.conf

# Run cleanup (remove old files)
sudo systemd-tmpfiles --clean

# Remove paths defined with 'r' or 'R' types
sudo systemd-tmpfiles --remove

# Show what would happen without making changes (dry run)
sudo systemd-tmpfiles --create --dry-run /etc/tmpfiles.d/myapp.conf
```

## Understanding the Systemd Timer for Cleanup

The cleanup runs automatically via a timer:

```bash
# Check the cleanup timer status
systemctl status systemd-tmpfiles-clean.timer

# See when it last ran and when it will run next
systemctl list-timers systemd-tmpfiles-clean.timer
```

The timer typically runs daily. The setup service runs at boot:

```bash
# Check the setup service that runs at boot
systemctl status systemd-tmpfiles-setup.service

# See what it processes
journalctl -u systemd-tmpfiles-setup.service -b
```

## Handling Subdirectory Cleanup

By default, the `d` type only deletes files in the directory itself, not in subdirectories. To also clean subdirectories, add `!` before the age:

```bash
sudo tee /etc/tmpfiles.d/deep-clean.conf << 'EOF'
# Clean files recursively in subdirectories (the ! prefix)
# Note: this is an advanced feature, check your systemd version
d  /var/cache/myapp  0755  myapp  myapp  30d
EOF
```

## Real-World Example: Web Application

Here is a complete example for a web application:

```bash
sudo tee /etc/tmpfiles.d/webapp.conf << 'EOF'
# Runtime files (cleaned at boot since D type removes on boot)
D  /run/webapp                   0755  webapp  webapp  -

# PID file location
d  /run/webapp                   0755  webapp  webapp  -

# Upload processing area - clean files older than 1 hour
d  /var/lib/webapp/processing    0750  webapp  webapp  1h

# Completed uploads - clean files older than 7 days
d  /var/lib/webapp/uploads       0750  webapp  webapp  7d

# Session files - clean older than 24 hours
d  /var/lib/webapp/sessions      0700  webapp  webapp  24h

# Cache directory - clean older than 30 days
d  /var/cache/webapp             0755  webapp  webapp  30d

# Log directory - never auto-clean (managed by logrotate instead)
d  /var/log/webapp               0755  webapp  webapp  -

# Ensure ownership is correct on the entire data directory
Z  /var/lib/webapp               0750  webapp  webapp  -
EOF

# Apply it immediately
sudo systemd-tmpfiles --create /etc/tmpfiles.d/webapp.conf
```

## Overriding Package Defaults

To change how a package manages its tmp files, create a file with the same name in `/etc/tmpfiles.d/`:

```bash
# View the package's tmpfiles configuration
cat /usr/lib/tmpfiles.d/nginx.conf

# Override it by creating the same filename in /etc
sudo cp /usr/lib/tmpfiles.d/nginx.conf /etc/tmpfiles.d/nginx.conf

# Edit your copy to change the settings
sudo nano /etc/tmpfiles.d/nginx.conf
```

Files in `/etc/tmpfiles.d/` take precedence over those in `/usr/lib/tmpfiles.d/` when they have the same filename.

## Summary

systemd-tmpfiles replaces ad-hoc scripts for managing temporary and runtime directories. Placing a configuration file in `/etc/tmpfiles.d/` is enough to ensure directories exist with the right ownership at boot and that stale files are cleaned up automatically. The format is declarative and easy to audit. The main types to know are `d` (create directory with optional cleanup), `e` (cleanup only), `z` and `Z` (fix permissions), and `f` (create file). Use `systemd-tmpfiles --create --dry-run` to test configurations before applying them.
