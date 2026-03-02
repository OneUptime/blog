# How to Debug systemd Boot Issues on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, systemd, Boot, Troubleshooting

Description: A practical guide to diagnosing slow boot times and failed units during the Ubuntu startup process using systemd-analyze and journalctl.

---

Boot problems on Ubuntu range from services that fail to start, to boots that take an unexpectedly long time, to systems that do not reach the login prompt at all. systemd provides excellent tooling for analyzing and debugging these situations. This post covers the main approaches for diagnosing boot issues.

## Checking Boot Time

The first thing to understand about a slow boot is where the time is going:

```bash
# Show total boot time broken down by kernel, initrd, and userspace
systemd-analyze time
```

Example output:
```
Startup finished in 2.987s (firmware) + 1.234s (loader) + 5.567s (kernel) + 12.345s (initrd) + 23.456s (userspace) = 45.589s
graphical.target reached after 23.101s in userspace
```

This shows you which phase is slow. If the userspace time is high, drill into which services are causing delays.

## Finding Slow Services

```bash
# List services by startup time (slowest first)
systemd-analyze blame

# Show the 10 slowest units
systemd-analyze blame | head -20
```

Output example:
```
10.234s NetworkManager-wait-online.service
 5.678s snapd.service
 3.456s apt-daily-upgrade.service
 2.345s udisks2.service
 1.234s accounts-daemon.service
```

If you see `NetworkManager-wait-online.service` at the top, this is common. It waits for a network connection to be fully established. If you do not need this for boot:

```bash
# Disable the wait-online service if not needed
sudo systemctl disable NetworkManager-wait-online.service

# Or mask it to prevent anything from enabling it
sudo systemctl mask NetworkManager-wait-online.service
```

## Visualizing the Boot Chain

For a visual representation of what happens during boot and how units depend on each other:

```bash
# Generate an SVG chart of the boot sequence
systemd-analyze plot > /tmp/boot.svg

# Open with a browser or SVG viewer
xdg-open /tmp/boot.svg
```

The chart shows each unit as a bar, with the length representing its startup time and the position showing when it started relative to other units. This makes it easy to see which services are blocking others.

## Checking for Failed Units at Boot

```bash
# Show all currently failed units
systemctl --failed

# Show units that failed during the last boot
sudo journalctl -b -p err

# Show all errors and warnings from the last boot
sudo journalctl -b -p warning
```

The `-b` flag limits output to the current boot. Use `-b -1` for the previous boot, `-b -2` for two boots ago, and so on.

## Reading Boot Logs

```bash
# Show all journal entries from the last boot
sudo journalctl -b

# Show entries from the previous boot
sudo journalctl -b -1

# Show kernel messages from boot
sudo journalctl -b -k

# Show only error and worse from the last boot
sudo journalctl -b -p err

# Search for a specific service during boot
sudo journalctl -b -u networking.service
```

## Debugging a Service That Fails at Boot

When a service fails during boot, get its full log:

```bash
# Example: debugging a database service that failed at boot
sudo journalctl -b -u postgresql.service

# If you need context around the failure, add timestamps
sudo journalctl -b -u postgresql.service --no-pager
```

