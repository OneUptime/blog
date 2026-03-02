# How to Use systemd Type=notify for Ready Signaling on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, systemd, Linux, DevOps, Service

Description: Learn how to use systemd's Type=notify to signal when your service is ready, enabling precise startup ordering and dependency management on Ubuntu.

---

When you write a long-running service that needs to perform initialization before it's truly ready to handle requests, the default `Type=simple` in systemd is not enough. It assumes your process is ready the instant it starts, which is wrong for most real applications. `Type=notify` solves this by letting your service tell systemd exactly when it's ready.

## What Type=notify Does

With `Type=notify`, systemd starts your process and then waits. The process does whatever startup work it needs - loading configs, binding ports, warming up caches - and only then sends a `READY=1` notification over a Unix socket. Systemd receives this notification and marks the service as active. Any other services that declare `After=your-service.service` won't start until that ready signal is received.

This matters a lot in practice. If service B depends on service A, and service A takes 10 seconds to fully initialize, `Type=simple` will let B start immediately while A is still warming up. `Type=notify` makes B wait for the real ready state.

## The sd_notify Protocol

Systemd exposes a socket path through the `NOTIFY_SOCKET` environment variable. Your service writes notification strings to this socket. The most common messages are:

- `READY=1` - service is ready to handle requests
- `STOPPING=1` - service is beginning a graceful shutdown
- `STATUS=<text>` - arbitrary status text shown in `systemctl status`
- `WATCHDOG=1` - watchdog keepalive ping
- `MAINPID=<pid>` - update the tracked main PID

You can write these using the `sd_notify()` C function from `libsystemd`, or by writing directly to the socket from any language.

## A Practical Example in Python

Most Python services can add sd_notify support with just a few lines of code. Install the `sdnotify` package or use the raw socket approach.

```python
#!/usr/bin/env python3
# my_service.py - A service that uses sd_notify for ready signaling

import os
import socket
import time
import signal
import sys

def sd_notify(message):
    """Send a notification to systemd via the NOTIFY_SOCKET."""
    notify_socket = os.environ.get('NOTIFY_SOCKET')
    if not notify_socket:
        # Not running under systemd, skip silently
        return

    # Handle abstract socket names (start with @)
    if notify_socket.startswith('@'):
        notify_socket = '\0' + notify_socket[1:]

    sock = socket.socket(socket.AF_UNIX, socket.SOCK_DGRAM)
    try:
        sock.sendto(message.encode(), notify_socket)
    finally:
        sock.close()

def startup_tasks():
    """Simulate real initialization work that takes time."""
    sd_notify("STATUS=Loading configuration...")
    time.sleep(2)

    sd_notify("STATUS=Connecting to database...")
    time.sleep(2)

    sd_notify("STATUS=Warming up cache...")
    time.sleep(1)

def handle_shutdown(signum, frame):
    """Graceful shutdown handler."""
    sd_notify("STOPPING=1")
    sd_notify("STATUS=Shutting down gracefully...")
    sys.exit(0)

def main():
    signal.signal(signal.SIGTERM, handle_shutdown)
    signal.signal(signal.SIGINT, handle_shutdown)

    # Do initialization work before signaling ready
    startup_tasks()

    # Now signal that we're ready
    sd_notify("READY=1")
    sd_notify("STATUS=Running and accepting connections")

    # Main service loop
    while True:
        time.sleep(60)  # Replace with real work

if __name__ == '__main__':
    main()
```

## Writing the Unit File

The unit file needs `Type=notify` and should include a `TimeoutStartSec` to avoid hanging forever if the ready signal never comes.

```ini
# /etc/systemd/system/my-service.service

[Unit]
Description=My Application Service
After=network.target postgresql.service
Requires=postgresql.service

[Service]
# Tell systemd to wait for READY=1 before marking active
Type=notify

# Run as a dedicated user for security
User=myapp
Group=myapp

# Where the application lives
WorkingDirectory=/opt/myapp

# The executable
ExecStart=/opt/myapp/venv/bin/python3 /opt/myapp/my_service.py

# Abort startup if READY=1 not received within 90 seconds
TimeoutStartSec=90

# Wait up to 30 seconds for graceful shutdown
TimeoutStopSec=30

# Restart on failure, but not on clean exit
Restart=on-failure
RestartSec=5

# Environment variables
Environment=APP_ENV=production
EnvironmentFile=/etc/myapp/environment

[Install]
WantedBy=multi-user.target
```

Enable and start it:

```bash
# Install the unit file
sudo systemctl daemon-reload

# Enable to start on boot
sudo systemctl enable my-service

# Start the service
sudo systemctl start my-service

# Watch the startup with timestamps
journalctl -u my-service -f
```

## Using the C sd_notify API

For C/C++ services, link against `libsystemd` and call `sd_notify()` directly:

```c
/* my_daemon.c - using sd_notify in C */
#include <systemd/sd-daemon.h>
#include <stdio.h>
#include <unistd.h>

int main(void) {
    /* Signal that we're starting up */
    sd_notify(0, "STATUS=Initializing...");

    /* Do real initialization work */
    sleep(3);

    /* Signal ready */
    sd_notify(0, "READY=1\nSTATUS=Service is running");

    /* Main loop */
    while (1) {
        /* Send watchdog ping if WatchdogSec is configured */
        sd_notify(0, "WATCHDOG=1");
        sleep(30);
    }

    return 0;
}
```

Compile with:

```bash
# Link against libsystemd
gcc -o my_daemon my_daemon.c $(pkg-config --cflags --libs libsystemd)
```

## Adding Watchdog Support

The watchdog feature lets systemd restart your service if it stops responding. Add `WatchdogSec` to your unit file and have your service ping systemd periodically:

```ini
[Service]
Type=notify
WatchdogSec=30
# systemd will kill and restart the service if no WATCHDOG=1 is
# received within 30 seconds
```

In your Python service, read the watchdog interval and ping accordingly:

```python
import os

def get_watchdog_interval():
    """Get the watchdog interval from systemd, return None if not set."""
    usec = os.environ.get('WATCHDOG_USEC')
    if usec:
        # Ping at half the watchdog interval to be safe
        return int(usec) / 2_000_000
    return None

# In your main loop
watchdog_interval = get_watchdog_interval()
while True:
    do_work()
    if watchdog_interval:
        sd_notify("WATCHDOG=1")
    time.sleep(watchdog_interval or 60)
```

## Verifying It Works

Check that systemd correctly tracks the service state:

```bash
# See the service state and status text
systemctl status my-service

# Look for "Active: active (running)" and the STATUS= message
# You should see your custom status text from sd_notify

# Check how long startup took
systemd-analyze blame | grep my-service

# Verify dependencies waited for ready signal
systemctl list-dependencies my-service --after
```

## Common Pitfalls

Several things trip people up when first using `Type=notify`.

The `NOTIFY_SOCKET` environment variable is only set when running under systemd. Your service needs to handle the case where it's absent, such as during development or testing outside of systemd. The example above handles this gracefully.

If you use `User=` in your unit file, the socket path is still accessible. Systemd creates the socket with permissions that allow the service user to write to it.

If your service forks child processes, systemd tracks the original PID. If the child is the actual service process, use `MAINPID=<pid>` to update what systemd tracks, or configure `NotifyAccess=all` to accept notifications from child processes.

```ini
[Service]
Type=notify
# Allow child processes to send notifications
NotifyAccess=all
```

`Type=notify` is a small change to make, but it dramatically improves the reliability of service startup ordering on busy systems with many interdependent services.
