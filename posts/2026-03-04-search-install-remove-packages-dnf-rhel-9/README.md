# How to Search, Install, and Remove Packages with DNF on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, DNF, Package Management, Linux

Description: A practical guide to searching, installing, and removing packages with DNF on RHEL 9, covering everyday commands that every sysadmin should have in their toolkit.

---

If you manage RHEL 9 systems, you will spend a good chunk of your time working with DNF. It replaced YUM as the default package manager starting with RHEL 8, and in RHEL 9 it is the only game in town. This guide walks through the commands you will use most often, from searching for packages to cleaning up after yourself.

## Understanding DNF Basics

DNF (Dandified YUM) is built on top of the libdnf library and uses RPM under the hood. It resolves dependencies automatically, pulls packages from configured repositories, and keeps a transaction history so you can undo changes later.

The main configuration file lives at `/etc/dnf/dnf.conf`, and individual repository definitions sit in `/etc/yum.repos.d/`. Yes, the directory still has "yum" in the name for backward compatibility.

## Searching for Packages

Before you install anything, you need to find it. DNF gives you several ways to search.

### Search by Name or Description

The `dnf search` command looks through package names and summaries:

```bash
# Search for packages related to nginx
dnf search nginx
```

This returns both exact and partial matches. If you want a broader search that also looks in package descriptions, add `--all`:

```bash
# Search names, summaries, and descriptions
dnf search --all "web server"
```

### Get Detailed Package Information

Once you know the package name, pull up the details:

```bash
# Show version, repo, size, and description for a package
dnf info httpd
```

This tells you which repository the package comes from, its version, architecture, and a full description. If the package is already installed, it will show the installed version alongside any available updates.

### Find Which Package Provides a File

This one saves you when you know you need a specific binary or library but have no idea which package ships it:

```bash
# Find which package provides the dig command
dnf provides dig
```

```bash
# Find which package owns a specific file path
dnf provides /usr/bin/curl
```

### List Available and Installed Packages

```bash
# List all installed packages
dnf list installed

# List all available packages (from enabled repos)
dnf list available

# List packages with updates ready
dnf list updates
```

You can also filter with glob patterns:

```bash
# List all installed packages starting with "python3"
dnf list installed 'python3*'
```

## Installing Packages

### Install a Single Package

```bash
# Install the httpd web server
sudo dnf install httpd
```

DNF will resolve dependencies, show you a transaction summary, and ask for confirmation. If you want to skip the confirmation prompt (useful in scripts), add `-y`:

```bash
# Install without confirmation prompt
sudo dnf install -y vim-enhanced
```

### Install a Specific Version

Sometimes you need a particular version of a package:

```bash
# Install a specific version of a package
sudo dnf install nginx-1.20.1
```

### Install from a Local RPM File

If you have an RPM file downloaded locally, DNF can install it and resolve dependencies from your configured repos:

```bash
# Install a local RPM and resolve dependencies from repos
sudo dnf install ./custom-app-1.0.0-1.el9.x86_64.rpm
```

### Install Multiple Packages at Once

```bash
# Install several packages in one transaction
sudo dnf install -y wget curl tmux htop
```

### Reinstall a Package

If config files got corrupted or something went sideways, you can reinstall:

```bash
# Reinstall a package (replaces all files from the package)
sudo dnf reinstall httpd
```

## Removing Packages

### Remove a Single Package

```bash
# Remove a package
sudo dnf remove httpd
```

By default, DNF will also remove packages that depended on the one you are removing. Always read the transaction summary before confirming.

### Autoremove Unneeded Dependencies

Over time, dependency packages pile up after you remove the things that originally pulled them in. Clean them out with:

```bash
# Remove packages that were installed as dependencies but are no longer needed
sudo dnf autoremove
```

Run this periodically to keep your system tidy. Just review the list before confirming, because occasionally something you actually use got installed as a dependency of something else.

## Keeping Packages Updated

### Check for Available Updates

```bash
# Check what updates are available
dnf check-update
```

This command returns exit code 100 if updates are available and 0 if there are none, which makes it handy in scripts.

### Apply All Updates

```bash
# Update all installed packages
sudo dnf update -y
```

### Update a Specific Package

```bash
# Update only the kernel package
sudo dnf update kernel
```

### Security Updates Only

If you want to apply only security patches and leave everything else alone:

```bash
# Apply only security-related updates
sudo dnf update --security
```

## Cleaning Up

DNF caches metadata and downloaded packages locally. This speeds up repeated operations but eats disk space over time.

```bash
# Remove cached package files
sudo dnf clean packages

# Remove cached metadata
sudo dnf clean metadata

# Remove everything (packages, metadata, and other cache data)
sudo dnf clean all
```

After cleaning, the next DNF operation will re-download metadata from your repos. This is useful when you suspect the cache is stale or corrupted.

### Check Cache and Rebuild

```bash
# Force a metadata refresh
sudo dnf makecache
```

## Useful DNF Options

Here are some flags worth knowing:

```bash
# Do a dry run without actually changing anything
sudo dnf install httpd --downloadonly

# Show which repo each package comes from
dnf list available --showduplicates nginx

# Skip broken dependencies and install what you can
sudo dnf install --skip-broken some-package
```

## Quick Reference

Here is a summary of the most common DNF commands:

| Task | Command |
|------|---------|
| Search for a package | `dnf search <name>` |
| Get package details | `dnf info <name>` |
| Find which package provides a file | `dnf provides <file>` |
| Install a package | `sudo dnf install <name>` |
| Remove a package | `sudo dnf remove <name>` |
| Update all packages | `sudo dnf update` |
| List installed packages | `dnf list installed` |
| Clean all caches | `sudo dnf clean all` |
| Remove orphaned dependencies | `sudo dnf autoremove` |

## Tips from the Trenches

1. Always run `dnf check-update` before a maintenance window so you know what you are getting into.
2. Use `dnf history` to review past transactions. It is a lifesaver when troubleshooting.
3. Pipe `dnf list installed` through `grep` when you need to quickly check if something is installed.
4. On systems with limited bandwidth, use `--downloadonly` first, then install during the maintenance window.
5. If a package install fails with dependency conflicts, try `dnf clean all` and retry before going deeper.

DNF is straightforward once you get the hang of it. The commands above cover 90% of what you will do day to day. For the other 10%, `dnf --help` and `man dnf` have your back.
