# How to Check AppArmor Status and Loaded Profiles on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, AppArmor, Security, System Administration

Description: Learn how to check AppArmor status, view loaded profiles, and understand profile modes on Ubuntu to verify your mandatory access control configuration is working correctly.

---

AppArmor is Ubuntu's default Mandatory Access Control (MAC) system. It confines programs to a set of allowed resources and actions, limiting the damage an exploited process can cause. Understanding how to check AppArmor's status and inspect loaded profiles is essential for both system administrators managing security configurations and developers troubleshooting application permission issues.

## What Is AppArmor?

AppArmor works at the kernel level, intercepting system calls and checking them against policy profiles. Each profile specifies what files, capabilities, and network operations a program is allowed to use. If a program tries to access something not in its profile, AppArmor either blocks the operation (enforce mode) or logs it (complain mode).

Ubuntu ships with AppArmor enabled and profiles for many common services: nginx, apache2, mysqld, sshd, cups, and others. Docker also uses AppArmor by default for container confinement.

## Checking Whether AppArmor Is Running

```bash
# Check AppArmor service status
sudo systemctl status apparmor

# Quick check: is AppArmor enabled in the kernel?
sudo aa-status --enabled
# Returns exit code 0 if enabled, non-zero if not

# Check if AppArmor module is loaded
lsmod | grep apparmor
# Output: apparmor   xxxxxx  x

# Check kernel command line for AppArmor parameter
cat /proc/cmdline | grep apparmor
# Should show: apparmor=1 security=apparmor (or similar)
```

## Viewing the Overall AppArmor Status

```bash
# Show comprehensive status summary
sudo aa-status
```

The output shows:

```text
apparmor module is loaded.
XX profiles are loaded.
XX profiles are in enforce mode.
   /usr/bin/evince
   /usr/bin/firefox
   /usr/sbin/nginx
   ...
XX profiles are in complain mode.
   /usr/bin/freshclam
   ...
XX profiles are in kill mode.
XX processes have profiles defined.
XX processes are in enforce mode.
   /usr/sbin/mysqld (1234)
XX processes are in complain mode.
XX processes are unconfined but have a profile defined.
```

Key sections to understand:
- **Profiles loaded** - total count of profiles the kernel knows about
- **Enforce mode** - profiles actively blocking unauthorized access
- **Complain mode** - profiles only logging (not blocking) violations
- **Processes in enforce mode** - running processes confined by an enforce-mode profile

## Listing All Loaded Profiles

```bash
# List all profiles and their current mode
sudo apparmor_status

# Or use aa-status with parseable output
sudo aa-status --pretty-print

# View raw profile information from the kernel
sudo cat /sys/kernel/security/apparmor/profiles | sort

# Output format: profile-name (mode)
# /usr/sbin/nginx (enforce)
# /usr/bin/firefox (enforce)
# /usr/bin/freshclam (complain)
```

## Checking Specific Profile Status

```bash
# Check the status of a specific application's profile
sudo aa-status | grep -i nginx
sudo aa-status | grep -i mysql
sudo aa-status | grep -i sshd

# Check if a running process is confined
# Get the PID first
pgrep nginx
# Then check its confinement
cat /proc/<PID>/attr/current
# Output: "nginx" (enforce)  - confined
# Output: unconfined         - not confined

# Check all running processes and their confinement
ps aux | while read -r line; do
    pid=$(echo "$line" | awk '{print $2}')
    if [[ -f "/proc/$pid/attr/current" ]]; then
        status=$(cat "/proc/$pid/attr/current" 2>/dev/null)
        if [[ "$status" != "unconfined" && -n "$status" ]]; then
            echo "PID $pid: $status"
        fi
    fi
done
```

## Viewing Profile Files

AppArmor profile files are stored in `/etc/apparmor.d/`:

```bash
# List all profile files
ls -la /etc/apparmor.d/

# View a specific profile file
sudo cat /etc/apparmor.d/usr.sbin.nginx

# View profiles in the "abstractions" directory
# These are reusable snippet files included by profiles
ls /etc/apparmor.d/abstractions/

# Find the profile for a specific binary
sudo ls /etc/apparmor.d/ | grep -i nginx
```

A typical profile file looks like:

