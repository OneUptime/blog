# How to Use systemd Bus Activation on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, systemd, D-Bus, Linux, Service

Description: Configure systemd D-Bus activation on Ubuntu to start services on demand when a client sends a message to a D-Bus name, reducing idle resource usage.

---

D-Bus activation is a mechanism where a service starts automatically when a D-Bus client sends a message to a specific bus name. The service does not run until needed - systemd holds the bus name and starts the service on the first message, then passes the message through. This is useful for services that are only needed occasionally but must respond quickly when called.

systemd integrates directly with D-Bus activation. When you define a service with a `BusName=` directive, systemd registers that bus name and starts the service on demand.

## Understanding D-Bus Activation

D-Bus has two buses:

- **System bus:** Used by system services, accessible to all processes with appropriate permissions
- **Session bus:** Per-user bus for desktop applications

Activation works the same on both. A `.service` file in the D-Bus activation directory tells D-Bus (or systemd) that when a message arrives for a given bus name, it should start the corresponding program.

Before bus activation, services ran continuously. With activation:

1. Client sends message to `com.example.MyService`
2. D-Bus (or systemd) sees the service is not running
3. systemd starts the service
4. The service registers on the bus and processes the queued message
5. The service can exit when idle, and will be restarted on the next message

## Setting Up a Simple D-Bus Activated Service

### Step 1: Write the Service Implementation

For this example, a simple Python service that responds to D-Bus calls:

```bash
sudo apt install python3-dbus -y
```

```bash
sudo nano /usr/local/bin/dbus-example-service.py
```

```python
#!/usr/bin/env python3
"""
Simple D-Bus activated service example.
Registers on the system bus and provides a simple method.
"""
import sys
import dbus
import dbus.service
import dbus.mainloop.glib
from gi.repository import GLib

# Set up the GLib main loop for D-Bus
dbus.mainloop.glib.DBusGMainLoop(set_as_default=True)

# Bus name and object path
BUS_NAME = "com.example.FileProcessor"
OBJECT_PATH = "/com/example/FileProcessor"


class FileProcessor(dbus.service.Object):
    """D-Bus service object."""

    def __init__(self, bus, path):
        dbus.service.Object.__init__(self, bus, path)

    @dbus.service.method(
        dbus_interface="com.example.FileProcessor",
        in_signature="s",   # String input
        out_signature="b"   # Boolean output
    )
    def ProcessFile(self, filepath):
        """Process a file and return success status."""
        import os
        try:
            # Example: just check if the file exists
            if os.path.exists(filepath):
                print(f"Processing file: {filepath}", flush=True)
                # Real processing logic here
                return True
            else:
                print(f"File not found: {filepath}", flush=True)
                return False
        except Exception as e:
            print(f"Error processing {filepath}: {e}", flush=True)
            return False

    @dbus.service.method(
        dbus_interface="com.example.FileProcessor",
        in_signature="",
        out_signature="s"
    )
    def GetVersion(self):
        """Return service version."""
        return "1.0.0"


def main():
    # Connect to the system bus
    bus = dbus.SystemBus()

    # Request the bus name
    name = dbus.service.BusName(BUS_NAME, bus)

    # Create the service object
    processor = FileProcessor(bus, OBJECT_PATH)

    print(f"Service started: {BUS_NAME}", flush=True)

    # Run the main loop
    loop = GLib.MainLoop()
    loop.run()


if __name__ == "__main__":
    main()
```

```bash
sudo chmod +x /usr/local/bin/dbus-example-service.py
```

### Step 2: Create the D-Bus Service File

The D-Bus service file tells D-Bus about the service and how to start it. For system bus services, place it in `/usr/share/dbus-1/system-services/`:

```bash
sudo nano /usr/share/dbus-1/system-services/com.example.FileProcessor.service
```

```ini
[D-BUS Service]
Name=com.example.FileProcessor
Exec=/usr/local/bin/dbus-example-service.py
User=root
SystemdService=dbus-file-processor.service
```

The `SystemdService=` line tells D-Bus to delegate activation to systemd rather than starting the process directly. This is the preferred approach on systemd systems.

### Step 3: Create the D-Bus Policy File

The system bus requires explicit policy to allow services to register names and clients to call methods:

```bash
sudo nano /usr/share/dbus-1/system.d/com.example.FileProcessor.conf
```

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE busconfig PUBLIC
    "-//freedesktop//DTD D-BUS Bus Configuration 1.0//EN"
    "http://www.freedesktop.org/standards/dbus/1.0/busconfig.dtd">
<busconfig>

    <!-- Allow the service to register this bus name -->
    <policy user="root">
        <allow own="com.example.FileProcessor"/>
    </policy>

    <!-- Allow all users to call methods on this service -->
    <policy context="default">
        <allow send_destination="com.example.FileProcessor"
               send_interface="com.example.FileProcessor"/>
    </policy>

    <!-- Restrict to specific group if needed -->
    <!-- <policy group="processors">
        <allow send_destination="com.example.FileProcessor"/>
    </policy> -->

