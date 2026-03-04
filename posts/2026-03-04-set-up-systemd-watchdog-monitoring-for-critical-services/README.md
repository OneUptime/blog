# How to Set Up systemd Watchdog Monitoring for Critical Services on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, systemd, System Administration, Monitoring, Linux

Description: Learn how to set Up systemd Watchdog Monitoring for Critical Services on RHEL with step-by-step instructions, configuration examples, and best practices.

---

The systemd watchdog feature monitors critical services and automatically restarts them if they stop responding. This is essential for production systems where service availability is a top priority.

## Prerequisites

- RHEL with systemd
- Root or sudo access
- A service that supports watchdog notifications (or one you will modify)

## How the Watchdog Works

When enabled, a service must periodically send a "keep alive" signal to systemd. If systemd does not receive this signal within the configured timeout, it considers the service hung and takes a recovery action (typically killing and restarting it).

## Step 1: Configure Watchdog in the Service Unit

Edit your service unit:

```bash
sudo systemctl edit --full myapp.service
```

Add watchdog configuration:

```ini
[Service]
Type=notify
WatchdogSec=30
Restart=on-watchdog
RestartSec=5
```

This tells systemd to expect a watchdog ping every 30 seconds. If no ping arrives within that window, the service is considered failed.

## Step 2: Send Watchdog Notifications from Your Application

Your application must call `sd_notify("WATCHDOG=1")` periodically. The recommended interval is half of `WatchdogSec`.

### Python Example

```python
import time
import sdnotify

n = sdnotify.SystemdNotifier()
n.notify("READY=1")

while True:
    # Do work here
    do_work()
    n.notify("WATCHDOG=1")
    time.sleep(10)  # Notify every 10 seconds for a 30-second timeout
```

Install the library:

```bash
pip install sdnotify
```

### Bash Example

```bash
#!/bin/bash
systemd-notify READY=1

while true; do
    # Do work
    perform_health_check
    systemd-notify WATCHDOG=1
    sleep 10
done
```

### C Example

```c
#include <systemd/sd-daemon.h>
#include <unistd.h>

int main() {
    sd_notify(0, "READY=1");
    while (1) {
        do_work();
        sd_notify(0, "WATCHDOG=1");
        sleep(10);
    }
    return 0;
}
```

## Step 3: Configure Recovery Actions

Customize what happens when the watchdog fires:

```ini
[Service]
WatchdogSec=30
Restart=on-watchdog
WatchdogSignal=SIGABRT
StartLimitBurst=3
StartLimitIntervalSec=300
```

For generating a core dump on watchdog failure:

```ini
[Service]
WatchdogSignal=SIGABRT
```

## Step 4: Enable System-Wide Hardware Watchdog

For critical servers, configure the hardware watchdog to reboot the machine if systemd itself hangs:

```bash
sudo vi /etc/systemd/system.conf
```

```ini
RuntimeWatchdogSec=60
RebootWatchdogSec=10min
```

```bash
sudo systemctl daemon-reexec
```

## Step 5: Test the Watchdog

Start the service and then simulate a hang:

```bash
sudo systemctl start myapp.service
# Simulate hang by pausing the process
sudo kill -STOP $(systemctl show --property=MainPID --value myapp.service)
```

After `WatchdogSec` expires, systemd should kill and restart the service:

```bash
journalctl -u myapp.service | tail -20
```

## Conclusion

systemd watchdog monitoring provides automatic recovery for hung services on RHEL. By combining application-level watchdog pings with systemd restart policies, you can build self-healing services that recover from hangs without manual intervention.
