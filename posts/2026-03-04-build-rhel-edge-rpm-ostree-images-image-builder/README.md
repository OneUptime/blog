# How to Build RHEL for Edge (rpm-ostree) Images Using Image Builder

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Image Builder, Edge, Rpm-ostree

Description: Build RHEL for Edge images using Image Builder for immutable deployments.

---

## Overview

Build RHEL for Edge images using Image Builder for immutable deployments. RHEL Image Builder lets you create customized, deployable operating system images for physical, virtual, and cloud environments.

## Prerequisites

- A RHEL 9 system with a valid subscription
- Enabled BaseOS and AppStream repositories
- Root or sudo access
- The osbuild-composer, composer-cli, and cockpit-composer packages

## Step 1 - Install Image Builder

```bash
sudo dnf install -y osbuild-composer composer-cli cockpit-composer bash-completion firewalld
sudo systemctl enable --now firewalld osbuild-composer.socket cockpit.socket
sudo firewall-cmd --add-service=cockpit --permanent
sudo firewall-cmd --reload
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

Start a RHEL for Edge Commit compose for network-based deployments:

```bash
composer-cli compose start my-custom-image edge-commit
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

Extract and serve the RHEL for Edge commit from a web server, then deploy it to your target edge device with Anaconda and Kickstart. For non-network-based deployments, create an `edge-container` and then an `edge-installer` image instead.

## Using the Cockpit Web Console

You can also manage Image Builder through the Cockpit web console at `https://your-host:9090`. Navigate to "Image Builder" to create blueprints and start composes from the browser.

## Summary

You have learned how to build RHEL for Edge (rpm-ostree) images using Image Builder. Image Builder provides a consistent workflow for creating RHEL for Edge images across supported deployment targets.
