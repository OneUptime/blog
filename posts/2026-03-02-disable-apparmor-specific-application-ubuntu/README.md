# How to Disable AppArmor for a Specific Application on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, AppArmor, Security, Linux

Description: Step-by-step guide to disabling AppArmor for a specific application on Ubuntu without turning off the entire AppArmor system.

---

There are situations where you need to disable AppArmor restrictions for a single application - maybe you're developing a custom tool, running a third-party binary that ships without a profile, or temporarily working around a profile that's too restrictive. Whatever the reason, the right approach is to disable AppArmor for that one application, not the whole system.

This post covers several methods for doing that safely.

## Understanding AppArmor Profile States

AppArmor profiles can be in three states:

- **enforce** - the profile is active and access violations are blocked
- **complain** - violations are logged but not blocked (useful for debugging)
- **disabled** - the profile is not loaded at all

Disabling a profile completely means the application runs without any AppArmor restrictions. This is different from complain mode, which still tracks everything.

## Check Which Profiles Are Loaded

Before making changes, check the current state of profiles:

```bash
# List all loaded profiles with their status
sudo aa-status

# Show just profile names and modes
sudo aa-status | grep -E "(enforce|complain|unconfined)"

# Check if a specific application has a profile
sudo aa-status | grep nginx
sudo aa-status | grep mysql
```

## Method 1: Use aa-disable (Recommended)

The `aa-disable` command from `apparmor-utils` is the cleanest way to disable a profile:

```bash
# Install apparmor-utils if needed
sudo apt install apparmor-utils

# Disable AppArmor for a specific application
# The argument is the profile file path, not the binary path
sudo aa-disable /usr/sbin/nginx

# Disable for MySQL
sudo aa-disable /usr/sbin/mysqld

# Disable for cups (print daemon)
sudo aa-disable /usr/lib/cups/backend/cups-pdf
```

`aa-disable` creates a symlink from the profile file to `/dev/null` in `/etc/apparmor.d/disable/`, which tells AppArmor to skip that profile on next load.

### Verify It Worked

```bash
# Check that the disable symlink was created
ls -la /etc/apparmor.d/disable/

# Confirm the profile is no longer in enforce/complain mode
sudo aa-status | grep nginx
```

After running `aa-disable`, you need to either reload AppArmor or reboot for the change to take effect on a running system:

```bash
# Reload AppArmor to apply the disable immediately
sudo systemctl reload apparmor

# Or reload a specific profile
sudo apparmor_parser -R /etc/apparmor.d/usr.sbin.nginx
```

The `-R` flag removes (unloads) the profile from the kernel.

## Method 2: Set Profile to Complain Mode

If you want to still track what the application does without blocking it, use complain mode instead of fully disabling:

```bash
# Put nginx profile in complain mode
sudo aa-complain /usr/sbin/nginx

# Or reference the profile file directly
sudo aa-complain /etc/apparmor.d/usr.sbin.nginx

# Verify
sudo aa-status | grep nginx
```

The difference between complain and disabled:
- Complain: AppArmor profile is loaded, violations are logged, nothing is blocked
- Disabled: AppArmor profile is not loaded, application runs completely unrestricted

For most troubleshooting scenarios, complain mode is the safer option.

## Method 3: Manually Unload the Profile

You can remove a profile from the kernel directly using `apparmor_parser`:

```bash
# Remove (unload) the nginx profile from the running kernel
sudo apparmor_parser -R /etc/apparmor.d/usr.sbin.nginx

# Confirm it's gone
sudo aa-status | grep nginx
```

This takes effect immediately but does not persist across reboots. If AppArmor reloads (e.g., after a package update or reboot), the profile comes back.

To make it persist, combine with the disable symlink:

```bash
# Create the disable symlink manually
sudo ln -s /etc/apparmor.d/usr.sbin.nginx /etc/apparmor.d/disable/usr.sbin.nginx

# Then remove from the running kernel
sudo apparmor_parser -R /etc/apparmor.d/usr.sbin.nginx
```

## Method 4: Move or Rename the Profile File

A less elegant but functional approach is to rename the profile file so AppArmor can't find it:

```bash
# Move the profile out of the apparmor.d directory
sudo mv /etc/apparmor.d/usr.sbin.nginx /etc/apparmor.d/usr.sbin.nginx.disabled

# Reload AppArmor
sudo systemctl reload apparmor
```

This works, but it's harder to track and re-enable later. The `aa-disable` method is better for this reason.

## Re-enabling a Disabled Profile

To re-enable an application's AppArmor profile after disabling it:

```bash
# Using aa-enforce to re-enable and set to enforce mode
sudo aa-enforce /usr/sbin/nginx

# This removes the disable symlink and loads the profile
# Verify
sudo aa-status | grep nginx
```

If you manually created the symlink:

```bash
# Remove the disable symlink
sudo rm /etc/apparmor.d/disable/usr.sbin.nginx

# Reload the profile
sudo apparmor_parser -r /etc/apparmor.d/usr.sbin.nginx

# Confirm
sudo aa-status | grep nginx
```

## Handling Applications Without Profiles

If an application doesn't have an AppArmor profile at all, it already runs unconfined - there's nothing to disable. You can confirm this:

```bash
# Check if a process is running unconfined
ps aux | grep myapp
sudo cat /proc/$(pgrep myapp)/attr/current
```

If the output shows `unconfined`, AppArmor is not restricting it.

## Disabling AppArmor for Snap Applications

Snap packages have their own AppArmor profiles managed by snapd. To allow a specific snap to run without restrictions:

```bash
# List snap connections and interfaces
snap connections myapp

# Remove a specific interface restriction
snap disconnect myapp:home

# For troubleshooting, check snap logs
snap logs myapp
```

For snaps, you generally work with interfaces and connections rather than raw AppArmor profiles. Directly editing snap AppArmor profiles is not recommended as snap manages them automatically.

## Security Considerations

Disabling AppArmor for an application removes a layer of defense. Before doing so:

- Understand why the denial is happening - it might be a legitimate security block
- Prefer complain mode for debugging rather than full disable
- Re-enable the profile as soon as possible
- Consider writing a custom profile that grants only the specific permissions needed rather than disabling protection entirely
- Document which applications have AppArmor disabled and why

If you find yourself disabling AppArmor frequently for an application, the right long-term fix is to write or update the AppArmor profile for that application to properly cover its legitimate access needs.

## Quick Reference

```bash
# Disable (full removal)
sudo aa-disable /path/to/binary
sudo systemctl reload apparmor

# Complain mode (log but don't block)
sudo aa-complain /path/to/binary

# Re-enable in enforce mode
sudo aa-enforce /path/to/binary

# Manually unload a profile
sudo apparmor_parser -R /etc/apparmor.d/profile.name

# Check current status
sudo aa-status
```

Disabling AppArmor for a specific application is a straightforward process when you use the right tools. The key is to use `aa-disable` or `aa-complain` rather than modifying profile files directly, which makes it easy to track what's disabled and restore protection when you're ready.
