# How to Fix 'The Following Packages Have Been Kept Back' on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, APT, Package Management, Troubleshooting, System Administration

Description: Learn why APT keeps packages back during upgrades on Ubuntu and the correct methods to upgrade them, including when to use apt upgrade versus apt full-upgrade.

---

After running `sudo apt upgrade`, you sometimes see a message like:

```
The following packages have been kept back:
  linux-generic linux-headers-generic linux-image-generic
```

This can be puzzling - you ran an upgrade, so why weren't these packages upgraded? The answer is that APT is doing exactly what it's designed to do, and understanding why helps you respond correctly.

## Why APT Keeps Packages Back

APT's `upgrade` command has a deliberate constraint: it will not install new packages or remove existing ones to satisfy dependencies. It only upgrades packages that can be upgraded without changing the installed package set.

When a package update requires:
- Installing a new package as a dependency
- Removing a package that conflicts with the new version
- Replacing one package with a different package

...APT marks it as "kept back" rather than proceeding with those additional actions automatically.

This is a safety feature. Automatically removing or adding packages without explicit user consent could break things in unexpected ways - especially on servers where package composition matters.

## Common Reasons for Kept-Back Packages

### 1. New Dependencies

A package update pulls in a new dependency that isn't installed. The update can't proceed without installing the new package.

### 2. Kernel Updates

Kernel updates are almost always kept back because upgrading the kernel package involves installing new `linux-image-*` and `linux-headers-*` packages while the old ones remain for safety.

### 3. Package Splits or Transitions

Sometimes upstream or Ubuntu maintainers split a package into multiple packages, or transition from one package name to another. The upgrade can't complete without the install/remove operations.

### 4. Manual Holds

If someone ran `apt-mark hold` on a package, or if the package conflicts with a held package, it stays back.

### 5. Phased Updates

Ubuntu uses phased updates for stability - not all users receive an update at the same time. Your machine might be in a phase that hasn't received the update yet, and APT will report it as kept back.

## How to Actually Upgrade Kept-Back Packages

### Method 1: apt full-upgrade (Recommended)

`full-upgrade` (formerly `dist-upgrade`) allows APT to install and remove packages to complete the upgrade:

```bash
sudo apt full-upgrade
```

This will show you what additional actions it needs to take:

```
The following NEW packages will be installed:
  linux-image-6.5.0-26-generic linux-modules-6.5.0-26-generic
The following packages will be upgraded:
  linux-generic linux-headers-generic linux-image-generic
```

Review the list and press Y to confirm if it looks reasonable.

### Method 2: Install Specific Packages Explicitly

If you only want to upgrade specific kept-back packages without a full-upgrade:

```bash
# Install the specific kept-back packages by name
sudo apt install linux-generic linux-headers-generic linux-image-generic
```

When you explicitly name a package for `apt install`, APT allows it to install new dependencies and perform the necessary changes.

### Method 3: For Kernel Updates Specifically

If the kept-back packages are kernel-related and you're on a system that might not tolerate a kernel upgrade without testing:

```bash
# First check what version would be installed
apt-cache policy linux-image-generic

# Check the current kernel
uname -r

# Then upgrade if satisfied
sudo apt install linux-image-generic linux-headers-generic linux-generic
```

## Investigating What's Holding a Package Back

Before blindly upgrading kept-back packages, understand why they're held:

```bash
# See why a package can't be upgraded with current constraints
sudo apt-get --simulate install linux-generic 2>&1

# More detail with apt-cache
apt-cache policy linux-generic
apt-cache showpkg linux-generic
```

The `--simulate` output shows exactly what would happen, including new installs and removals, without actually doing anything.

### Checking for Held Packages

```bash
# See if any package is explicitly on hold
apt-mark showhold

# Or
dpkg --get-selections | grep hold
```

If a package is on hold, decide whether it's safe to unhold it:

```bash
# Remove the hold and upgrade
sudo apt-mark unhold package-name
sudo apt upgrade
```

## Checking Phased Updates

If a package is kept back due to phasing (Ubuntu's gradual rollout system):

```bash
# Install the update-manager-core package which includes tools for this
sudo apt install update-manager-core

# Check your phase
cat /etc/update-manager/release-upgrades

# Check if a package is in phased state
apt-cache policy package-name 2>/dev/null | grep "Phased"
```

Phased packages show something like `Phased-Update-Percentage: 20` in their policy output, meaning only 20% of users receive this update yet. If you want to force the update regardless of phasing:

```bash
# Force upgrade of a phased package
sudo apt install package-name
```

## When to Avoid full-upgrade

`apt full-upgrade` is powerful but occasionally removes packages you want to keep. Always review its proposed changes before confirming:

```bash
# Dry run first to see what full-upgrade would do
sudo apt full-upgrade --dry-run

# If you see unexpected removals, check why
sudo apt full-upgrade --dry-run 2>&1 | grep "will be removed"
```

If `full-upgrade` wants to remove a package you need, investigate the conflict:

```bash
# Why would full-upgrade remove nginx, for example?
apt-cache showpkg nginx | grep "Conflicts\|Replaces"

# Or check what conflicts with it
apt-rdepends --reverse nginx | head -20
```

## Automating Kept-Back Package Handling

In automated maintenance scripts, handle kept-back packages carefully:

```bash
#!/bin/bash
# upgrade-with-kept-back.sh

# Run standard upgrade first
sudo apt upgrade -y

# Check if anything was kept back
kept_back=$(apt list --upgradable 2>/dev/null | grep -v "^Listing" | wc -l)

if [ "$kept_back" -gt 0 ]; then
    echo "The following packages are still upgradable (kept back):"
    apt list --upgradable 2>/dev/null | grep -v "^Listing"

    # Optionally: auto-apply full-upgrade
    # sudo apt full-upgrade -y

    # Or: send notification and wait for manual intervention
    echo "Manual intervention may be required for these packages."
fi
```

## Monitoring Kept-Back Packages

For fleet management, track kept-back packages across servers:

```bash
# On each server, check for kept-back packages
apt list --upgradable 2>/dev/null | grep -v "^Listing"

# Using a one-liner to check if anything is upgradable
apt list --upgradable 2>/dev/null | grep -vc "^Listing"
```

A result greater than 0 means packages are being kept back.

## Summary

"Packages kept back" is not an error - it's APT respecting its conservative upgrade policy. The correct resolution depends on context:

- For routine kernel and package updates: `sudo apt full-upgrade`
- For specific packages: `sudo apt install <package-name>`
- For packages held intentionally: leave them alone or consciously `apt-mark unhold`
- For phased updates: either wait for the phase to reach you, or `sudo apt install <package-name>` to force it

Always review what `full-upgrade` plans to do before confirming, particularly the list of packages it wants to remove.
