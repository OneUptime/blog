# How to Use pbuilder for Clean Package Builds on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Packaging, pbuilder, Debian, Build Environment

Description: Learn how to use pbuilder on Ubuntu to build Debian packages in a clean chroot environment, ensuring reproducible builds that don't depend on your development machine's installed packages.

---

One of the most common packaging mistakes is building a package on a development machine that has hundreds of extra packages installed. The package appears to build fine locally but fails when others try to build it - because it silently depends on something you have installed but didn't declare in `Build-Depends`. pbuilder solves this by building packages in a minimal chroot environment with only the declared dependencies installed.

pbuilder creates and maintains a base chroot tarball. When you build a package, it unpacks the chroot, installs build dependencies, builds the package, and discards the chroot. Each build starts from a known-good minimal state.

## Installing pbuilder

```bash
# Install pbuilder and helpers
sudo apt update
sudo apt install pbuilder debootstrap devscripts -y

# Optional but useful - cowbuilder (faster than pbuilder for repeat builds)
sudo apt install cowbuilder -y
```

## Creating the Base Chroot

The first step is creating the base environment. This downloads and installs a minimal Ubuntu/Debian system:

```bash
# Create a base chroot for Ubuntu 24.04 (Noble)
sudo pbuilder create \
  --distribution noble \
  --mirror http://archive.ubuntu.com/ubuntu \
  --components "main universe" \
  --debootstrapopts "--include=gnupg"

# This creates /var/cache/pbuilder/base.tgz
# Takes several minutes on first run

# Create a base chroot for Ubuntu 22.04 (Jammy)
sudo pbuilder create \
  --distribution jammy \
  --basetgz /var/cache/pbuilder/jammy-base.tgz \
  --mirror http://archive.ubuntu.com/ubuntu \
  --components "main universe"
```

## Configuring pbuilder

Create a configuration file at `~/.pbuilderrc` to set defaults:

```bash
cat > ~/.pbuilderrc << 'EOF'
# Default distribution
DISTRIBUTION="noble"

# Mirror to use for package downloads
MIRRORSITE="http://archive.ubuntu.com/ubuntu"

# Enable universe and multiverse components
COMPONENTS="main restricted universe multiverse"

# Cache directory for downloaded .deb files (speeds up repeat builds)
APTCACHE="/var/cache/pbuilder/aptcache"

# Hooks directory for pre/post build scripts
HOOKDIR="/var/cache/pbuilder/hooks"

# Extra packages to install in every build environment
EXTRAPACKAGES="apt-utils"

# Build results go here
BUILDRESULT="/var/cache/pbuilder/result"

# Log file location
LOGFILE=""
EOF

# Create required directories
sudo mkdir -p /var/cache/pbuilder/aptcache
sudo mkdir -p /var/cache/pbuilder/hooks
sudo mkdir -p /var/cache/pbuilder/result
```

## Building a Package

To build a package with pbuilder, you need a source package (`.dsc` file):

```bash
# First build a source package from your source directory
cd ~/build/mypackage-1.0
dpkg-buildpackage -S -sa -us -uc

# Now build it with pbuilder using the .dsc file
sudo pbuilder build ~/build/mypackage_1.0-1.dsc

# Build for a specific distribution
sudo pbuilder build \
  --basetgz /var/cache/pbuilder/jammy-base.tgz \
  ~/build/mypackage_1.0-1.dsc

# Results appear in /var/cache/pbuilder/result/
ls /var/cache/pbuilder/result/
```

## Updating the Base Chroot

Keep the base chroot up to date with security patches:

```bash
# Update the default base chroot
sudo pbuilder update

# Update a specific chroot
sudo pbuilder update --basetgz /var/cache/pbuilder/jammy-base.tgz

# Schedule regular updates via cron
cat > /etc/cron.weekly/pbuilder-update << 'EOF'
#!/bin/bash
pbuilder update
pbuilder update --basetgz /var/cache/pbuilder/jammy-base.tgz
EOF
sudo chmod +x /etc/cron.weekly/pbuilder-update
```

## Using pdebuild for Convenience

`pdebuild` is a wrapper that combines `dpkg-buildpackage -S` and `pbuilder build` into a single command:

