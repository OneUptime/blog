# How to Set Up systemd Service Watchdogs and Auto-Restart Policies on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Systemd, Watchdog, Auto-Restart, Service Management, Linux

Description: Learn how to configure systemd service watchdogs and auto-restart policies on RHEL to keep critical services running reliably.

---

systemd provides built-in watchdog and restart mechanisms that ensure services stay running. The watchdog checks that a service is alive and responsive, while restart policies define how systemd recovers from failures.

## Step 1: Configure Auto-Restart

```bash
# Create or modify a service with restart policies
sudo tee /etc/systemd/system/myapp.service << 'UNITEOF'
[Unit]
Description=My Application
After=network.target

[Service]
ExecStart=/usr/local/bin/myapp
# Restart on any failure (non-zero exit, signal, timeout, watchdog)
Restart=on-failure
# Wait 5 seconds between restart attempts
RestartSec=5
# Give up after 5 failures within 60 seconds
StartLimitBurst=5
StartLimitIntervalSec=60

[Install]
WantedBy=multi-user.target
UNITEOF

sudo systemctl daemon-reload
sudo systemctl enable --now myapp.service
```

## Step 2: Restart Policy Options

| Policy | Restarts On |
|--------|------------|
| no | Never (default) |
| on-success | Clean exit (code 0) |
| on-failure | Non-zero exit, signal, timeout, watchdog |
| on-abnormal | Signal, timeout, watchdog |
| on-watchdog | Watchdog timeout only |
| on-abort | Signal only |
| always | Any exit |

## Step 3: Configure the Watchdog

```bash
# Add watchdog to a service
sudo tee /etc/systemd/system/myapp.service.d/watchdog.conf << 'UNITEOF'
[Service]
# The service must notify systemd every 30 seconds
WatchdogSec=30
# Restart if the watchdog times out
Restart=on-watchdog
# Send SIGABRT instead of SIGKILL for core dumps on watchdog failure
WatchdogSignal=SIGABRT
UNITEOF

sudo systemctl daemon-reload
sudo systemctl restart myapp.service
```

## Step 4: Implement Watchdog in Your Application

```python
#!/usr/bin/env python3
"""myapp.py - Application with systemd watchdog support"""
import os
import time
import socket

def notify_systemd(message):
    """Send a notification to systemd."""
    addr = os.environ.get('NOTIFY_SOCKET')
    if not addr:
        return
    sock = socket.socket(socket.AF_UNIX, socket.SOCK_DGRAM)
    if addr[0] == '@':
        addr = '\0' + addr[1:]
    sock.sendto(message.encode(), addr)
    sock.close()

def main():
    # Tell systemd we are ready
    notify_systemd("READY=1")

    while True:
        # Do application work here
        do_work()

        # Ping the watchdog to indicate we are alive
        notify_systemd("WATCHDOG=1")

        time.sleep(10)

def do_work():
    """Placeholder for actual work."""
    pass

if __name__ == '__main__':
    main()
```

Update the service to use Type=notify:

```bash
sudo tee /etc/systemd/system/myapp.service.d/notify.conf << 'UNITEOF'
[Service]
Type=notify
NotifyAccess=main
UNITEOF
```

## Step 5: Configure Escalating Restart Actions

```bash
# Configure failure actions that escalate
sudo tee /etc/systemd/system/myapp.service.d/escalate.conf << 'UNITEOF'
[Service]
# After exhausting restart attempts, reboot the system
FailureAction=reboot-force
# Or just log and stop
# FailureAction=none
# Execute a custom command on failure
ExecStopPost=/usr/local/bin/alert-on-failure.sh %n
UNITEOF

sudo systemctl daemon-reload
```

## Step 6: Monitor Restart Behavior

```bash
# Check how many times a service has restarted
systemctl show myapp.service --property=NRestarts

# View restart-related logs
journalctl -u myapp.service | grep -i restart

# Check the watchdog status
systemctl show myapp.service --property=WatchdogTimestamp
```

## Summary

You have configured systemd service watchdogs and auto-restart policies on RHEL. The watchdog ensures your service is responsive, not just running, while restart policies provide automatic recovery from failures. Together, they form a robust self-healing mechanism for critical services.
