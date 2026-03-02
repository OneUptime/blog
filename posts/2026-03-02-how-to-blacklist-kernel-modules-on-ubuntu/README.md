# How to Blacklist Kernel Modules on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Kernel, System Administration, Linux

Description: Learn how to blacklist kernel modules on Ubuntu to prevent unwanted drivers from loading at boot, improving system stability and security.

---

Kernel modules are pieces of code that can be loaded and unloaded into the kernel on demand. They extend kernel functionality without requiring a reboot. Sometimes, however, you need to prevent specific modules from loading - whether because they conflict with other drivers, cause hardware issues, or pose security concerns. Blacklisting is the mechanism Ubuntu provides to handle this.

## Why Blacklist Kernel Modules

There are several practical reasons to blacklist a module:

- A module auto-loads but conflicts with your preferred driver (common with graphics cards and Wi-Fi adapters)
- A module causes system instability or kernel panics
- You want to prevent a known-vulnerable module from loading
- You're using a hardware device with an out-of-tree driver that conflicts with the in-tree version
- The default module interferes with a VM or container setup

A classic example is blacklisting the `nouveau` driver before installing the proprietary NVIDIA driver, or blacklisting `pcspkr` to disable the system beep.

## How Module Loading Works

Before blacklisting anything, it helps to understand how modules get loaded. Ubuntu uses `udev` rules and `modprobe` configuration to determine which modules load at boot. The `initramfs` stage also loads certain modules early in the boot process.

The key configuration directories are:

- `/etc/modprobe.d/` - modprobe configuration files
- `/lib/modprobe.d/` - distro-provided configuration (don't edit these)
- `/etc/modules` - modules to load at boot explicitly
- `/etc/modules-load.d/` - additional module loading configuration

## Listing and Inspecting Modules

Before blacklisting a module, check if it's currently loaded:

```bash
# List all currently loaded modules
lsmod

# Check if a specific module is loaded
lsmod | grep nouveau

# Get detailed info about a module
modinfo nouveau

# Show module dependencies
modprobe --show-depends nouveau
```

To see what modules are available but not necessarily loaded:

```bash
# Find module files on the system
find /lib/modules/$(uname -r) -name "*.ko*" | grep nouveau

# Check what's loading at boot via udev
cat /etc/udev/rules.d/*.rules | grep -i module
```

## Blacklisting a Module via modprobe.d

The standard and recommended way to blacklist a module is by creating a configuration file in `/etc/modprobe.d/`:

```bash
# Create a blacklist file - use a descriptive name
sudo nano /etc/modprobe.d/blacklist-nouveau.conf
```

Add the following content:

```bash
# Blacklist the nouveau open-source NVIDIA driver
# This prevents it from loading before the proprietary driver
blacklist nouveau

# Also prevent any modules that depend on nouveau from loading
blacklist lbm-nouveau
options nouveau modeset=0
alias nouveau off
alias lbm-nouveau off
```

The `blacklist` directive alone is sometimes not enough. If another module depends on or aliases to the blacklisted module, the kernel may still load it. The `alias` approach with `off` handles this case.

## Blacklisting Multiple Modules

You can blacklist multiple modules in one file or use separate files per concern:

```bash
# /etc/modprobe.d/blacklist-custom.conf

# Disable PC speaker (annoying beep)
blacklist pcspkr
blacklist snd_pcsp

# Disable Bluetooth if not needed
blacklist bluetooth
blacklist btusb
blacklist rfcomm
blacklist bnep

# Disable webcam (security hardening)
blacklist uvcvideo

# Disable firewire
blacklist firewire-core
blacklist firewire-ohci
```

## Updating initramfs After Blacklisting

If the module loads during the early boot stage via initramfs, you need to rebuild it after blacklisting:

```bash
# Apply the blacklist to initramfs
sudo update-initramfs -u

# For all installed kernels
sudo update-initramfs -u -k all
```

Without this step, your blacklisted module may still load during the initramfs phase before your modprobe.d configuration takes effect.

## Verifying the Blacklist Works

Reboot and verify:

```bash
# After reboot, check if the module is still loaded
lsmod | grep nouveau

# Check the module's current state
cat /sys/module/nouveau/initstate 2>/dev/null || echo "Module not loaded"

# View what blacklists are active
cat /etc/modprobe.d/*.conf | grep blacklist

# Use modprobe to test (won't load blacklisted module)
sudo modprobe nouveau
# Should output: modprobe: ERROR: could not insert 'nouveau': Operation not permitted
```

## Temporarily Preventing a Module from Loading

If you want to test without permanently blacklisting, you can use kernel boot parameters. Edit your GRUB configuration:

```bash
# Edit GRUB config
sudo nano /etc/default/grub
```

Add `module_blacklist=` to the kernel line:

```bash
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash module_blacklist=nouveau,btusb"
```

Then update GRUB:

```bash
sudo update-grub
```

This approach is useful for troubleshooting before committing to a permanent blacklist.

## Manually Removing a Loaded Module

If you need to remove a module that's currently loaded without rebooting:

```bash
# Remove a module (fails if something depends on it)
sudo modprobe -r nouveau

# Force removal (use carefully - can cause instability)
sudo rmmod -f nouveau

# Remove module and its dependencies
sudo modprobe -r --remove-dependencies nouveau
```

## Troubleshooting Blacklist Issues

If a module still loads despite being blacklisted:

**Check for module aliases:**
```bash
# List all aliases for a module
modinfo nouveau | grep alias

# Check if there's an alias loading it
cat /lib/modprobe.d/*.conf | grep nouveau
```

**Check udev rules:**
```bash
# udev can trigger module loading independently
grep -r "nouveau" /etc/udev/rules.d/ /lib/udev/rules.d/
```

**Check if it's built into the kernel:**
```bash
# If it shows 'y', it's built-in and cannot be blacklisted via modprobe
grep CONFIG_DRM_NOUVEAU /boot/config-$(uname -r)
# 'y' = built-in (cannot blacklist), 'm' = module (can blacklist)
```

**Check initrd contents:**
```bash
# List modules in current initramfs
lsinitramfs /boot/initrd.img-$(uname -r) | grep nouveau
```

## Security Considerations

Blacklisting modules for security purposes (like disabling USB storage or Bluetooth) is a defense-in-depth measure. Keep in mind:

- A user with sudo access can still manually load blacklisted modules
- For stronger enforcement, combine blacklisting with kernel lockdown mode
- Consider using `install /bin/false` directive instead of just `blacklist` for modules you want to absolutely prevent:

```bash
# This ensures any attempt to load the module runs /bin/false instead
# Even if a dependency tries to load it, it will fail
install usb_storage /bin/false
install bluetooth /bin/false
```

The `install` directive with `/bin/false` is more aggressive than `blacklist` and stops even dependency-triggered loads.

## Common Module Blacklisting Scenarios

| Scenario | Modules to Blacklist |
|----------|---------------------|
| Install NVIDIA proprietary driver | nouveau |
| Disable laptop touchpad | psmouse |
| Disable USB storage | usb_storage, uas |
| Disable Wi-Fi | iwlwifi (Intel), ath9k, rtl8xxxu |
| Disable IPv6 | (use sysctl instead) |
| Disable system beeper | pcspkr, snd_pcsp |

Blacklisting kernel modules is a straightforward but powerful tool for controlling system behavior. Combined with proper initramfs updates and verification, you can reliably prevent unwanted modules from affecting your Ubuntu system.
