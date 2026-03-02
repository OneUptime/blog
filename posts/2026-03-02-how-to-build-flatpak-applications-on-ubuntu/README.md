# How to Build Flatpak Applications on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Flatpak, Development, Linux, Package Management

Description: A practical guide to building and packaging applications as Flatpak packages on Ubuntu, covering manifests, runtimes, SDKs, and publishing to Flathub.

---

Building Flatpak applications means packaging your software with a manifest that describes how to build it, what runtime it needs, and what permissions it requires. The result is a Flatpak bundle that works on any Linux distribution with Flatpak installed. This guide covers the complete build process from setting up tools to publishing on Flathub.

## Installing Build Tools

```bash
# Install Flatpak if not already installed
sudo apt install flatpak

# Install flatpak-builder - the build tool
sudo apt install flatpak-builder

# Verify installations
flatpak --version
flatpak-builder --version

# Add Flathub for accessing SDKs
sudo flatpak remote-add --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo

# Add GNOME SDK repository
sudo flatpak remote-add --if-not-exists flathub-beta https://flathub.org/beta-repo/flathub-beta.flatpakrepo
```

## Choosing a Runtime and SDK

Flatpak applications run against a runtime - a base set of libraries. Every Flatpak uses one of a handful of standard runtimes:

- **org.freedesktop.Platform** - Minimal base, useful for CLI tools
- **org.gnome.Platform** - GNOME libraries, for GNOME applications
- **org.kde.Platform** - KDE Frameworks, for KDE applications
- **org.electronjs.Electron2.BaseApp** - Electron application base

Each runtime has a corresponding SDK for building:

```bash
# Install the runtime and SDK you'll use
sudo flatpak install flathub org.gnome.Platform//46
sudo flatpak install flathub org.gnome.Sdk//46

# For a simpler freedesktop base
sudo flatpak install flathub org.freedesktop.Platform//23.08
sudo flatpak install flathub org.freedesktop.Sdk//23.08

# List installed SDKs
flatpak list --runtime | grep Sdk
```

## The Flatpak Manifest

The manifest is a JSON or YAML file that describes your application. Create a file named after your app ID:

```json
{
  "app-id": "com.example.MyApp",
  "runtime": "org.gnome.Platform",
  "runtime-version": "46",
  "sdk": "org.gnome.Sdk",
  "command": "myapp",
  "finish-args": [
    "--share=network",
    "--share=ipc",
    "--socket=fallback-x11",
    "--socket=wayland",
    "--filesystem=home"
  ],
  "modules": [
    {
      "name": "myapp",
      "buildsystem": "cmake-ninja",
      "sources": [
        {
          "type": "git",
          "url": "https://github.com/example/myapp.git",
          "tag": "v1.0.0",
          "commit": "abc123def456"
        }
      ],
      "config-opts": [
        "-DCMAKE_BUILD_TYPE=Release"
      ]
    }
  ]
}
```

The YAML equivalent (both formats work):

```yaml
# com.example.MyApp.yml
app-id: com.example.MyApp
runtime: org.gnome.Platform
runtime-version: '46'
sdk: org.gnome.Sdk
command: myapp

finish-args:
  - --share=network
  - --share=ipc
  - --socket=fallback-x11
  - --socket=wayland
  - --filesystem=home

modules:
  - name: myapp
    buildsystem: cmake-ninja
    sources:
      - type: git
        url: https://github.com/example/myapp.git
        tag: v1.0.0
        commit: abc123def456
    config-opts:
      - -DCMAKE_BUILD_TYPE=Release
```

## Build Systems

Flatpak supports multiple build systems through its `buildsystem` field:

```yaml
# CMake with Ninja (recommended for CMake projects)
- name: myapp
  buildsystem: cmake-ninja
  sources:
    - type: dir
      path: .
  config-opts:
    - -DCMAKE_BUILD_TYPE=Release

# Autotools (./configure && make)
- name: mylib
  buildsystem: autotools
  sources:
    - type: archive
      url: https://example.com/mylib-1.0.tar.gz
      sha256: abcdef123456...

# Meson
- name: myapp
  buildsystem: meson
  sources:
    - type: git
      url: https://github.com/example/myapp.git
      branch: main
  config-opts:
    - -Dbuildtype=release

# Python (pip/setuptools)
- name: myapp
  buildsystem: simple
  build-commands:
    - pip3 install --prefix=/app .
  sources:
    - type: dir
      path: .

# Node.js application
- name: myapp
  buildsystem: simple
  build-commands:
    - npm install --prefix /app
    - cp -r . /app/lib/myapp
  sources:
    - type: dir
      path: .
```

## Source Types

```yaml
# Local directory (for development)
sources:
  - type: dir
    path: .

# Git repository with specific commit (required for reproducibility)
sources:
  - type: git
    url: https://github.com/example/project.git
    tag: v2.0
    commit: a1b2c3d4e5f6...  # Always pin the commit

# Archive (tar.gz, zip, etc.)
sources:
  - type: archive
    url: https://example.com/project-1.0.tar.gz
    sha256: abcdef...  # Checksum for verification

# Single file
sources:
  - type: file
    url: https://example.com/config.py
    sha256: abcdef...

# Patch file
sources:
  - type: patch
    path: fix-build.patch
```