Common reasons services fail at boot:
1. Configuration file errors (check the app's own config validator)
2. Dependencies not ready yet (check `After=` and `Requires=` directives)
3. File system not mounted yet (check `RequiresMountsFor=`)
4. Incorrect permissions on files or directories
5. Network not available when the service expects it

## Adding Boot Debug Output

For diagnosing kernel-level boot problems, add `debug` to the kernel command line in GRUB:

```bash
# Edit GRUB configuration temporarily at boot
# Press 'e' at the GRUB menu, find the linux line, and add:
systemd.log_level=debug systemd.log_target=kmsg

# To see all logs including suppressed ones:
rd.systemd.log_level=debug
```

For a permanent change:

```bash
sudo tee -a /etc/default/grub << 'EOF'
# Add to GRUB_CMDLINE_LINUX for debug boots
EOF
sudo nano /etc/default/grub
# Add systemd.log_level=debug to GRUB_CMDLINE_LINUX_DEFAULT
sudo update-grub
```

## Checking Critical Chain

To find the bottleneck in the boot sequence - the chain of units that determined when the target was reached:

```bash
# Show the critical path to the default target
systemd-analyze critical-chain

# Show the critical path to a specific target
systemd-analyze critical-chain graphical.target

# Show critical chain for a specific unit
systemd-analyze critical-chain nginx.service
```

Example output:
```
graphical.target @23.101s
└─multi-user.target @23.101s
  └─nginx.service @22.890s +0.211s
    └─network.target @22.880s
      └─NetworkManager.service @5.123s +17.757s
```

The `+` value shows how long the unit took to start. The `@` value shows when it finished. This chain tells you that NetworkManager caused the 17-second delay.

## Emergency and Recovery Modes

When the system will not boot normally, the GRUB boot options give you recovery access.

### Rescue Mode

```bash
# At GRUB, append to kernel line:
systemd.unit=rescue.target

# Once in rescue mode, check the journal
journalctl -b --no-pager | grep -i "fail\|error\|crit"
```

### Emergency Mode

If even rescue mode does not load properly:

```bash
# At GRUB, append:
systemd.unit=emergency.target

# This gives you a root shell with read-only root filesystem
# Remount root read-write if you need to make changes
mount -o remount,rw /

# Fix issues and then exit
exit
```

### Skipping a Problematic Service at Boot

If you know which service is causing boot to hang, you can mask it temporarily:

```bash
# Boot to emergency mode, then mask the problematic service
systemctl mask problematic.service

# Reboot normally
systemctl reboot
```

## Debugging Unit File Issues

A syntactically invalid unit file can cause boot problems:

```bash
# Check all unit files for errors
sudo systemd-analyze verify /etc/systemd/system/*.service

# Check a specific unit file
sudo systemd-analyze verify /etc/systemd/system/myapp.service

# After any unit file change, check for errors before rebooting
sudo systemctl daemon-reload
sudo journalctl -p err -b
```

## Investigating Circular Dependencies

Circular dependencies cause systemd to abort starting the affected units:

```bash
# Check for cycle warnings in the journal
sudo journalctl -b | grep -i "cycle\|circular"

# Analyze dependencies for a unit
systemd-analyze dot nginx.service | dot -Tsvg > /tmp/nginx-deps.svg
```

The `dot` command requires graphviz:

```bash
sudo apt install graphviz
```

## Checking Masked Units

Sometimes a unit is masked (completely disabled) and causing dependent services to fail:

```bash
# List all masked units
systemctl list-units --state=masked

# Check if a specific unit is masked
systemctl status problematic.service | grep "Loaded:"
# Will show: Loaded: masked (...) if masked
```

## Persistent Boot Logs

By default on Ubuntu, journal logs are stored in `/var/log/journal/` if that directory exists, otherwise they are in `/run/log/journal/` and lost on reboot. Make sure journal logs persist:

```bash
# Create the directory to enable persistent logging
sudo mkdir -p /var/log/journal/
sudo systemd-tmpfiles --create --prefix /var/log/journal

# Verify persistence is enabled
journalctl --disk-usage

# List available boots
journalctl --list-boots
```

With persistent logs, you can compare current and previous boot times:

```bash
# Check how boot times have changed over recent boots
for i in -3 -2 -1 0; do
    echo "Boot $i:"
    journalctl -b $i --no-pager | grep "Startup finished" || echo "  (no data)"
done
```

## Summary

Debugging systemd boot issues follows a clear progression: start with `systemd-analyze time` to see where time is spent, use `systemd-analyze blame` and `critical-chain` to identify slow units, then use `journalctl -b -p err` to find failures. For systems that will not boot, GRUB's rescue and emergency modes give you a shell to diagnose and fix problems. Keep journal persistence enabled so you have historical boot data to compare against.