</busconfig>
```

### Step 4: Create the systemd Service Unit

```bash
sudo nano /etc/systemd/system/dbus-file-processor.service
```

```ini
[Unit]
Description=D-Bus activated file processor service
Requires=dbus.service
After=dbus.service

[Service]
Type=dbus
# Must match the BUS_NAME in the Python script
BusName=com.example.FileProcessor
ExecStart=/usr/local/bin/dbus-example-service.py

# Auto-exit when idle (optional - implement in the service itself)
# TimeoutStopSec=30

# Restart on failure (but not on clean exit)
Restart=on-failure
RestartSec=3

StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

The `Type=dbus` tells systemd that the service is ready when it has registered its `BusName` on the system bus.

### Step 5: Enable and Test

```bash
# Reload D-Bus to pick up the new policy
sudo systemctl reload dbus

# Reload systemd
sudo systemctl daemon-reload

# Enable the service (but don't start it - activation handles that)
sudo systemctl enable dbus-file-processor.service

# Check status - should show inactive (waiting for activation)
sudo systemctl status dbus-file-processor.service
```

## Testing D-Bus Activation

Use `dbus-send` to trigger the service:

```bash
# This call will activate the service if not running
dbus-send \
    --system \
    --print-reply \
    --dest=com.example.FileProcessor \
    /com/example/FileProcessor \
    com.example.FileProcessor.GetVersion

# Call the ProcessFile method
dbus-send \
    --system \
    --print-reply \
    --dest=com.example.FileProcessor \
    /com/example/FileProcessor \
    com.example.FileProcessor.ProcessFile \
    string:"/etc/hostname"
```

Watch the service activate:

```bash
# Monitor service activation in real time
sudo journalctl -u dbus-file-processor.service -f &

# Send the D-Bus message
dbus-send --system --print-reply \
    --dest=com.example.FileProcessor \
    /com/example/FileProcessor \
    com.example.FileProcessor.GetVersion
```

## Introspecting D-Bus Services

```bash
# List all names on the system bus
dbus-send --system --print-reply \
    --dest=org.freedesktop.DBus \
    /org/freedesktop/DBus \
    org.freedesktop.DBus.ListNames

# Introspect the service to see available interfaces and methods
dbus-send --system --print-reply \
    --dest=com.example.FileProcessor \
    /com/example/FileProcessor \
    org.freedesktop.DBus.Introspectable.Introspect

# Use gdbus for a cleaner interface
gdbus introspect --system \
    --dest com.example.FileProcessor \
    --object-path /com/example/FileProcessor
```

## Implementing Idle Exit

Services activated on demand should exit when idle to avoid consuming resources:

```python
# Add to the FileProcessor class
import threading

class FileProcessor(dbus.service.Object):
    IDLE_TIMEOUT = 60  # Exit after 60 seconds of inactivity

    def __init__(self, bus, path):
        dbus.service.Object.__init__(self, bus, path)
        self._loop = None
        self._reset_idle_timer()

    def _reset_idle_timer(self):
        """Reset the idle timeout on each method call."""
        if hasattr(self, '_idle_timer') and self._idle_timer:
            self._idle_timer.cancel()
        self._idle_timer = threading.Timer(self.IDLE_TIMEOUT, self._on_idle)
        self._idle_timer.daemon = True
        self._idle_timer.start()

    def _on_idle(self):
        """Called when the service has been idle too long."""
        print("Service idle timeout reached, exiting", flush=True)
        if self._loop:
            self._loop.quit()

    @dbus.service.method(...)
    def ProcessFile(self, filepath):
        self._reset_idle_timer()
        # ... processing logic
```

## Monitoring D-Bus Activation

```bash
# Watch D-Bus messages in real time (requires dbus-monitor)
sudo dbus-monitor --system "destination=com.example.FileProcessor"

# Check D-Bus socket and activation status
systemctl status dbus

# List systemd services with BusName set
systemctl show --property=BusName $(systemctl list-units --type=service -o json | python3 -c "import sys,json; [print(u['unit']) for u in json.load(sys.stdin) if u['unit'].startswith('dbus-')]")
```

## Troubleshooting

**Service not starting on D-Bus message:** Check that the D-Bus service file has `SystemdService=` pointing to the correct systemd unit name. Also verify the policy file allows the client to send to the destination.

**Permission denied:** The D-Bus policy controls who can own names and who can send to them. Review the policy file and check `journalctl -u dbus` for policy denial messages.

**Service starts but client gets no reply:** The service may be registering the bus name but crashing before processing the message. Check `journalctl -u dbus-file-processor.service` for errors.

**Type=dbus service never becomes active:** The service must explicitly register the `BusName` on the D-Bus system bus. If your Python script exits before registering, systemd will mark the service as failed.

D-Bus activation is a clean solution for services that need to be available on demand without the overhead of running continuously. It is widely used in the Linux desktop stack (NetworkManager, UDisks, BlueZ) and works equally well for custom system services.