## Building the Flatpak

```bash
# Build the app into a directory
flatpak-builder --force-clean build-dir com.example.MyApp.yml

# Build and install locally for testing
flatpak-builder --force-clean --install --user build-dir com.example.MyApp.yml

# Run the installed app
flatpak run com.example.MyApp

# Build with verbose output for debugging
flatpak-builder --force-clean --verbose build-dir com.example.MyApp.yml
```

The `build-dir` directory contains the built application. The `--force-clean` flag removes it before rebuilding.

## Working with Dependencies

Many applications need libraries that aren't in the runtime. Package them as additional modules:

```yaml
modules:
  # First, build the dependency
  - name: libfoo
    buildsystem: cmake-ninja
    sources:
      - type: archive
        url: https://example.com/libfoo-2.1.tar.gz
        sha256: abcdef...
    config-opts:
      - -DCMAKE_BUILD_TYPE=Release
      - -DBUILD_SHARED_LIBS=ON

  # Then build the app that uses it
  - name: myapp
    buildsystem: cmake-ninja
    sources:
      - type: git
        url: https://github.com/example/myapp.git
        tag: v1.0.0
        commit: abc123...
    build-options:
      env:
        PKG_CONFIG_PATH: /app/lib/pkgconfig
```

## Finish Args: Permissions

The `finish-args` section declares what system resources your app can access:

```yaml
finish-args:
  # Network
  - --share=network          # Internet access
  - --share=ipc              # Shared memory (for X11 performance)

  # Display
  - --socket=wayland         # Wayland display
  - --socket=fallback-x11    # X11 as fallback
  - --device=dri             # GPU access (needed for hardware acceleration)

  # Audio
  - --socket=pulseaudio      # Audio playback
  - --talk-name=org.freedesktop.portal.Desktop  # Desktop portal

  # Filesystem
  - --filesystem=home        # Full home directory
  - --filesystem=xdg-documents  # Documents only
  - --filesystem=/run/media  # USB drives and media

  # D-Bus
  - --talk-name=org.gnome.Shell  # Talk to GNOME Shell
  - --own-name=com.example.MyApp  # Register D-Bus service
```

## Testing the Build

```bash
# Get a shell inside the Flatpak build environment for debugging
flatpak-builder --run build-dir com.example.MyApp.yml bash

# Inside the build environment:
cd /app
ls bin/
ldd bin/myapp  # Check linked libraries

# Run with extra verbose output
flatpak run --verbose com.example.MyApp

# Check what permissions the app is using
flatpak info --show-permissions com.example.MyApp
```

## Creating a Flatpak Bundle

To distribute without a repository, create a bundle file:

```bash
# Build and export to a local repository
flatpak-builder --force-clean --repo=myrepo build-dir com.example.MyApp.yml

# Create a bundle from the repository
flatpak build-bundle myrepo myapp.flatpak com.example.MyApp

# Others can install the bundle with:
flatpak install myapp.flatpak
```

## Publishing to Flathub

Flathub is the primary distribution channel for Flatpak applications:

1. Fork the `flathub` organization's template on GitHub
2. Create a repository named after your app ID: `com.example.MyApp`
3. Add your manifest file
4. Submit a pull request to [flathub/flathub](https://github.com/flathub/flathub)

The Flathub team reviews submissions and requires:
- Verified upstream release (tagged commit, not a branch head)
- Proper application metadata (AppStream/MetaInfo XML)
- Reasonable permission requests
- Functional build

```xml
<!-- com.example.MyApp.metainfo.xml - required for Flathub -->
<?xml version="1.0" encoding="UTF-8"?>
<component type="desktop-application">
  <id>com.example.MyApp</id>
  <name>My App</name>
  <summary>A short description</summary>
  <description>
    <p>A longer description of what the application does.</p>
  </description>
  <url type="homepage">https://example.com/myapp</url>
  <releases>
    <release version="1.0.0" date="2026-03-01"/>
  </releases>
  <content_rating type="oars-1.1"/>
</component>
```

## Automated Builds with GitHub Actions

```yaml
# .github/workflows/flatpak.yml
name: Build Flatpak

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    container:
      image: bilelmoussaoui/flatpak-github-actions:gnome-46
      options: --privileged

    steps:
      - uses: actions/checkout@v4

      - name: Build and test
        uses: bilelmoussaoui/flatpak-github-actions/flatpak-builder@v6
        with:
          bundle: myapp.flatpak
          manifest-path: com.example.MyApp.yml
          run-tests: true
          test-args: >
            --socket=x11
            --env=DISPLAY=:0
```

Building Flatpaks requires more upfront investment than snap packaging for simple cases, but the manifest format is flexible enough to handle complex dependency trees, and the Flathub review process ensures a consistent quality bar across published applications.
