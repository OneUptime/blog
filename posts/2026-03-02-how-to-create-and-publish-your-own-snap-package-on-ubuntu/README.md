# How to Create and Publish Your Own Snap Package on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Snap, Snapcraft, DevOps, Linux

Description: A step-by-step guide to creating, building, and publishing your own snap package to the Snap Store on Ubuntu using Snapcraft.

---

Packaging software as a snap gives you automatic updates, rollback capability, and a distribution mechanism that works across every Ubuntu release and several other Linux distributions. This guide walks through the complete process from writing a `snapcraft.yaml` file to publishing your snap on the Snap Store.

## Prerequisites

You need snapd and snapcraft installed. On Ubuntu, snapd is installed by default. Snapcraft is available as a snap itself:

```bash
# Install snapcraft
sudo snap install snapcraft --classic

# Verify installation
snapcraft --version
```

Snapcraft uses Multipass or LXD to build snaps in clean, isolated environments. Multipass is the default on Ubuntu and gets installed automatically when needed:

```bash
# Snapcraft will prompt to install Multipass on first build
# Or install it manually
sudo snap install multipass
```

## Project Structure

Create a directory for your snap project. The only required file is `snapcraft.yaml` inside a `snap/` subdirectory:

```bash
mkdir my-snap-project
cd my-snap-project
mkdir snap
```

For this example, we'll package a simple Python script, but the principles apply to any language or binary.

```bash
# Create a simple Python application
cat > myapp.py << 'EOF'
#!/usr/bin/env python3
import sys

def main():
    name = sys.argv[1] if len(sys.argv) > 1 else "World"
    print(f"Hello, {name}!")

if __name__ == "__main__":
    main()
EOF
```

## Writing snapcraft.yaml

The `snapcraft.yaml` file defines everything about your snap - its metadata, how to build it, and what it exposes to users:

```yaml
# snap/snapcraft.yaml

# Basic metadata
name: my-hello-app          # Unique name on the Snap Store
base: core22               # Ubuntu 22.04 base runtime
version: '1.0'             # Your app's version
summary: A simple greeting application
description: |
  Greets the user by name. Pass a name as an argument or
  get a default greeting.

# Security model - start strict, loosen only if needed
confinement: strict
grade: stable               # 'stable' or 'devel'

# Application entry points
apps:
  my-hello-app:
    command: bin/myapp      # Path inside the snap
    plugs:                  # Interfaces this app needs
      - home                # Access to home directory

# Build instructions
parts:
  my-hello-app:
    plugin: python          # Use the Python snapcraft plugin
    source: .               # Build from current directory
    python-packages:        # Additional Python packages
      - requests            # Example dependency
```

## Understanding Parts

Parts are the building blocks of a snap. Each part defines how to fetch and build a piece of your application. Snapcraft has plugins for common build systems:

```yaml
parts:
  # CMake-based C++ project
  cpp-part:
    plugin: cmake
    source: https://github.com/example/project.git
    source-branch: main
    cmake-parameters:
      - -DCMAKE_BUILD_TYPE=Release

  # Autotools project (./configure && make)
  autotools-part:
    plugin: autotools
    source: .

  # Plain binary - just copy files
  bin-part:
    plugin: dump
    source: .
    organize:
      myapp: bin/myapp      # Rename/move during install

  # Go project
  go-part:
    plugin: go
    source: .
    build-snaps:
      - go/1.21/stable     # Specific Go version to build with
```

## Building Your Snap

From the project root directory, run:

```bash
# Build the snap (creates an .snap file)
snapcraft

# If using Multipass (default on desktop Ubuntu), this will:
# 1. Launch a clean VM
# 2. Install build dependencies
# 3. Run the build process
# 4. Package everything into a .snap file
```

The output is a `.snap` file in your project directory, named something like `my-hello-app_1.0_amd64.snap`.

```bash
# Test install the snap locally before publishing
sudo snap install my-hello-app_1.0_amd64.snap --devmode

# Run it
my-hello-app Alice
# Output: Hello, Alice!

# If it works, remove the test install
sudo snap remove my-hello-app
```

## Testing with Strict Confinement

Before publishing, test with strict confinement to catch permission issues:

```bash
# Install with strict confinement (--dangerous skips signature check for local snaps)
sudo snap install my-hello-app_1.0_amd64.snap --dangerous

# Check if it works
my-hello-app

# Check AppArmor logs if something fails
sudo journalctl -xe | grep apparmor | tail -20
```

If you see AppArmor denials, add the required interfaces to your `snapcraft.yaml` and rebuild.

## Creating a Snap Store Account

Publishing requires a Snap Store account:

1. Visit https://snapcraft.io/account and create an account
2. Register your snap name (must be unique):

```bash
# Login to the Snap Store from the command line
snapcraft login

# Register your snap name (do this before your first push)
snapcraft register my-hello-app
```

Name registration is permanent - choose carefully. Names must be lowercase letters, numbers, and hyphens.

## Publishing Your Snap

```bash
# Upload and release to the edge channel first for testing
snapcraft upload --release=edge my-hello-app_1.0_amd64.snap

# Once tested, promote to stable
snapcraft release my-hello-app <revision-number> stable

# You can see revision numbers in the output of upload, or:
snapcraft status my-hello-app
```

Channel promotion workflow:
- **edge** - Automated builds, latest commit, for developers
- **beta** - Manually promoted from edge, for testers
- **candidate** - Release candidate, for final verification
- **stable** - Production release, for all users

```bash
# Promote revision 5 from candidate to stable
snapcraft release my-hello-app 5 stable

# View current channel status
snapcraft status my-hello-app
```

## Setting Up Automated Builds

The Snap Store integrates with GitHub to trigger automatic builds. In your Snap Store dashboard, go to your snap's settings and connect your GitHub repository. The store will rebuild and release to `edge` on every push.

Alternatively, use GitHub Actions:

```yaml
# .github/workflows/snap.yml
name: Snap Build and Publish

on:
  push:
    branches: [main]
  release:
    types: [published]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build snap
        uses: snapcore/action-build@v1
        id: build

      - name: Publish to edge
        uses: snapcore/action-publish@v1
        env:
          SNAPCRAFT_STORE_CREDENTIALS: ${{ secrets.SNAPCRAFT_TOKEN }}
        with:
          snap: ${{ steps.build.outputs.snap }}
          release: edge
```

To generate the token for GitHub Actions:

```bash
# Export credentials for CI use
snapcraft export-login --snaps my-hello-app --channels edge snapcraft-token.txt
cat snapcraft-token.txt
# Add this as SNAPCRAFT_TOKEN secret in GitHub repository settings
```

## Snap Metadata and Store Listing

Beyond `snapcraft.yaml`, you can add store listing metadata:

```bash
# Create a snap/gui directory for icons and desktop files
mkdir -p snap/gui

# Add a 256x256 PNG icon
cp myapp-icon.png snap/gui/my-hello-app.png

# For GUI apps, add a .desktop file
cat > snap/gui/my-hello-app.desktop << 'EOF'
[Desktop Entry]
Name=My Hello App
Comment=Greets the user by name
Exec=my-hello-app
Icon=${SNAP}/meta/gui/my-hello-app.png
Type=Application
Categories=Utility;
EOF
```

The Snap Store page for your snap is managed through the web interface at snapcraft.io, where you can add screenshots, a longer description, and contact information.

Publishing a snap puts your software in front of millions of Ubuntu users across every release from 16.04 onwards, plus users of other snap-compatible distributions. The investment in packaging pays off through simplified distribution and automatic delivery of updates.
