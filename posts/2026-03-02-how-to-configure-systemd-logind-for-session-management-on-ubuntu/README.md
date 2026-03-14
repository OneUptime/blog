# How to Configure systemd-logind for Session Management on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Systemd, Session Management, Logind, Linux

Description: Configure systemd-logind on Ubuntu to manage user sessions, control power key behavior, set idle timeouts, manage seat access, and handle multi-user environments.

---

`systemd-logind` is the session manager that handles user login tracking, seat management, hardware access control, and power state transitions on Ubuntu. It replaces the older ConsoleKit and manages the lifecycle of user sessions, from the moment a user logs in to when they log out. Understanding and configuring logind is relevant for server administrators managing multi-user systems, developers setting up workstations, and anyone who wants to control how Ubuntu handles idle timeouts, power buttons, and lid events.

## What systemd-logind Manages

- **Sessions**: Tracks active, idle, and locked user sessions (TTY, SSH, graphical)
- **Seats**: Manages collections of hardware (display, keyboard, mouse) assigned to a local user
- **Users**: Tracks per-user processes and resource accounting
- **Inhibitors**: Lets applications block shutdown/suspend (Firefox downloads, package updates)
- **Power events**: Handles power button, sleep button, and lid-close events

```bash
# Check logind status
systemctl status systemd-logind

# View active sessions
loginctl list-sessions

# View active users
loginctl list-users

# View seats
loginctl list-seats
```

## The logind.conf Configuration File

Edit `/etc/systemd/logind.conf` to configure logind:

```bash
sudo nano /etc/systemd/logind.conf
```

```ini
[Login]
# Number of virtual consoles to allocate
NAutoVTs=6

# Reserve a VT for the getty (login prompt)
ReserveVT=6

# Kill all user processes when the user's last session ends
KillUserProcesses=no

# Don't kill specific processes (by name) when the user logs out
KillExcludeUsers=root

# Power button behavior on desktop/server
# Options: ignore, poweroff, reboot, halt, kexec, suspend, hibernate,
#          hybrid-sleep, suspend-then-hibernate, lock
HandlePowerKey=poweroff

# Suspend key behavior
HandleSuspendKey=suspend

# Hibernate key behavior
HandleHibernateKey=hibernate

# Lid close behavior (laptop)
HandleLidSwitch=suspend
# When docked (external power + external display)
HandleLidSwitchDocked=ignore
# With external power but no external display
HandleLidSwitchExternalPower=ignore

# Power key long-press behavior
HandlePowerKeyLongPress=poweroff
HandleRebootKey=reboot

# Idle timeout before session auto-lock (0 = disabled)
IdleAction=ignore
IdleActionSec=30min

# Session inactivity time before lock
# (different from IdleAction which acts on idle sessions)

# Allow power operations without authentication (for desktop environments)
# on servers, typically set to yes to prevent accidental shutdown
InhibitDelayMaxSec=5

# Limit concurrent logins per user (0 = unlimited)
UserTasksMax=33%

# Require authentication for power operations even on the local seat
# HandlePowerKey default depends on whether a seat is managed by a desktop session
```

Apply changes:

```bash
sudo systemctl restart systemd-logind
```

## Configuring Session Behavior for Servers

On headless servers, adjust logind to not interfere with normal operation:

```bash
sudo nano /etc/systemd/logind.conf
```

```ini
[Login]
# On servers, ignore power key presses
# (prevent accidental shutdown from a mis-press)
HandlePowerKey=ignore

# Keep user processes running after logout
# Useful if you run tmux/screen sessions
KillUserProcesses=no

# No automatic suspend/hibernate on servers
HandleSuspendKey=ignore
HandleHibernateKey=ignore

# No lid handling (servers don't have lids)
HandleLidSwitch=ignore
```

## Managing Sessions with loginctl

```bash
# List all sessions
loginctl list-sessions

# Show details about a specific session
loginctl session-status SESSION_ID

# Show all properties of a session
loginctl show-session SESSION_ID

# Terminate a session
loginctl terminate-session SESSION_ID

# Lock a session
loginctl lock-session SESSION_ID

# Lock all sessions
loginctl lock-sessions
```

### Session Properties

```bash
# Check what type a session is (x11, wayland, mir, tty)
loginctl show-session SESSION_ID | grep Type

# Check if a session is active
loginctl show-session SESSION_ID | grep Active

# Check the session's remote address (for SSH)
loginctl show-session SESSION_ID | grep Remote
```

## Managing Users with loginctl

