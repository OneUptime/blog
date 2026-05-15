# How to Configure Suspend and Hibernate Modes on RHEL with systemd

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Suspend, Hibernate, Systemd, Power Management, Linux

Description: Configure suspend-to-RAM, suspend-to-disk (hibernate), and hybrid sleep modes on RHEL using systemd for power management on laptops and workstations.

---

RHEL supports multiple sleep states through systemd: suspend (suspend-to-RAM), hibernate (suspend-to-disk), and hybrid-sleep. These are useful for laptops and workstations where you want to save power while preserving the running session.

## Check Available Sleep States

```bash
# List the sleep states supported by your hardware

cat /sys/power/state
# Common output: freeze mem disk

# Check if systemd supports each mode
systemctl status sleep.target suspend.target hibernate.target hybrid-sleep.target
```

## Suspend (Suspend-to-RAM)

Suspend saves the system state to RAM and puts the machine into a low-power state. Resume is fast (a few seconds).

```bash
# Suspend the system immediately
sudo systemctl suspend

# Check if suspend is working by reviewing the journal after wake
journalctl -b -u systemd-suspend.service
```

## Configure Hibernate (Suspend-to-Disk)

Hibernate saves the system state to swap space and powers off completely. It requires a swap partition or file large enough to hold the hibernation image; many systems size swap at least as large as RAM.

### Set Up Swap Space

```bash
# Check current swap
swapon --show

# If swap is too small, create a swap file
sudo dd if=/dev/zero of=/swapfile bs=1M count=8192 status=progress
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make the swap file permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Configure the Resume Device

```bash
# For a swap partition, find its UUID
sudo blkid -s UUID -o value /dev/your-swap-partition

# For a swap file, find the UUID of the filesystem containing it
findmnt -no UUID -T /swapfile

# For a swap file, also find the first physical offset in PAGE_SIZE units
sudo filefrag -v -b$(getconf PAGESIZE) /swapfile | awk '$1=="0:" {print $4}' | cut -d. -f1

# Add resume parameters to the kernel boot command for a swap partition
sudo grubby --update-kernel=ALL \
  --args="resume=UUID=your-swap-uuid"

# Or, for a swap file, include the filesystem UUID and resume offset
sudo grubby --update-kernel=ALL \
  --args="resume=UUID=your-filesystem-uuid resume_offset=your-offset"

# Regenerate initramfs to include the resume module
sudo dracut -f

# Reboot to apply
sudo reboot
```

### Test Hibernate

```bash
# Hibernate the system
sudo systemctl hibernate

# After powering on, the system should restore the previous session
# Verify by checking the journal
journalctl -b -u systemd-hibernate.service
```

## Hybrid Sleep

Hybrid sleep combines suspend and hibernate: the state is saved to both RAM and disk. If power is maintained, resume is fast. If power is lost, the system recovers from disk.

```bash
# Enter hybrid sleep
sudo systemctl hybrid-sleep
```

## Configure Lid Close Behavior

```bash
# Edit the logind configuration
sudo vi /etc/systemd/logind.conf

# Set what happens when the laptop lid is closed
# Options: ignore, poweroff, reboot, halt, suspend, hibernate, hybrid-sleep, lock
```

```ini
# /etc/systemd/logind.conf
[Login]
HandleLidSwitch=suspend
HandleLidSwitchExternalPower=ignore
HandleLidSwitchDocked=ignore
```

```bash
# Restart logind to apply
sudo systemctl restart systemd-logind
```

## Troubleshooting

```bash
# Test suspend/hibernate with verbose logging
sudo systemctl suspend
journalctl -b -1 | grep -i "suspend\|resume\|sleep"

# Check for devices preventing suspend
cat /proc/acpi/wakeup

# Disable a device from waking the system
echo XHC1 | sudo tee /proc/acpi/wakeup
```

Properly configured sleep states save power and provide a convenient workflow for RHEL laptop and workstation users.
