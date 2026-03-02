# How to Remove Orphaned Packages on Ubuntu with deborphan

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Package Management, System Administration, Disk Cleanup, APT

Description: Learn how to find and remove orphaned packages on Ubuntu using deborphan, apt autoremove, and related tools to keep your system clean and reclaim disk space.

---

Over time, Ubuntu systems accumulate packages that were installed as dependencies but are no longer needed. These orphaned packages consume disk space and, in some cases, can create security exposure through unmaintained software. Cleaning them up regularly is good system hygiene.

## Understanding Orphaned Packages

An "orphaned" package is one that:
- Was installed as a dependency for another package
- Has no other packages depending on it
- Wasn't explicitly installed by the user

The most common sources of orphan accumulation are:
- Removing a large application without removing its dependencies
- Upgrading packages that replaced their dependencies with different ones
- Installing packages for testing and removing only the top-level package

## The Built-in Tool: apt autoremove

Before reaching for `deborphan`, try the built-in approach:

```bash
# See what apt considers automatically removable
sudo apt autoremove --dry-run

# Remove the automatically installed packages no longer needed
sudo apt autoremove

# Also purge config files of removed packages
sudo apt autoremove --purge
```

`apt autoremove` works by tracking which packages were installed automatically (as dependencies) versus explicitly. When none of the explicitly installed packages depend on an auto-installed package anymore, it becomes a candidate for removal.

The limitation of `apt autoremove` is that it only removes packages marked as "automatically installed." If you manually installed something and later forgot you installed it, `autoremove` won't touch it.

## Installing deborphan

`deborphan` takes a different approach - it analyzes what packages are installed and finds any that have no other packages depending on them:

```bash
# Install deborphan
sudo apt install deborphan

# Basic usage - list orphaned library packages
deborphan

# List all orphaned packages, not just libraries
deborphan --all
```

By default, `deborphan` focuses on library packages (`lib*`) because those are the most common orphans and the least likely to be intentionally standalone packages.

## Using deborphan to Find Orphans

```bash
# Find orphaned library packages (default behavior)
deborphan

# Example output:
# libgdbm-compat4
# libperl5.34
# libssl1.1
# libpython3.10-minimal

# Find ALL packages with no dependents
deborphan --all

# This includes applications as well as libraries
# Be more careful reviewing this list - some standalone tools are valid

# Show packages and their descriptions for easier review
deborphan | xargs dpkg -l
```

## Removing deborphan's Findings

```bash
# One-liner to remove all identified orphaned libraries
sudo apt remove $(deborphan)

# To also remove their config files
sudo apt purge $(deborphan)

# Always review first with a dry run
deborphan | xargs sudo apt remove --dry-run
```

## Iterating Until Clean

One pass often isn't enough. Removing orphaned libraries may expose more orphans underneath:

```bash
#!/bin/bash
# Iteratively remove orphans until none remain

while [ -n "$(deborphan)" ]; do
    echo "Orphans found:"
    deborphan
    echo ""
    echo "Removing..."
    deborphan | xargs sudo apt-get -y remove
    echo "---"
done

echo "No more orphans found."
```

This loop is safe - each iteration removes what's safe to remove and re-checks until clean.

## Keeping Specific Packages from Being Flagged

Sometimes `deborphan` flags packages you want to keep even though nothing depends on them - standalone tools you installed for occasional use:

```bash
# Add a package to deborphan's keep list
deborphan --add-keep package-name

# List packages in the keep list
deborphan --show-keep

# Remove a package from the keep list
deborphan --del-keep package-name
```

The keep list persists between runs, stored in `~/.deborphan` or `/etc/deborphan/keep`.

## Using orphaner for Interactive Removal

`deborphan` ships with a companion tool called `orphaner` that provides an interactive curses interface:

```bash
# Run the interactive orphan remover
sudo orphaner

# Navigate with arrow keys, space to mark for removal
# Press 'q' to quit, 'r' to remove marked packages
```

`orphaner` is more forgiving for manual review since you can examine each package before marking it for removal.

## Finding Packages Installed but Removed From Repositories

Some packages end up "orphaned" in a different sense - they're installed but no longer available in any repository (perhaps a PPA was removed):

```bash
# Find locally installed packages not in any repository
sudo apt list --installed 2>/dev/null | \
    awk -F/ '{print $1}' | \
    while read pkg; do
        if ! apt-cache show "$pkg" >/dev/null 2>&1; then
            echo "$pkg"
        fi
    done
```

Or more efficiently with `aptitude`:

```bash
# Find packages not in any repository (aptitude must be installed)
aptitude search '~i !~M !~ahold' | grep "^i A"
```

## Finding Config Files from Removed Packages

After removing packages, orphaned configuration files remain (packages removed with `apt remove` leave configs behind):

```bash
# Find packages that have been removed but still have config files
dpkg -l | grep "^rc"
# "rc" = removed but config files remain

# Clean up these orphaned configs
dpkg -l | grep "^rc" | awk '{print $2}' | xargs sudo apt purge

# Or with a one-liner
sudo dpkg --purge $(dpkg -l | grep '^rc' | awk '{print $2}')
```

## Checking Disk Usage Before and After

Measure the impact of cleanup:

```bash
# Check disk usage before cleanup
df -h /

# Check how much the package cache is using
du -sh /var/cache/apt/archives/

# After removing orphans, also clean the package cache
sudo apt clean

# Check disk usage after
df -h /
```

On a system that's been running for a couple of years without cleanup, you might recover several gigabytes.

## Combining Everything in a Cleanup Script

```bash
#!/bin/bash
# system-cleanup.sh - Full orphan and cache cleanup

echo "=== APT autoremove ==="
sudo apt autoremove --purge -y

echo "=== Removing orphaned libraries ==="
if command -v deborphan >/dev/null 2>&1; then
    # Iteratively remove until clean
    passes=0
    while [ -n "$(deborphan)" ] && [ $passes -lt 5 ]; do
        deborphan | xargs sudo apt-get -y remove
        passes=$((passes + 1))
    done
    echo "Completed after $passes passes"
else
    echo "deborphan not installed, skipping"
fi

echo "=== Purging removed package configs ==="
dpkg -l | grep "^rc" | awk '{print $2}' | xargs sudo dpkg --purge 2>/dev/null

echo "=== Cleaning package cache ==="
sudo apt clean

echo "=== Done. Disk usage: ==="
df -h /
```

## Caveats and Warnings

Be careful with `deborphan --all`. Some packages are intentionally installed without dependents:
- Command-line tools you use directly (`htop`, `tmux`, `vim`)
- Standalone services (`fail2ban`, `logwatch`)
- Optional utilities you installed manually

Always review `deborphan --all` output manually before removing everything. Stick to `deborphan` (library-only mode) for automated cleanup.

## Summary

Regular orphan cleanup is worthwhile on long-running systems. The recommended sequence is:

1. `sudo apt autoremove --purge` for APT-tracked orphans
2. `deborphan | xargs sudo apt purge` for library orphans (iterate until clean)
3. `dpkg -l | grep '^rc'` to find and purge leftover config files
4. `sudo apt clean` to remove cached package files

Running this monthly or quarterly keeps your system lean and your disk space available for things that actually matter.