```bash
# Show all logged-in users
loginctl list-users

# Show details for a specific user
loginctl user-status USERNAME

# Show all properties for a user
loginctl show-user USERNAME

# Terminate all sessions for a user
loginctl terminate-user USERNAME

# Kill all processes for a user
loginctl kill-user USERNAME

# Enable/disable linger for a user
# Linger: keep user processes running even when no sessions are active
sudo loginctl enable-linger USERNAME
sudo loginctl disable-linger USERNAME

# Check if linger is enabled
loginctl show-user USERNAME | grep Linger
```

### User Lingering

Lingering allows user-level systemd services to run when the user is not logged in. This is useful for user-level services started with `systemctl --user`:

```bash
# Enable lingering for a service user
sudo loginctl enable-linger serviceuser

# Now the user can run services that start at boot:
# As the service user:
systemctl --user enable myapp.service
systemctl --user start myapp.service
# The service starts at boot even without the user being logged in
```

## Power Management Integration

logind handles ACPI events and controls when the system can sleep:

```bash
# Check current power settings
loginctl show | grep -E "Handle|Idle"

# Change power key behavior at runtime
sudo systemd-inhibit --what=handle-power-key sleep 3600 &

# List active inhibitors (things preventing sleep/shutdown)
systemd-inhibit --list
```

### Setting Idle Action

Configure what happens when all sessions go idle:

```ini
# /etc/systemd/logind.conf
[Login]
# Suspend the machine after 30 minutes of all sessions being idle
IdleAction=suspend
IdleActionSec=30min

# Or power off unattended servers after extended idle
# IdleAction=poweroff
# IdleActionSec=6h
```

## Inhibitor Locks

Applications can block sleep/shutdown by acquiring inhibitor locks. This is how package managers prevent shutdown during updates and media players prevent screen blanking during movies:

```bash
# See all active inhibitors
systemd-inhibit --list

# Example output:
# WHO        WHAT                 WHY                         MODE
# apt        sleep:shutdown       Package update in progress  block
# firefox    handle-suspend-key   Playing media               delay

# Create an inhibitor lock from a script
# (lock is released when the script exits)
systemd-inhibit --what=sleep:shutdown --who="my-backup" --why="Backup in progress" \
    /path/to/backup-script.sh

# Take a lock and hold it for a command's duration
systemd-inhibit --what=handle-power-key:handle-suspend-key \
    --who="deploy-script" \
    --why="Deployment in progress" \
    ./deploy.sh
```

## Multi-Seat Configuration

On systems with multiple seats (multiple sets of keyboard+display+mouse), logind manages which hardware belongs to which seat:

```bash
# List all seats
loginctl list-seats

# Show hardware assigned to a seat
loginctl seat-status seat0

# Attach a device to a specific seat
loginctl attach seat1 /sys/devices/...
```

## Configuring for SSH-Only Servers

For servers only accessed via SSH, logind configuration can be simplified:

```bash
sudo nano /etc/systemd/logind.conf
```

```ini
[Login]
# SSH sessions are "remote" sessions - logind treats them specially
# Remote sessions don't control power/lid events

# Kill user processes on logout - useful on shared servers
# to prevent runaway processes from shell sessions
KillUserProcesses=yes

# But don't kill lingering services
KillExcludeUsers=

# Ignore all hardware events
HandlePowerKey=ignore
HandleSuspendKey=ignore
HandleHibernateKey=ignore
HandleLidSwitch=ignore

# Allow maximum concurrent SSH sessions per user
# 0 = unlimited
# Set a reasonable limit on shared servers
# UserTasksMax=200
```

## Tracking Session Activity

```bash
# See when users logged in/out (from the journal)
journalctl -u systemd-logind | grep -E "New session|Removed session|Logged out"

# Get last login times
last

# Get failed login attempts
lastb 2>/dev/null || journalctl | grep "Failed password"

# Real-time monitoring
journalctl -u systemd-logind -f
```

## Troubleshooting logind Issues

**Services failing to start because logind is not ready**:

```bash
# Check if logind is running
systemctl status systemd-logind

# Some services need the user session bus
journalctl -u systemd-logind | tail -50
```

**User can't access hardware devices (USB, audio, video)**:

```bash
# Check if the user is in the right groups
groups username

# logind grants hardware access based on active sessions
# Check if the session is actually "active"
loginctl session-status $(loginctl list-sessions | grep username | awk '{print $1}')
# Look for "State: active"
```

**Can't shut down without root password**:

```bash
# logind's PolicyKit integration controls this
# Check polkit rules
ls /etc/polkit-1/rules.d/
cat /usr/share/polkit-1/actions/org.freedesktop.login1.policy | grep -A5 "poweroff"
```

logind is a background component that most administrators rarely need to configure, but it controls key aspects of multi-user behavior. On servers, the main configuration needs are disabling unintended power events and controlling what happens to user processes at logout. On workstations, idle timeout and lid-close behavior are the primary tuning points.
