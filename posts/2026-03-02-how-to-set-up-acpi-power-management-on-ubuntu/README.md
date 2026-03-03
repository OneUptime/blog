# How to Set Up ACPI Power Management on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, ACPI, Power Management, Server, Hardware

Description: A practical guide to configuring ACPI power management on Ubuntu, including event handling, power button behavior, suspend/resume settings, and custom power scripts.

---

ACPI (Advanced Configuration and Power Interface) is the standard through which the operating system communicates with hardware for power management. On Ubuntu servers and desktops, ACPI governs responses to power button presses, lid close events, battery level changes, and thermal conditions. Configuring it correctly prevents accidental shutdowns, enables proper sleep states, and lets you run custom actions on power events.

## Understanding ACPI on Ubuntu

ACPI events flow through a chain:
1. Hardware generates an ACPI event (power button pressed, AC power disconnected)
2. The kernel receives the event
3. `acpid` - the ACPI events daemon - receives notification
4. `acpid` matches the event to a handler
5. The handler (usually a shell script) runs

On modern Ubuntu systems, systemd-logind also handles many ACPI events. Understanding which system is handling which events is important for effective configuration.

## Installing ACPI Tools

```bash
# Install acpid and ACPI utilities
sudo apt update
sudo apt install -y acpid acpi acpi-support acpitools

# Start and enable acpid
sudo systemctl enable --now acpid

# Check service status
systemctl status acpid

# List current ACPI events
acpi -V

# Show battery status
acpi -b

# Show thermal information
acpi -t

# Show AC adapter status
acpi -a
```

## Checking ACPI Events

Monitor ACPI events in real time:

```bash
# Listen for ACPI events
acpi_listen

# Or monitor the acpid socket
sudo acpi_listen -s /var/run/acpid.socket

# Check recent ACPI events in system log
journalctl -u acpid --no-pager | tail -20
```

When you press buttons or change power states, you'll see events like:
```text
button/power PBTN 00000080 00000001
button/sleep SBTN 00000080 00000001
ac_adapter ACAD 00000000 00000001
battery PNP0C0A:00 00000080 00000001
```

## Configuring acpid Event Handlers

acpid reads event handlers from `/etc/acpi/events/`:

```bash
# List existing event handlers
ls /etc/acpi/events/

# View the default power button handler
cat /etc/acpi/events/powerbtn
```

### Custom Power Button Handler

The default power button handler typically initiates a shutdown. You might want it to prompt or do something else on a server:

```bash
# Create a custom power button event file
sudo tee /etc/acpi/events/powerbtn-custom << 'EOF'
# Power button event handler
event=button/power
action=/etc/acpi/powerbtn-custom.sh
EOF

# Create the handler script
sudo tee /etc/acpi/powerbtn-custom.sh << 'EOF'
#!/bin/bash
# Custom power button handler
# Log the event and send a notification instead of immediate shutdown

logger "ACPI: Power button pressed"

# Send email notification (adjust to your notification method)
# echo "Power button pressed on $(hostname) at $(date)" | mail -s "ACPI Alert" admin@example.com

# Initiate a graceful shutdown with 2-minute warning
/sbin/shutdown -h +2 "System shutting down in 2 minutes - power button was pressed"
EOF

sudo chmod +x /etc/acpi/powerbtn-custom.sh
sudo systemctl restart acpid
```

### Preventing Accidental Shutdown on Servers

On servers, you often want to ignore or log-only the power button:

```bash
sudo tee /etc/acpi/events/powerbtn << 'EOF'
# Ignore physical power button presses on server
event=button/power
action=/etc/acpi/powerbtn-ignore.sh
EOF

sudo tee /etc/acpi/powerbtn-ignore.sh << 'EOF'
#!/bin/bash
# Log power button press but don't act on it
logger "ACPI: Power button pressed - ignored (server mode)"
# Optionally: send alert to monitoring system
EOF

sudo chmod +x /etc/acpi/powerbtn-ignore.sh
sudo systemctl restart acpid
```

## systemd-logind ACPI Integration

systemd-logind handles many ACPI events on Ubuntu. Configure it in `/etc/systemd/logind.conf`:

```bash
sudo nano /etc/systemd/logind.conf
```

```ini
[Login]
# What happens when power button is pressed
# Options: ignore, poweroff, reboot, halt, kexec, suspend,
#          hibernate, hybrid-sleep, lock
HandlePowerKey=ignore

# What happens when sleep button is pressed
HandleSuspendKey=ignore

# What happens when lid is closed
HandleLidSwitch=ignore
HandleLidSwitchDocked=ignore
HandleLidSwitchExternalPower=ignore

# How long power key must be held for long-press action
HoldoffTimeoutSec=0

# What happens when AC power is connected/disconnected
# (handled differently through udev)
```

Apply the changes:

