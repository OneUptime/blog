# How to Use Python systemd Integration on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Python, systemd, Linux, Services

Description: Learn how to integrate Python applications with systemd on Ubuntu, including journal logging, service notifications, and watchdog support.

---

Running Python applications as systemd services is straightforward. What's less obvious is how to make those applications actually integrate with systemd - logging to the journal properly, sending readiness notifications, and working with the watchdog. This guide covers all of that using the `systemd-python` library and native Python approaches.

## Why Native systemd Integration Matters

When you run a Python script as a systemd service, you can log with `print()` and systemd will capture stdout. But that's surface-level integration. Real integration means:

- Sending `READY=1` so systemd knows your service is up (useful for `Type=notify` services)
- Writing structured logs to the journal with proper log levels
- Responding to the watchdog so systemd can restart unresponsive services
- Sending status messages visible in `systemctl status`

## Installing systemd-python

```bash
# Install the system package (recommended on Ubuntu)
sudo apt update
sudo apt install python3-systemd

# Or install via pip into a virtual environment
pip install systemd-python
```

The system package is preferred because it links against the system's libsystemd, avoiding version mismatches.

## Logging to the systemd Journal

The `systemd.journal` module provides a Python logging handler that writes structured records directly to the journal.

```python
# app.py
import logging
from systemd.journal import JournalHandler

# Create a logger and attach the journal handler
log = logging.getLogger(__name__)
log.addHandler(JournalHandler())
log.setLevel(logging.DEBUG)

def main():
    log.info("Application started")
    log.debug("Debug message - only visible with journalctl -p debug")
    log.warning("Something looks off")
    log.error("Something went wrong")

if __name__ == "__main__":
    main()
```

View the output with journalctl:

```bash
# Follow the journal for a specific service
journalctl -u myapp.service -f

# Show messages from a specific Python module
journalctl PYTHON_MODULE=app

# Filter by priority (0=emergency, 7=debug)
journalctl -u myapp.service -p warning
```

### Adding Structured Fields

The journal supports arbitrary key-value fields. Pass them as keyword arguments to the log call:

```python
from systemd.journal import JournalHandler
import logging

log = logging.getLogger("myapp")
log.addHandler(JournalHandler())
log.setLevel(logging.INFO)

# Include extra fields in journal entries
log.info(
    "Request processed",
    extra={
        "SYSLOG_IDENTIFIER": "myapp",
        "REQUEST_ID": "abc-123",
        "USER_ID": "42",
        "DURATION_MS": "150",
    }
)
```

Query specific fields later:

```bash
journalctl SYSLOG_IDENTIFIER=myapp REQUEST_ID=abc-123
```

## Service Readiness Notifications

For services that take time to initialize (loading config, establishing database connections, etc.), use `Type=notify` in the service unit and call `sd_notify` from Python:

```python
# app.py
from systemd import daemon
import time
import logging

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

def initialize():
    """Simulate a slow initialization phase."""
    log.info("Loading configuration...")
    time.sleep(2)
    log.info("Connecting to database...")
    time.sleep(1)
    log.info("Initialization complete")

def main():
    initialize()

    # Tell systemd we're ready to serve traffic
    daemon.notify("READY=1")
    log.info("Service is ready")

    # Send a status message visible in systemctl status
    daemon.notify("STATUS=Serving requests on port 8080")

    # Main loop
    while True:
        time.sleep(10)
        # Optionally update status periodically
        daemon.notify("STATUS=Processed 100 requests, uptime 10s")

if __name__ == "__main__":
    main()
```

The corresponding service unit:

```ini
# /etc/systemd/system/myapp.service
[Unit]
Description=My Python Application
After=network.target

[Service]
Type=notify
User=www-data
WorkingDirectory=/opt/myapp
ExecStart=/opt/myapp/venv/bin/python app.py
Restart=on-failure
RestartSec=5

# Require the notify signal within 30 seconds of start
TimeoutStartSec=30

[Install]
WantedBy=multi-user.target
```

With `Type=notify`, systemd will wait for `READY=1` before considering the service started. Dependent services won't start until this signal is received.

## Watchdog Integration

The systemd watchdog kills and restarts services that stop responding. Your application must "pet" the watchdog at regular intervals.

```python
# watchdog_app.py
from systemd import daemon
import time
import logging
import os

log = logging.getLogger(__name__)

def get_watchdog_interval():
    """Get the watchdog timeout from environment and return half of it."""
    watchdog_usec = int(os.environ.get("WATCHDOG_USEC", 0))
    if watchdog_usec == 0:
        return None
    # Pet the watchdog at half the timeout interval for safety margin
    return (watchdog_usec / 1_000_000) / 2

def do_work():
    """Simulate actual application work."""
    log.info("Processing...")
    time.sleep(0.5)

def main():
    daemon.notify("READY=1")

    watchdog_interval = get_watchdog_interval()
    last_watchdog = time.monotonic()

    while True:
        do_work()

        # Pet the watchdog if enabled
        if watchdog_interval:
            now = time.monotonic()
            if now - last_watchdog >= watchdog_interval:
                daemon.notify("WATCHDOG=1")
                last_watchdog = now
                log.debug("Watchdog reset")

if __name__ == "__main__":
    main()
```

Enable the watchdog in the service unit:

```ini
[Service]
Type=notify
ExecStart=/opt/myapp/venv/bin/python watchdog_app.py
WatchdogSec=30s
Restart=on-watchdog
```

If the Python process doesn't send `WATCHDOG=1` within 30 seconds, systemd kills it and applies the `Restart` policy.

## Handling Signals Gracefully

systemd sends `SIGTERM` when stopping a service. Handle it so your service shuts down cleanly:

```python
# graceful_app.py
import signal
import sys
import logging
from systemd import daemon

log = logging.getLogger(__name__)
running = True

def handle_sigterm(signum, frame):
    """Handle SIGTERM from systemd."""
    global running
    log.info("Received SIGTERM, initiating graceful shutdown")

    # Tell systemd we're stopping
    daemon.notify("STOPPING=1")
    running = False

def main():
    signal.signal(signal.SIGTERM, handle_sigterm)
    signal.signal(signal.SIGINT, handle_sigterm)

    daemon.notify("READY=1")
    log.info("Application started")

    while running:
        # Do work here
        import time
        time.sleep(1)

    log.info("Shutdown complete")
    sys.exit(0)

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    main()
```

## Reading the Journal from Python

You can also read and filter journal entries programmatically:

```python
from systemd.journal import Reader
from systemd import journal

# Read journal entries for a specific service
reader = Reader()
reader.add_match(_SYSTEMD_UNIT="myapp.service")
reader.seek_tail()
reader.get_previous()  # Move back one entry from tail

# Read the last 10 entries
for i, entry in enumerate(reader):
    if i >= 10:
        break
    print(f"{entry['__REALTIME_TIMESTAMP']}: {entry.get('MESSAGE', '')}")
```

## Using Standard Logging Without systemd-python

If you can't install `systemd-python`, systemd still captures stdout and stderr from your service. Use the standard logging module with appropriate formatting:

```python
import logging
import sys

# Write to stdout - systemd journal captures it
handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(logging.Formatter('%(levelname)s: %(message)s'))

log = logging.getLogger(__name__)
log.addHandler(handler)
log.setLevel(logging.INFO)
```

Set `StandardOutput=journal` in the service unit to ensure stdout goes to the journal with proper metadata.

Proper systemd integration makes Python services behave like first-class system citizens - they start in the right order, report health status accurately, and shut down cleanly when asked.
