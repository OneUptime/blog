# How to Override systemd Service Parameters with Drop-In Files on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Systemd, Service Management, Configuration

Description: Learn how to use systemd drop-in files to customize service parameters on Ubuntu without modifying the original unit files provided by packages.

---

When you need to change how a systemd service behaves, the temptation is to edit the unit file directly. The problem is that package updates will overwrite your changes, losing your customizations. systemd has a cleaner solution: drop-in files. These are snippet files that extend or override specific parameters of a unit without touching the original.

## What Are Drop-In Files

Drop-in files are configuration files placed in a special directory named after the unit they modify, with a `.d` suffix. For example, to modify `nginx.service`, you create files in `/etc/systemd/system/nginx.service.d/`.

systemd merges the original unit file with all drop-ins it finds in that directory. Drop-in files are applied in alphabetical order, so naming matters when multiple drop-ins exist.

The directory structure looks like:

```text
/etc/systemd/system/
  nginx.service.d/
    10-limits.conf
    20-environment.conf
  postgresql.service.d/
    custom.conf
```

## Creating Drop-In Files Manually

Drop-in files must contain the section header for the directives they set. You cannot just list directives without a section.

Here is an example that increases file descriptor limits for nginx:

```bash
# Create the drop-in directory
sudo mkdir -p /etc/systemd/system/nginx.service.d/

# Create the drop-in file
sudo tee /etc/systemd/system/nginx.service.d/10-limits.conf << 'EOF'
[Service]
# Override the default LimitNOFILE to allow more open files
LimitNOFILE=65536
EOF
```

After creating or modifying drop-in files, reload systemd:

```bash
sudo systemctl daemon-reload
sudo systemctl restart nginx.service
```

Verify the setting was applied:

```bash
systemctl show nginx.service | grep LimitNOFILE
```

## Using systemctl edit (The Preferred Method)

The `systemctl edit` command is the safest way to create drop-in files. It opens a text editor, creates the directory structure for you, and reloads the daemon when you save:

```bash
# Edit drop-in for a system service (opens your $EDITOR)
sudo systemctl edit nginx.service

# Edit drop-in for a user service
systemctl --user edit myapp.service
```

This creates a file at `/etc/systemd/system/nginx.service.d/override.conf`. The editor starts with an empty template showing the section structure.

Type your overrides:

```ini
[Service]
# Restart the service on any non-zero exit
Restart=always
RestartSec=10s
```

Save and exit. systemctl automatically runs `daemon-reload`.

## Viewing the Full Merged Configuration

To see the final merged unit configuration after all drop-ins are applied:

```bash
# Show the complete effective configuration
systemctl cat nginx.service

# The output shows the original file and then each drop-in, in order
# Lines from drop-ins are clearly marked with # /etc/systemd/system/nginx.service.d/...
```

## Common Override Scenarios

### Adding Environment Variables

```bash
sudo systemctl edit myapp.service
```

```ini
[Service]
Environment=DATABASE_URL=postgresql://localhost/mydb
Environment=LOG_LEVEL=info
```

Or load from a file:

```ini
[Service]
EnvironmentFile=/etc/myapp/environment
```

### Changing Restart Behavior

Package-installed services sometimes have conservative restart settings. Override them:

```ini
[Service]
Restart=on-failure
RestartSec=5s
StartLimitIntervalSec=300
StartLimitBurst=5
```

### Adding Dependencies

If your service needs to start after another service that the package does not know about:

```ini
[Unit]
After=redis.service
Requires=redis.service
```

### Changing Resource Limits

```ini
[Service]
# Memory limit
MemoryMax=512M

# CPU limit (50% of one core)
CPUQuota=50%

# Limit number of processes
TasksMax=100

# File descriptor limit
LimitNOFILE=65536
```

### Modifying Security Settings

```ini
[Service]
# Run as a specific user
User=myapp
Group=myapp

# Prevent writing to the filesystem except for specific paths
ProtectSystem=strict
ReadWritePaths=/var/lib/myapp /var/log/myapp

# Prevent access to /home
ProtectHome=true

# Prevent privilege escalation
NoNewPrivileges=true
```

### Adding Pre/Post Commands

Drop-ins can add exec commands before or after the main service command. Note that for some directives like `ExecStart`, you need to reset the list first if replacing:

```ini
[Service]
# Add a pre-start check (appended to existing ExecStartPre)
ExecStartPre=/usr/local/bin/check-database-connection.sh

# Add a post-stop cleanup
ExecStopPost=/usr/local/bin/cleanup.sh
```

For `ExecStart`, if you want to completely replace the command:

```ini
[Service]
# Empty assignment first clears the existing ExecStart list
ExecStart=
# Then set the new command
ExecStart=/usr/local/bin/myapp --config /etc/myapp/config.yaml
```

This reset-then-set pattern is required for multi-value directives where an empty assignment clears the list.

## Naming Convention for Drop-In Files

Files are applied in lexicographic order. Use a numeric prefix to control ordering:

```text
10-limits.conf       # Applied first
20-environment.conf  # Applied second
90-custom.conf       # Applied last (highest number wins on conflicts)
```

For most cases, a single `override.conf` file is fine. Use numbered prefixes when you have multiple drop-ins that need to be applied in a specific order.

## Full Override with systemctl edit --full

If you really need to replace the entire unit file (not recommended for package-managed services), use:

```bash
# Creates a full copy in /etc/systemd/system/ that overrides the package version
sudo systemctl edit --full nginx.service
```

This copies the entire unit to `/etc/systemd/system/nginx.service`, which takes precedence over the package version in `/lib/systemd/system/nginx.service`. Updates to the package will not affect this copy, so use it with caution.

## Reverting Overrides

To remove a drop-in and go back to the default behavior:

```bash
# Remove the drop-in directory for a service
sudo rm -rf /etc/systemd/system/nginx.service.d/

# Or remove a specific drop-in file
sudo rm /etc/systemd/system/nginx.service.d/override.conf

# Reload systemd
sudo systemctl daemon-reload
sudo systemctl restart nginx.service
```

Using `systemctl edit`:

```bash
# This removes the drop-in if you save an empty file
sudo systemctl revert nginx.service
```

The `revert` command removes any drop-ins and full overrides, restoring the service to its package-default configuration.

## Drop-Ins for Template Units

Template units (like `getty@.service`) also support drop-ins. The directory name uses the template base:

```bash
# Override for all instances of a template
sudo mkdir -p /etc/systemd/system/getty@.service.d/
sudo tee /etc/systemd/system/getty@.service.d/override.conf << 'EOF'
[Service]
TTYVTDisallocate=no
EOF

# Or override for a specific instance only
sudo mkdir -p /etc/systemd/system/getty@tty1.service.d/
```

## Checking What Overrides Are Active

```bash
# List all units with overrides in /etc/systemd/system/
systemd-delta

# Show only units that have drop-in overrides (not full replacements)
systemd-delta --type=extended
```

`systemd-delta` is a handy command for auditing customizations across the system.

## Summary

Drop-in files are the right way to customize systemd services on Ubuntu. Using `sudo systemctl edit servicename` creates the drop-in structure automatically and is the safest method. The resulting files in `/etc/systemd/system/servicename.d/` survive package updates and clearly document your customizations. Keep the empty assignment pattern in mind when you need to replace rather than append to list-type directives like `ExecStart`. Use `systemctl cat servicename` to verify the final merged configuration looks correct.
