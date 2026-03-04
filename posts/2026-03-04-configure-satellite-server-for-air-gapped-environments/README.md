# How to Configure Satellite Server for Air-Gapped Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Satellite, Air-Gapped, Disconnected, Security

Description: Set up Red Hat Satellite in a disconnected, air-gapped environment where the server has no internet access, using exported content for offline synchronization.

---

In secure environments, Satellite servers cannot access the internet. Red Hat provides a disconnected workflow where you export content on a connected system and import it on the air-gapped Satellite using physical media.

## Architecture Overview

You need two systems:
1. A connected Satellite (or a connected RHEL host with subscription-manager) that can download content from Red Hat CDN
2. The air-gapped Satellite that receives imported content via USB drives or other offline media

## Set Up the Connected Export Host

On the internet-connected system:

```bash
# Install the satellite-maintain package for content export tools
sudo dnf install -y satellite-maintain

# Or if using a dedicated connected Satellite, sync the required repos
hammer repository synchronize \
    --product "Red Hat Enterprise Linux for x86_64" \
    --name "Red Hat Enterprise Linux 9 for x86_64 - BaseOS RPMs 9" \
    --organization "MyOrg"
```

## Export Content from the Connected System

```bash
# Export a complete content view version
hammer content-export complete version \
    --content-view "RHEL9-Base" \
    --version "1.0" \
    --organization "MyOrg"

# The export is saved to /var/lib/pulp/exports/
ls /var/lib/pulp/exports/MyOrg/RHEL9-Base/1.0/

# For subsequent updates, use incremental export
hammer content-export incremental version \
    --content-view "RHEL9-Base" \
    --version "2.0" \
    --organization "MyOrg"
```

## Transfer Content to the Air-Gapped Network

```bash
# Copy the export directory to removable media
sudo cp -r /var/lib/pulp/exports/MyOrg/RHEL9-Base/1.0/ /mnt/usb/

# Or create a tar archive
sudo tar czf /mnt/usb/rhel9-base-1.0.tar.gz \
    -C /var/lib/pulp/exports/MyOrg/RHEL9-Base/ 1.0/
```

Physically transfer the media to the air-gapped network.

## Import Content on the Air-Gapped Satellite

```bash
# Copy the content from the removable media
sudo cp -r /mnt/usb/1.0/ /var/lib/pulp/imports/MyOrg/RHEL9-Base/

# Set correct ownership
sudo chown -R pulp:pulp /var/lib/pulp/imports/

# Import the content
hammer content-import version \
    --path /var/lib/pulp/imports/MyOrg/RHEL9-Base/1.0/ \
    --organization "MyOrg"

# Verify the content view was imported
hammer content-view version list \
    --content-view "RHEL9-Base" \
    --organization "MyOrg"
```

## Configure the Air-Gapped Satellite

```bash
# Disable CDN sync attempts (not reachable anyway)
hammer organization update \
    --name "MyOrg" \
    --redhat-repository-url "file:///var/lib/pulp/imports/"

# Promote the imported content view to environments
hammer content-view version promote \
    --content-view "RHEL9-Base" \
    --version "1.0" \
    --to-lifecycle-environment "Production" \
    --organization "MyOrg"
```

## Export and Import Subscription Manifests

The Satellite needs a manifest even when disconnected:

```bash
# Download the manifest from access.redhat.com on a connected system
# Transfer it to the air-gapped Satellite

# Import the manifest
hammer subscription upload \
    --file /tmp/manifest.zip \
    --organization "MyOrg"
```

## Automate Regular Updates

Create a script for the regular export-transfer-import cycle:

```bash
#!/bin/bash
# export-content.sh - Run on the connected system
hammer content-export incremental version \
    --content-view "RHEL9-Base" \
    --version "latest" \
    --organization "MyOrg"

echo "Export complete. Transfer contents of /var/lib/pulp/exports/ to air-gapped network."
```

This disconnected workflow keeps your air-gapped RHEL systems patched and up to date without ever exposing the Satellite to the internet.
