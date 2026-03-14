# How to Configure systemd RestartSec and WatchdogSec on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Systemd, Services, Reliability, System Administration

Description: Configure systemd RestartSec for service restart timing and WatchdogSec for liveness monitoring on Ubuntu to build more reliable and self-recovering services.

---

When a systemd service fails, it can be automatically restarted. How quickly it restarts and under what conditions are controlled by a handful of related directives. Getting these settings right matters for service reliability - too aggressive and you create a restart storm that worsens an underlying problem; too conservative and your service is down longer than necessary.

WatchdogSec adds a different dimension: it allows services to report their own health via a heartbeat mechanism, and systemd kills and restarts a service if the heartbeat stops. This is useful when a service might be alive as a process but stuck and unresponsive.

## Restart Fundamentals

Three directives control the basic restart behavior:

```ini
[Service]
# When to restart (on-failure, always, on-abnormal, on-abort, on-watchdog, on-success, no)
Restart=on-failure

# How long to wait before restarting
RestartSec=5s

# Maximum number of restart attempts within a time window
StartLimitIntervalSec=60s
StartLimitBurst=5
```

### Restart= Options

| Value | Restarts when |
|-------|--------------|
| `no` | Never (default) |
| `always` | Service exits for any reason including clean exit |
| `on-success` | Only when exit code is 0 |
| `on-failure` | Exit code non-zero, signal, or watchdog timeout |
| `on-abnormal` | Signal, watchdog timeout, or timeout exceeded |
| `on-abort` | Unclean signal only |
| `on-watchdog` | Watchdog timeout only |

`Restart=on-failure` is the most common choice for production services. It restarts on crashes and error exits but does not restart on intentional clean exits (e.g., when you run `systemctl stop`).

`Restart=always` is appropriate for services that should never be down, including ones that exit with code 0 as part of their normal reload cycle.

## RestartSec Configuration

`RestartSec` specifies how long systemd waits after a service exits before attempting to restart it.

```ini
[Service]
Restart=on-failure

# Wait 5 seconds before restart
RestartSec=5s

# Seconds are the default unit
RestartSec=10

# Milliseconds
RestartSec=500ms

# Minutes
RestartSec=2min
```

### Choosing the Right RestartSec

The right value depends on the failure mode:

- **Transient errors** (network glitch, temporary resource unavailability): 2-5 seconds is usually sufficient
- **Service initialization failures**: longer delays (10-30 seconds) to avoid hammering a still-unavailable dependency
- **Memory or resource exhaustion**: longer delays to allow resource recovery

A common pattern is combining RestartSec with startup rate limiting to handle repeated failures gracefully.

## Start Limit Configuration

Without limits, a failing service would restart indefinitely, consuming resources and filling logs. The start limit directives control this:

```ini
[Service]
Restart=on-failure
RestartSec=5s

[Unit]
# Allow 5 start attempts within 60 seconds
StartLimitIntervalSec=60s
StartLimitBurst=5

# Action when the burst limit is exceeded
# options: none (default), reboot, reboot-force, poweroff, exit, exit-force
StartLimitAction=none
```

With these settings:
1. Service fails and restarts after 5 seconds
2. After 5 restarts within 60 seconds, systemd stops trying
3. The service enters a "failed" state
4. Manual intervention is required: `sudo systemctl reset-failed myservice && sudo systemctl start myservice`

### Implementing Exponential Backoff

systemd does not have built-in exponential backoff, but you can simulate it by wrapping the service command:

```bash
# Create a restart wrapper script
sudo nano /usr/local/lib/restart-with-backoff.sh
```

```bash
#!/bin/bash
# Implements exponential backoff for service restarts
# Usage: restart-with-backoff.sh <actual-command>

BACKOFF_FILE="/run/myservice-backoff"
MAX_BACKOFF=300  # 5 minutes maximum

# Read current backoff value
if [ -f "$BACKOFF_FILE" ]; then
    BACKOFF=$(cat "$BACKOFF_FILE")
else
    BACKOFF=1
fi

# Execute the actual service
exec "$@"
```

Alternatively, use the `RestartSteps` and `RestartMaxDelaySec` directives available in systemd 254+:

```ini
[Service]
Restart=on-failure
RestartSec=1s

# Gradually increase restart delay (systemd 254+)
# Start at 1s, double each time up to 60s
RestartSteps=6
RestartMaxDelaySec=60s
```

Check if your Ubuntu version's systemd supports this:

```bash
systemctl --version | head -1
# systemd 255 (Ubuntu 24.04+) supports RestartSteps
```

## TimeoutStartSec and TimeoutStopSec

Related timing directives that affect service lifecycle:

```ini
[Service]
# How long to wait for the service to start before considering it failed
TimeoutStartSec=30s

# How long to wait for the service to stop before sending SIGKILL
TimeoutStopSec=30s

# Shorthand to set both
TimeoutSec=30s

# Never time out (dangerous but sometimes necessary for slow starts)
TimeoutStartSec=infinity
```

## WatchdogSec: Service Self-Monitoring

`WatchdogSec` enables a heartbeat mechanism. The service must send `sd_notify(STATUS=WATCHDOG=1)` (or equivalent) to systemd within the watchdog timeout period, or systemd kills and restarts it.