```text
# /etc/apparmor.d/usr.sbin.nginx

#include <tunables/global>

/usr/sbin/nginx flags=(attach_disconnected,mediate_deleted) {
    #include <abstractions/base>
    #include <abstractions/nameservice>
    #include <abstractions/openssl>

    capability dac_override,
    capability dac_read_search,
    capability net_bind_service,
    capability setgid,
    capability setuid,

    /etc/nginx/** r,
    /var/log/nginx/** w,
    /var/www/** r,
    /run/nginx.pid rw,

    deny /etc/shadow r,
}
```

## Checking AppArmor Denials in Logs

When AppArmor blocks an operation, it logs it. This is how you find out what's being denied:

```bash
# View AppArmor denials in the system log
sudo dmesg | grep -i "apparmor.*DENIED"

# View via journalctl
sudo journalctl -k | grep -i "apparmor.*DENIED"

# View the audit log if auditd is running
sudo grep "apparmor.*DENIED" /var/log/syslog

# Follow denials in real time
sudo journalctl -k -f | grep -i "apparmor"

# Use aa-notify (provides desktop notifications for denials)
sudo aa-notify -p -s 1 -w 60 -f /var/log/syslog
```

Example denial log entry:

```text
Mar 02 10:15:30 server kernel: audit: type=1400 audit(1234567890.123:45): apparmor="DENIED" operation="open" profile="/usr/sbin/nginx" name="/etc/shadow" pid=1234 comm="nginx" requested_mask="r" denied_mask="r" fsuid=33 ouid=0
```

This shows nginx tried to read `/etc/shadow` and was denied.

## Viewing Profile Load Errors

```bash
# Check for profile parsing or loading errors
sudo journalctl -u apparmor --since "1 hour ago"

# Test if a profile file is syntactically valid without loading it
sudo apparmor_parser -p /etc/apparmor.d/usr.sbin.nginx

# Load a profile manually and check for errors
sudo apparmor_parser -r /etc/apparmor.d/usr.sbin.nginx

# Verbose profile loading (shows what's being processed)
sudo apparmor_parser -v -r /etc/apparmor.d/usr.sbin.nginx
```

## Checking Docker Container Confinement

By default, Docker applies the `docker-default` AppArmor profile to containers:

```bash
# Check the AppArmor profile for a running container
docker inspect <container-id> | grep -i apparmor

# Output:
# "AppArmorProfile": "docker-default"

# View the docker-default profile
sudo cat /etc/apparmor.d/docker-default

# Check if the profile is loaded
sudo aa-status | grep docker
```

## Checking AppArmor Kernel Parameters

```bash
# Check AppArmor kernel parameters
sudo cat /sys/module/apparmor/parameters/enabled
# Output: Y (enabled) or N (disabled)

# Check AppArmor audit mode
sudo cat /sys/module/apparmor/parameters/audit
# Output: normal

# Check AppArmor mode (enforce or complain at global level)
sudo cat /sys/module/apparmor/parameters/mode
```

## Summary Report Script

```bash
#!/bin/bash
# apparmor-report.sh - Generate an AppArmor status summary

echo "=== AppArmor Status Report ==="
echo "Generated: $(date)"
echo ""

# Overall status
echo "--- Module Status ---"
if sudo aa-status --enabled 2>/dev/null; then
    echo "AppArmor: ENABLED"
else
    echo "AppArmor: DISABLED"
    exit 0
fi

echo ""
echo "--- Profile Summary ---"
sudo aa-status 2>/dev/null | grep -E "profiles are|processes"

echo ""
echo "--- Recent Denials (last 24h) ---"
DENIALS=$(sudo journalctl -k --since "24 hours ago" 2>/dev/null | grep -c "apparmor.*DENIED")
echo "Total denials: $DENIALS"

if [[ $DENIALS -gt 0 ]]; then
    echo ""
    echo "--- Top Denied Operations ---"
    sudo journalctl -k --since "24 hours ago" 2>/dev/null | \
        grep "apparmor.*DENIED" | \
        awk -F'"' '{print $4}' | \
        sort | uniq -c | sort -rn | head -10
fi
```

## Summary

AppArmor status checking centers on two main commands: `sudo aa-status` for a comprehensive overview of loaded profiles and process confinement, and `sudo journalctl -k | grep "apparmor.*DENIED"` for finding what is being blocked. Profile files live in `/etc/apparmor.d/` and can be inspected directly. Running processes can be checked individually via `/proc/<PID>/attr/current`. Understanding the distinction between enforce mode (actively blocking) and complain mode (only logging) is key to interpreting the status output and deciding whether AppArmor is actually protecting your system.
