# How to Configure VS Code as the Default IDE in Google Cloud Workstations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Google Cloud, Cloud Workstations, VS Code, IDE, Development Environment

Description: Learn how to configure VS Code as the default IDE in Google Cloud Workstations including extensions, settings, and connecting from your local VS Code client.

---

Most developers I know have strong opinions about their IDE, and VS Code has become the default choice for a huge portion of the industry. Google Cloud Workstations supports VS Code out of the box through Code OSS (the open-source version of VS Code), and with some configuration, you can make it feel exactly like your local setup. You can even connect your local VS Code installation to a Cloud Workstation, which gives you the best of both worlds - local editor feel with cloud compute.

Let me walk through the different ways to set up and configure VS Code in Cloud Workstations.

## Option 1: Using the Built-in Code OSS (Browser-Based)

The simplest approach is to use the pre-built Code OSS image that Google provides. This gives you a browser-based VS Code experience with no setup required.

```bash
# Create a workstation configuration with Code OSS as the IDE

gcloud workstations configs create vscode-config \
    --project=my-project \
    --region=us-central1 \
    --cluster=dev-cluster \
    --machine-type=e2-standard-8 \
    --pd-disk-size=200 \
    --pd-disk-type=pd-ssd \
    --idle-timeout=7200s \
    --container-predefined-image=codeoss
```

When a developer starts a workstation with this configuration and opens it in their browser, they get the full VS Code editor experience. The interface is nearly identical to the desktop version.

## Customizing the Browser-Based VS Code

### Pre-Installing Extensions

You can install VS Code extensions from the Open VSX Registry with a startup script in your custom container image so they are available when a developer starts their workstation.

```dockerfile
# Dockerfile for a workstation with startup-installed VS Code extensions
FROM us-central1-docker.pkg.dev/cloud-workstations-images/predefined/code-oss:latest

COPY install-code-oss-extensions.sh /etc/workstation-startup.d/120_install-code-oss-extensions.sh
RUN chmod +x /etc/workstation-startup.d/120_install-code-oss-extensions.sh
```

The startup script runs the Code OSS CLI as the workstation user:

```bash
#!/bin/bash
# install-code-oss-extensions.sh

sudo -u user /opt/code-oss/bin/codeoss-cloudworkstations \
    --install-extension ms-python.python \
    --install-extension golang.go \
    --install-extension dbaeumer.vscode-eslint \
    --install-extension esbenp.prettier-vscode \
    --install-extension eamodio.gitlens \
    --install-extension redhat.vscode-yaml \
    --install-extension ms-kubernetes-tools.vscode-kubernetes-tools
```

### Setting Default VS Code Settings

You can also bake in default settings that apply to all workstations. These go into the machine settings file:

```dockerfile
# Add to your Dockerfile after the extension installation
# Create default VS Code settings for all developers
RUN mkdir -p /etc/workstation-startup.d/

COPY setup-vscode-settings.sh /etc/workstation-startup.d/050-setup-vscode-settings.sh
RUN chmod +x /etc/workstation-startup.d/050-setup-vscode-settings.sh
```

The startup script creates the settings if they do not already exist:

```bash
#!/bin/bash
# setup-vscode-settings.sh
# Sets up default VS Code settings on first run
# These are placed in the persistent home directory so they survive restarts

SETTINGS_DIR="/home/user/.codeoss-cloudworkstations/data/Machine"
SETTINGS_FILE="${SETTINGS_DIR}/settings.json"

# Only create settings if they do not already exist
# This respects developer customizations
if [ ! -f "${SETTINGS_FILE}" ]; then
    mkdir -p "${SETTINGS_DIR}"
    cat > "${SETTINGS_FILE}" << 'SETTINGS'
{
    "editor.fontSize": 14,
    "editor.tabSize": 4,
    "editor.formatOnSave": true,
    "editor.minimap.enabled": false,
    "editor.bracketPairColorization.enabled": true,
    "editor.guides.bracketPairs": true,
    "editor.suggestSelection": "first",
    "editor.wordWrap": "on",
    "terminal.integrated.fontSize": 13,
    "terminal.integrated.defaultProfile.linux": "bash",
    "files.autoSave": "afterDelay",
    "files.autoSaveDelay": 1000,
    "files.trimTrailingWhitespace": true,
    "files.insertFinalNewline": true,
    "git.autofetch": true,
    "git.confirmSync": false,
    "workbench.startupEditor": "none",
    "workbench.colorTheme": "Default Dark+",
    "telemetry.telemetryLevel": "off",
    "python.defaultInterpreterPath": "/usr/bin/python3",
    "go.toolsManagement.autoUpdate": true,
    "[javascript]": {
        "editor.defaultFormatter": "esbenp.prettier-vscode"
    },
    "[typescript]": {
        "editor.defaultFormatter": "esbenp.prettier-vscode"
    },
    "[go]": {
        "editor.defaultFormatter": "golang.go"
    }
}
SETTINGS
    chown -R user:user "${SETTINGS_DIR}"
fi
```

