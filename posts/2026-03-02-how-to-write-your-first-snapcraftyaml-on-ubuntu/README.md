# How to Write Your First Snapcraft.yaml on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Snap, Snapcraft, Packaging

Description: A beginner-friendly guide to writing your first snapcraft.yaml file on Ubuntu, covering metadata, parts, apps, and confinement for packaging applications as snaps.

---

Snapcraft is the tool for building snap packages - sandboxed application bundles that include all dependencies and run across multiple Linux distributions. The build process is driven entirely by a `snapcraft.yaml` file that describes what your application is, where to get it, how to build it, and how to run it.

This guide walks through writing a `snapcraft.yaml` from scratch for a simple application.

## Setting Up Snapcraft

Before writing the YAML, install snapcraft:

```bash
# Install snapcraft
sudo snap install snapcraft --classic

# Verify installation
snapcraft --version
```

Snapcraft uses Multipass (a lightweight VM tool) by default to create clean build environments. Install it if prompted:

```bash
sudo snap install multipass
```

## Project Structure

Create a directory for your snap project:

```bash
mkdir my-app-snap
cd my-app-snap

# The YAML file lives at the root of your project
# or in a snap/ subdirectory
touch snap/snapcraft.yaml
```

Most projects use `snap/snapcraft.yaml`. Some older documentation shows `snapcraft.yaml` at the root - both work, but `snap/snapcraft.yaml` is the modern convention.

## The Basic snapcraft.yaml Structure

Here's the minimal valid `snapcraft.yaml`:

```yaml
name: my-app
version: '1.0'
summary: A one-line summary of what this snap does
description: |
  A longer description of the snap.
  Can span multiple lines.

grade: devel
confinement: devmode

base: core22

parts:
  my-app:
    plugin: nil

apps:
  my-app:
    command: usr/bin/my-app
```

## Metadata Fields

### name

The snap name must be unique in the Snap Store. It's lowercase with hyphens:

```yaml
name: my-awesome-tool
```

### version

Can be any string. Often you'll pull this from your source code:

```yaml
version: '2.1.3'
```

Or use `adopt-info` to pull from git tags:

```yaml
version: git
adopt-info: my-part-name
```

### summary and description

Summary is shown in single-line listings. Description appears in the full snap page:

```yaml
summary: Fast JSON processor for the terminal
description: |
  my-awesome-tool processes JSON files quickly using a pipeline
  approach. It supports filtering, transforming, and aggregating
  JSON data from multiple sources.

  Features:
  - Fast parallel processing
  - Support for jq-style queries
  - Built-in CSV output
```

### base

The base snap defines the OS libraries your snap runs against:

```yaml
# Ubuntu 22.04 libraries (recommended for new snaps)
base: core22

# Ubuntu 20.04 libraries (older projects)
base: core20

# Minimal base - you provide everything
base: bare
```

### confinement

Controls the security sandbox:

```yaml
# Full sandboxing with plugs for access
confinement: strict

# Development mode - no sandboxing (not publishable to stable)
confinement: devmode

# Classic confinement - full system access (requires Snap Store approval)
confinement: classic
```

### grade

```yaml
# Stable release
grade: stable

# Development build (can't be released to stable channel)
grade: devel
```

## Writing Parts

Parts describe how to build your software. This is where most of the work is:

```yaml
parts:
  my-app:
    # Where to get the source
    source: .
    # Or from a git repository
    # source: https://github.com/myuser/my-app.git
    # source-tag: v1.0.0

    # How to build it
    plugin: make

    # Build dependencies (installed in build environment)
    build-packages:
      - libssl-dev
      - libz-dev

    # Runtime dependencies (staged into the snap)
    stage-packages:
      - libssl3
      - zlib1g

    # Override the build step if needed
    override-build: |
      make all
      make install DESTDIR=$SNAPCRAFT_PART_INSTALL
```

### Common Plugins

**nil** - No build, just stage files:

```yaml
parts:
  static-files:
    plugin: nil
    source: files/
```

**make** - For projects using Makefiles:

```yaml
parts:
  my-c-app:
    plugin: make
    source: .
    make-parameters:
      - PREFIX=/usr
```

**cmake** - For CMake-based projects:

```yaml
parts:
  my-cmake-app:
    plugin: cmake
    source: .
    cmake-parameters:
      - -DCMAKE_INSTALL_PREFIX=/usr
      - -DBUILD_TESTING=OFF
```

**python** - For Python applications:

```yaml
parts:
  my-python-app:
    plugin: python
    source: .
    python-packages:
      - requests
      - click
```

**go** - For Go applications:

```yaml
parts:
  my-go-app:
    plugin: go
    source: .
    build-snaps:
      - go/1.21/stable
```

**dump** - Just copies files from source to staging:

```yaml
parts:
  my-binary:
    plugin: dump
    source: https://github.com/myuser/my-app/releases/download/v1.0/my-app-linux-amd64.tar.gz
    source-type: tar
```

## Defining Apps

Apps are the commands users run when they execute your snap:

```yaml
apps:
  # The main command - accessed as 'snapname' or 'snapname.my-app'
  my-app:
    command: usr/bin/my-app

  # A secondary command
  my-app-helper:
    command: usr/bin/my-app-helper
```

### Adding Interfaces (Plugs)

Strict confinement blocks most system access. Grant access through plugs:

```yaml
apps:
  my-app:
    command: usr/bin/my-app
    plugs:
      - network           # internet access
      - network-bind      # listen on network ports
      - home              # access to ~/
      - removable-media   # access to USB drives, /media
      - x11               # X11 display
      - wayland           # Wayland display
      - opengl            # GPU access
      - audio-playback    # play audio
      - desktop           # desktop integration
```

### Services (Daemons)

For applications that run as background services:

```yaml
apps:
  my-server:
    command: usr/bin/my-server
    daemon: simple        # or 'forking', 'oneshot', 'notify'
    restart-condition: on-failure
    plugs:
      - network-bind
```

## A Complete Example: Packaging a Go CLI Tool

```yaml
name: json-processor
version: git
summary: Fast command-line JSON processor
description: |
  Processes JSON files with filtering and transformation support.
  Handles large files efficiently using streaming.

base: core22
grade: stable
confinement: strict
adopt-info: json-processor

parts:
  json-processor:
    plugin: go
    source: .
    source-type: git
    build-snaps:
      - go/1.21/stable
    override-pull: |
      craftctl default
      craftctl set version=$(git describe --tags --always)

apps:
  json-processor:
    command: bin/json-processor
    plugs:
      - home
      - removable-media
```

## Validating Your snapcraft.yaml

Before building, check for errors:

```bash
# Snapcraft will validate the YAML and report schema errors
snapcraft lint

# Or just try to build and see what happens
snapcraft
```

Common YAML mistakes that cause failures:
- Tabs instead of spaces for indentation
- Missing required fields (name, version, summary, description, base)
- Invalid plugin names
- Wrong indentation level for nested keys

## Building Your First Snap

```bash
# From the directory containing snap/snapcraft.yaml
snapcraft

# On success, you'll get a .snap file
ls *.snap
# my-app_1.0_amd64.snap
```

The first build takes longer because it downloads the base snap and build environment. Subsequent builds are faster.

Once you have a working `.snap` file, install and test it locally before publishing. The next step after writing a working `snapcraft.yaml` is testing the build and then publishing to the Snap Store.
