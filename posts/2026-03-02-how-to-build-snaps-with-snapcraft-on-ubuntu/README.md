# How to Build Snaps with Snapcraft on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Snap, Snapcraft, DevOps, Development

Description: A practical guide to using Snapcraft to build snap packages on Ubuntu, covering snapcraft.yaml structure, plugins, lifecycle commands, and debugging builds.

---

Snapcraft is the official build tool for snap packages. It takes your application source code along with a build specification file and produces a `.snap` file ready for distribution. This guide covers the Snapcraft build process in practical detail - from setting up your environment to debugging build failures.

## Installing Snapcraft

```bash
# Install snapcraft as a snap (the recommended way)
sudo snap install snapcraft --classic

# Verify installation
snapcraft --version

# Snapcraft uses Multipass to create clean build VMs
# Install Multipass if not already present
sudo snap install multipass
```

On servers, you may prefer to use LXD instead of Multipass:

```bash
# Install LXD
sudo snap install lxd
sudo lxd init --minimal

# Add your user to the lxd group
sudo usermod -aG lxd $USER
newgrp lxd

# Tell snapcraft to use LXD
export SNAPCRAFT_BUILD_ENVIRONMENT=lxd
```

## The snapcraft.yaml File

Every snap starts with a `snapcraft.yaml` file. By convention, this lives in a `snap/` subdirectory of your project:

```bash
mkdir -p myproject/snap
cd myproject
```

The `snapcraft.yaml` has several required sections:

```yaml
# snap/snapcraft.yaml - Annotated example

# --- Required metadata ---
name: my-application          # Unique snap name (lowercase, hyphens only)
base: core22                  # Which Ubuntu LTS this snap builds against
                              # core20 = Ubuntu 20.04, core22 = Ubuntu 22.04
version: '1.2.3'              # App version (quoted string)
summary: Short one-line description   # Max 79 characters
description: |                # Multi-line description shown in snap info
  This application does something useful.
  Supports multiple platforms.

# --- Security ---
confinement: strict           # strict, classic, or devmode
grade: stable                 # stable or devel

# --- Applications exposed to users ---
apps:
  my-application:             # Name of the command (creates 'my-application' binary)
    command: bin/myapp        # Path inside the snap filesystem
    plugs:                    # Interfaces this app needs
      - network
      - home
      - x11

  # Secondary command from the same snap
  my-application-daemon:
    command: bin/myapp-daemon
    daemon: simple            # Makes this a systemd service
    restart-condition: on-failure

# --- Build instructions ---
parts:
  my-application:
    plugin: cmake             # Build system plugin to use
    source: .                 # Source location (local or URL)
    cmake-parameters:
      - -DCMAKE_BUILD_TYPE=Release
    build-packages:           # APT packages needed only during build
      - libssl-dev
      - zlib1g-dev
    stage-packages:           # APT packages bundled into the snap
      - libssl3
      - zlib1g
```

## Understanding Plugins

Snapcraft plugins handle the actual build process. Each plugin knows how to build a specific type of project:

```yaml
# Go plugin
parts:
  app:
    plugin: go
    source: .
    build-snaps:
      - go/1.21/stable        # Specific Go toolchain version

# Python plugin
parts:
  app:
    plugin: python
    source: .
    python-packages:
      - flask
      - gunicorn
    python-requirements:
      - requirements.txt

# Node.js plugin
parts:
  app:
    plugin: npm
    source: .
    npm-node-version: '20.11.0'

# Rust/Cargo plugin
parts:
  app:
    plugin: rust
    source: .

# Plain binary (no build system)
parts:
  app:
    plugin: dump
    source: .
    organize:
      myapp-linux-amd64: bin/myapp  # Rename file during staging

# Nil plugin - run custom commands
parts:
  app:
    plugin: nil
    source: .
    override-build: |
      # Custom build script
      cd $SNAPCRAFT_PART_SRC
      make PREFIX=$SNAPCRAFT_PART_INSTALL
      make install PREFIX=$SNAPCRAFT_PART_INSTALL
```

## The Build Lifecycle

Snapcraft processes each part through a series of lifecycle steps:

```
pull -> build -> stage -> prime -> snap
```

Understanding each step helps when debugging:

| Step | What Happens |
|------|-------------|
| `pull` | Downloads source code and dependencies |
| `build` | Compiles the source using the plugin |
| `stage` | Assembles build artifacts from all parts |
| `prime` | Filters the stage directory to what goes in the snap |
| `snap` | Packages the prime directory into a .snap file |

