# How to Use sbuild for Reproducible Package Building on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Packaging, sbuild, Reproducible Builds, Debian

Description: Set up and use sbuild on Ubuntu for reproducible Debian package builds using schroot, ensuring consistent results across different build environments and machines.

---

sbuild is the build tool used by Debian and Ubuntu's official build infrastructure (Launchpad). While pbuilder is easier to get started with, sbuild produces more consistent results with the official builders and is better suited for serious package maintenance. It uses `schroot` to manage chroot environments and supports reproducible builds through careful environment control.

## How sbuild Differs from pbuilder

Both tools build packages in clean chroot environments, but they differ in approach:

- pbuilder uses a tarball that's unpacked fresh for each build
- sbuild uses `schroot` sessions, which are faster and support union mounts
- sbuild is what Launchpad actually uses, so behavior matches exactly
- sbuild has better support for cross-compilation and multiple architectures

## Installing sbuild

```bash
# Install sbuild and schroot
sudo apt update
sudo apt install sbuild schroot debootstrap -y

# Add your user to the sbuild group (required to run builds)
sudo adduser $USER sbuild

# Log out and back in for the group membership to take effect
# Verify group membership
groups | grep sbuild
```

## Creating a Build Chroot with sbuild-createchroot

```bash
# Create a chroot for Ubuntu 24.04 (Noble)
sudo sbuild-createchroot \
  --include=gnupg,apt-transport-https \
  noble \
  /srv/chroot/noble-amd64-sbuild \
  http://archive.ubuntu.com/ubuntu

# Create a chroot for Ubuntu 22.04 (Jammy)
sudo sbuild-createchroot \
  --include=gnupg \
  jammy \
  /srv/chroot/jammy-amd64-sbuild \
  http://archive.ubuntu.com/ubuntu

# List available chroots
schroot --list
```

The chroot names follow the pattern `DISTRO-ARCH-sbuild`. sbuild uses this naming convention automatically.

## Configuring sbuild

```bash
# Create user sbuild configuration
cat > ~/.sbuildrc << 'EOF'
# Default distribution
$distribution = 'noble';

# Build architecture
$build_arch = 'amd64';

# Sign packages with your GPG key
$pgp_options = ['-us', '-uc'];

# Number of parallel build jobs
$build_environment = {
    'DEB_BUILD_OPTIONS' => 'parallel=4',
};

# Run lintian after each build
$run_lintian = 1;
$lintian_opts = ['-i', '-I', '--show-overrides'];

# Send build log to file
$log_dir = "$ENV{HOME}/sbuild-logs";

# Extra packages to add to every chroot
$extra_packages = ['apt-utils', 'locales'];
EOF

# Create log directory
mkdir -p ~/sbuild-logs
```

## Building a Package with sbuild

```bash
# From your source package directory
cd ~/build/mypackage-1.0

# Build source package first
dpkg-buildpackage -S -sa -us -uc

# Build with sbuild using the .dsc file
sbuild ../mypackage_1.0-1.dsc

# Build for a specific distribution
sbuild --dist=jammy ../mypackage_1.0-1.dsc

# Build for a specific architecture
sbuild --arch=arm64 ../mypackage_1.0-1.dsc

# Build with extra build dependencies
sbuild --extra-package=/path/to/dependency.deb ../mypackage_1.0-1.dsc
```

## Running sbuild from the Source Directory

```bash
# Build directly from source without pre-building the source package
cd ~/build/mypackage-1.0

# sbuild can invoke dpkg-buildpackage -S internally
sbuild --dist=noble

# Sign the resulting packages
sbuild --dist=noble --sign-with=$KEY_ID
```

## Using schroot Sessions Directly

For debugging, you can enter the chroot manually:

```bash
# Start a session in the noble chroot
schroot --chroot noble-amd64-sbuild --user root

# Inside the chroot, you can install packages and test
apt-get install gdb -y

# Exit the session
exit

# For a persistent session that survives across commands
SESSION=$(schroot --begin-session --chroot noble-amd64-sbuild)
schroot --run-session --chroot "$SESSION" -- apt-get install gdb
schroot --end-session --chroot "$SESSION"
```

