# How to Switch AppArmor Profiles Between Enforce and Complain Mode on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, AppArmor, Security, System Administration

Description: Learn how to switch AppArmor profiles between enforce and complain modes on Ubuntu, load and unload profiles, and use complain mode for safe profile development and troubleshooting.

---

AppArmor profiles operate in one of several modes. Enforce mode actively blocks unauthorized operations. Complain mode logs violations without blocking them. Knowing how to switch between modes is essential when developing new profiles, troubleshooting application problems, or gradually rolling out security policies.

## Understanding AppArmor Modes

**Enforce mode** - The profile is active and enforced. Any operation not explicitly allowed in the profile is blocked and logged. This is the correct state for production systems.

**Complain mode** - Also called learning mode. The profile is loaded but violations are only logged, not blocked. The application runs without restrictions. Useful for initial profile development and troubleshooting.

**Disabled** - The profile is not loaded at all. The application runs without any AppArmor confinement.

**Audit mode** - A sub-mode where allowed operations are also logged (in addition to denied ones). Useful for understanding exactly what an application is doing.

## Checking Current Profile Modes

```bash
# View all profiles and their modes
sudo aa-status

# Filter to see just enforce mode profiles
sudo aa-status | grep "enforce mode" -A 100 | grep "^   "

# Filter to see just complain mode profiles
sudo aa-status | grep "complain mode" -A 100 | grep "^   "

# Check a specific profile's mode
sudo aa-status | grep nginx

# Check from the kernel directly
sudo cat /sys/kernel/security/apparmor/profiles | grep nginx
# Output: /usr/sbin/nginx (enforce)
```

## Switching a Profile to Complain Mode

The `aa-complain` command switches a profile to complain mode:

```bash
# Switch nginx profile to complain mode
sudo aa-complain /usr/sbin/nginx

# Or specify the profile file directly
sudo aa-complain /etc/apparmor.d/usr.sbin.nginx

# Switch multiple profiles at once
sudo aa-complain /usr/sbin/nginx /usr/sbin/apache2

# Switch all loaded profiles to complain mode
sudo aa-complain /etc/apparmor.d/*

# Verify the change
sudo aa-status | grep nginx
# Should now show: /usr/sbin/nginx in complain mode
```

## Switching a Profile Back to Enforce Mode

```bash
# Switch nginx back to enforce mode
sudo aa-enforce /usr/sbin/nginx

# Or via the profile file path
sudo aa-enforce /etc/apparmor.d/usr.sbin.nginx

# Switch all profiles back to enforce mode
sudo aa-enforce /etc/apparmor.d/*

# Verify
sudo aa-status | grep nginx
# Should show: /usr/sbin/nginx in enforce mode
```

## Disabling a Profile

Disabling removes the profile from the kernel entirely. The application runs completely unconfined:

```bash
# Disable a profile
# This creates a symlink in /etc/apparmor.d/disable/ and unloads the profile
sudo aa-disable /etc/apparmor.d/usr.sbin.nginx

# Verify it was disabled
sudo aa-status | grep nginx
# nginx should no longer appear in the list

# Check the disable symlink was created
ls -la /etc/apparmor.d/disable/

# Re-enable a disabled profile
# Remove the symlink and reload the profile
sudo rm /etc/apparmor.d/disable/usr.sbin.nginx
sudo apparmor_parser -r /etc/apparmor.d/usr.sbin.nginx
sudo aa-status | grep nginx
```

## Loading and Reloading Profiles

When you create or modify a profile file, you need to load it:

```bash
# Load a new profile file
sudo apparmor_parser -a /etc/apparmor.d/usr.sbin.mynewapp

# Reload an existing profile (applies changes)
sudo apparmor_parser -r /etc/apparmor.d/usr.sbin.nginx

# Reload all profiles (useful after system updates)
sudo systemctl reload apparmor
# Or
sudo service apparmor reload

# Remove (unload) a profile from the kernel
sudo apparmor_parser -R /etc/apparmor.d/usr.sbin.nginx
```

## Using Complain Mode for Profile Development

The typical workflow when creating a profile for a new application:

```bash
# Step 1: Generate an initial profile using aa-genprof
# This starts the application and records what it accesses
sudo aa-genprof /usr/local/bin/myapp

# aa-genprof will:
# 1. Set the app to complain mode
# 2. Ask you to run the application through its normal use cases
# 3. Help you build rules from what it observed

# Step 2: If you already have a profile, put it in complain mode first
sudo aa-complain /usr/local/bin/myapp

# Step 3: Run the application through all its normal operations
# This generates log entries showing what access is needed
sudo -u www-data /usr/local/bin/myapp --run-tasks

# Step 4: Use aa-logprof to review violations and update the profile
sudo aa-logprof

# aa-logprof reads the logs and suggests rules to add to the profile
# You review each suggestion and accept or reject

# Step 5: Switch to enforce mode once the profile is refined
sudo aa-enforce /usr/local/bin/myapp
```

## Monitoring Complain Mode Violations

In complain mode, violations are logged but not blocked. Monitor these to understand what a profile needs:

