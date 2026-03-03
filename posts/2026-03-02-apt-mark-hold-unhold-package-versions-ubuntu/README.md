# How to Use apt-mark to Hold and Unhold Package Versions on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, APT, Package Management, System Administration, DevOps

Description: Learn how to use apt-mark to pin specific package versions on Ubuntu, preventing accidental upgrades of critical software like databases, kernels, and custom-built applications.

---

There are situations where upgrading a package would break something - a kernel that has a known regression, a database version pinned to match a production cluster, or a custom-built library that a vendor application depends on. Ubuntu's APT package manager provides `apt-mark` to handle exactly this scenario, letting you hold packages at their current versions until you're ready to upgrade on your own terms.

## What apt-mark Does

`apt-mark` is a utility for changing the status of installed packages. Beyond holding, it can mark packages as automatically or manually installed, which affects how `apt autoremove` handles them. The hold functionality is what most people reach for when they need version pinning.

When a package is on hold, `apt upgrade` and `apt dist-upgrade` will skip it, printing a message like:

```text
The following packages have been kept back:
  postgresql-14
```

This is intentional behavior - the package won't be upgraded even when a newer version is available in the repositories.

## Placing a Package on Hold

The syntax is straightforward:

```bash
# Hold a single package
sudo apt-mark hold <package-name>

# Hold multiple packages at once
sudo apt-mark hold postgresql-14 postgresql-client-14 postgresql-common
```

After running this, you'll see confirmation:

```text
postgresql-14 set on hold.
postgresql-client-14 set on hold.
postgresql-common set on hold.
```

A practical example - holding the current kernel to avoid regressions:

```bash
# First, check the current kernel version
uname -r
# Output: 5.15.0-91-generic

# Hold the linux-image and linux-headers for this kernel
sudo apt-mark hold linux-image-5.15.0-91-generic
sudo apt-mark hold linux-headers-5.15.0-91-generic

# Also hold the meta-packages if you want to prevent kernel updates entirely
sudo apt-mark hold linux-image-generic linux-headers-generic
```

## Checking Which Packages Are on Hold

```bash
# List all held packages
apt-mark showhold

# Or use dpkg to check hold status
dpkg --get-selections | grep hold
```

The `apt-mark showhold` command gives a clean list. The `dpkg` approach shows the full selection state for all packages, filtering for those in hold status.

## Removing a Hold

When you're ready to allow upgrades again:

```bash
# Remove the hold from a single package
sudo apt-mark unhold postgresql-14

# Remove hold from multiple packages
sudo apt-mark unhold postgresql-14 postgresql-client-14 postgresql-common
```

After removing the hold, a standard `sudo apt upgrade` will pick up any available updates for those packages.

## Practical Use Cases

### Database Version Pinning

When your application was developed and tested against PostgreSQL 14, and your team hasn't validated it against 15 yet:

```bash
# Hold all PostgreSQL 14 packages
sudo apt-mark hold $(dpkg -l | grep postgresql-14 | awk '{print $2}')
```

This uses `dpkg -l` to list all installed packages matching `postgresql-14`, extracts just the package names, and holds them all in one command.

### Holding a Specific Version of Node.js

```bash
# Check what's installed
dpkg -l nodejs

# Hold the current version
sudo apt-mark hold nodejs npm

# When you want to upgrade manually later
sudo apt-mark unhold nodejs npm
sudo apt install nodejs npm
```

### Preventing Kernel Updates Temporarily

Before a major update cycle when you want stability:

```bash
# Hold all kernel-related packages
sudo apt-mark hold linux-image-generic \
    linux-headers-generic \
    linux-libc-dev
```

## Alternative: dpkg --set-selections

`apt-mark hold` is the modern approach, but the underlying mechanism uses dpkg's selection system. You can also interact with it directly:

```bash
# Hold via dpkg
echo "postgresql-14 hold" | sudo dpkg --set-selections

# Verify
dpkg --get-selections postgresql-14
# Output: postgresql-14     hold

# Remove hold via dpkg
echo "postgresql-14 install" | sudo dpkg --set-selections
```

This is useful in automation scripts or when dealing with systems where `apt-mark` might not be available.

## Bulk Hold Management

For environments where you want to hold a large number of packages - perhaps capturing an entire system state:

```bash
# Export all current package states (useful for snapshots)
dpkg --get-selections > /tmp/package-selections.txt

# Put all currently installed packages on hold
dpkg --get-selections | grep -v deinstall | \
    awk '{print $1}' | \
    xargs sudo apt-mark hold

# Restore from a saved state
sudo dpkg --set-selections < /tmp/package-selections.txt
sudo apt-get dselect-upgrade
```

## Using apt-mark for autoremove Control

Beyond holding, `apt-mark` helps control which packages `apt autoremove` considers safe to remove:

```bash
# Mark a package as manually installed (won't be autoremoved)
sudo apt-mark manual package-name

# Mark a package as automatically installed (will be autoremoved if nothing depends on it)
sudo apt-mark auto package-name

# Show which packages are marked as manually installed
apt-mark showmanual

# Show automatically installed packages
apt-mark showauto
```

This is useful when you've installed something as a dependency and later want to keep it even if the original dependent package is removed.

## Scripting Hold Operations

Here's a script that documents and manages holds for a production server:

```bash
#!/bin/bash
# manage-holds.sh - Track and manage package holds

HOLDS_FILE="/etc/apt/holds.list"

case "$1" in
    save)
        # Save current holds to file
        apt-mark showhold > "$HOLDS_FILE"
        echo "Saved $(wc -l < "$HOLDS_FILE") holds to $HOLDS_FILE"
        ;;
    restore)
        # Restore holds from file
        if [ -f "$HOLDS_FILE" ]; then
            xargs sudo apt-mark hold < "$HOLDS_FILE"
            echo "Restored holds from $HOLDS_FILE"
        else
            echo "No holds file found at $HOLDS_FILE"
        fi
        ;;
    list)
        apt-mark showhold
        ;;
    *)
        echo "Usage: $0 {save|restore|list}"
        ;;
esac
```

## Interaction with dist-upgrade

One important thing to know: even with `apt upgrade`, held packages are skipped. But `apt dist-upgrade` is smarter about dependency resolution - it can still upgrade packages if doing so resolves a dependency conflict. If you need an absolute hold that even `dist-upgrade` respects, the dpkg selection method combined with APT pinning provides more control.

For truly critical holds, combine `apt-mark hold` with an APT preferences file:

```bash
# Create a pin file to prevent a package from upgrading
cat > /etc/apt/preferences.d/pin-postgresql << 'EOF'
Package: postgresql-14
Pin: version 14.*
Pin-Priority: 1001
EOF
```

A pin priority above 1000 makes APT prefer the pinned version even over newer available packages, providing a belt-and-suspenders approach to version locking.

## Summary

`apt-mark hold` is a quick and reliable way to prevent specific packages from being upgraded during routine system maintenance. Use it for database versions, kernels with known issues, and vendor-specific software that has compatibility requirements. Always document your holds and the reason for them - six months later, you'll want to know why that package was pinned.
