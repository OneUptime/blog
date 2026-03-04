# How to Resolve 'Transaction Check Error' When Installing Packages with DNF on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, DNF, Packages, Troubleshooting, RPM

Description: Fix DNF transaction check errors on RHEL caused by dependency conflicts, file conflicts, or corrupted RPM databases.

---

A "Transaction check error" in DNF means the package manager detected a conflict or broken dependency before installing packages. Here is how to diagnose and fix common causes.

## Identify the Problem

The error message usually tells you what went wrong:

```bash
# Common error patterns:
# "file /usr/lib64/libfoo.so conflicts between attempted installs"
# "package foo-1.0 requires bar >= 2.0, but none available"
# "package foo-1.0 obsoletes bar provided by bar-0.9"
```

## Fix 1: Dependency Conflicts

```bash
# Check for broken dependencies
sudo dnf check

# Try to resolve the issue automatically
sudo dnf distro-sync

# Install with --allowerasing to replace conflicting packages
sudo dnf install --allowerasing package-name
```

## Fix 2: File Conflicts Between Packages

```bash
# If two packages own the same file
# Find which package owns the conflicting file
rpm -qf /usr/lib64/libfoo.so

# Remove the conflicting package first
sudo dnf remove conflicting-package

# Then install the desired package
sudo dnf install desired-package
```

## Fix 3: Clean DNF Cache and Metadata

```bash
# Clear all cached data
sudo dnf clean all

# Rebuild the metadata cache
sudo dnf makecache

# Try the installation again
sudo dnf install package-name
```

## Fix 4: Corrupted RPM Database

```bash
# Rebuild the RPM database
sudo rpm --rebuilddb

# Verify the database
rpm -qa | wc -l

# Try the installation again
sudo dnf install package-name
```

## Fix 5: Duplicate Packages

```bash
# Check for duplicate packages
sudo dnf list --duplicates

# Remove older duplicates
sudo dnf remove --duplicates

# Or use package-cleanup
sudo dnf install -y dnf-utils
sudo package-cleanup --dupes
sudo package-cleanup --cleandupes
```

## Fix 6: Force Overwrite (Last Resort)

```bash
# If a file conflict cannot be resolved cleanly
# Use rpm directly with --replacefiles (use with caution)
sudo rpm -ivh --replacefiles /path/to/package.rpm
```

## Preventive Measures

```bash
# Always check before installing from third-party repos
sudo dnf check-update

# Use dnf history to undo problematic transactions
sudo dnf history list
sudo dnf history undo <transaction-id>
```

Most transaction check errors come from mixing packages from incompatible repositories. Stick to official RHEL repos and EPEL when possible.
