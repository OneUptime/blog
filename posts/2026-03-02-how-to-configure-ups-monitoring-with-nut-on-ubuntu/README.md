# How to Configure UPS Monitoring with NUT (Network UPS Tools) on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, NUT, UPS, Power Management, Server

Description: A complete walkthrough of configuring Network UPS Tools (NUT) on Ubuntu to monitor UPS devices, send alerts on power events, and initiate graceful shutdowns during prolonged outages.

---

A UPS (Uninterruptible Power Supply) is only useful if your server knows it's running on battery and can gracefully shut down before the battery dies. NUT (Network UPS Tools) is the standard Linux solution for UPS monitoring. It handles communication with the UPS hardware, provides a consistent interface regardless of UPS brand, and can initiate clean shutdowns when power events occur.

## How NUT Works

NUT has a client-server architecture:
- **upsd** - the UPS network daemon, reads UPS data from drivers and serves it over the network
- **upsmon** - the monitoring daemon, watches UPS status and takes action on events
- **UPS drivers** - communicate with specific UPS hardware (hidups for USB, snmp-ups for network UPS, etc.)

A single NUT server can monitor multiple UPS units and serve multiple client machines. Clients on remote machines can monitor the same UPS and shut down in sequence based on priority.

## Installing NUT

```bash
# Install NUT
sudo apt update
sudo apt install -y nut nut-client

# Check installed version
upsd --version

# Install USB HID UPS support (most modern UPS devices)
sudo apt install -y nut-server

# For SNMP-connected UPS devices
sudo apt install -y nut-snmp
```

## Identifying Your UPS

Connect the UPS via USB and identify it:

```bash
# List USB devices - look for your UPS
lsusb | grep -i ups
lsusb

# Check kernel messages for UPS detection
dmesg | grep -i "hid\|ups\|apc\|eaton\|cyberpower"

# Check existing NUT drivers that might match your UPS
apt-cache show nut | grep Depends

# List available NUT drivers
ls /lib/nut/

# Check NUT's hardware compatibility list
# (or visit https://networkupstools.org/stable-hcl.html)
```

For common UPS brands, the driver is usually:
- **APC**: `usbhid-ups` or `apcsmart` (for serial)
- **CyberPower**: `usbhid-ups`
- **Eaton**: `usbhid-ups` or `snmp-ups`
- **Tripp Lite**: `usbhid-ups`
- **Minuteman**: `usbhid-ups`

## Configuring NUT Mode

NUT has several operational modes:

```bash
# Configure the NUT mode
sudo tee /etc/nut/nut.conf << 'EOF'
# NUT mode: standalone, netserver, or netclient
# standalone: upsd and upsmon run on the same machine (most common)
# netserver: this machine monitors UPS and serves data to clients
# netclient: this machine monitors a remote NUT server
MODE=standalone
EOF
```

## Configuring the UPS Device

```bash
# Configure UPS hardware
sudo tee /etc/nut/ups.conf << 'EOF'
[myups]
    # Human-readable description
    desc = "APC Smart-UPS 1500"

    # Driver to use
    # For most USB UPS devices:
    driver = usbhid-ups

    # For APC with serial connection:
    # driver = apcsmart

    # Port - for USB use "auto" or the USB device path
    port = auto

    # Override detection settings if needed
    # productid = 0002
    # vendorid = 051d  # APC vendor ID

    # For network-connected UPS (SNMP):
    # driver = snmp-ups
    # port = 192.168.1.20
    # community = public
    # snmp_version = v1
EOF
```

## Configuring upsd

```bash
# Configure upsd to accept connections
sudo tee /etc/nut/upsd.conf << 'EOF'
# upsd configuration

# Listen on localhost only (standalone mode)
LISTEN 127.0.0.1 3493

# For network server mode, listen on all interfaces:
# LISTEN 0.0.0.0 3493

# Maximum number of connections
MAXCONN 15
EOF
```

## Creating UPS Users

```bash
# Configure users for upsd
sudo tee /etc/nut/upsd.users << 'EOF'
# upsd users

[upsmon_local]
    # Password for this user
    password = secure-local-password
    # This user is a monitoring client
    upsmon master

[upsmon_remote]
    # Remote monitoring clients use this account
    password = secure-remote-password
    upsmon slave
EOF

# Set restrictive permissions
sudo chmod 640 /etc/nut/upsd.users
sudo chown root:nut /etc/nut/upsd.users
```

## Configuring upsmon

