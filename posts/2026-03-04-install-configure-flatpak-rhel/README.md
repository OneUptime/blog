# How to Install and Configure Flatpak on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Flatpak, Application Management, Sandboxing, Linux

Description: Install and configure Flatpak on RHEL to run sandboxed applications that are independent of system libraries and provide their own runtimes.

---

Flatpak is a framework for distributing desktop applications on Linux. Applications run in isolated sandboxes with their own libraries and dependencies, which means they work consistently regardless of the host system's package versions. This is useful for running newer application versions on RHEL's stable base.

## Install Flatpak

```bash
# Install Flatpak
sudo dnf install -y flatpak

# Install the GNOME Software Flatpak plugin for graphical management
sudo dnf install -y gnome-software-plugin-flatpak
```

## Add the Flathub Repository

Flathub is the primary source for Flatpak applications.

```bash
# Add the Flathub repository
flatpak remote-add --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo

# Verify it was added
flatpak remotes
```

## Search for Applications

```bash
# Search for an application
flatpak search firefox

# Search with more details
flatpak search vlc
```

## Install an Application

```bash
# Install an application from Flathub
flatpak install flathub org.mozilla.firefox

# Install with automatic yes to prompts
flatpak install -y flathub org.videolan.VLC

# Install a specific application by partial name
flatpak install flathub gimp
```

## Run a Flatpak Application

```bash
# Run an installed Flatpak application
flatpak run org.mozilla.firefox

# Flatpak applications also appear in the GNOME Activities menu
# and can be launched like any other application
```

## List Installed Applications

```bash
# List all installed Flatpak applications
flatpak list

# List only applications (not runtimes)
flatpak list --app

# List only runtimes
flatpak list --runtime

# Show detailed information about an installed app
flatpak info org.mozilla.firefox
```

## Update Applications

```bash
# Update all installed Flatpak applications
flatpak update

# Update a specific application
flatpak update org.mozilla.firefox

# Check for available updates without installing
flatpak update --no-deploy
```

## Remove Applications

```bash
# Remove an application
flatpak uninstall org.mozilla.firefox

# Remove an application and its data
flatpak uninstall --delete-data org.mozilla.firefox

# Remove unused runtimes and extensions
flatpak uninstall --unused
```

## Configure Flatpak for All Users

```bash
# Install an application system-wide (available to all users)
sudo flatpak install --system flathub org.mozilla.firefox

# Install for current user only
flatpak install --user flathub org.mozilla.firefox
```

## View Application Permissions

```bash
# Check the permissions of an installed application
flatpak info --show-permissions org.mozilla.firefox

# View the sandbox metadata
flatpak info --show-metadata org.mozilla.firefox
```

## Troubleshooting

```bash
# Repair Flatpak installation
flatpak repair

# Clear the Flatpak cache
rm -rf ~/.cache/flatpak/

# Check for runtime issues
flatpak run --log-session-bus org.mozilla.firefox
```

Flatpak provides a safe way to run the latest application versions on RHEL while maintaining system stability through sandboxed isolation.
