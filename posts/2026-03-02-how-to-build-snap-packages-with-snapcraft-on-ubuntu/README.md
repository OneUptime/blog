# How to Build Snap Packages with Snapcraft on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Snap, Snapcraft, Packaging, DevOps

Description: A complete guide to building snap packages with Snapcraft on Ubuntu, from environment setup through debugging builds and optimizing snap size.

---

Snapcraft is the official tool for building snap packages. It reads your `snapcraft.yaml`, sets up a clean build environment (via LXD or Multipass), runs the build steps, and produces a `.snap` file ready for distribution. Understanding the build process helps you write better snapcraft configurations and debug issues efficiently.

## Prerequisites

```bash
# Install snapcraft
sudo snap install snapcraft --classic

# Snapcraft uses either LXD or Multipass for clean builds
# LXD is lighter and preferred for CI

# Install LXD
sudo snap install lxd
sudo lxd init --auto

# Add yourself to the lxd group
sudo usermod -aG lxd $USER
newgrp lxd

# Or install Multipass (heavier but simpler setup)
sudo snap install multipass
```

## Build Environments

Snapcraft can build in several environments:

```bash
# Default: uses Multipass or LXD (clean VM/container)
snapcraft

# Force use of LXD
snapcraft --use-lxd

# Build on the host system directly (no isolation, faster)
snapcraft --destructive-mode

# Build on the host inside a managed container
snapcraft --build-environment=lxd
```

For local development, `--destructive-mode` is fastest since it skips VM setup. For CI and release builds, use a clean environment.

## Understanding the Build Lifecycle

Snapcraft builds snap parts through these steps in order:

```
pull -> build -> stage -> prime -> snap
```

- **pull**: Download source code
- **build**: Run the plugin's build commands
- **stage**: Copy build artifacts to staging area
- **prime**: Filter down to only what goes in the final snap
- **snap**: Package everything into the .snap file

You can run individual steps to debug:

```bash
# Run just the pull step for a specific part
snapcraft pull my-part-name

# Run through build
snapcraft build my-part-name

# Run through stage
snapcraft stage my-part-name

# Run through prime (what actually goes in the snap)
snapcraft prime my-part-name

# Clean build artifacts for a part
snapcraft clean my-part-name

# Clean everything and start fresh
snapcraft clean
```

## Inspecting Build Artifacts

After each step, you can inspect the directory:

```bash
# After pull: source is here
ls parts/my-part/src/

# After build: build artifacts
ls parts/my-part/install/

# After stage: merged staging area
ls stage/

# After prime: final snap contents
ls prime/
```

If your app isn't finding a library, check that it's in `prime/` - that's exactly what ends up in the snap.

## Debugging Build Failures

### Open a Shell in the Build Environment

```bash
# Get a shell in the snapcraft build environment
snapcraft --shell

# Get a shell after a specific step fails
snapcraft --shell-after build
```

Inside the build shell, you have access to all build variables:

```bash
# Useful environment variables in the build shell
echo $SNAPCRAFT_PART_SRC      # source directory
echo $SNAPCRAFT_PART_BUILD    # build directory
echo $SNAPCRAFT_PART_INSTALL  # install prefix
echo $SNAPCRAFT_STAGE         # staging directory
echo $SNAPCRAFT_PRIME         # prime directory

# Manually run your build commands to debug
cd $SNAPCRAFT_PART_SRC
./configure --prefix=/usr
make
```

### Override Build Steps for Debugging

Add `override-build` to your part to see what's happening:

```yaml
parts:
  my-app:
    plugin: make
    source: .
    override-build: |
      # Show environment
      env | grep SNAPCRAFT

      # Show what's in the source
      ls -la $SNAPCRAFT_PART_SRC

      # Run the actual build
      craftctl default

      # Show what was installed
      ls -la $SNAPCRAFT_PART_INSTALL
```

`craftctl default` runs the plugin's default behavior. Wrapping it with custom commands is how you add pre/post steps.

## Common Plugin Configurations

### Dumping a Pre-built Binary

```yaml
parts:
  my-binary:
    plugin: dump
    source: https://github.com/user/app/releases/download/v1.0/app-linux-amd64.tar.gz
    source-type: tar
    # Only include specific files from the archive
    stage:
      - bin/app
      - lib/*.so
    # Files to exclude from prime
    prime:
      - -lib/debug-lib.so
```

