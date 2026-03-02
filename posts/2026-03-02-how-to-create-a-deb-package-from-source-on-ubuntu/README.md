# How to Create a .deb Package from Source on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Packaging, Debian, Development, DevOps

Description: A practical guide to creating .deb packages from source code on Ubuntu, covering directory structure, control files, and building installable packages with dpkg-buildpackage.

---

Creating .deb packages lets you distribute software in a format that integrates cleanly with Ubuntu's package management system. Whether you're packaging internal tools, contributing to a distribution, or just want proper versioned installs, building .deb files from source is a fundamental skill for Ubuntu developers.

This post covers the mechanics of building a .deb from a simple C program or script, all the way through the control file, changelog, and build process.

## Prerequisites

Start by installing the build toolchain:

```bash
# Install essential build tools
sudo apt update
sudo apt install build-essential devscripts dh-make dpkg-dev lintian -y

# Verify tools are available
dpkg-buildpackage --version
lintian --version
```

## Understanding the Package Directory Layout

A Debian source package has a specific layout. For a package named `myhello` at version `1.0`:

```
myhello-1.0/
├── debian/
│   ├── changelog
│   ├── compat
│   ├── control
│   ├── copyright
│   ├── rules
│   └── source/
│       └── format
└── src/
    └── myhello.c
```

The `debian/` directory contains all packaging metadata. The source lives alongside it.

## Creating a Simple Example Program

Start with a minimal C program to package:

```bash
# Create the project directory (version must be in the name)
mkdir -p ~/build/myhello-1.0/src
cd ~/build/myhello-1.0

# Write a simple C program
cat > src/myhello.c << 'EOF'
#include <stdio.h>

int main() {
    printf("Hello from a .deb package!\n");
    return 0;
}
EOF

# Write a basic Makefile
cat > Makefile << 'EOF'
CC = gcc
CFLAGS = -Wall -O2

all: myhello

myhello: src/myhello.c
	$(CC) $(CFLAGS) -o myhello src/myhello.c

install:
	install -m 0755 myhello $(DESTDIR)/usr/bin/myhello

clean:
	rm -f myhello
EOF
```

## Generating the debian/ Directory Skeleton

Use `dh_make` to generate the initial debian directory structure:

```bash
cd ~/build/myhello-1.0

# Generate debian/ skeleton
# -s = single binary package
# -e = maintainer email
# -f = upstream tarball (or use --createorig if no tarball)
dh_make -s --createorig -e yourname@example.com

# Accept defaults and press Enter when prompted
```

This creates the `debian/` directory with template files.

## Editing the Control File

The `debian/control` file defines package metadata:

```bash
cat > ~/build/myhello-1.0/debian/control << 'EOF'
Source: myhello
Section: utils
Priority: optional
Maintainer: Your Name <yourname@example.com>
Build-Depends: debhelper-compat (= 13), gcc
Standards-Version: 4.6.0
Homepage: https://example.com/myhello

Package: myhello
Architecture: any
Depends: ${shlibs:Depends}, ${misc:Depends}
Description: A simple hello world program
 This package provides a minimal demonstration of a .deb package
 built from source code. It prints a greeting to standard output.
EOF
```

Key fields explained:
- `Source` - the source package name
- `Build-Depends` - packages needed at build time
- `Package` - the binary package name
- `Architecture` - `any` for compiled code, `all` for scripts
- `Depends` - runtime dependencies (substitution variables handle library deps automatically)

## Writing the debian/rules File

The `rules` file is a Makefile that controls the build:

```bash
cat > ~/build/myhello-1.0/debian/rules << 'EOF'
#!/usr/bin/make -f
# Use debhelper's dh command for a minimal rules file

%:
	dh $@
EOF

chmod +x ~/build/myhello-1.0/debian/rules
```

For more complex builds, you can override specific targets:

```bash
cat > ~/build/myhello-1.0/debian/rules << 'EOF'
#!/usr/bin/make -f

%:
	dh $@

# Override the install step to specify where binaries go
override_dh_auto_install:
	$(MAKE) install DESTDIR=$(CURDIR)/debian/myhello
EOF
```

## Writing the Changelog

The changelog must follow a strict format:

```bash
cat > ~/build/myhello-1.0/debian/changelog << 'EOF'
myhello (1.0-1) unstable; urgency=medium

  * Initial packaging of myhello
  * Simple hello world demonstration package

 -- Your Name <yourname@example.com>  Mon, 02 Mar 2026 12:00:00 +0000
EOF
```

The date format must be RFC 2822-compliant. Use `date -R` to get the correct format for the current time.

## Setting the compat Level

```bash
# debhelper compatibility level - use 13 for modern packaging
echo "13" > ~/build/myhello-1.0/debian/compat
```

## Building the Package

```bash
cd ~/build/myhello-1.0

# Build the package
# -us = unsigned source
# -uc = unsigned .changes file
dpkg-buildpackage -us -uc

# The output files appear in the parent directory
ls -la ~/build/
```

You should see:
- `myhello_1.0-1_amd64.deb` - the installable binary package
- `myhello_1.0.orig.tar.xz` - the original source tarball
- `myhello_1.0-1.debian.tar.xz` - the debian directory as a tarball
- `myhello_1.0-1.dsc` - the source description file
- `myhello_1.0-1_amd64.changes` - the changes file for upload

## Checking Package Quality with Lintian

Lintian checks packages against Debian policy:

```bash
# Run lintian against the built package
lintian ~/build/myhello_1.0-1_amd64.deb

# Get verbose output with explanations
lintian -v --explain-tags ~/build/myhello_1.0-1_amd64.deb

# Check the source package too
lintian ~/build/myhello_1.0-1.dsc
```

Fix any errors before distributing. Warnings may be acceptable depending on context.

## Installing and Testing

```bash
# Install the newly built package
sudo dpkg -i ~/build/myhello_1.0-1_amd64.deb

# Test it works
myhello

# Inspect package contents
dpkg -L myhello
dpkg -s myhello

# Remove the package
sudo apt remove myhello
```

## Packaging a Python Script Instead

For scripts rather than compiled code, the process is similar but `Architecture` changes to `all`:

```bash
# For a Python script package, the control file would have:
# Architecture: all
# Build-Depends: debhelper-compat (= 13), python3
# Depends: python3, ${misc:Depends}

# And the rules file install step:
# override_dh_auto_install:
#     install -D -m 0755 myscript.py $(CURDIR)/debian/myscript/usr/bin/myscript
```

## Automating Version Bumps

Use `dch` to update the changelog properly:

```bash
# Add a new changelog entry for version 1.0-2
dch -i "Fix a bug in the greeting output"

# Release a new upstream version
dch -v 2.0-1 "New upstream release"

# Mark as released (removes UNRELEASED from header)
dch -r ""
```

## Next Steps

Once comfortable with basic packaging, look into using `pbuilder` or `sbuild` for clean-room builds that ensure your package builds correctly in a minimal environment without relying on packages installed on your development machine. The `devscripts` package also provides many helper utilities for common packaging tasks.
