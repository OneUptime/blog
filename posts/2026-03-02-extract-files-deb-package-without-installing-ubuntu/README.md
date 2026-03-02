# How to Extract Files from a .deb Package Without Installing on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, dpkg, Package Management, System Administration, Debian

Description: Learn multiple methods to extract files from a .deb package without installing it on Ubuntu, including dpkg-deb, ar, and how to inspect package contents and metadata.

---

There are valid reasons to extract files from a `.deb` package without going through the full installation process: you might want to pull out a single configuration file template, inspect what a package contains before committing to installing it, recover a file that was accidentally deleted, or deploy package files to a location other than the defaults.

## Understanding .deb Package Structure

A `.deb` file is actually an `ar` archive containing three components:

- `debian-binary` - A text file indicating the package format version (usually "2.0")
- `control.tar.xz` (or `.gz`) - Contains package metadata, scripts, and dependency information
- `data.tar.xz` (or other compression) - Contains the actual files to be installed

Knowing this structure informs which method to use depending on what you need.

## Method 1: dpkg-deb (Recommended)

`dpkg-deb` is the standard tool for working with `.deb` files and is always available on Ubuntu:

```bash
# Extract all files from a .deb to a directory
dpkg-deb --extract package.deb /tmp/package-contents/

# The directory will contain the full filesystem structure
# For example, for nginx.deb:
ls /tmp/package-contents/
# etc/  usr/  var/

ls /tmp/package-contents/usr/sbin/
# nginx
```

### Extracting Just the Control Information

The control archive contains metadata, pre/post install scripts, and triggers:

```bash
# Extract control information only
dpkg-deb --control package.deb /tmp/package-control/

# This extracts to the directory:
ls /tmp/package-control/
# control   postinst   prerm   md5sums   conffiles
```

### Listing Package Contents Without Extracting

```bash
# List all files in a .deb (like 'ls' for archives)
dpkg-deb --contents package.deb

# Or use -c as shorthand
dpkg-deb -c package.deb

# Example output:
# drwxr-xr-x root/root         0 2024-01-15 10:00 ./
# drwxr-xr-x root/root         0 2024-01-15 10:00 ./usr/
# drwxr-xr-x root/root         0 2024-01-15 10:00 ./usr/sbin/
# -rwxr-xr-x root/root    1234567 2024-01-15 10:00 ./usr/sbin/nginx
```

### Viewing Package Metadata

```bash
# Show the control file (metadata, dependencies, description)
dpkg-deb --info package.deb

# Get a specific field
dpkg-deb --field package.deb Package
dpkg-deb --field package.deb Version
dpkg-deb --field package.deb Depends
dpkg-deb --field package.deb Installed-Size
dpkg-deb --field package.deb Description
```

## Method 2: Extracting with ar

Since `.deb` files are `ar` archives, you can use the `ar` command directly - useful when working on non-Debian systems or when you need access to the raw archive components:

```bash
# Navigate to a working directory
mkdir /tmp/deb-work && cd /tmp/deb-work

# Extract the ar archive to see its components
ar x /path/to/package.deb

# You'll see the three components:
ls
# debian-binary  control.tar.xz  data.tar.xz

# Check the format version
cat debian-binary
# 2.0

# Extract the control information
tar xf control.tar.xz

# Extract the actual package files
tar xf data.tar.xz

# Now the package files are extracted in the current directory
ls -la
```

## Method 3: Using apt-get to Download Without Installing

If the package is in your configured repositories, download it without installing:

```bash
# Download to current directory without installing
apt-get download nginx

# A .deb file appears in the current directory
ls *.deb

# Then extract it with dpkg-deb
dpkg-deb --extract nginx_*.deb /tmp/nginx-contents/
```

For older or unavailable versions, specify the exact version:

```bash
# Download a specific version
apt-get download nginx=1.18.0-0ubuntu1
```

## Extracting a Single Specific File

When you only need one file from a large package:

