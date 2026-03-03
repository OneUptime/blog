# How to Handle Held-Back Packages After an Ubuntu Upgrade

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, APT, Package Management, Troubleshooting

Description: How to identify and resolve held-back packages after Ubuntu upgrades, covering apt-mark, pinning, dependency conflicts, and when it is safe to override holds.

---

After running `apt upgrade`, you may see output like:

```text
The following packages have been kept back:
  linux-generic linux-headers-generic linux-image-generic
```

Packages listed as "kept back" are not being upgraded even though newer versions are available. This is not always a problem, but it can mean your system is not fully patched. Understanding why packages are held back is important for security and stability.

## Why Packages Get Held Back

There are several distinct reasons a package might appear in the kept-back list:

### 1. Dependency Changes

The most common reason: upgrading the package would require installing a new dependency or removing an existing one. `apt upgrade` refuses to do this automatically. Only `apt dist-upgrade` (or `apt full-upgrade`) will handle these cases:

```bash
# dist-upgrade is equivalent to full-upgrade - both handle dependency changes
sudo apt dist-upgrade

# Or explicitly
sudo apt full-upgrade
```

### 2. Manual Hold via apt-mark

Packages can be manually held to prevent upgrades:

```bash
# Check which packages are manually held
sudo apt-mark showhold

# If a package you want to upgrade is listed here, release the hold
sudo apt-mark unhold package-name

# Or hold a package intentionally
sudo apt-mark hold package-name
```

### 3. Package Pinning via Preferences

The `/etc/apt/preferences` file or files in `/etc/apt/preferences.d/` can pin packages to specific versions:

```bash
# Check for pinning configurations
cat /etc/apt/preferences 2>/dev/null
ls /etc/apt/preferences.d/

# View the effective pin priorities for a package
apt-cache policy package-name
```

Output example:

```text
linux-generic:
  Installed: 6.5.0.21.22
  Candidate: 6.8.0.35.35
  Package pin: 6.5.0.21.22
  Version table:
     6.8.0.35.35 500
        500 http://archive.ubuntu.com/ubuntu noble/main amd64 Packages
 *** 6.5.0.21.22 1001
        1001 /var/lib/dpkg/status
```

A pin priority above 1000 means the installed version is preferred over available upgrades.

### 4. Repository Configuration Issues

If a package's source repository is not properly configured for the current Ubuntu release, apt may not offer upgrades:

```bash
# Check what repository a package comes from
apt-cache policy package-name | grep "http"

# If pointing to an old release (e.g., jammy when you are on noble)
# the repository needs to be updated
cat /etc/apt/sources.list.d/third-party.list
```

## Diagnosing a Specific Package

For any package showing up as kept back, get detailed information:

```bash
# Simulate the upgrade to see why it cannot proceed
sudo apt-get --simulate install package-name

# Show full dependency information
apt-cache depends package-name
apt-cache rdepends package-name

# Check for broken dependencies
sudo apt check

# Show why a package is being kept back
sudo apt-get -V upgrade 2>&1 | grep -A5 "kept back"
```

A more detailed approach using `aptitude`:

```bash
sudo apt install aptitude

# Aptitude explains why packages are held
sudo aptitude why-not package-name

# Or use aptitude's full-upgrade which provides better explanations
sudo aptitude full-upgrade
```

## Resolving Held-Back Packages Safely

### Method 1: Use dist-upgrade/full-upgrade

This is the right solution when the hold is due to dependency changes:

```bash
# See what full-upgrade would do (dry run)
sudo apt --dry-run full-upgrade

# If the output looks reasonable (no unexpected removals), proceed
sudo apt full-upgrade
```

Carefully review the dry-run output. If it wants to remove packages you need, investigate before proceeding.

### Method 2: Install the Package Explicitly

Sometimes apt will process the upgrade if you name the package directly:

```bash
# Force install a specific package
sudo apt install package-name

# Install with automatic resolution
sudo apt install --fix-missing package-name
```

### Method 3: Release a Manual Hold

```bash
# Check for holds
sudo apt-mark showhold

# Release a hold
sudo apt-mark unhold package-name

# Then upgrade
sudo apt upgrade
```

### Method 4: Remove Problematic Pin Configurations

If pinning is causing the hold and the pin is no longer needed:

```bash
# View current pin file
sudo cat /etc/apt/preferences.d/problematic-pin

# Remove or edit it
sudo rm /etc/apt/preferences.d/problematic-pin
# Or edit to change the priority

# Refresh apt cache
sudo apt update

# Check if package is now upgradeable
apt-cache policy package-name
```

## Kernel Packages Kept Back

Kernel packages showing as kept back are particularly common and warrant specific attention:

```bash
# Check what kernel packages are held
sudo apt-mark showhold | grep linux

# Check current and candidate versions
apt-cache policy linux-generic linux-image-generic linux-headers-generic

# Force-upgrade kernel packages
sudo apt install linux-generic linux-image-generic linux-headers-generic

# This usually requires a reboot to take effect
sudo reboot
```

On systems with a full `/boot` partition, kernel upgrades fail because there is not enough space to install the new kernel alongside the old one. Check:

```bash
df -h /boot

# Remove old kernels to free space
sudo apt autoremove --purge

# Or manually remove specific old kernels
dpkg --list | grep linux-image
# Note old version numbers (not the current running one)
uname -r  # Shows current running kernel

# Remove an old kernel (do NOT remove the currently running one)
sudo apt remove linux-image-5.15.0-100-generic
```

## Packages from Third-Party PPAs

When a PPA does not have packages for your current Ubuntu release, its packages show as held back or simply unavailable:

```bash
# Check which PPAs are configured
grep -r "^deb " /etc/apt/sources.list.d/

# Check if a PPA package has an update available in the PPA's own repo
apt-cache policy ppa-package-name

# If the PPA has a version for the new release, update the source file
# Change the release codename (e.g., jammy -> noble)
sudo nano /etc/apt/sources.list.d/ppa-name.list
sudo apt update
sudo apt upgrade
```

## Using aptitude for Complex Resolution

When apt cannot resolve dependencies automatically, aptitude offers an interactive resolver:

```bash
sudo aptitude upgrade

# aptitude will propose solutions and explain its reasoning
# Type 'y' to accept, 'n' to reject and see alternatives
# Type '?' for help
```

Aptitude's interactive mode presents multiple solutions when there are conflicts, letting you choose the least disruptive option.

## Checking System Consistency

After resolving held packages:

```bash
# Verify no broken packages remain
sudo apt --fix-broken install
sudo dpkg --configure -a

# Check overall package consistency
sudo apt check

# List packages with issues
dpkg -l | grep "^[^ii]"
```

## When to Leave Packages Held

Sometimes a package is held for good reason:

- **Security-sensitive software with compatibility requirements**: You may be running a specific version of a library because your application requires it
- **Packages under active testing**: You intentionally pinned a version during testing
- **Production-critical services**: You deferred upgrading a database or web server until a maintenance window

In these cases, document the hold and its reason:

```bash
# Document holds in a comment file
cat > /etc/apt/preferences.d/holds-documentation << 'EOF'
# Package: libssl-dev
# Held until: application upgrade to version 2.x (planned Q2 2024)
# Ticket: https://jira.example.com/INFRA-1234
EOF
```

The held-back packages output is APT's way of being conservative rather than breaking things silently. Understanding the reasons behind each held package lets you make informed decisions about whether to override the hold or leave it in place.
