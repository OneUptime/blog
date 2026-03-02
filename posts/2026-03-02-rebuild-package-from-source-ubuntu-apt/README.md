# How to Rebuild a Package from Source on Ubuntu with APT

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, APT, Package Management, Build Tools, System Administration

Description: Learn how to download, modify, and rebuild Debian packages from source on Ubuntu using apt source, dpkg-buildpackage, and related tools for custom compilation.

---

Sometimes you need a package compiled with different options than the Ubuntu default - maybe you need OpenSSL with a specific cipher enabled, nginx with a non-standard module, or a tool patched to fix a bug that hasn't made it into the official package yet. Ubuntu's packaging system makes it possible to download the exact source used to build the official package, make changes, and build your own version.

## Prerequisites

Before starting, you need development tools and the ability to fetch source packages:

```bash
# Install the essential build tools
sudo apt install build-essential devscripts fakeroot dpkg-dev

# Enable source repositories (needed to download source packages)
# Edit /etc/apt/sources.list and make sure deb-src lines exist
sudo nano /etc/apt/sources.list
```

The sources.list needs `deb-src` lines corresponding to your `deb` lines:

```
# Before (only binary packages):
deb http://archive.ubuntu.com/ubuntu jammy main restricted

# After (add source packages):
deb http://archive.ubuntu.com/ubuntu jammy main restricted
deb-src http://archive.ubuntu.com/ubuntu jammy main restricted
```

Alternatively, on Ubuntu 22.04 and later with the new deb822 format:

```bash
# Enable source packages in the Ubuntu repositories file
sudo nano /etc/apt/sources.list.d/ubuntu.sources
# Change 'Types: deb' to 'Types: deb deb-src'
```

After enabling source repositories, update:

```bash
sudo apt update
```

## Downloading the Source Package

With source repos enabled, download the source for any package:

```bash
# Create a working directory
mkdir -p ~/build/nginx && cd ~/build/nginx

# Download the source package (creates several files)
apt-get source nginx

# This downloads:
# nginx_1.18.0-6ubuntu14.4.dsc  (description file)
# nginx_1.18.0.orig.tar.gz      (original upstream source)
# nginx_1.18.0-6ubuntu14.4.debian.tar.xz  (Ubuntu patches)
# And extracts to: nginx-1.18.0/
```

The source directory is already extracted and ready to work with.

## Installing Build Dependencies

The source package declares what it needs to compile. Install those dependencies:

```bash
# Install all build dependencies for a package
sudo apt-get build-dep nginx

# Verify with a dry run first
sudo apt-get -s build-dep nginx
```

This single command handles the often-complex dependency chain needed to compile the package.

## Examining the Package Structure

Before making changes, understand the structure:

```bash
cd nginx-1.18.0

# The debian/ directory contains all Ubuntu-specific packaging
ls debian/

# Key files:
# debian/rules     - The build script (Makefile)
# debian/control   - Package metadata and dependencies
# debian/patches/  - Applied patches (if any)
# debian/changelog - Version history
```

The `debian/rules` file is where build options are configured. It's typically a Makefile that calls the upstream build system.

## Making Changes to the Source

### Adding a Compile-time Option

For example, adding the `nginx-module-geoip` to a custom nginx build:

```bash
# Look at the existing configure options
cat debian/rules | grep configure
```

Edit `debian/rules` to add your configure option:

```bash
# Find the configure arguments section and add your flag
# This varies by package - look for ./configure or cmake invocations
```

### Applying a Patch

```bash
# If you have a patch file
cp /path/to/mypatch.patch debian/patches/fix-myissue.patch

# Add it to the patch series
echo "fix-myissue.patch" >> debian/patches/series

# Verify the patch applies cleanly
cd ~/build/nginx/nginx-1.18.0
quilt push -a
```

### Modifying the Source Directly

For small changes, edit the source files directly. The packaging system will handle incorporating them into the build.

## Updating the Changelog

Before building, update the package version to distinguish it from the official package:

```bash
# Use dch (debian changelog) to add a new version entry
dch --local "+custom" "Added GeoIP module and custom configuration"

# Or specify the version manually
dch --newversion "1.18.0-6ubuntu14.4+custom1" "Built with custom modules"
```

The `+custom` suffix ensures your version sorts higher than the official package but is clearly identifiable as custom. This also prevents `apt upgrade` from replacing it with the official version unless a newer official version is released.

## Building the Package

With changes made and changelog updated, build the package:

```bash
# Build without signing (common for local builds)
dpkg-buildpackage -b -us -uc

# Flags:
# -b    build binary packages only (not source)
# -us   do not sign the source package
# -uc   do not sign the changes file

# Or use debuild which runs additional checks
debuild -b -us -uc
```

The build process runs in the source directory and places the resulting `.deb` files one level up:

```bash
# Check what was built
ls ~/build/nginx/*.deb
```

## Building with Multiple CPU Cores

For large packages like the Linux kernel or GCC, use parallel compilation:

```bash
# Use all available cores
dpkg-buildpackage -b -us -uc -j$(nproc)

# Or specify a number
dpkg-buildpackage -b -us -uc -j4
```

## Installing the Custom Package

```bash
# Install the built package
sudo dpkg -i ~/build/nginx/nginx_1.18.0-6ubuntu14.4+custom1_amd64.deb

# If there are dependency issues
sudo apt install -f
```

## Preventing the Custom Package from Being Overwritten

After installing your custom build, hold it so apt doesn't replace it:

```bash
# Hold the package at your custom version
sudo apt-mark hold nginx
```

## A Complete Example: Building curl with a Custom SSL Backend

```bash
# Set up build directory
mkdir -p ~/build/curl && cd ~/build/curl

# Download curl source
apt-get source curl

# Install build dependencies
sudo apt-get build-dep curl

cd curl-7.81.0/  # version will vary

# Look at the configure options in debian/rules
grep -A 20 "configure" debian/rules

# Add a version suffix to the changelog
dch --local "+gnutls" "Rebuilt with GnuTLS backend instead of OpenSSL"

# Build
dpkg-buildpackage -b -us -uc -j$(nproc)

# Install
cd ..
sudo dpkg -i libcurl4_*.deb curl_*.deb
```

## Using pbuilder for Clean Builds

For reproducible builds that don't pollute your system with build dependencies, use `pbuilder`:

```bash
# Install pbuilder
sudo apt install pbuilder

# Create a clean chroot environment
sudo pbuilder create --distribution jammy

# Build inside the chroot
sudo pbuilder build ~/build/nginx/nginx_*.dsc
```

`pbuilder` creates a minimal chroot, builds the package, and cleans up. This ensures your build only uses declared dependencies and produces a clean result.

## Tracking Custom Packages

Keep a record of custom packages in a text file for documentation:

```bash
# List all installed packages with custom versions
dpkg -l | grep "+custom\|+local\|~ppa"
```

## Summary

Rebuilding from source on Ubuntu follows a consistent workflow: enable source repos, download with `apt-get source`, install build deps with `apt-get build-dep`, make your changes, update the changelog with `dch`, and build with `dpkg-buildpackage`. The Debian packaging system is well-designed for this use case - you get the full Ubuntu build environment with your customizations layered on top.
