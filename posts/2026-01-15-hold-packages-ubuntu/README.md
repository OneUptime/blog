# How to Hold and Unhold Packages on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, APT, Package Management, Hold, Tutorial

Description: Learn to prevent specific packages from being upgraded on Ubuntu using apt-mark hold and other methods.

---

Holding packages prevents them from being upgraded during system updates. This is useful when a specific version works well and you want to avoid potential issues from newer releases. This guide covers multiple methods to hold packages.

## Prerequisites

- Ubuntu 18.04 or later
- Root or sudo access

## Why Hold Packages?

Common reasons to hold packages:
- Current version works perfectly for your use case
- Newer version has known bugs
- Application requires specific dependency versions
- Waiting for fixes in newer versions
- Custom-compiled packages

## Using apt-mark (Recommended)

### Hold a Package

```bash
# Hold single package
sudo apt-mark hold package-name

# Example: Hold nginx
sudo apt-mark hold nginx

# Hold multiple packages
sudo apt-mark hold package1 package2 package3
```

### Unhold a Package

```bash
# Remove hold
sudo apt-mark unhold package-name

# Unhold multiple packages
sudo apt-mark unhold package1 package2 package3
```

### Check Hold Status

```bash
# List all held packages
apt-mark showhold

# Check if specific package is held
apt-mark showhold | grep package-name
```

## Using dpkg

### Hold Package

```bash
# Set package to hold
echo "package-name hold" | sudo dpkg --set-selections

# Example
echo "nginx hold" | sudo dpkg --set-selections
```

### Unhold Package

```bash
# Remove hold
echo "package-name install" | sudo dpkg --set-selections
```

### Check Status

```bash
# Show package selection state
dpkg --get-selections | grep package-name

# List all held packages
dpkg --get-selections | grep hold
```

## Using aptitude

```bash
# Install aptitude if not available
sudo apt install aptitude

# Hold package
sudo aptitude hold package-name

# Unhold package
sudo aptitude unhold package-name

# Check status
aptitude search '~ahold'
```

## Hold Kernel Packages

### Hold Current Kernel

```bash
# Get current kernel version
uname -r

# Hold kernel packages
sudo apt-mark hold linux-image-$(uname -r)
sudo apt-mark hold linux-headers-$(uname -r)
sudo apt-mark hold linux-modules-$(uname -r)
```

### Hold All Kernel Packages

```bash
# Hold all kernel-related packages for current version
KERNEL_VERSION=$(uname -r)
sudo apt-mark hold linux-image-$KERNEL_VERSION
sudo apt-mark hold linux-headers-$KERNEL_VERSION
sudo apt-mark hold linux-modules-$KERNEL_VERSION
sudo apt-mark hold linux-modules-extra-$KERNEL_VERSION
```

### Script to Hold Kernel

```bash
#!/bin/bash
# hold-kernel.sh - Hold current kernel packages

KERNEL=$(uname -r)

echo "Holding kernel packages for version: $KERNEL"

# Find and hold all related packages
dpkg -l | grep $KERNEL | awk '{print $2}' | while read pkg; do
    echo "Holding: $pkg"
    sudo apt-mark hold "$pkg"
done

echo "Done. Held packages:"
apt-mark showhold | grep linux
```

## APT Preferences (Pin Packages)

For more control, use APT pinning:

### Create Preferences File

```bash
sudo nano /etc/apt/preferences.d/package-name
```

### Pin to Specific Version

```
# Pin nginx to version 1.18
Package: nginx
Pin: version 1.18.*
Pin-Priority: 1001
```

### Pin Priority Levels

| Priority | Effect |
|----------|--------|
| < 0 | Never install |
| 0-100 | Install only if not installed |
| 100-500 | Install unless newer available |
| 500-990 | Install unless target release has newer |
| 990-1000 | Install unless held or newer available |
| > 1000 | Install even if downgrade |

### Pin from Specific Repository

```
# Prefer packages from specific repo
Package: nginx*
Pin: release o=Ubuntu
Pin-Priority: 1001
```

### Check Pin Status

