# How to Fix Broken Symbolic Links on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Filesystems, Troubleshooting, System Administration, Linux

Description: Find and fix broken symbolic links on Ubuntu using various tools and techniques, including automated cleanup scripts and best practices for managing symlinks reliably.

---

A symbolic link (symlink) points to a path. When the target at that path no longer exists - because it was deleted, moved, or never created - the symlink becomes broken (also called a dangling symlink). Broken symlinks can cause application failures, confusing error messages, and sometimes system issues if they're in critical paths.

## Understanding Symbolic Links

```bash
# Show the difference between a working and broken symlink
ls -la /usr/bin/python3
# lrwxrwxrwx 1 root root 9 Mar 1 2026 /usr/bin/python3 -> python3.10
# ^ This is a working symlink pointing to python3.10

# A broken symlink looks the same in ls output but accessing it fails
cat /path/to/broken-symlink
# cat: /path/to/broken-symlink: No such file or directory

# Check if a symlink target exists
readlink -f /path/to/symlink
# If no output or "No such file", the target doesn't exist
```

## Finding Broken Symbolic Links

### Using find

The most reliable method:

```bash
# Find broken symlinks in a specific directory
find /usr -xtype l 2>/dev/null

# Explanation:
# -xtype l : find symlinks where the target doesn't exist
#             (different from -type l which finds all symlinks)
# -xdev     : don't cross filesystem boundaries
# 2>/dev/null : suppress permission errors

# Find broken symlinks system-wide (excluding virtual filesystems)
find / -xtype l \
    -not -path "/proc/*" \
    -not -path "/sys/*" \
    -not -path "/run/*" \
    -not -path "/dev/*" \
    2>/dev/null

# Find broken symlinks with their targets shown
find /usr -xtype l -exec sh -c 'echo "Broken: {} -> $(readlink {})"' \; 2>/dev/null
```

### Using symlinks Utility

The `symlinks` package provides a dedicated tool:

```bash
# Install symlinks utility
sudo apt-get install -y symlinks

# Find broken symlinks (dry run)
sudo symlinks -r /usr/lib

# Show verbose output including what the target should be
sudo symlinks -rv /usr/local

# Outputs like:
# dangling: /usr/local/bin/somecmd -> /opt/someapp/bin/somecmd

# Remove all dangling (broken) symlinks
sudo symlinks -rd /usr/local
```

## Fixing Broken Symlinks

### Method 1: Update the Symlink Target

If the target moved to a new location:

```bash
# View current (broken) symlink
ls -la /usr/local/bin/myapp
# lrwxrwxrwx ... /usr/local/bin/myapp -> /opt/oldpath/myapp

# Check where the actual file now lives
find / -name "myapp" -type f 2>/dev/null

# Remove the old broken symlink
sudo rm /usr/local/bin/myapp

# Create a new symlink pointing to the correct location
sudo ln -s /opt/newpath/myapp /usr/local/bin/myapp

# Verify it works
ls -la /usr/local/bin/myapp
myapp --version
```

### Method 2: Recreate the Target

If the target was accidentally deleted and should exist:

```bash
# Example: Python alternative symlink is broken
ls -la /usr/bin/python3
# lrwxrwxrwx ... /usr/bin/python3 -> python3.10
# (python3.10 doesn't exist anymore)

# Check what Python versions are installed
ls /usr/bin/python*

# Recreate the symlink pointing to the installed version
sudo rm /usr/bin/python3
sudo ln -s /usr/bin/python3.11 /usr/bin/python3

# Or use update-alternatives for system-managed Python symlinks
sudo update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1
sudo update-alternatives --config python3
```

### Method 3: Fix Library Symlinks with ldconfig

Library symlinks are managed by `ldconfig`. Broken library symlinks cause application crashes:

```bash
# Example: libssl.so -> libssl.so.1.1 is broken
ldd /usr/bin/openssl | grep "not found"
# libssl.so.1.1 => not found

# Check where the library actually is
find /usr/lib -name "libssl*" -ls

# Rebuild library symlinks automatically
sudo ldconfig

# ldconfig reads /etc/ld.so.conf and /etc/ld.so.conf.d/ and creates symlinks
# For libraries in non-standard directories, add them first
echo "/opt/myapp/lib" | sudo tee /etc/ld.so.conf.d/myapp.conf
sudo ldconfig

# Verify the library is now found
ldd /usr/bin/openssl | grep ssl
```

## Fixing Package-Related Broken Symlinks

Broken symlinks often result from incomplete package operations:

```bash
# Reinstall a package to restore its symlinks
sudo apt-get install --reinstall python3-minimal

# If a package's symlinks are broken, reconfiguring may help
sudo dpkg --configure python3-minimal

# Run a general fix for all partially-configured packages
sudo dpkg --configure -a
sudo apt-get install -f

# For broken /usr/bin/X11 -> ../X11R6/bin type symlinks
sudo apt-get install --reinstall x11-common
```

