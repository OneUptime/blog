# How to Set Up systemd User Services on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, systemd, Service Management, User Sessions

Description: Learn how to create and manage systemd user services on Ubuntu that run without root privileges and can start automatically when a user logs in.

---

Most people are familiar with system-level systemd services that run as root or a dedicated service account. But systemd also supports user-level services that run within a user's session, managed by a per-user instance of systemd. This is useful for running personal applications, development servers, and background tools without needing root access or modifying system-wide configuration.

## How User Services Differ from System Services

System services are managed by the root-owned systemd instance (PID 1). User services are managed by a per-user systemd instance that starts when the user first logs in. Each user gets their own `systemd --user` process.

Key differences:
- User services run without any elevated privileges
- Unit files live in the user's home directory, not `/etc/systemd/system/`
- They start and stop with the user's login session (by default)
- They are managed with `systemctl --user` instead of `sudo systemctl`

## Directory Structure for User Services

User unit files can be placed in several locations:

```text
~/.config/systemd/user/     # User-specific units (preferred)
/etc/systemd/user/           # System-wide user units (admin installed)
/usr/lib/systemd/user/       # Package-installed user units
```

Create the user directory if it does not exist:

```bash
mkdir -p ~/.config/systemd/user/
```

## Creating a Simple User Service

Here is a basic example: a Python HTTP server that runs in the user's session.

```ini
# ~/.config/systemd/user/my-dev-server.service

[Unit]
Description=My Development HTTP Server
After=default.target

[Service]
# No User= or Group= directives needed - runs as the current user
ExecStart=/usr/bin/python3 -m http.server 8080 --directory /home/user/www
Restart=on-failure
RestartSec=5s

# Set working directory
WorkingDirectory=/home/%h/www

[Install]
WantedBy=default.target
```

Note that `%h` expands to the user's home directory. This is equivalent to `$HOME` in shell.

Enable and start it:

```bash
# Reload user systemd configuration
systemctl --user daemon-reload

# Enable the service (start on login)
systemctl --user enable my-dev-server.service

# Start it now
systemctl --user start my-dev-server.service

# Check status
systemctl --user status my-dev-server.service
```

## Common systemctl --user Commands

```bash
# List all user services
systemctl --user list-units --type=service

# List failed user services
systemctl --user --failed

# View logs for a user service
journalctl --user-unit my-dev-server.service

# Follow logs in real time
journalctl --user-unit my-dev-server.service -f

# Stop a user service
systemctl --user stop my-dev-server.service

# Disable autostart
systemctl --user disable my-dev-server.service
```

## Environment Variables in User Services

User services inherit a limited environment. If your service needs specific environment variables, set them explicitly:

```ini
[Service]
# Set individual variables
Environment=PORT=8080
Environment=NODE_ENV=development

# Or load from a file
EnvironmentFile=%h/.config/myapp/environment
```

The environment file format is simple key=value pairs:

```bash
# ~/.config/myapp/environment
DATABASE_URL=postgresql://localhost/mydb
API_KEY=mysecretkey
PORT=3000
```

You can also pass your current shell environment using `systemctl --user import-environment`:

```bash
# Import specific variables from your shell into the user manager
systemctl --user import-environment PATH DISPLAY DBUS_SESSION_BUS_ADDRESS

# This is often done in shell startup files to ensure GUI-related variables are available
```

## Running Services After Logout with loginctl

By default, user services stop when the user logs out. To keep them running after logout (useful on servers where you want per-user services that persist):

```bash
# Enable lingering for your user
sudo loginctl enable-linger $USER

# Verify lingering is enabled
loginctl show-user $USER | grep Linger
# Output: Linger=yes

# Disable lingering
sudo loginctl disable-linger $USER
```

With lingering enabled, the user's systemd instance starts at boot and keeps running even when the user has no active sessions.

## A Practical Example: Running a Node.js App as a User Service

```ini
# ~/.config/systemd/user/myapp.service

[Unit]
Description=My Node.js Application
After=network.target

[Service]
ExecStart=/usr/bin/node /home/user/myapp/server.js
WorkingDirectory=/home/%h/myapp
Environment=NODE_ENV=production
Environment=PORT=3000

# Load additional environment from file
EnvironmentFile=-%h/.config/myapp/env

# Restart settings
Restart=on-failure
RestartSec=5s
StartLimitIntervalSec=60
StartLimitBurst=3

# Redirect stdout/stderr
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=default.target
```

```bash
# Deploy the service
systemctl --user daemon-reload
systemctl --user enable myapp.service
systemctl --user start myapp.service

# Check it is running
systemctl --user status myapp.service
curl http://localhost:3000/health
```

## User Timers

User services support timers just like system services. Here is an example of a user timer that runs a backup script:

```ini
# ~/.config/systemd/user/backup.service

[Unit]
Description=User Data Backup

[Service]
Type=oneshot
ExecStart=/home/%h/scripts/backup.sh
```

```ini
# ~/.config/systemd/user/backup.timer

[Unit]
Description=Daily backup timer

[Timer]
# Run daily at 2 AM
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
# Enable and start the timer
systemctl --user enable backup.timer
systemctl --user start backup.timer

# List active user timers
systemctl --user list-timers
```

## Sharing Variables with the User Manager

Your shell's `PATH` and display-related variables are not automatically available to the user systemd manager. A common pattern is to set them from your shell profile:

```bash
# Add to ~/.bash_profile or ~/.profile
# Export PATH to the user systemd manager
systemctl --user import-environment PATH

# For GUI applications, export display variables
if [ -n "$DISPLAY" ]; then
    systemctl --user import-environment DISPLAY XAUTHORITY
fi
```

## Inspecting User Systemd State

```bash
# Show the user systemd manager status
systemctl --user status

# Show the user systemd unit file directories
systemd-analyze --user unit-paths

# Check for errors in user unit files
systemd-analyze --user verify ~/.config/systemd/user/myapp.service

# Show environment of the user manager
systemctl --user show-environment
```

## Working with D-Bus in User Services

Some applications need a D-Bus session. User services can access the session bus:

```ini
[Service]
# Make sure the D-Bus session address is available
Environment=DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/%U/bus
```

The `%U` specifier expands to the user's numeric UID.

## Summary

systemd user services are a clean way to run personal applications and development tools without requiring root access or modifying system-wide configuration. The workflow mirrors system services - create a unit file in `~/.config/systemd/user/`, run `systemctl --user daemon-reload`, then enable and start the service. Enable lingering with `loginctl enable-linger` if you need services to persist after logout. User timers bring the same scheduling capabilities available to system timers, making this a complete system for managing per-user workloads.
