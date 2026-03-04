# How to Create Azure-Compatible RHEL 9 VM Images with Image Builder

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Image Builder, Azure, VHD, Cloud

Description: Create Azure-compatible RHEL 9 VM images with Image Builder.

---

## Overview

Create Azure-compatible RHEL 9 VM images with Image Builder. RHEL Image Builder lets you create customized, deployable operating system images for physical, virtual, and cloud environments.

## Prerequisites

- A RHEL 9 system with a valid subscription
- Root or sudo access
- The osbuild-composer and composer-cli packages

## Step 1 - Install Image Builder

```bash
sudo dnf install -y osbuild-composer composer-cli cockpit-composer
sudo systemctl enable --now osbuild-composer.socket
```

## Step 2 - Create a Blueprint

Create a TOML blueprint file `my-image.toml`:

```toml
name = "my-custom-image"
description = "Custom RHEL 9 image"
version = "1.0.0"

[[packages]]
name = "vim-enhanced"
version = "*"

[[packages]]
name = "tmux"
version = "*"

[[customizations.user]]
name = "admin"
groups = ["wheel"]
```

Push the blueprint:

```bash
composer-cli blueprints push my-image.toml
```

## Step 3 - Start a Compose

List available image types:

```bash
composer-cli compose types
```

Start a compose (e.g., qcow2 for KVM, ami for AWS, vhd for Azure):

```bash
composer-cli compose start my-custom-image qcow2
```

## Step 4 - Monitor and Download

Check the status:

```bash
composer-cli compose status
```

Download the finished image:

```bash
composer-cli compose image <compose-uuid>
```

## Step 5 - Deploy the Image

Deploy the image to your target platform (KVM, AWS, Azure, VMware) following the platform-specific deployment process.

## Using the Cockpit Web Console

You can also manage Image Builder through the Cockpit web console at `https://your-host:9090`. Navigate to "Image Builder" to create blueprints and start composes from the browser.

## Summary

You have learned how to create azure-compatible rhel 9 vm images with image builder. Image Builder provides a consistent workflow for creating RHEL images across all deployment targets.
