# How to Resolve 'Unmet Dependencies' Errors in APT on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, APT, Package Management, Troubleshooting, System Administration

Description: Learn how to diagnose and fix 'unmet dependencies' errors when installing packages on Ubuntu, including conflict resolution, version pinning issues, and broken package states.

---

An "unmet dependencies" error stops you from installing a package and can leave your system in an inconsistent state. The error message typically looks like:

```text
E: Unable to correct problems, you have held broken packages.
The following packages have unresolved dependencies:
  some-package : Depends: libfoo (>= 2.0) but 1.8 is installed
                 Depends: libbar which is a virtual package
```

Understanding what's causing the problem is essential before trying fixes blindly, since the wrong approach can make things worse.

## Understanding Why Unmet Dependencies Happen

Unmet dependencies occur when:

1. **Version conflict** - The package requires version X of a library, but a different incompatible version is installed
2. **Missing package** - A dependency isn't available in any of your configured repositories
3. **Architecture mismatch** - You're trying to install a package for one architecture when the dependency is installed for another
4. **Held packages** - A held package prevents its dependencies from being updated
5. **Third-party repository conflicts** - A PPA or external repo installs packages that conflict with official Ubuntu packages
6. **Partial upgrades** - A previous interrupted upgrade left the system in a broken state

## Step 1: Diagnose the Actual Problem

Never start with fixes before understanding the cause:

```bash
# Full verbose output of what's broken
sudo apt-get -f install --dry-run

# Check the broken state
sudo dpkg --configure -a --dry-run

# Detailed dependency information for a specific package
apt-cache showpkg package-name

# Show what version of a dependency is available vs installed
apt-cache policy libfoo
```

The `apt-cache policy` output shows available versions and their sources:

```text
libfoo:
  Installed: 1.8
  Candidate: 2.1
  Version table:
 *** 2.1 500
        500 http://archive.ubuntu.com/ubuntu jammy/main amd64 Packages
     1.8 100
        100 /var/lib/dpkg/status
```

This immediately shows what versions are available and where they come from.

## Step 2: Fix Broken Package State

The first thing to try is having APT attempt automatic dependency resolution:

```bash
# The -f flag means "fix broken"
sudo apt-get install -f

# Or equivalently:
sudo apt --fix-broken install
```

This command looks at the current broken state and tries to install missing dependencies or remove conflicting packages to restore consistency.

If that doesn't work, try reconfiguring all partially configured packages:

```bash
# Configure any packages that are "half-configured"
sudo dpkg --configure -a

# Then try the fix again
sudo apt-get install -f
```

## Step 3: Handle Version Conflicts

When a package requires a version that conflicts with what's installed:

```bash
# Example: foo needs libbar >= 2.0 but 1.8 is installed

# Option A: Upgrade the dependency
sudo apt upgrade libbar

# Option B: Check if the required version is available
apt-cache policy libbar
# If 2.0+ is available:
sudo apt install libbar=2.0-1ubuntu1

# Option C: Downgrade the package that has the stricter requirement
# (rarely the right answer, but sometimes necessary for third-party packages)
sudo apt install foo=1.0-1  # older version with looser deps
```

## Step 4: Resolving Third-Party Repository Conflicts

Third-party PPAs and external repos are the most common source of persistent dependency problems:

```bash
# List all external repositories
grep -r "^deb " /etc/apt/sources.list /etc/apt/sources.list.d/

# Check which repository a package came from
apt-cache policy problematic-package

# Temporarily disable a PPA to test
sudo mv /etc/apt/sources.list.d/ppa-name.list /etc/apt/sources.list.d/ppa-name.list.disabled
sudo apt update

# Try installing after disabling the problematic repo
sudo apt install -f
```

If the PPA packages conflict with official Ubuntu packages, you may need to remove the PPA's packages:

```bash
# Install ppa-purge to cleanly remove a PPA and downgrade its packages
sudo apt install ppa-purge

# Remove a PPA and restore all its packages to official versions
sudo ppa-purge ppa:owner/ppa-name
```