```bash
sudo systemctl restart systemd-logind
```

For servers with no lid or sleep button, setting all handlers to `ignore` and relying on proper remote management (IPMI, iDRAC, iLO) is the right approach.

## ACPI Thermal Management

ACPI thermal zones define temperature thresholds and actions:

```bash
# Check thermal zones
ls /sys/class/thermal/

# Read temperatures
for zone in /sys/class/thermal/thermal_zone*; do
    type=$(cat $zone/type)
    temp=$(cat $zone/temp)
    echo "$type: $((temp/1000))°C"
done

# Check trip points for a thermal zone
ls /sys/class/thermal/thermal_zone0/
cat /sys/class/thermal/thermal_zone0/trip_point_0_temp
cat /sys/class/thermal/thermal_zone0/trip_point_0_type
```

Trip point types:
- `critical` - kernel forces emergency shutdown
- `hot` - OSPM should shut down
- `active` - fan turns on
- `passive` - CPU throttles

## Custom Thermal Event Handlers

```bash
# Create a thermal handler
sudo tee /etc/acpi/events/thermal << 'EOF'
event=thermal
action=/etc/acpi/thermal-handler.sh
EOF

sudo tee /etc/acpi/thermal-handler.sh << 'EOF'
#!/bin/bash
# Log thermal events and alert on high temperatures

THRESHOLD=80  # degrees Celsius

# Get current temperature
TEMP=$(cat /sys/class/thermal/thermal_zone0/temp)
TEMP_C=$((TEMP / 1000))

logger "ACPI: Thermal event - CPU temperature: ${TEMP_C}°C"

if [ "$TEMP_C" -gt "$THRESHOLD" ]; then
    logger "ACPI: WARNING - High temperature: ${TEMP_C}°C"
    # Add your alerting here (webhook, email, etc.)
fi
EOF

sudo chmod +x /etc/acpi/thermal-handler.sh
sudo systemctl restart acpid
```

## AC Adapter Events

Handle power supply connection/disconnection:

```bash
sudo tee /etc/acpi/events/ac-power << 'EOF'
event=ac_adapter
action=/etc/acpi/ac-power.sh
EOF

sudo tee /etc/acpi/ac-power.sh << 'EOF'
#!/bin/bash
# Handle AC power events

STATUS=$(cat /sys/class/power_supply/AC0/online 2>/dev/null || echo "unknown")

if [ "$STATUS" = "1" ]; then
    logger "ACPI: AC power connected"
    # Switch to performance governor when on AC power
    cpupower frequency-set -g performance 2>/dev/null || true
else
    logger "ACPI: AC power disconnected"
    # Switch to powersave when on battery
    cpupower frequency-set -g powersave 2>/dev/null || true
fi
EOF

sudo chmod +x /etc/acpi/ac-power.sh
sudo systemctl restart acpid
```

## Checking ACPI Information

```bash
# Show all ACPI information
acpi -V

# Show battery details
acpi -bi

# Check ACPI BIOS version
sudo dmidecode -t bios | grep -E "Version|Date|Release"

# Show ACPI tables (requires root)
sudo acpidump | head -50

# Decode ACPI tables (requires acpica-tools)
sudo apt install -y acpica-tools
sudo acpidump -o /tmp/acpi.dump
acpixtract -a /tmp/acpi.dump
iasl -d *.dat
```

## Debugging ACPI Issues

```bash
# Enable ACPI debug logging
echo "0x1f" | sudo tee /proc/acpi/debug_level
echo "0x01" | sudo tee /proc/acpi/debug_layer

# Watch kernel ACPI messages
dmesg | grep -i acpi
journalctl -k | grep -i acpi

# Check if acpid is receiving events
sudo acpi_listen &
# Press power button and see if event appears

# Test an event handler manually
sudo /etc/acpi/powerbtn.sh

# Check acpid configuration
acpid --test
```

## Server-Specific ACPI Recommendations

For Ubuntu server deployments:

1. Disable or log-only all physical button handlers
2. Configure thermal handlers to alert monitoring systems before hitting critical thresholds
3. Leave C-state management to the kernel unless you have specific latency requirements
4. Use IPMI or server vendor management tools (iDRAC, iLO) for remote power control rather than relying on ACPI events

```bash
# Comprehensive server ACPI config
sudo tee /etc/systemd/logind.conf.d/server.conf << 'EOF'
[Login]
HandlePowerKey=ignore
HandleSuspendKey=ignore
HandleHibernateKey=ignore
HandleLidSwitch=ignore
HandleLidSwitchDocked=ignore
HandleLidSwitchExternalPower=ignore
IdleAction=ignore
EOF

sudo systemctl restart systemd-logind
```

Proper ACPI configuration on Ubuntu servers prevents unexpected shutdowns and gives you control over how the system responds to hardware events, while providing hooks for integration with monitoring and alerting systems.
