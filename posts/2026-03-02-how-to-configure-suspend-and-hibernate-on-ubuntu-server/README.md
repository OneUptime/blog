# How to Configure Suspend and Hibernate on Ubuntu Server

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Suspend, Hibernate, Power Management, Server

Description: A guide to configuring suspend (sleep) and hibernate states on Ubuntu Server, including systemd-sleep, wake triggers, and deciding whether these features are appropriate for your servers.

---

Suspend and hibernate are power-saving sleep states that make sense on laptops and desktop workstations, but their applicability to server environments is more nuanced. On edge servers, small office servers, or development machines that run Ubuntu Server, these features can reduce power consumption during off-hours. On production data center servers, they're usually disabled to ensure availability. This guide covers how both states work and how to configure them.

## Understanding Sleep States

Linux exposes several sleep states through the ACPI interface:

- **S1 (standby)** - CPU clock stopped, memory powered, fast wake
- **S3 (suspend to RAM)** - system state saved to RAM, most components powered off, fast wake (seconds)
- **S4 (suspend to disk / hibernate)** - system state written to swap on disk, complete power off, slow wake (30+ seconds)
- **S5 (soft-off)** - powered off but AC still connected, requires full boot

On modern hardware, `suspend` typically refers to S3 (suspend to RAM), and `hibernate` refers to S4 (suspend to disk).

## Checking Available Sleep States

```bash
# Check which sleep states the hardware supports
cat /sys/power/state

# Example output:
# freeze mem disk

# Check available hibernate modes
cat /sys/power/disk

# Check current sleep mode settings
cat /sys/power/mem_sleep
# s2idle [deep]   <- deep is selected (brackets)

# Available sleep mode options
# s2idle = suspend to idle (software freeze only, shallower but faster)
# deep = S3 (traditional suspend to RAM)
```

## Manually Triggering Suspend/Hibernate

```bash
# Suspend to RAM (S3)
sudo systemctl suspend

# Hibernate to disk (S4 - requires configured swap space)
sudo systemctl hibernate

# Hybrid sleep (writes to disk AND keeps RAM powered)
# Can restore from disk if power is lost during sleep
sudo systemctl hybrid-sleep

# Suspend then hibernate (suspends first, hibernates if sleep is too long)
sudo systemctl suspend-then-hibernate
```

## Configuring Hibernate

Hibernate requires a swap partition or swap file large enough to hold all of RAM's contents.

### Checking Swap Configuration

```bash
# Check available swap
swapon --show
free -h

# Ensure swap is at least as large as RAM
RAMSIZE=$(free -b | awk '/Mem:/{print $2}')
SWAPSIZE=$(free -b | awk '/Swap:/{print $2}')

if [ "$SWAPSIZE" -lt "$RAMSIZE" ]; then
    echo "Swap ($SWAPSIZE bytes) is smaller than RAM ($RAMSIZE bytes)"
    echo "Hibernate may not work correctly"
fi
```

### Setting Up a Swap File for Hibernate

If you're using a swap file rather than a swap partition:

```bash
# Check current swap file location
swapon --show | grep file

# Get the UUID of the filesystem containing swap
# (needed for kernel resume parameter)
SWAP_FILE=$(swapon --show --noheadings --raw | awk '{print $1}')
SWAP_DEVICE=$(df "$SWAP_FILE" | tail -1 | awk '{print $1}')
SWAP_UUID=$(blkid -o value -s UUID "$SWAP_DEVICE")

# Get the offset of the swap file (needed for resume_offset)
SWAP_OFFSET=$(sudo filefrag -v "$SWAP_FILE" | awk 'NR==4{print $4}' | tr -d '.')

echo "UUID: $SWAP_UUID"
echo "Offset: $SWAP_OFFSET"
```

Configure the kernel to resume from this swap file:

```bash
# Add to GRUB kernel parameters
sudo nano /etc/default/grub

# Add resume parameters
GRUB_CMDLINE_LINUX="resume=UUID=your-uuid resume_offset=your-offset"

sudo update-grub
```

### Testing Hibernate

```bash
# Test hibernate (WARNING: system will shut down and restart)
sudo systemctl hibernate

# After resume, check if everything is working correctly
systemctl status
dmesg | tail -20
```

## Configuring systemd-sleep Behavior

systemd handles suspend and hibernate through `systemd-sleep`. Configure timing and behavior:

```bash
# Configure sleep settings
sudo nano /etc/systemd/sleep.conf
```

```ini
[Sleep]
# Whether suspend is allowed
AllowSuspend=yes

# Whether hibernate is allowed
AllowHibernation=no    # Disable for servers

# Whether hybrid-sleep is allowed
AllowHybridSleep=no

# Whether suspend-then-hibernate is allowed
AllowSuspendThenHibernate=no

# Time to stay in suspend before switching to hibernate
# (for suspend-then-hibernate mode)
HibernateDelaySec=180min

# Hibernate mode: platform, shutdown, reboot, suspend, test-suspend
HibernateMode=platform

# Suspend mode: suspend, freeze, standby
SuspendMode=

# Sleep state to use for suspend
SuspendState=mem freeze

# Sleep state to use for hibernate
HibernateState=disk

# Sleep state to use for hybrid-sleep
HybridSleepMode=suspend platform shutdown
HybridSleepState=disk
```

