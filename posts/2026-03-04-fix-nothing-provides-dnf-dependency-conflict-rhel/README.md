# How to Fix 'Nothing Provides' DNF Dependency Conflict on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, DNF, Package Management, Dependencies, Troubleshooting

Description: Resolve 'nothing provides' dependency conflicts in DNF on RHEL by identifying missing repositories, compatible package versions, or alternative providers.

---

The "nothing provides" error in DNF means a package you are trying to install requires a dependency that is not available in any enabled repository. This guide covers the most common causes and solutions.

## Understanding the Error

```bash
# Typical error message:
# Error: Problem: nothing provides libfoo.so.2()(64bit) needed by package-1.0-1.el9.x86_64

# This means package-1.0 needs libfoo.so.2, but no enabled repo has it
```

## Step 1: Check Which Repos Are Enabled

```bash
# List all enabled repositories
sudo dnf repolist

# Often the dependency is in a repo that is not enabled
# Common missing repos on RHEL:
sudo subscription-manager repos --list | grep -E "codeready|baseos|appstream"

# Enable the CodeReady/CRB repository (common source of devel packages)
sudo subscription-manager repos --enable codeready-builder-for-rhel-9-x86_64-rpms
# Or on RHEL 9:
sudo dnf config-manager --set-enabled crb
```

## Step 2: Search for the Missing Dependency

```bash
# Search for which package provides the missing library
sudo dnf provides "libfoo.so.2"

# Search across all repos including disabled ones
sudo dnf provides "libfoo.so.2" --enablerepo=\*
```

## Step 3: Install from EPEL

If the dependency is not in official RHEL repos, it may be in EPEL.

```bash
# Install EPEL repository
sudo dnf install https://dl.fedoraproject.org/pub/epel/epel-release-latest-9.noarch.rpm

# Retry the installation
sudo dnf install package-name
```

## Step 4: Check for Version Mismatches

```bash
# The dependency might exist but in a different version
sudo dnf list available | grep libfoo

# Try installing a different version of the package
sudo dnf install package-name-0.9

# Or try with --best to see what is available
sudo dnf install package-name --best --allowerasing
```

## Step 5: Use Module Streams

```bash
# Some packages are in module streams
sudo dnf module list | grep package-name

# Enable the required module stream
sudo dnf module enable module-name:stream
sudo dnf install package-name
```

## Step 6: Skip Broken Dependencies (Last Resort)

```bash
# Skip packages with broken dependencies
sudo dnf install package-name --skip-broken

# This installs what it can and skips what it cannot resolve
# Only use this as a temporary workaround
```

## Step 7: Clean Metadata and Retry

```bash
# Sometimes stale metadata causes false dependency errors
sudo dnf clean all
sudo dnf makecache

# Retry the installation
sudo dnf install package-name
```

The most common fix is enabling a missing repository. On RHEL, the CodeReady Builder (CRB) repository contains many development libraries that other packages depend on.
