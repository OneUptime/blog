# How to Configure systemd Watchdog for Service Health Checks on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Systemd, Service Management, High Availability

Description: Learn how to configure systemd's built-in watchdog mechanism to automatically detect and restart unresponsive services on Ubuntu systems.

---

A service that is running but not actually working is often worse than a service that has crashed. systemd provides a built-in watchdog mechanism that addresses exactly this problem. When configured, it expects services to send periodic heartbeat notifications, and if they stop, systemd will restart the service automatically. This is particularly valuable for production environments where an unresponsive daemon can silently cause failures.

## How the systemd Watchdog Works

The watchdog mechanism works through a simple protocol:

1. systemd sets the `WATCHDOG_USEC` environment variable when starting a service
2. The service reads this variable and sends periodic `sd_notify("WATCHDOG=1")` messages to systemd
3. If systemd does not receive a notification within the watchdog interval, it kills and restarts the service

This is different from simple process monitoring - a service can have its process running while being completely unresponsive (stuck in an infinite loop, deadlocked, and so on). The watchdog catches these cases.

## Configuring the Watchdog in a Unit File

The key directive is `WatchdogSec` in the `[Service]` section:

```ini
[Unit]
Description=My Application Service
After=network.target

[Service]
Type=notify
ExecStart=/usr/local/bin/myapp
WatchdogSec=30s
Restart=on-watchdog
RestartSec=5s

[Install]
WantedBy=multi-user.target
```

Key points about this configuration:
- `Type=notify` is required - the service must support sd_notify protocol
- `WatchdogSec=30s` means systemd expects a heartbeat at least every 30 seconds
- `Restart=on-watchdog` tells systemd to restart the service when the watchdog fires
- The effective timeout is `WatchdogSec * 2/3`, so systemd will kill the service if no keepalive arrives within that window

## Watchdog Restart Options

The `Restart=` directive controls when systemd restarts the service:

```ini
[Service]
# Only restart on watchdog timeout
Restart=on-watchdog

# Restart on watchdog timeout AND on failure (recommended for most services)
Restart=on-failure

# Always restart (even on clean exit) - use with caution
Restart=always
```

There is also a dedicated `RestartSec` to control the delay before restarting, and `StartLimitBurst` to prevent infinite restart loops.

## Implementing Watchdog Notifications in Your Application

If you control the application code, you need to send watchdog notifications. The method depends on your language.

### Bash Script with watchdog support

```bash
#!/bin/bash
# Simple bash service with watchdog support

# Get the watchdog interval from systemd
WATCHDOG_INTERVAL_USEC=${WATCHDOG_USEC:-0}

if [ "$WATCHDOG_INTERVAL_USEC" -gt 0 ]; then
    # Calculate interval in seconds, keep it to half the watchdog timeout
    PING_INTERVAL=$(( WATCHDOG_INTERVAL_USEC / 2000000 ))
    [ "$PING_INTERVAL" -lt 1 ] && PING_INTERVAL=1
fi

# Notify systemd that we are ready
systemd-notify --ready

# Main loop
while true; do
    # Do actual work here
    process_tasks

    # Send watchdog keepalive to systemd
    if [ "$WATCHDOG_INTERVAL_USEC" -gt 0 ]; then
        systemd-notify WATCHDOG=1
    fi

    sleep "$PING_INTERVAL"
done
```

### Python Application

```python
#!/usr/bin/env python3
"""Service with systemd watchdog support."""

import os
import time
import threading
import socket

def notify_systemd(message):
    """Send a notification to systemd via the socket."""
    notify_socket = os.environ.get('NOTIFY_SOCKET')
    if not notify_socket:
        return

    if notify_socket.startswith('@'):
        # Abstract socket
        notify_socket = '\0' + notify_socket[1:]

    with socket.socket(socket.AF_UNIX, socket.SOCK_DGRAM) as sock:
        sock.connect(notify_socket)
        sock.sendall(message.encode())

def watchdog_thread(interval_seconds):
    """Thread that sends watchdog keepalives."""
    while True:
        notify_systemd("WATCHDOG=1")
        time.sleep(interval_seconds / 2)  # Send at half the interval

def main():
    # Check if watchdog is configured
    watchdog_usec = int(os.environ.get('WATCHDOG_USEC', 0))

    if watchdog_usec > 0:
        interval_seconds = watchdog_usec / 1_000_000
        # Start watchdog thread
        wd_thread = threading.Thread(
            target=watchdog_thread,
            args=(interval_seconds,),
            daemon=True
        )
        wd_thread.start()

    # Tell systemd we are ready
    notify_systemd("READY=1")

    # Main application loop
    while True:
        # Your application logic here
        do_work()
        time.sleep(1)

if __name__ == '__main__':
    main()
```