## Option 2: Connecting Local VS Code to a Cloud Workstation

Many developers prefer using their local VS Code installation because they already have it configured exactly how they want. Cloud Workstations supports this through SSH.

### Step 1: Install Remote - SSH

Install VS Code's "Remote - SSH" extension locally. You can also install Cloud Code if you want Google Cloud development tools inside VS Code.

### Step 2: Configure SSH Access

Set up the SSH tunnel for your workstation:

```bash
# Start your workstation if it is not already running
gcloud workstations start my-workstation \
    --project=my-project \
    --region=us-central1 \
    --cluster=dev-cluster \
    --config=vscode-config

# Open an SSH tunnel to the workstation
gcloud workstations start-tcp-tunnel my-workstation 22 \
    --project=my-project \
    --region=us-central1 \
    --cluster=dev-cluster \
    --config=vscode-config \
    --local-host-port=:1025
```

Leave the tunnel command running. It prints a "Listening on port" message; use that local port when connecting from VS Code.

### Step 3: Connect from Local VS Code

With the SSH tunnel running, use VS Code's Remote - SSH extension to connect:

1. Open VS Code locally
2. Press Ctrl+Shift+P (or Cmd+Shift+P on Mac) and type "Remote-SSH: Connect to Host"
3. Enter `user@localhost:1025`, replacing `1025` with the local port printed by the tunnel command
4. VS Code opens a new window connected to the cloud workstation

Your local VS Code settings, themes, keybindings, and UI extensions are used, but workspace extensions normally run on the remote workstation and may need to be installed there. File operations and terminal commands run on the cloud workstation. This means you get your personalized editor experience with the compute power and network access of the cloud machine.

## Option 3: Using VS Code Tunnels

VS Code also supports tunnels, which can create a connection between your local VS Code and the workstation without using VS Code's Remote - SSH flow:

```bash
#!/bin/bash
# setup-vscode-tunnel.sh
# Add this as a startup script in your custom image
# It starts a VS Code tunnel that your local VS Code can connect to

# Download and install the VS Code CLI
curl -L 'https://code.visualstudio.com/sha/download?build=stable&os=cli-linux-x64' \
    --output /tmp/vscode-cli.tar.gz
tar -xf /tmp/vscode-cli.tar.gz -C /usr/local/bin

# The developer runs this command to start the tunnel
# They will get a URL to authenticate and connect
# code tunnel --accept-server-license-terms
```

## Configuring Keyboard Shortcuts and Keybindings

For the browser-based Code OSS, some keyboard shortcuts conflict with browser shortcuts. You can configure custom keybindings to work around this:

```json
// keybindings.json
// Add this from Preferences: Open Keyboard Shortcuts (JSON)
[
    {
        // Use Ctrl+Shift+` instead of Ctrl+` for terminal toggle
        // (Ctrl+` is often captured by the browser)
        "key": "ctrl+shift+`",
        "command": "workbench.action.terminal.toggleTerminal"
    },
    {
        // Quick file switching
        "key": "ctrl+shift+e",
        "command": "workbench.action.quickOpen"
    }
]
```

## Setting Up Workspace Trust

For teams that want to enforce workspace trust settings across all workstations:

```json
// Add to the machine settings.json
{
    "security.workspace.trust.enabled": true,
    "security.workspace.trust.startupPrompt": "once",
    "security.workspace.trust.untrustedFiles": "prompt",
    "security.workspace.trust.emptyWindow": true
}
```

## Syncing Settings Across Workstations

If a developer has multiple workstations (say one for backend and one for frontend work), they can sync settings using VS Code's built-in Settings Sync with a GitHub or Microsoft account. This keeps editor preferences consistent across their environments.

To enable this, developers simply sign in through the Settings Sync option in the bottom-left corner of VS Code. Their settings, extensions, keybindings, and snippets can sync across VS Code installations, although VS Code does not sync extensions to or from a remote SSH window automatically.

## Performance Tips

A few things to keep in mind for the best experience:

Use a region close to your developers. The browser-based IDE is sensitive to latency, so choose a region that minimizes round-trip time.

Allocate enough memory. VS Code itself uses a fair amount of RAM, and with extensions and a language server running, 8 GB is the minimum I would recommend for the machine type.

Use SSD persistent disks. The editor constantly reads and writes to disk for indexing, search, and file watching. SSDs make a noticeable difference in responsiveness.

## Summary

VS Code in Cloud Workstations works well whether you use it in the browser or connect from your local installation. The browser experience through Code OSS is nearly identical to desktop VS Code, and pre-installing extensions and settings in a custom container image means your team gets a productive environment from the start. For developers who want their exact local setup, connecting via SSH or tunnels gives them cloud compute with a local feel. Pick the approach that fits your team best, and know that you can mix and match - some developers might prefer the browser while others connect from their local editors.