This catches "zombie" scenarios: the service process is alive but stuck - not processing requests, stuck in a lock, or in an infinite loop that is not doing useful work.

### Enabling Watchdog in the Unit File

```ini
[Service]
Type=notify
# Service must send watchdog keepalive every 30 seconds
WatchdogSec=30s

# Restart if watchdog fires
Restart=on-watchdog
RestartSec=5s
```

`Type=notify` is required for watchdog functionality. With this type, systemd waits for the service to send a `READY=1` notification before considering it started.

### Implementing Watchdog in Applications

Applications must actively send watchdog notifications. This requires integrating with the systemd notification socket.

#### Shell Script Service with Watchdog

```bash
#!/bin/bash
# /usr/local/bin/myservice.sh

# Notify systemd we are ready
systemd-notify --ready --status="Service started"

# Main loop with watchdog keepalive
while true; do
    # Do actual work here
    perform_work

    # Send watchdog heartbeat
    systemd-notify WATCHDOG=1

    # Sleep until next cycle
    sleep 10
done
```

#### Python Application with Watchdog

```python
#!/usr/bin/env python3
# Service with systemd watchdog support

import os
import socket
import time
import signal


def notify_systemd(state: str):
    """Send notification to systemd via sd_notify socket."""
    notify_socket = os.environ.get("NOTIFY_SOCKET")
    if not notify_socket:
        return  # Not running under systemd

    if notify_socket.startswith("@"):
        # Abstract socket
        notify_socket = "\0" + notify_socket[1:]

    with socket.socket(socket.AF_UNIX, socket.SOCK_DGRAM) as sock:
        sock.connect(notify_socket)
        sock.sendall(state.encode())


def main():
    # Notify systemd we are ready to accept connections
    notify_systemd("READY=1\nSTATUS=Service is running")

    # Main service loop
    while True:
        try:
            # Do actual work
            process_work()

            # Send watchdog heartbeat
            notify_systemd("WATCHDOG=1")

        except Exception as e:
            # Log the error but keep running
            print(f"Error: {e}", flush=True)

        time.sleep(10)


if __name__ == "__main__":
    main()
```

#### Node.js Application with Watchdog

```javascript
// watchdog.js
// Simple watchdog implementation for Node.js

const { execSync } = require('child_process');

function notifySystemd(state) {
  const socketPath = process.env.NOTIFY_SOCKET;
  if (!socketPath) return;

  try {
    // Use the systemd-notify command for simplicity
    execSync(`systemd-notify '${state}'`, { stdio: 'ignore' });
  } catch (e) {
    // Ignore notification failures
  }
}

// Send ready notification
notifySystemd('READY=1\nSTATUS=Ready to serve requests');

// Set up watchdog timer
const watchdogInterval = setInterval(() => {
  notifySystemd('WATCHDOG=1');
}, 15000); // Send every 15 seconds (half the WatchdogSec value)

// Clean up on exit
process.on('SIGTERM', () => {
  clearInterval(watchdogInterval);
  notifySystemd('STOPPING=1\nSTATUS=Shutting down');
  process.exit(0);
});
```

## A Complete Reliable Service Configuration

Combining all the relevant directives:

```ini
[Unit]
Description=Reliable API Service
After=network.target postgresql.service
Requires=postgresql.service

# Restart limit: 5 attempts in 120 seconds
StartLimitIntervalSec=120s
StartLimitBurst=5

[Service]
Type=notify
User=apiservice
Group=apiservice

ExecStart=/usr/local/bin/api-server

# Restart configuration
Restart=on-failure
RestartSec=5s

# Watchdog: service must heartbeat every 30 seconds
WatchdogSec=30s

# Startup and shutdown timeouts
TimeoutStartSec=60s
TimeoutStopSec=30s

# Send SIGTERM on stop, SIGKILL after TimeoutStopSec
KillMode=mixed
KillSignal=SIGTERM

# Environment
Environment=PORT=8080
Environment=LOG_LEVEL=info

# Resource limits
MemoryMax=1G
CPUQuota=100%

# Security
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
StateDirectory=apiservice
LogsDirectory=apiservice
RuntimeDirectory=apiservice

[Install]
WantedBy=multi-user.target
```

## Monitoring Restart Behavior

```bash
# Check how many times a service has been restarted
systemctl show myservice.service -p NRestarts

# Watch restart events in real time
sudo journalctl -u myservice.service -f | grep -E "Started|Stopped|Failed|Watchdog"

# Check if service is in a restart loop
systemctl status myservice.service
# Look for "active (running)" vs "activating (auto-restart)"

# See when watchdog was triggered
sudo journalctl -u myservice.service | grep -i watchdog
```

## Summary

`RestartSec` controls the delay between service failures and restart attempts, while `StartLimitIntervalSec` and `StartLimitBurst` prevent restart storms. Together they provide a resilient restart policy that handles transient failures automatically while stopping attempts when a persistent failure requires human investigation. `WatchdogSec` adds active liveness monitoring - the service must send periodic heartbeats or systemd kills and restarts it, catching stuck processes that standard exit-based restart cannot detect. For production services, combining these with `Type=notify` and implementing the watchdog notification in the application code provides the most comprehensive reliability coverage.