## Updating Build Chroots

```bash
# Update all build chroots
sudo sbuild-update --update --upgrade --autoclean noble-amd64-sbuild
sudo sbuild-update --update --upgrade --autoclean jammy-amd64-sbuild

# Or update from inside the chroot
schroot --chroot noble-amd64-sbuild --user root -- apt-get update
schroot --chroot noble-amd64-sbuild --user root -- apt-get upgrade -y
```

Set up automatic updates via a weekly cron job:

```bash
cat > /etc/cron.weekly/sbuild-update << 'EOF'
#!/bin/bash
for CHROOT in $(schroot --list | grep sbuild); do
    sbuild-update --update --upgrade --autoclean "$CHROOT"
done
EOF
sudo chmod +x /etc/cron.weekly/sbuild-update
```

## Cross-Architecture Builds

sbuild supports cross-compilation with the right setup:

```bash
# Install cross-compilation tools
sudo apt install gcc-aarch64-linux-gnu -y

# Enable arm64 architecture in the chroot
sudo schroot --chroot noble-amd64-sbuild --user root -- \
  dpkg --add-architecture arm64

sudo schroot --chroot noble-amd64-sbuild --user root -- \
  apt-get update

# Build for arm64 from amd64 host
sbuild --host=arm64 --build=amd64 ../mypackage_1.0-1.dsc
```

## Reproducible Builds

Reproducible builds produce identical binary output when given the same source and build environment. sbuild supports this through `SOURCE_DATE_EPOCH`:

```bash
# Set build timestamp from the latest changelog entry
SOURCE_DATE_EPOCH=$(dpkg-parsechangelog -STimestamp)
export SOURCE_DATE_EPOCH

# Build with reproducibility enabled
sbuild --dist=noble \
  --debbuildopt="-DEB_BUILD_OPTIONS=reproducible=+all" \
  ../mypackage_1.0-1.dsc

# Verify reproducibility by building twice and comparing
sbuild --dist=noble ../mypackage_1.0-1.dsc
mv mypackage_1.0-1_amd64.deb mypackage_1.0-1_amd64.deb.build1

sbuild --dist=noble ../mypackage_1.0-1.dsc
mv mypackage_1.0-1_amd64.deb mypackage_1.0-1_amd64.deb.build2

# Compare the two builds
sha256sum mypackage_1.0-1_amd64.deb.build1 mypackage_1.0-1_amd64.deb.build2

# For detailed diffoscope analysis
sudo apt install diffoscope -y
diffoscope mypackage_1.0-1_amd64.deb.build1 mypackage_1.0-1_amd64.deb.build2
```

## Build Profiles

Build profiles allow conditional build dependencies and install rules:

```bash
# In debian/control, mark a build dependency as optional
Build-Depends: debhelper-compat (= 13),
               libfoo-dev,
               libdoc-dev <!nodoc>

# Build without documentation
sbuild --dist=noble \
  --debbuildopt="--build-profiles=nodoc" \
  ../mypackage_1.0-1.dsc
```

## Integrating with CI/CD

```bash
#!/bin/bash
# CI build script using sbuild

set -e

DIST="${1:-noble}"
SOURCE_DIR="$(pwd)"

# Build source package
cd "$SOURCE_DIR"
dpkg-buildpackage -S -us -uc

# Find .dsc file
DSC=$(ls ../*.dsc | head -1)

# Build with sbuild
sbuild \
  --dist="$DIST" \
  --no-sign \
  --extra-package=./local-dep.deb \
  "$DSC"

# Check build results
ls -la ../*.deb

echo "Build successful for $DIST"
```

## Viewing Build Logs

```bash
# sbuild build logs go to the current directory by default
ls *.build

# View the last build log
cat mypackage_1.0-1_amd64.build

# Monitor a running build
tail -f mypackage_1.0-1_amd64.build
```

sbuild is the right tool when you need builds that closely match Ubuntu's official build infrastructure, when working on packages destined for the main archive, or when you need robust cross-compilation support. The initial setup takes a bit more effort than pbuilder, but the consistency it provides is worth it for serious package maintenance.
