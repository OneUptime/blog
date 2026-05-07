# How to Install Podman Desktop Extensions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Podman Desktop, Extension, Plugin

Description: Learn how to discover, install, and manage Podman Desktop extensions to add new features and integrations to your container workflow.

---

> Extensions transform Podman Desktop from a container manager into a customizable development platform tailored to your specific workflow needs.

Podman Desktop supports an extension system that allows you to add new capabilities such as Kubernetes cluster providers, container runtime integrations, and developer tools. Extensions can be installed from the built-in catalog or from OCI registries. This guide walks you through finding, installing, and managing extensions.

---

## Understanding Podman Desktop Extensions

Extensions in Podman Desktop are packaged as OCI images and can add:

- New container runtime providers
- Kubernetes cluster management tools
- Image building capabilities
- Custom UI panels and actions
- Integration with external services

```bash
# Podman Desktop extensions are OCI images

# They follow a specific structure with package.json and extension code
# The extension catalog is available directly in the UI
```

## Browsing Available Extensions

Podman Desktop includes a built-in extension catalog:

1. Open Podman Desktop and click **Extensions** in the left sidebar.
2. Browse the **Catalog** tab to see available extensions.
3. Each extension shows its name, description, publisher, and version.
4. Click on an extension for more details including features and requirements.

Popular extensions include Kind cluster support, Minikube integration, Docker compatibility tools, and image layer analyzers.

## Installing Extensions from the Catalog

To install an extension from the built-in catalog:

1. Navigate to **Extensions > Catalog**.
2. Find the extension you want to install.
3. Click the **Install** button next to the extension.
4. Wait for the download and installation to complete.
5. The extension appears in the **Installed** tab once ready.

Some extensions may require a restart of Podman Desktop to activate fully.

## Installing Extensions from OCI Images

You can install extensions directly from OCI registries:

1. Go to **Extensions** in Podman Desktop.
2. Click the **Install custom...** button.
3. Enter the OCI image reference (e.g., `ghcr.io/publisher/extension-name:latest`).
4. Click **Install** to pull and activate the extension.

```bash
# Extensions are standard OCI images that you can inspect
podman pull ghcr.io/podman-desktop/extension-bootc:next
podman inspect ghcr.io/podman-desktop/extension-bootc:next
```

## Managing Installed Extensions

View and manage your installed extensions:

1. Go to **Extensions > Installed** to see all active extensions.
2. Each extension shows details such as its status and version.
3. Click the toggle to enable or disable an extension without removing it.
4. Click **Remove** to uninstall an extension completely.

## Extension Settings

Many extensions add their own settings:

1. Go to **Settings** in Podman Desktop.
2. Look for extension-specific sections in the settings menu.
3. Configure options like default cluster names, resource limits, or API endpoints.
4. Changes typically take effect immediately without a restart.

## Common Extensions and Their Uses

Here are some useful extensions to consider:

```bash
# Kind Extension - manages Kind Kubernetes clusters
# Adds the ability to create and manage Kind clusters from the UI

# Minikube Extension - integrates Minikube cluster management
# Provides start, stop, and configure options for Minikube

# Podman AI Lab - experiment with AI models locally
# Run large language models inside containers

# Bootc Extension - build bootable container images
# Create OS images from container definitions

# Headlamp Extension - Kubernetes dashboard
# Adds a visual Kubernetes cluster dashboard
```

## Updating Extensions

Keep your extensions up to date:

1. Go to **Extensions > Installed**.
2. Extensions with available updates show an update indicator.
3. Click **Update** to pull the latest version.
4. Podman Desktop will download the new version and swap it in.

You can also check for updates manually by reviewing the extension catalog.

## Disabling and Re-enabling Extensions

Temporarily disable extensions you do not currently need:

1. Navigate to **Extensions > Installed**.
2. Find the extension and click the toggle switch to disable it.
3. The extension remains installed but stops consuming resources.
4. Toggle it back on when you need it again.

This is useful when an extension conflicts with another tool or when you want to reduce resource usage.

## Troubleshooting Extension Issues

If an extension is not working correctly:

```bash
# Check Podman Desktop logs for extension errors from the UI:
# 1. Click the Troubleshooting icon in the status bar.
# 2. Select the Logs tab to view logs.
# 3. Optionally use Gather Logs to save all logs as a .zip file.

# You can also check the extension's status on the Extensions page.

# Common issues:
# - Extension requires a newer Podman Desktop version
# - Missing dependencies (e.g., Kind binary not installed)
# - Network issues preventing OCI image download
# - Conflicting extensions

# Try reinstalling the extension
# 1. Remove the extension from the Installed tab
# 2. Restart Podman Desktop
# 3. Reinstall from the catalog
```

## Summary

Podman Desktop extensions expand the capabilities of your container management tool with Kubernetes providers, developer integrations, and custom features. The built-in catalog makes discovery simple, and OCI-based packaging ensures consistent installation. By managing your extensions effectively, you can build a customized container development environment that fits your specific workflow needs.
