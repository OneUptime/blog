# How to Find Which Package Provides a Specific File on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, APT, Package Management, Dpkg, System Administration

Description: Learn multiple methods to find which Ubuntu package provides a specific file, binary, or library - both for installed files and packages not yet on your system.

---

A classic sysadmin puzzle: you get an error like `libssl.so.1.1: cannot open shared object file`, or you find a configuration file at `/etc/nginx/nginx.conf` and want to know which package owns it. Sometimes you're on a fresh server and need to figure out which package to install to get a specific command or library.

Ubuntu provides several tools for this, each suited to different situations.

## Finding the Package That Owns an Installed File

If the file is already on the system, `dpkg -S` (search) is the fastest approach:

```bash
# Find which package owns a specific file
dpkg -S /usr/bin/curl

# Output:
# curl: /usr/bin/curl
```

```bash
# Works with any installed file
dpkg -S /etc/ssh/sshd_config
# openssh-server: /etc/ssh/sshd_config

dpkg -S /usr/lib/x86_64-linux-gnu/libssl.so.3
# libssl3:amd64: /usr/lib/x86_64-linux-gnu/libssl.so.3

# Search by filename pattern (not full path)
dpkg -S '*libssl*'
# Lists all packages that own files matching this pattern
```

The `dpkg -S` approach only works for files installed by packages currently on your system. For files that don't exist yet - like when you're trying to install something that pulls in a missing library - you need `apt-file`.

## Using apt-file to Search Uninstalled Package Contents

`apt-file` queries the full contents of all packages in your configured repositories, not just installed ones. This is how you answer "which package do I need to install to get X?"

```bash
# Install apt-file first
sudo apt install apt-file

# Update its database (required before searching)
sudo apt-file update
```

Now you can search:

```bash
# Find which package provides a specific file path
apt-file search /usr/bin/dig
# dnsutils: /usr/bin/dig

# Search by filename only (searches across all paths)
apt-file search libpng.so
# libpng-dev: /usr/lib/x86_64-linux-gnu/libpng.so
# libpng16-16: /usr/lib/x86_64-linux-gnu/libpng16.so.16
# libpng16-16: /usr/lib/x86_64-linux-gnu/libpng16.so.16.37.0

# Find the package that provides a specific header file
apt-file search curl/curl.h
# libcurl4-openssl-dev: /usr/include/curl/curl.h
```

The database that `apt-file` maintains is a compressed index of all file-to-package mappings for your enabled repositories. It updates separately from `apt update`, so run `sudo apt-file update` after adding new repositories.

## Using apt-cache to Search Package Descriptions

For a different angle - when you know what a tool does but not its exact filename:

```bash
# Search package names and descriptions
apt-cache search "network traffic monitor"

# Search for packages by name pattern
apt-cache search nginx

# Show detailed info about what files a package provides
apt-cache show nginx | grep -A 5 "Depends"
```

## Using dpkg -L to List Files in a Package

The inverse of `dpkg -S` - when you know the package name and want to see all files it installs:

```bash
# List all files installed by a package
dpkg -L curl
# /.
# /usr
# /usr/bin
# /usr/bin/curl
# /usr/share
# /usr/share/doc
# /usr/share/doc/curl
# /usr/share/doc/curl/changelog.Debian.gz
# /usr/share/man
# /usr/share/man/man1
# /usr/share/man/man1/curl.1.gz
```

This is useful for understanding what a package will put on your filesystem before installing it.

## Searching for a Command's Package

A common scenario: you type a command and bash says "command not found." Ubuntu's `command-not-found` handler usually suggests a package, but you can also search directly:

```bash
# For a command not found, search by name
apt-file search --regexp '/bin/nmap$'
# nmap: /usr/bin/nmap

# Or more broadly
apt-file search nmap | grep '/bin/'

# Using dpkg for installed commands
which curl | xargs dpkg -S
# curl: /usr/bin/curl
```

## Practical Examples

### Finding the Package for a Missing Library

When a compiled application reports a missing shared library:

```bash
# Error: error while loading shared libraries: libreadline.so.8
# Find which package provides it:
apt-file search libreadline.so.8

# Output:
# libreadline8: /lib/x86_64-linux-gnu/libreadline.so.8
# libreadline8: /lib/x86_64-linux-gnu/libreadline.so.8.2
```

Install the indicated package to resolve it.

### Finding Dev Headers for Compilation

When `./configure` or a Makefile complains about a missing header:

```bash
# Error: fatal error: zlib.h: No such file or directory
apt-file search zlib.h

# Output:
# zlib1g-dev: /usr/include/zlib.h
```

The pattern is almost always `<library>-dev` for development headers.

### Auditing Configuration Files

On a server where you're inheriting an existing setup:

```bash
# Who owns this config file?
dpkg -S /etc/logrotate.d/nginx
# nginx: /etc/logrotate.d/nginx

# Find all config files from a package
dpkg -L nginx | grep /etc/
```

### Verifying Package Integrity

`dpkg -S` can help verify if a file might have been modified or replaced outside the package manager:

```bash
# Find the package owning a file
pkg=$(dpkg -S /usr/bin/sshd 2>/dev/null | cut -d: -f1)

# Then verify all files from that package
sudo dpkg -V "$pkg"

# dpkg -V shows nothing if files are intact
# Modified files are listed with what changed (permissions, checksum, etc.)
```

## Using apt-cache showpkg for Reverse Dependencies

When you want to know which packages depend on a specific package (not file):

```bash
# Show everything that depends on openssl
apt-cache showpkg openssl

# More readable with rdepends
apt-cache rdepends openssl | head -30
```

## Scripting Package Lookups

Here's a helper function you can add to your `.bashrc` or scripts:

```bash
# Add to ~/.bashrc
# Find package providing a file or command
whichpkg() {
    local target="$1"

    # First try dpkg -S for installed files
    if dpkg -S "$target" 2>/dev/null; then
        return 0
    fi

    # Fall back to apt-file for uninstalled packages
    if command -v apt-file >/dev/null 2>&1; then
        echo "Searching repositories with apt-file..."
        apt-file search "$target"
    else
        echo "apt-file not installed. Run: sudo apt install apt-file"
    fi
}
```

Usage:

```bash
whichpkg /usr/bin/dig
whichpkg libpng.so
```

## Online Search with Ubuntu Packages Website

If you can't install `apt-file` (limited environment, no internet access for the tool), Ubuntu maintains a web interface at `packages.ubuntu.com`. You can search by filename and filter by Ubuntu version and architecture. This is useful when working in a minimal container environment.

## Summary

- `dpkg -S <file>` - find which installed package owns a file
- `dpkg -L <package>` - list all files installed by a package
- `apt-file search <file>` - find which available package provides a file
- `apt-file update` - refresh apt-file's database after adding repos

For day-to-day troubleshooting, `dpkg -S` handles most questions about installed files, while `apt-file search` answers the "what do I need to install?" question. Both tools together cover virtually every package-file lookup scenario you'll encounter.
