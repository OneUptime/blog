# How to Use apt-rdepends to Trace Package Dependencies on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, APT, Package Management, Dependencies, System Administration

Description: Learn how to use apt-rdepends to trace full package dependency trees on Ubuntu, find reverse dependencies, visualize dependency graphs, and troubleshoot complex dependency chains.

---

Understanding package dependencies becomes important when you're troubleshooting installation failures, planning package removals, or trying to understand why installing one package pulls in thirty others. `apt-rdepends` traces dependency trees both forward (what does this package need?) and backward (what packages need this package?).

## Installing apt-rdepends

```bash
# Install apt-rdepends
sudo apt install apt-rdepends
```

## Forward Dependencies: What Does This Package Need?

The default behavior lists all packages a given package depends on, recursively:

```bash
# Show all recursive dependencies of curl
apt-rdepends curl

# Output (partial):
# Reading package lists...
# curl
#   Depends: libcurl4 (>= 7.16.2)
# libcurl4
#   Depends: libc6 (>= 2.17)
#   Depends: libgssapi-krb5-2 (>= 1.14)
#   Depends: libldap-2.5-0 (>= 2.0.2)
# libgssapi-krb5-2
#   Depends: libc6 (>= 2.4)
#   Depends: libcom-err2 (>= 1.43.9)
# ...
```

This continues until it reaches packages with no further dependencies (usually core system libraries).

## Counting Total Dependencies

```bash
# Count how many packages a package pulls in
apt-rdepends curl | grep -c "^  Depends:"

# Or count unique dependency packages
apt-rdepends curl | grep "^[^ ]" | sort -u | wc -l

# Get just a flat list of dependent packages
apt-rdepends curl | grep -v "Depends:" | grep -v "^Reading" | grep -v "^$" | sort -u
```

## Reverse Dependencies: What Needs This Package?

The most useful feature of `apt-rdepends` is finding reverse dependencies - which packages depend on a given package:

```bash
# Show what packages depend on libssl3
apt-rdepends --reverse libssl3

# This is helpful for:
# - Understanding what breaks if you remove a package
# - Finding the "root" packages that pulled in a dependency

# How many packages depend on libssl3?
apt-rdepends --reverse libssl3 | grep -c "^  Depends:"
```

## Why This Matters: Safe Package Removal

Before removing a package, check what depends on it:

```bash
# Is it safe to remove libpng16-16?
apt-rdepends --reverse libpng16-16

# If many important packages depend on it, reconsider the removal

# APT also checks this with a simpler command:
apt-cache rdepends libpng16-16 | head -20
```

The difference is that `apt-rdepends --reverse` shows the full recursive chain, while `apt-cache rdepends` only shows direct dependents.

## Limiting Dependency Depth

For large packages, the full recursive tree can be overwhelming. Limit the depth:

```bash
# Show only direct dependencies (depth 1)
apt-rdepends --depth=1 nginx

# Show two levels deep
apt-rdepends --depth=2 nginx

# Compare: without depth limit vs with
apt-rdepends nginx | wc -l
apt-rdepends --depth=1 nginx | wc -l
```

## Generating Dependency Graphs

`apt-rdepends` can output in DOT format for visualization:

```bash
# Generate a DOT format dependency graph
apt-rdepends --dotty curl > curl-deps.dot

# Convert to an image (requires graphviz)
sudo apt install graphviz
dot -Tpng curl-deps.dot -o curl-deps.png

# View the image
xdg-open curl-deps.png  # or scp to your desktop
```

The graphviz visualization is especially useful for understanding complex webs of dependencies - you can see at a glance which packages are central hubs that many others depend on.

For large dependency trees, use SVG for better scalability:

```bash
dot -Tsvg curl-deps.dot -o curl-deps.svg
```

## Comparing with apt-cache depends

`apt-rdepends` vs `apt-cache depends`:

```bash
# apt-cache depends shows only direct dependencies (not recursive)
apt-cache depends nginx

# apt-rdepends shows the full recursive tree
apt-rdepends nginx

# apt-cache rdepends shows direct reverse dependencies
apt-cache rdepends nginx

# apt-rdepends --reverse shows full recursive reverse dependency tree
apt-rdepends --reverse nginx
```

For most quick checks, `apt-cache depends` and `apt-cache rdepends` are sufficient and faster. Use `apt-rdepends` when you need the full picture.

## Finding Why a Package Was Installed

When you have an unexpected package installed and want to know what brought it in:

```bash
# Which packages depend on an unexpected library?
apt-rdepends --reverse unexpected-package | head -30

# Cross-reference with what's installed
apt-rdepends --reverse unexpected-package | \
    grep "^[^ ]" | \
    xargs dpkg -l 2>/dev/null | \
    grep "^ii"
```

## Tracing the Install Chain for a Dependency

Finding why a specific library got installed on a system:

```bash
# Step 1: Find what directly depends on the library
apt-cache rdepends libreadline8 | grep -A 1000 "Reverse Depends:"

# Step 2: Check which of those are installed
apt-cache rdepends libreadline8 | \
    tail -n +3 | \
    xargs -I{} sh -c 'dpkg -l "{}" 2>/dev/null | grep "^ii" | awk "{print \$2}"'
```

## Using apt-rdepends in Cleanup Workflows

```bash
#!/bin/bash
# find-removable-packages.sh
# Find packages with no reverse dependencies (potential orphans)

echo "Packages with no reverse dependencies:"
echo "(review carefully before removing)"

dpkg --get-selections | grep "install$" | awk '{print $1}' | \
while read pkg; do
    # Check if anything depends on this package
    rdeps=$(apt-rdepends --reverse "$pkg" 2>/dev/null | grep "^[^ ]" | grep -v "^$pkg$" | wc -l)
    if [ "$rdeps" -eq 0 ]; then
        # Also check that it's not manually installed
        manual=$(apt-mark showmanual | grep "^${pkg}$")
        if [ -z "$manual" ]; then
            echo "$pkg"
        fi
    fi
done
```

## Practical Example: Understanding a Full Upgrade's Dependencies

When `apt full-upgrade` wants to install many new packages:

```bash
# Before accepting a large upgrade, understand what's changing
sudo apt full-upgrade --dry-run 2>&1 | grep "^Inst" | \
    awk '{print $2}' | \
    head -10 | \
    while read pkg; do
        echo "=== $pkg ==="
        apt-rdepends --reverse "$pkg" --depth=2 | head -10
    done
```

## Finding Shared Dependencies Between Packages

```bash
#!/bin/bash
# find-common-deps.sh - Find dependencies shared by two packages

PKG1="nginx"
PKG2="apache2"

# Get dependency lists for both packages
apt-rdepends "$PKG1" | grep "^[^ ]" | sort > /tmp/deps-$PKG1.txt
apt-rdepends "$PKG2" | grep "^[^ ]" | sort > /tmp/deps-$PKG2.txt

# Find common dependencies
echo "Common dependencies between $PKG1 and $PKG2:"
comm -12 /tmp/deps-$PKG1.txt /tmp/deps-$PKG2.txt

# Clean up
rm /tmp/deps-$PKG1.txt /tmp/deps-$PKG2.txt
```

## Summary

`apt-rdepends` is most valuable for:

- **Tracing full dependency trees** when `apt-cache depends` shows too little
- **Reverse dependency analysis** - what breaks if I remove this?
- **Dependency graphs** for visual understanding of complex package relationships
- **Finding orphaned packages** by identifying those with no reverse dependencies

For day-to-day package management, `apt-cache depends` and `apt-cache rdepends` cover most needs. Reserve `apt-rdepends` for deeper investigation of complex dependency situations, pre-upgrade planning, and system cleanup work.