```bash
# Configure upsmon monitoring behavior
sudo tee /etc/nut/upsmon.conf << 'EOF'
# UPS monitoring configuration

# Monitor the UPS: <name>@<host>[:<port>] <slaves> <user> <password> <type>
# slaves = 1 means this is the master (connected to UPS)
# slaves = 0 would mean this is a slave (network client)
MONITOR myups@localhost 1 upsmon_local secure-local-password master

# How many power supplies this system has
# (usually 1 for servers without dual PSU redundancy)
MINSUPPLIES 1

# Shutdown command when battery is critical
SHUTDOWNCMD "/sbin/shutdown -h +0"

# Notify command for events
NOTIFYCMD /usr/sbin/upssched

# Polling interval in seconds
POLLFREQ 5

# How long to wait before declaring communications lost
DEADTIME 15

# Where to write the PID file
POWERDOWNFLAG /etc/killpower

# Notification messages for different events
NOTIFYMSG ONLINE    "UPS %s on line power"
NOTIFYMSG ONBATT    "UPS %s on battery"
NOTIFYMSG LOWBATT   "UPS %s battery is low"
NOTIFYMSG FSD       "UPS %s: forced shutdown in progress"
NOTIFYMSG COMMOK    "Communications with UPS %s established"
NOTIFYMSG COMMBAD   "Communications with UPS %s lost"
NOTIFYMSG SHUTDOWN  "Auto logout and shutdown proceeding"
NOTIFYMSG REPLBATT  "UPS %s battery needs to be replaced"
NOTIFYMSG NOCOMM    "UPS %s is unavailable"

# What to do for each notification
NOTIFYFLAG ONLINE   SYSLOG+WALL
NOTIFYFLAG ONBATT   SYSLOG+WALL+EXEC
NOTIFYFLAG LOWBATT  SYSLOG+WALL+EXEC
NOTIFYFLAG FSD      SYSLOG+WALL+EXEC
NOTIFYFLAG COMMOK   SYSLOG
NOTIFYFLAG COMMBAD  SYSLOG+WALL
NOTIFYFLAG SHUTDOWN SYSLOG+WALL+EXEC
NOTIFYFLAG REPLBATT SYSLOG+WALL

# Battery charge level to trigger shutdown
RBWARNTIME 43200

# Remaining runtime (seconds) at which to initiate shutdown
HOSTSYNC 15

# Force shutdown after this many seconds if slaves don't respond
FINALDELAY 5
EOF

sudo chmod 640 /etc/nut/upsmon.conf
sudo chown root:nut /etc/nut/upsmon.conf
```

## Configuring upssched for Custom Actions

`upssched` lets you run commands on UPS events with optional delays:

```bash
sudo tee /etc/nut/upssched.conf << 'EOF'
# upssched configuration

# Command to execute on timer events
CMDSCRIPT /etc/nut/upssched-cmd

# Queue file
PIPEFN /run/nut/upssched.pipe
LOCKFN /run/nut/upssched.lock

# On battery: wait 30 seconds, then notify
AT ONBATT * START-TIMER onbatt 30

# If power returns before shutdown, cancel the timer
AT ONLINE * CANCEL-TIMER onbatt

# At low battery, immediately notify
AT LOWBATT * EXECUTE lowbatt
EOF

# Create the command script
sudo tee /etc/nut/upssched-cmd << 'EOF'
#!/bin/bash
# upssched command handler

case "$1" in
    onbatt)
        # Power has been on battery for 30 seconds - send alert
        logger "UPS: Power lost - running on battery"
        # Add your alert method here (email, webhook, etc.)
        ;;
    lowbatt)
        # Battery critically low - initiate shutdown
        logger "UPS: Battery low - initiating shutdown"
        /sbin/upsmon -c fsd
        ;;
    *)
        logger "upssched-cmd: unrecognized event: $1"
        ;;
esac
EOF

sudo chmod +x /etc/nut/upssched-cmd
```

## Starting NUT Services

```bash
# Start the UPS driver
sudo upsdrvctl start

# Start the UPS daemon
sudo systemctl start nut-server

# Start UPS monitoring
sudo systemctl start nut-client

# Enable all services on boot
sudo systemctl enable nut-driver.service
sudo systemctl enable nut-server.service
sudo systemctl enable nut-client.service

# Check status
systemctl status nut-server nut-client
```

## Querying UPS Status

```bash
# List available UPS devices
upsc -l

# Show all UPS variables
upsc myups@localhost

# Show specific variables
upsc myups@localhost ups.status
upsc myups@localhost battery.charge
upsc myups@localhost battery.runtime
upsc myups@localhost input.voltage
upsc myups@localhost ups.load

# Useful status codes:
# OL = on line power
# OB = on battery
# LB = low battery
# CHRG = charging
# DISCHRG = discharging

# Continuous monitoring
watch -n5 upsc myups@localhost
```

## Testing the Configuration

Before you need it in a real power outage, test the shutdown:

```bash
# Test communications
upsc myups@localhost ups.status

# Test the shutdown command (will actually shut down!)
# Only run this during a maintenance window
# sudo upsmon -c fsd

# Simulate a power event for testing (without actual shutdown)
# Check that notifications work
upscmd -u admin -p password myups beeper.enable  # if supported
```

## Monitoring Multiple Servers

For a setup where one server is directly connected to the UPS and others need to shut down first:

On the **NUT server** (connected to UPS), add to `upsd.conf`:
```text
LISTEN 0.0.0.0 3493
```

On **client servers**, set `nut.conf` to `MODE=netclient` and configure `upsmon.conf`:

```text
MONITOR myups@192.168.1.10 0 upsmon_remote secure-remote-password slave
```

Client servers have `0` power supplies connected to the UPS, making them slaves. They shut down before the master server, which shuts down last.

## Common Issues

```bash
# Check if UPS driver is communicating
sudo upsdrvctl start
sudo upsdrvctl status

# Check udev rules for USB device permissions
ls -la /dev/usb/
# NUT needs read/write access to the USB device

# Check NUT logs
journalctl -u nut-server -u nut-client --no-pager
cat /var/log/syslog | grep -i "nut\|ups"

# Verify the USB device is recognized
lsusb | grep -i ups
dmesg | tail -20
```

NUT provides reliable UPS monitoring that works with virtually all UPS brands. The extra 30 minutes it takes to set up and test beats discovering that your servers didn't gracefully shut down during a power event.