## Automated Cleanup Script

For systems with many broken symlinks to clean up:

```bash
#!/bin/bash
# /usr/local/bin/fix-broken-symlinks.sh
# Find and optionally remove broken symlinks

SEARCH_PATHS="/usr /opt /home /etc /var"
DRY_RUN=true  # Set to false to actually remove
LOG_FILE="/tmp/broken-symlinks-$(date +%Y%m%d).log"

echo "Scanning for broken symbolic links..."
echo "Scan started: $(date)" > "$LOG_FILE"

for search_path in $SEARCH_PATHS; do
    if [ ! -d "$search_path" ]; then
        continue
    fi

    while IFS= read -r symlink; do
        target=$(readlink "$symlink")
        echo "BROKEN: $symlink -> $target"

        if [ "$DRY_RUN" = false ]; then
            rm "$symlink"
            echo "REMOVED: $symlink" | tee -a "$LOG_FILE"
        else
            echo "  (dry run - would remove)" | tee -a "$LOG_FILE"
        fi
    done < <(find "$search_path" -xtype l \
        -not -path "/proc/*" \
        -not -path "/sys/*" \
        2>/dev/null)
done

echo ""
echo "Scan complete. Log at: $LOG_FILE"
```

```bash
chmod +x /usr/local/bin/fix-broken-symlinks.sh

# Run in dry-run mode first to review
sudo /usr/local/bin/fix-broken-symlinks.sh

# Then run with DRY_RUN=false to actually clean up
# Edit the script and change DRY_RUN=false
sudo /usr/local/bin/fix-broken-symlinks.sh
```

## Common System Symlink Issues

### /etc/alternatives Broken Links

Ubuntu's `update-alternatives` system manages symlinks for commands that have multiple implementations:

```bash
# View all managed alternatives
sudo update-alternatives --list

# Fix a broken alternative
# Example: java symlink is broken
sudo update-alternatives --config java
# Presents a menu to select the installed Java version

# If no alternatives exist, add one
sudo update-alternatives --install /usr/bin/java java /usr/lib/jvm/java-11-openjdk-amd64/bin/java 1

# Automatically select the best (highest priority) alternative
sudo update-alternatives --auto java
```

### /proc and /sys Symlinks

Some "broken" symlinks in `/proc` and `/sys` are expected - they represent processes or hardware that no longer exists:

```bash
# These will show as broken but are normal:
ls -la /proc/1/exe
# lrwxrwxrwx ... /proc/1/exe -> /usr/lib/systemd/systemd

# The /proc filesystem is virtual - symlinks to terminated processes appear broken
# Don't try to "fix" these
```

### SSH Key Symlinks

```bash
# Sometimes SSH configs use symlinks to centralize key management
ls -la ~/.ssh/
# If authorized_keys -> /etc/ssh/authorized_keys.d/mykeys is broken
# Recreate or restore the target file

# Fix broken SSH authorized_keys symlink
cat > ~/.ssh/authorized_keys << 'EOF'
ssh-ed25519 AAAA... your-public-key
EOF
chmod 600 ~/.ssh/authorized_keys
```

## Preventing Broken Symlinks

### Use Relative Symlinks When Possible

```bash
# Absolute symlink - breaks if the system is mounted at a different path
ln -s /opt/myapp/bin/cmd /usr/local/bin/cmd

# Relative symlink - more portable within the filesystem
cd /usr/local/bin
ln -s ../../../opt/myapp/bin/cmd cmd

# Check if a symlink is relative or absolute
readlink /usr/local/bin/cmd
```

### Verify Symlinks in Deployment Scripts

```bash
# Add symlink verification to deployment scripts
verify_symlink() {
    local link=$1
    local expected_target=$2

    if [ ! -L "$link" ]; then
        echo "ERROR: $link is not a symlink"
        return 1
    fi

    actual_target=$(readlink -f "$link")
    if [ "$actual_target" != "$expected_target" ]; then
        echo "ERROR: $link points to $actual_target (expected $expected_target)"
        return 1
    fi

    if [ ! -e "$link" ]; then
        echo "ERROR: $link target does not exist (broken symlink)"
        return 1
    fi

    echo "OK: $link -> $actual_target"
    return 0
}

# Usage in deployment script
verify_symlink /usr/local/bin/myapp /opt/myapp/current/bin/myapp
```

## Summary

Broken symlinks on Ubuntu are typically caused by:

- Packages that were removed without cleaning up their symlinks
- Manually moved or deleted files that other files depended on
- Incomplete software installations or upgrades
- Application versioning where a new version didn't update old symlinks

The `find -xtype l` command is the most reliable way to locate broken symlinks. For system library symlinks, `ldconfig` often fixes the issue automatically. For application-specific symlinks, reinstalling the relevant package usually restores them. When recreating symlinks manually, prefer absolute paths for clarity and verify the target exists before creating the link.