## Step 5: Handle Missing Virtual Packages

Some dependencies are "virtual packages" that multiple packages can provide. When the provider isn't installed:

```bash
# Check who provides a virtual package
apt-cache showpkg virtual-package-name

# Or
apt-cache search --names-only virtual-package | head

# Install one of the providers
sudo apt install actual-package-that-provides-it
```

Example: if a package depends on `default-mta` (a virtual package), any of `postfix`, `sendmail`, or `exim4` would satisfy it.

## Step 6: Architecture Issues

Multi-architecture setups (mixing amd64 and i386 packages) can create dependency headaches:

```bash
# Check what architectures are configured
dpkg --print-architecture
dpkg --print-foreign-architectures

# See if a dependency exists for the right architecture
apt-cache policy libfoo:amd64
apt-cache policy libfoo:i386

# Install for a specific architecture
sudo apt install libfoo:amd64
```

## Step 7: Dealing with Held Packages That Block Dependencies

```bash
# Show all held packages
apt-mark showhold

# Check if a held package is preventing dependency resolution
# Suppose 'oldpkg' is held but 'newpkg' needs 'dep >= 2.0' which conflicts with oldpkg
apt-cache showpkg oldpkg | grep Conflicts

# Temporarily unhold, upgrade, and re-hold if needed
sudo apt-mark unhold oldpkg
sudo apt upgrade oldpkg
sudo apt-mark hold oldpkg  # only if you still need the hold after upgrading
```

## Step 8: Manual dpkg Operations for Severe Cases

When APT can't resolve things itself:

```bash
# Force remove a package that's blocking everything
# WARNING: Use this only when you understand the consequences
sudo dpkg --remove --force-remove-reinstreq broken-package

# Force install a package ignoring dependency checks
# This is dangerous and should be temporary
sudo dpkg --install --force-depends package.deb

# After forcing, try to fix the state with APT
sudo apt-get install -f
```

The `--force-depends` option bypasses dependency checking but leaves your system in a technically inconsistent state - always follow it up with `apt-get install -f` to clean things up.

## Step 9: Nuclear Option - Reinstall from Scratch

For a package that's completely broken:

```bash
# Purge the package and all its config files
sudo apt purge broken-package

# Clear the package cache
sudo apt clean

# Update package lists fresh
sudo apt update

# Reinstall
sudo apt install broken-package
```

## Preventing Dependency Problems

### Don't Mix Release Repositories

Avoid adding packages from Ubuntu 24.04 (Noble) repositories on a 22.04 (Jammy) system. Library versions don't mix well between releases.

### Use aptitude for Conflict Resolution

`aptitude` has a more sophisticated dependency resolver that can often find solutions APT can't:

```bash
sudo apt install aptitude

# Try installing with aptitude's resolver
sudo aptitude install problematic-package

# aptitude presents multiple resolution options
# Navigate with arrow keys, select the best option
```

### Pin Third-Party Packages Appropriately

When using third-party repos, use APT pinning to prevent their packages from interfering with official ones:

```bash
# Create a preferences file for a third-party repo
sudo tee /etc/apt/preferences.d/third-party << 'EOF'
Package: *
Pin: release o=Third Party Name
Pin-Priority: 100
EOF
```

A priority of 100 means APT only installs from that repo when explicitly asked to, reducing automatic conflicts.

## Summary

Resolving unmet dependencies requires understanding the cause before applying fixes:

1. Diagnose with `apt-cache policy` and `apt-cache showpkg`
2. Try `sudo apt --fix-broken install` as the first fix
3. Run `sudo dpkg --configure -a` to handle partial installations
4. For third-party repo conflicts, use `ppa-purge` or manual repo management
5. Use `aptitude` when APT's resolver can't find a solution
6. As a last resort, `dpkg --remove --force-remove-reinstreq` for truly broken packages

Patience and diagnosis are more valuable than aggressive force flags - take time to understand why the conflict exists before deciding how to resolve it.