```bash
# Show pin policy for package
apt-cache policy package-name
```

## Automatic Hold Configuration

### Hold After Install Script

```bash
#!/bin/bash
# auto-hold.sh - Install and hold package

PACKAGE=$1
VERSION=$2

if [ -z "$PACKAGE" ]; then
    echo "Usage: $0 package-name [version]"
    exit 1
fi

# Install specific version or latest
if [ -n "$VERSION" ]; then
    sudo apt install "$PACKAGE=$VERSION" -y
else
    sudo apt install "$PACKAGE" -y
fi

# Hold the package
sudo apt-mark hold "$PACKAGE"

echo "$PACKAGE installed and held at version:"
dpkg -l | grep "^ii  $PACKAGE"
```

### Batch Hold from File

```bash
# Create file with packages to hold
cat > ~/packages-to-hold.txt << EOF
nginx
mysql-server
php8.1
EOF

# Hold all packages in file
while read pkg; do
    sudo apt-mark hold "$pkg"
done < ~/packages-to-hold.txt
```

## Behavior During Updates

When a held package is encountered:

```bash
# Running apt upgrade shows held packages
sudo apt upgrade

# Output shows:
# The following packages have been kept back:
#   nginx
```

### Force Upgrade Held Package

```bash
# Temporarily upgrade held package
sudo apt install package-name

# Or unhold, upgrade, re-hold
sudo apt-mark unhold package-name
sudo apt upgrade
sudo apt-mark hold package-name
```

## Unattended Upgrades Configuration

Exclude held packages from automatic updates:

```bash
# Edit unattended-upgrades config
sudo nano /etc/apt/apt.conf.d/50unattended-upgrades

# Packages are automatically excluded if held
# But you can add explicit blocklist
Unattended-Upgrade::Package-Blacklist {
    "nginx";
    "mysql-server";
};
```

## GUI Method (Ubuntu Desktop)

Using Synaptic Package Manager:

```bash
# Install Synaptic
sudo apt install synaptic
```

1. Open Synaptic
2. Search for package
3. Select package
4. Package menu → Lock Version
5. Package shows lock icon

## Monitoring Held Packages

### Create Monitoring Script

```bash
#!/bin/bash
# check-held-packages.sh - Monitor held packages for available updates

echo "=== Held Packages Status ==="
echo

HELD=$(apt-mark showhold)

if [ -z "$HELD" ]; then
    echo "No packages are currently held."
    exit 0
fi

for pkg in $HELD; do
    INSTALLED=$(dpkg -l "$pkg" 2>/dev/null | grep "^ii" | awk '{print $3}')
    AVAILABLE=$(apt-cache policy "$pkg" | grep "Candidate:" | awk '{print $2}')

    echo "Package: $pkg"
    echo "  Installed: $INSTALLED"
    echo "  Available: $AVAILABLE"

    if [ "$INSTALLED" != "$AVAILABLE" ]; then
        echo "  Status: UPDATE AVAILABLE"
    else
        echo "  Status: Up to date"
    fi
    echo
done
```

### Add to Cron

```bash
# Run weekly check
echo "0 9 * * 1 /home/user/check-held-packages.sh | mail -s 'Held Packages Report' admin@example.com" | sudo tee -a /etc/crontab
```

## Troubleshooting

### Package Still Upgrades

```bash
# Verify hold is set
apt-mark showhold | grep package-name

# Check for package name variations
dpkg -l | grep package-name

# May need to hold related packages too
apt-cache depends package-name
```

### Remove All Holds

```bash
# Unhold all packages at once
sudo apt-mark unhold $(apt-mark showhold)
```

### Held Package Causes Dependency Issues

```bash
# Check what depends on held package
apt-cache rdepends --installed package-name

# Simulate upgrade to see issues
apt upgrade -s
```

---

Holding packages is essential for maintaining system stability when specific versions are required. Remember to periodically review held packages and check for security updates that might require careful manual upgrading. For related information, see [How to Downgrade Packages on Ubuntu](https://oneuptime.com/blog/post/2026-01-15-downgrade-packages-ubuntu/view).