### Using the systemd Python Library

A cleaner option for Python is the `python-systemd` package:

```bash
# Install the systemd Python bindings
sudo apt install python3-systemd
```

```python
from systemd.daemon import notify, Notification
import os
import time

# Notify ready
notify(Notification.READY)

# Send watchdog pings in your main loop
watchdog_usec = int(os.environ.get('WATCHDOG_USEC', 0))
if watchdog_usec > 0:
    ping_interval = watchdog_usec / 2_000_000  # Half the watchdog timeout

while True:
    # Do work
    process_tasks()

    # Send watchdog notification
    notify(Notification.WATCHDOG)
    time.sleep(ping_interval)
```

## Using the Hardware Watchdog

systemd also supports the kernel hardware watchdog through `systemd-watchdog`. This extends the concept to the entire system - if systemd itself becomes unresponsive, the hardware watchdog will trigger a system reset.

Check if a hardware watchdog device is available:

```bash
# List available watchdog devices
ls -la /dev/watchdog*

# Check hardware watchdog status
sudo wdctl /dev/watchdog
```

Configure the system-level watchdog in `/etc/systemd/system.conf`:

```ini
# /etc/systemd/system.conf

[Manager]
# Enable runtime watchdog (kicks the hardware watchdog)
RuntimeWatchdogSec=30s

# Reboot watchdog - triggers reboot if systemd is stuck during shutdown
RebootWatchdogSec=10min

# Hardware watchdog device
WatchdogDevice=/dev/watchdog
```

Apply the changes:

```bash
sudo systemctl daemon-reexec
```

## Testing the Watchdog

To verify your watchdog configuration is working, you can deliberately cause a service to stop sending keepalives and observe the restart behavior:

```bash
# Watch the service status in real time
watch -n 1 systemctl status myapp.service

# Check journal for watchdog events
sudo journalctl -u myapp.service -f
```

When the watchdog fires, you will see entries like:

```text
myapp.service: Watchdog timeout (limit 30s)!
myapp.service: Killing process 1234 (myapp) with signal SIGABRT.
myapp.service: Main process exited, code=dumped, status=6/ABRT
myapp.service: Failed with result 'watchdog'.
myapp.service: Scheduled restart job, restart counter is at 1.
```

## Checking Watchdog Status

```bash
# Show watchdog-related properties of a service
systemctl show myapp.service | grep -i watchdog

# Sample output fields:
# WatchdogTimestamp=...
# WatchdogTimestampMonotonic=...
# WatchdogUSec=30000000
```

## Common Configuration Patterns

For a database service where you want conservative watchdog settings:

```ini
[Service]
Type=notify
ExecStart=/usr/bin/postgresql
WatchdogSec=120s
Restart=on-watchdog
RestartSec=10s
StartLimitIntervalSec=300
StartLimitBurst=3
```

For a lightweight web service where you want aggressive monitoring:

```ini
[Service]
Type=notify
ExecStart=/usr/local/bin/myapi
WatchdogSec=10s
Restart=on-failure
RestartSec=2s
StartLimitIntervalSec=60
StartLimitBurst=5
```

## Summary

The systemd watchdog is a powerful tool for building self-healing services. The key requirements are: set `Type=notify` in your service unit, configure `WatchdogSec` with an appropriate timeout, set `Restart=on-watchdog` or `Restart=on-failure`, and implement watchdog notifications in your application code. Services that support the sd_notify protocol gain robust health monitoring without any external tools. For most production services, combining the service-level watchdog with `StartLimitBurst` to cap restart attempts gives you both resilience and protection against restart loops.