### Python Application with Dependencies

```yaml
parts:
  my-python-app:
    plugin: python
    source: .
    python-packages:
      - requests==2.31.0
      - click==8.1.7
    # System libraries needed
    stage-packages:
      - libssl3
    # Build tools needed (not included in snap)
    build-packages:
      - python3-dev
      - libssl-dev
```

### Multi-part Builds

Parts can depend on each other:

```yaml
parts:
  # Build a shared library first
  mylib:
    plugin: cmake
    source: https://github.com/user/mylib.git
    source-tag: v2.0.0
    cmake-parameters:
      - -DCMAKE_INSTALL_PREFIX=/usr

  # Build the app that uses the library
  myapp:
    plugin: make
    source: .
    after:
      - mylib    # ensures mylib builds first
    build-environment:
      - PKG_CONFIG_PATH: $SNAPCRAFT_STAGE/usr/lib/pkgconfig
```

## Reducing Snap Size

Large snaps are slow to download and install. Techniques to reduce size:

```yaml
parts:
  my-app:
    plugin: make
    source: .
    # Exclude development files that aren't needed at runtime
    stage:
      - -usr/include
      - -usr/share/man
      - -usr/lib/debug
    prime:
      - -usr/include
      - -usr/share/doc
      - -usr/share/man
      - -usr/lib/pkgconfig
      - -usr/lib/*.a         # static libraries
      - -usr/lib/*.la        # libtool files

    # Strip debug symbols from binaries
    override-prime: |
      craftctl default
      # Strip binaries to reduce size
      find $SNAPCRAFT_PRIME/usr/bin -type f | xargs strip --strip-all 2>/dev/null || true
      find $SNAPCRAFT_PRIME/usr/lib -name "*.so*" | xargs strip --strip-debug 2>/dev/null || true
```

Also check your `stage-packages` - each package brings in its dependencies:

```bash
# Check what a package depends on
apt-cache depends libssl3

# See what's taking up space in your snap
du -sh prime/*
du -sh prime/usr/*
du -sh prime/usr/lib/*
```

## Cross-Compilation

Build for a different architecture:

```bash
# Build for arm64 on an amd64 host
snapcraft --build-for arm64

# Build for armhf
snapcraft --build-for armhf
```

This requires LXD or Multipass - it won't work with `--destructive-mode` unless you're on the target architecture.

## Build with Environment Variables

Pass configuration to the build:

```yaml
parts:
  my-app:
    plugin: make
    source: .
    build-environment:
      - CGO_ENABLED: "0"      # Disable CGO for Go builds
      - GOOS: linux
      - GOARCH: amd64
      - VERSION: "1.0.0"
```

Or override completely in the build step:

```yaml
    override-build: |
      export CUSTOM_VAR=value
      make release
      make install DESTDIR=$SNAPCRAFT_PART_INSTALL
```

## Caching Builds

Repeated builds are much faster because snapcraft caches:

```bash
# Check build state
snapcraft state

# Clean only specific parts
snapcraft clean my-slow-dependency-part

# Don't clean the fast-changing part
snapcraft prime   # will only rebuild what changed
```

## Verifying the Final Snap

After building, inspect the snap before installing:

```bash
# List contents of the snap
unsquashfs -l my-app_1.0_amd64.snap

# Extract and inspect
unsquashfs my-app_1.0_amd64.snap
ls squashfs-root/
cat squashfs-root/meta/snap.yaml

# Check snap metadata
snap info --verbose my-app_1.0_amd64.snap 2>/dev/null || \
  python3 -c "import yaml; print(yaml.safe_load(open('squashfs-root/meta/snap.yaml')))"
```

Once the snap looks correct, install and test it locally:

```bash
# Install the local snap in devmode for testing
sudo snap install --devmode my-app_1.0_amd64.snap

# Test the app
my-app --version

# Check snap logs if it's a daemon
sudo snap logs my-app
```

Building snaps becomes much faster once you understand which parts can be cached and which need rebuilding. The key is iterating on individual parts during development rather than doing full rebuilds every time.