```bash
# View recent AppArmor events (both allows and denials in audit mode)
sudo journalctl -k | grep "apparmor" | tail -50

# Filter for specific application
sudo journalctl -k | grep 'profile="/usr/sbin/nginx"' | tail -20

# Watch in real time
sudo journalctl -k -f | grep "apparmor"

# Use aa-notify for a summary of recent events
# -p: print events, -s 1: start from 1 day ago, -f: log file
sudo aa-notify -p -s 1 -f /var/log/syslog 2>/dev/null

# Parse audit log if auditd is installed
sudo ausearch -m AVC -ts today | grep apparmor
```

## Creating a New Profile from Scratch

```bash
# Method 1: Use aa-genprof (interactive)
sudo aa-genprof /usr/local/bin/myapp

# Method 2: Use aa-easyprof for a quick starting template
sudo apt install apparmor-easyprof

# Generate a template profile
sudo aa-easyprof /usr/local/bin/myapp

# The template gives you the structure; customize it for your app
```

A minimal profile template:

```bash
# Create a new profile file
sudo tee /etc/apparmor.d/usr.local.bin.myapp << 'EOF'
#include <tunables/global>

/usr/local/bin/myapp {
    #include <abstractions/base>

    # Allow read access to the application's config
    /etc/myapp/** r,

    # Allow write access to the log directory
    /var/log/myapp/ rw,
    /var/log/myapp/** rw,

    # Allow read access to the data directory
    /var/lib/myapp/** r,

    # Network access
    network inet stream,
    network inet6 stream,
}
EOF

# Load the profile in complain mode first to test it
sudo apparmor_parser -a /etc/apparmor.d/usr.local.bin.myapp
sudo aa-complain /usr/local/bin/myapp

# Run the application and observe what it needs
# Then use aa-logprof to refine the profile
sudo aa-logprof

# Once satisfied, switch to enforce
sudo aa-enforce /usr/local/bin/myapp
```

## Bulk Mode Changes

For managing multiple profiles during an audit or deployment:

```bash
#!/bin/bash
# manage-apparmor-modes.sh - Switch profiles between modes

ACTION="${1:-status}"  # status, enforce, complain, or disable

case "$ACTION" in
    status)
        echo "=== AppArmor Profile Modes ==="
        sudo aa-status 2>/dev/null | grep -E "in enforce mode|in complain mode" -A 100 | \
            grep -E "^  [^ ]"
        ;;
    enforce-all)
        echo "Switching all profiles to enforce mode..."
        sudo aa-enforce /etc/apparmor.d/* 2>/dev/null
        echo "Done"
        ;;
    complain-all)
        echo "Switching all profiles to complain mode..."
        sudo aa-complain /etc/apparmor.d/* 2>/dev/null
        echo "Done"
        ;;
    *)
        echo "Usage: $0 [status|enforce-all|complain-all]"
        ;;
esac
```

## Handling Profiles During Package Updates

When packages update, their AppArmor profiles may change:

```bash
# After a package update, reload affected profiles
sudo apt upgrade nginx
sudo apparmor_parser -r /etc/apparmor.d/usr.sbin.nginx

# Or reload all profiles
sudo systemctl reload apparmor

# Check if the reload brought in any new profiles
sudo aa-status | grep -E "profiles are loaded"
```

## Troubleshooting: Profile Switches Don't Take Effect

```bash
# If aa-complain or aa-enforce seems to have no effect, check for caching
sudo systemctl restart apparmor

# Verify the profile is actually loaded with the right mode
sudo cat /sys/kernel/security/apparmor/profiles | grep <appname>

# Check for profile errors preventing the switch
sudo apparmor_parser -p /etc/apparmor.d/usr.sbin.nginx
# No output = no errors

# Check journal for AppArmor errors
sudo journalctl -u apparmor --since "5 minutes ago"
```

## Understanding flags=(complain) in Profile Files

Complain mode can also be set directly in the profile file using flags:

```
# This profile starts in complain mode by default
/usr/local/bin/myapp flags=(complain) {
    #include <abstractions/base>
    # ... rules
}
```

This is useful for distributing profiles that default to complain mode until administrators explicitly switch them to enforce:

```bash
# Check if a profile has complain flag in the file
grep "flags=(complain)" /etc/apparmor.d/usr.local.bin.myapp

# Remove the flag and reload to switch to enforce
sudo sed -i 's/flags=(complain)//' /etc/apparmor.d/usr.local.bin.myapp
sudo apparmor_parser -r /etc/apparmor.d/usr.local.bin.myapp
```

## Summary

Switching AppArmor profile modes is done with `aa-complain` (to log-only mode) and `aa-enforce` (to active enforcement). Use complain mode when developing profiles or troubleshooting application issues - it lets the application run without restrictions while logging what would have been denied. The `aa-logprof` tool reads those logs and suggests profile rules. Once a profile covers all legitimate application behavior, switch it to enforce mode. Keep an eye on your AppArmor logs even in enforce mode to catch any unexpected denials that might indicate a misconfigured profile or a compromised process attempting unauthorized access.