```bash
# Download the package
apt-get download nginx

# Extract just one file (pipe dpkg-deb to tar for selective extraction)
dpkg-deb --fsys-tarfile nginx_*.deb | tar -xOf - ./usr/sbin/nginx > /tmp/nginx-binary

# Or extract to a temp dir and copy the file
dpkg-deb --extract nginx_*.deb /tmp/nginx-extract/
cp /tmp/nginx-extract/usr/sbin/nginx /tmp/nginx-binary

# Clean up
rm -rf /tmp/nginx-extract/
```

The `--fsys-tarfile` option outputs the data tar archive to stdout, which you can pipe directly to `tar` for selective extraction.

## Practical Use Cases

### Recovering a Deleted Configuration File

```bash
# Accidentally deleted /etc/nginx/nginx.conf?

# Download the package
apt-get download nginx

# Extract it
dpkg-deb --extract nginx_*.deb /tmp/nginx-recover/

# The default config is at the expected path within the extract
ls /tmp/nginx-recover/etc/nginx/
# nginx.conf  sites-available/  sites-enabled/  ...

# Copy it back
sudo cp /tmp/nginx-recover/etc/nginx/nginx.conf /etc/nginx/nginx.conf

# Clean up
rm -rf /tmp/nginx-recover/
```

### Inspecting a Third-Party Package Before Installing

```bash
# Downloaded a .deb from a vendor - inspect before installing
# Check what it will install
dpkg-deb --contents vendor-tool.deb

# Check dependencies
dpkg-deb --field vendor-tool.deb Depends

# Check pre/post install scripts for suspicious commands
dpkg-deb --control vendor-tool.deb /tmp/vendor-control/
cat /tmp/vendor-control/postinst

# Check file permissions
dpkg-deb --contents vendor-tool.deb | grep -E "\-rws|\-rwx"  # Find setuid/executable files
```

### Comparing Package Versions

```bash
# Download two versions of a package
apt-get download nginx=1.18.0-0ubuntu1
apt-get download nginx=1.18.0-6ubuntu14

# Extract both
dpkg-deb --extract nginx_1.18.0-0ubuntu1*.deb /tmp/nginx-old/
dpkg-deb --extract nginx_1.18.0-6ubuntu14*.deb /tmp/nginx-new/

# Compare differences
diff -r /tmp/nginx-old/ /tmp/nginx-new/

# Or just compare the config files
diff /tmp/nginx-old/etc/nginx/nginx.conf /tmp/nginx-new/etc/nginx/nginx.conf
```

### Deploying to a Non-Standard Location

```bash
# Install package files to a staging area instead of /
dpkg-deb --extract package.deb /opt/staging/

# All files will be under /opt/staging with their relative paths preserved
# /usr/bin/tool -> /opt/staging/usr/bin/tool
```

## Inspecting the Package Scripts

Pre and post-installation scripts are in the control archive:

```bash
# Extract control archive
dpkg-deb --control package.deb /tmp/control/

# View each script type:
cat /tmp/control/preinst     # Runs before installation
cat /tmp/control/postinst    # Runs after installation
cat /tmp/control/prerm       # Runs before removal
cat /tmp/control/postrm      # Runs after removal

# Check config files that shouldn't be overwritten on upgrade
cat /tmp/control/conffiles
```

## Using file-roller or Archive Manager (GUI)

On Ubuntu Desktop, you can open `.deb` files directly in the Archive Manager (file-roller) by right-clicking and selecting "Open with Archive Manager." This provides a graphical view of the package structure, though the contents are nested in the `data.tar.xz` sub-archive.

## Summary

For extracting files from `.deb` packages without installing:

- `dpkg-deb --extract package.deb /destination/` - Extract all files
- `dpkg-deb --contents package.deb` - List files without extracting
- `dpkg-deb --info package.deb` - Show package metadata
- `dpkg-deb --control package.deb /destination/` - Extract control scripts
- `apt-get download package-name` - Download a repo package without installing

The most common workflow is `apt-get download` followed by `dpkg-deb --extract` for recovering files from official repository packages. For third-party `.deb` files, always inspect the control scripts before installing.