```bash
# Run from the source package directory
cd ~/build/mypackage-1.0

# Build with pbuilder in one step
sudo pdebuild

# Build for a specific distribution
sudo pdebuild -- --basetgz /var/cache/pbuilder/jammy-base.tgz
```

## Using Hooks for Extra Configuration

Hooks let you run scripts at different points in the build process:

```bash
# Create hooks directory
sudo mkdir -p /var/cache/pbuilder/hooks

# D-hooks run after unpacking the chroot but before installing build-deps
# Useful for adding extra repositories

# Example: Add a custom repository to the chroot
sudo tee /var/cache/pbuilder/hooks/D05-add-repo << 'EOF'
#!/bin/bash
# Add extra repository for build dependencies
echo "deb http://ppa.launchpad.net/example/ppa/ubuntu $(lsb_release -cs) main" \
  >> /etc/apt/sources.list
apt-key adv --keyserver keyserver.ubuntu.com --recv-keys ABCDEF12
apt-get update
EOF
sudo chmod +x /var/cache/pbuilder/hooks/D05-add-repo

# B-hooks run after the build completes (before cleanup)
sudo tee /var/cache/pbuilder/hooks/B10-test << 'EOF'
#!/bin/bash
# Run additional tests after build
echo "Build completed, running post-build checks..."
EOF
sudo chmod +x /var/cache/pbuilder/hooks/B10-test
```

Hook naming convention:
- `A` hooks: before unpacking base tarball
- `D` hooks: after unpacking, before installing build-deps
- `E` hooks: after installing build-deps, before build
- `B` hooks: after build

## Multiple Distribution Chroots

Maintaining separate chroots for different Ubuntu releases:

```bash
# Create chroot tarball for each target distribution
for DISTRO in focal jammy noble; do
  sudo pbuilder create \
    --distribution $DISTRO \
    --basetgz /var/cache/pbuilder/${DISTRO}-base.tgz \
    --mirror http://archive.ubuntu.com/ubuntu \
    --components "main restricted universe"
  echo "Created chroot for $DISTRO"
done

# Build a package for all supported releases
for DISTRO in focal jammy noble; do
  echo "Building for $DISTRO..."
  sudo pbuilder build \
    --basetgz /var/cache/pbuilder/${DISTRO}-base.tgz \
    --buildresult /var/cache/pbuilder/result/${DISTRO}/ \
    ~/build/mypackage_1.0-1.dsc
done
```

## Using cowbuilder for Faster Builds

cowbuilder uses copy-on-write overlays instead of re-extracting a tarball for each build:

```bash
# Create a cowbuilder base directory (faster than pbuilder for repeat builds)
sudo cowbuilder create \
  --distribution noble \
  --basepath /var/cache/pbuilder/noble-cow

# Build with cowbuilder
sudo cowbuilder build ~/build/mypackage_1.0-1.dsc

# Update
sudo cowbuilder update --basepath /var/cache/pbuilder/noble-cow
```

## Troubleshooting Build Failures

```bash
# Get a shell inside the chroot to debug
sudo pbuilder login

# Inside the chroot, you can manually install packages and test builds
# This is non-destructive - changes are discarded when you exit

# Save the build environment after a failure (for debugging)
sudo pbuilder build --preserve-buildplace ~/build/mypackage_1.0-1.dsc

# The build directory is preserved at /var/cache/pbuilder/build/
# Examine it to understand what went wrong
ls /var/cache/pbuilder/build/
```

## Integration with CI/CD

pbuilder works well in automated build pipelines. On a build server:

```bash
# Non-interactive build script for CI
#!/bin/bash
set -e

PACKAGE_DIR="$1"
DISTRO="${2:-noble}"

cd "$PACKAGE_DIR"

# Build source package
dpkg-buildpackage -S -us -uc

# Find the .dsc file
DSC=$(ls ../*.dsc | head -1)

# Build with pbuilder
sudo pbuilder build \
  --basetgz /var/cache/pbuilder/${DISTRO}-base.tgz \
  --buildresult /var/cache/pbuilder/result/ \
  "$DSC"

echo "Build complete. Results in /var/cache/pbuilder/result/"
```

Clean chroot builds catch missing build dependencies early, before users encounter them. Incorporating pbuilder into your packaging workflow is one of the most effective ways to ensure package quality.