## Preventing Automatic Suspend

On servers, you want to prevent automatic suspend from occurring:

```bash
# Via systemd-logind
sudo tee /etc/systemd/logind.conf.d/no-suspend.conf << 'EOF'
[Login]
# Disable idle suspend
IdleAction=ignore
IdleActionSec=0

# Ignore power button
HandlePowerKey=ignore

# Ignore suspend key
HandleSuspendKey=ignore

# Ignore lid close (if a laptop)
HandleLidSwitch=ignore
HandleLidSwitchDocked=ignore
HandleLidSwitchExternalPower=ignore
EOF

sudo systemctl restart systemd-logind
```

### Disabling Sleep via systemd mask

Completely prevent suspend and hibernate from being triggered:

```bash
# Mask sleep targets
sudo systemctl mask sleep.target
sudo systemctl mask suspend.target
sudo systemctl mask hibernate.target
sudo systemctl mask hybrid-sleep.target

# Verify they're masked
systemctl status sleep.target
# Loaded: masked (/dev/null; vendor preset: enabled)

# To re-enable
sudo systemctl unmask sleep.target
sudo systemctl unmask suspend.target
sudo systemctl unmask hibernate.target
sudo systemctl unmask hybrid-sleep.target
```

## Wake-on Events Configuration

For systems that use suspend, configuring reliable wake conditions is important.

### Wake from RTC Timer

```bash
# Schedule a wake time before suspending
sudo rtcwake -m mem -t $(date +%s -d "+4 hours")

# This suspends the system and wakes it in 4 hours
```

### Wake from Network (WoL)

```bash
# Enable Wake-on-LAN
sudo ethtool -s eth0 wol g

# Verify
sudo ethtool eth0 | grep Wake-on

# WoL must also be enabled in BIOS
```

### Configure systemd-sleep Hooks

Run custom scripts before or after suspend/resume:

```bash
# Create hook directory
sudo mkdir -p /etc/systemd/system-sleep/

# Create a hook script
sudo tee /etc/systemd/system-sleep/my-hook.sh << 'EOF'
#!/bin/bash
# Called by systemd-sleep before and after sleep

case "$1" in
    pre)
        # Called before going to sleep
        echo "Preparing to sleep" | systemd-cat -t "sleep-hook"

        # Flush caches
        sync

        # Stop non-critical services before sleeping
        # systemctl stop myapp
        ;;

    post)
        # Called after waking from sleep
        echo "Woke from sleep" | systemd-cat -t "sleep-hook"

        # Restart services that don't recover cleanly
        # systemctl restart myapp

        # Sync time (system clock may have drifted)
        systemctl restart systemd-timesyncd
        ;;
esac
EOF

sudo chmod +x /etc/systemd/system-sleep/my-hook.sh
```

## Suspend on Servers: When It Makes Sense

Suspend can be appropriate for:

**Edge servers and remote sites:** Small servers (mini PCs, NUCs) that run services during business hours can suspend overnight, reducing power and heat. Use RTC wake to bring them up before the workday.

**Development and test servers:** Servers that aren't needed nights and weekends can suspend rather than run idle.

**Batch processing servers:** Servers that run overnight jobs can hibernate during the day.

**Not appropriate for:**
- Production web/application servers (users expect availability)
- Database servers (inconsistent state during suspend)
- Monitoring systems
- Any server that receives traffic directly

## Troubleshooting Suspend Issues

```bash
# Check if suspend is failing
journalctl -b -u systemd-sleep

# Check for processes preventing sleep
systemd-inhibit --list

# A process holding a sleep inhibitor will prevent suspend
# Find and stop it if needed

# Test suspend with verbose output
sudo systemctl isolate sleep.target

# Check wake reason after resume
dmesg | grep -E "wake|ACPI|resume" | tail -20

# Check kernel suspend log
cat /sys/power/pm_trace

# Check for failed resume
journalctl -b -p err | head -20
```

## Managing Suspend for Office Hours

Schedule suspend and wake for a typical workday pattern:

```bash
# Script: schedule-sleep.sh
# Suspends at end of day, wakes before start

#!/bin/bash
WAKE_TIME="07:30 tomorrow"

# Set RTC wake alarm
WAKE_EPOCH=$(date -d "$WAKE_TIME" +%s)
echo 0 | sudo tee /sys/class/rtc/rtc0/wakealarm
echo $WAKE_EPOCH | sudo tee /sys/class/rtc/rtc0/wakealarm

echo "Suspending. Will wake at $(date -d @$WAKE_EPOCH)"
sudo systemctl suspend
```

```bash
# Cron to run at 20:00 on weekdays
echo "0 20 * * 1-5 root /usr/local/bin/schedule-sleep.sh" | \
    sudo tee /etc/cron.d/schedule-suspend
```

For production servers, the default behavior - staying powered on and available - is almost always correct. But for the right use cases, suspend and hibernate provide meaningful power savings while maintaining the ability to quickly resume full operation.
