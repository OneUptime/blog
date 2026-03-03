# How to Publish Snaps to the Snap Store from Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Snap, Snap Store, Snapcraft, Publishing

Description: A step-by-step guide to publishing snap packages to the Snap Store from Ubuntu, including account setup, name registration, channel management, and automated CI publishing.

---

Once you've built and tested your snap locally, publishing it to the Snap Store makes it available to millions of Ubuntu users. The Snap Store distributes to Ubuntu, Debian, Fedora, and other distributions that have snap support. This guide covers the publishing process from account setup through ongoing release management.

## Create a Snapcraft Account

Before you can publish, you need an Ubuntu One account, which also serves as your Snapcraft login:

1. Visit https://login.ubuntu.com and create an account if you don't have one
2. Visit https://snapcraft.io/account to set up your publisher profile
3. Set your publisher name - this appears next to your snaps in the store

## Authenticate Snapcraft CLI

```bash
# Log in to the Snap Store
snapcraft login

# Enter your Ubuntu One credentials when prompted
# This saves a credential token locally

# Verify login
snapcraft whoami
```

For CI environments, use stored credentials:

```bash
# Export credentials for CI use
snapcraft export-login credentials.txt

# In CI, use the credentials file
snapcraft login --with credentials.txt

# Or set as environment variable
export SNAPCRAFT_STORE_CREDENTIALS=$(cat credentials.txt)
```

## Register Your Snap Name

Snap names are globally unique in the store. Register yours before someone else does:

```bash
# Register a snap name
snapcraft register my-app-name

# Check if a name is available
# Just try to register - it will tell you if taken
snapcraft register my-desired-name
```

Name registration is free. Names must be:
- Lowercase letters, digits, and hyphens
- 2-40 characters
- Cannot start or end with hyphens
- Must be unique across the entire Snap Store

If your preferred name is taken, the store will tell you who owns it. You can reach out to them through Snapcraft's claim process if the name is squatted.

## Configure Your snapcraft.yaml

Ensure your `snapcraft.yaml` uses the registered name:

```yaml
name: my-app-name    # must match registered name exactly
version: '1.0.0'
summary: A brief description of my app
description: |
  Longer description that appears in the Snap Store listing.

base: core22
grade: stable        # 'stable' for production releases, 'devel' for testing
confinement: strict

parts:
  my-app:
    plugin: go
    source: .
    build-snaps:
      - go/1.21/stable

apps:
  my-app:
    command: bin/my-app
    plugs:
      - network
      - home
```

## Build and Upload

```bash
# Build a clean snap
snapcraft clean
snapcraft

# Verify the snap file
ls *.snap
# my-app-name_1.0.0_amd64.snap

# Upload to the store (but don't release yet)
snapcraft upload my-app-name_1.0.0_amd64.snap

# Upload and immediately release to a channel
snapcraft upload my-app-name_1.0.0_amd64.snap --release=stable

# Upload to edge channel for testing
snapcraft upload my-app-name_1.0.0_amd64.snap --release=edge
```

The upload process:
1. Pushes the snap file to the store
2. The store runs automated review checks (virus scanning, policy checks)
3. The snap gets a revision number
4. You can then release that revision to channels

## Understanding Channels

Channels control which users get which version:

```text
<track>/<risk>/<branch>

Tracks: latest (default), specific versions like 1.0, 2.0
Risk levels: stable, candidate, beta, edge

Examples:
- latest/stable     - Most conservative, largest audience
- latest/candidate  - Release candidate testing
- latest/beta       - Beta testing
- latest/edge       - Bleeding edge, auto-published from CI
```

Users install from channels:

```bash
# User installs from stable (default)
snap install my-app

# User installs from edge
snap install my-app --channel=edge
```

## Releasing to Channels

```bash
# List available revisions
snapcraft list-revisions my-app-name

# Release revision 3 to stable
snapcraft release my-app-name 3 stable

# Release to multiple channels at once
snapcraft release my-app-name 3 stable candidate

# Release to a specific track
snapcraft release my-app-name 3 1.0/stable
```

A good workflow is: build -> upload -> test on edge -> promote to beta -> promote to stable:

```bash
# Upload and release to edge for initial testing
snapcraft upload my-app_1.0_amd64.snap --release=edge

# After testing, promote to beta
snapcraft release my-app-name 5 beta

# After beta testing, promote to stable
snapcraft release my-app-name 5 stable
```

This way the same tested revision moves through channels without rebuilding.

## Creating Version Tracks

For software with LTS or major version tracks:

```bash
# Create a version track (requires snap store approval for non-default tracks)
snapcraft create-track my-app-name --version=1.0

# Release to a specific track
snapcraft release my-app-name 5 1.0/stable
snapcraft release my-app-name 8 2.0/stable

# Users can then pin to a specific major version
snap install my-app --channel=1.0/stable
```

## Store Page Configuration

Enhance your snap's store listing with additional metadata:

```bash
# Set up store metadata
# Visit https://snapcraft.io/my-app-name/listing to fill in:
# - Long description with markdown
# - Screenshots (up to 5)
# - Contact information
# - License
# - Categories
# - Keywords

# You can also manage metadata via CLI for some fields
snapcraft set-default-track my-app-name 2.0
```

For screenshots and icons, upload through the web dashboard at https://snapcraft.io/publisher.

## Automating Releases with CI

A typical GitHub Actions workflow:

```yaml
# .github/workflows/publish-snap.yml
name: Publish Snap

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build snap
        uses: snapcore/action-build@v1
        id: build

      - name: Publish snap
        uses: snapcore/action-publish@v1
        env:
          SNAPCRAFT_STORE_CREDENTIALS: ${{ secrets.SNAPCRAFT_STORE_CREDENTIALS }}
        with:
          snap: ${{ steps.build.outputs.snap }}
          release: stable
```

Store the credentials secret:

```bash
# Export credentials for CI
snapcraft export-login --snaps=my-app-name --channels=stable - | base64

# Add the base64 output as SNAPCRAFT_STORE_CREDENTIALS in GitHub Secrets
```

## Monitoring Your Snap

```bash
# View download metrics
snapcraft status my-app-name

# Detailed metrics by channel
snapcraft metrics my-app-name --name installed_base --start 2026-01-01 --end 2026-03-01

# List all revisions
snapcraft list-revisions my-app-name

# Check current channel map
snapcraft status my-app-name
```

## Handling Store Review Failures

The Snap Store runs automated security reviews. Common rejection reasons:

```bash
# Check review status after upload
snapcraft list-revisions my-app-name

# The status column shows: approved, rejected, or needs-review
```

Common issues:
- Using `--classic` confinement requires manual approval from the store
- Some interfaces are "super privileged" and need approval
- Binaries with known vulnerabilities get flagged

For classic confinement, file a request:
1. Build and upload the snap
2. Go to the store listing page
3. Follow the link to request classic confinement
4. Provide justification for why strict confinement won't work

## Updating and Maintaining

```bash
# Check what users have installed
snapcraft metrics my-app-name --name weekly_device_change

# Close a channel to stop serving snaps from it
snapcraft close my-app-name edge

# Re-open a channel
snapcraft release my-app-name 10 edge
```

Publishing to the Snap Store sets up automatic update delivery to all users. When you release a new revision to stable, all users on the `latest/stable` channel will automatically update within 24 hours.