```bash
# Run through all steps (full build)
snapcraft

# Run only to a specific step
snapcraft pull
snapcraft build
snapcraft stage
snapcraft prime
snapcraft pack     # Create .snap from prime directory

# Clean and rebuild from a specific step
snapcraft clean --step build
snapcraft

# Clean a specific part
snapcraft clean my-application-part
```

## Building the Snap

```bash
# Standard build - runs all lifecycle steps in a Multipass VM
snapcraft

# Build without a VM (use host system - faster but less clean)
snapcraft --destructive-mode

# Build and see verbose output for debugging
snapcraft --verbosity=verbose

# Build for a different architecture (requires multipass or LXD)
snapcraft --build-for arm64
snapcraft --build-for armhf
```

The output is a `.snap` file in the current directory:
`my-application_1.2.3_amd64.snap`

## Testing the Build

```bash
# Install the locally built snap in devmode for testing
sudo snap install my-application_1.2.3_amd64.snap --devmode

# Run it
my-application

# Check logs
snap logs my-application

# Check what AppArmor violations occurred during testing
sudo journalctl -xe | grep apparmor | grep my-application

# Remove after testing
sudo snap remove my-application
```

## Debugging Build Failures

```bash
# If the build fails inside Multipass VM, get a shell into the VM
snapcraft --shell

# Inside the VM, you can manually run build commands
# and inspect the build environment
cd /root/parts/my-application/build/
make
ls -la install/

# Exit the VM when done
exit
```

For builds using `override-build`, add debugging output:

```yaml
parts:
  app:
    plugin: nil
    override-build: |
      # Debug: show environment variables
      env | grep SNAPCRAFT

      # Debug: show working directory
      pwd
      ls -la

      # Actual build steps
      ./configure --prefix=$SNAPCRAFT_PART_INSTALL
      make -j$(nproc)
      make install
```

```bash
# Check exactly what files ended up in the prime directory
ls -la prime/
ls -la prime/bin/
ls -la prime/lib/
```

## Multi-Part Builds

Complex applications may need multiple parts - perhaps a library built from source plus the application that uses it:

```yaml
parts:
  my-library:
    plugin: cmake
    source: https://github.com/example/mylib.git
    source-tag: v2.1.0
    cmake-parameters:
      - -DCMAKE_BUILD_TYPE=Release
      - -DBUILD_SHARED_LIBS=ON

  my-application:
    plugin: cmake
    source: .
    after:
      - my-library           # Build my-library first
    cmake-parameters:
      - -DCMAKE_BUILD_TYPE=Release
    build-environment:
      - PKG_CONFIG_PATH: $SNAPCRAFT_STAGE/usr/lib/pkgconfig
```

## Snap Hooks

Hooks are scripts that run at specific lifecycle events:

```bash
# Hook directory structure
snap/
  hooks/
    install         # Runs after snap is installed
    configure       # Runs when snap config changes
    remove          # Runs before snap is removed
    pre-refresh     # Runs before a snap refresh
    post-refresh    # Runs after a snap refresh
```

```bash
# Example install hook
cat > snap/hooks/install << 'EOF'
#!/bin/bash

# Set default configuration values on first install
snapctl set log-level=info
snapctl set max-connections=100
EOF

chmod +x snap/hooks/install
```

## Publishing After Build

```bash
# Login to the Snap Store
snapcraft login

# Register the snap name (one time)
snapcraft register my-application

# Upload to edge channel for testing
snapcraft upload --release=edge my-application_1.2.3_amd64.snap

# Promote to stable after testing
snapcraft release my-application <revision-number> stable
```

## CI/CD Integration

```yaml
# .github/workflows/snap.yml
name: Build and Test Snap

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build snap
        uses: snapcore/action-build@v1
        id: snapcraft

      - name: Test snap
        run: |
          sudo snap install ${{ steps.snapcraft.outputs.snap }} --dangerous --devmode
          my-application --version

      - name: Upload snap artifact
        uses: actions/upload-artifact@v3
        with:
          name: snap
          path: ${{ steps.snapcraft.outputs.snap }}
```

Snapcraft's combination of declarative YAML configuration with a robust plugin system handles most build scenarios. Starting with `--destructive-mode` for quick iteration, then using the full VM build for final testing before publication, is a productive workflow for developing and maintaining snap packages.
