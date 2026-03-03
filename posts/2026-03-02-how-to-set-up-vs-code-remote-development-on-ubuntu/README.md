# How to Set Up VS Code Remote Development on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, VS Code, Remote Development, SSH

Description: Step-by-step setup of VS Code Remote Development on Ubuntu, covering SSH remotes, Dev Containers, and Remote Tunnels for flexible development workflows.

---

VS Code's Remote Development extensions let you use a local VS Code instance to work on files and run code on a remote Ubuntu machine, inside a container, or through a tunnel. The editor runs on your local machine while the language servers, debuggers, and terminals run on the target. This guide covers setting up each remote development mode on Ubuntu.

## Prerequisites

You need VS Code installed on your local machine and an Ubuntu system you want to connect to. For SSH-based remotes, the Ubuntu machine needs an SSH server running.

On the Ubuntu target:

```bash
# Install and enable OpenSSH server
sudo apt update
sudo apt install -y openssh-server

# Start and enable the SSH service
sudo systemctl enable --now ssh

# Check it's listening
ss -tlnp | grep :22
```

On your local machine, install VS Code and then add the Remote Development extension pack from the marketplace. It includes:
- Remote - SSH
- Dev Containers
- Remote - Tunnels
- WSL (for Windows users)

## Setting Up SSH Key Authentication

Password authentication works but SSH keys are more convenient and more secure. Set these up before configuring VS Code.

```bash
# On your local machine - generate a key pair if you don't have one
ssh-keygen -t ed25519 -C "your-email@example.com"

# Copy your public key to the Ubuntu server
ssh-copy-id username@ubuntu-server-ip

# Test the connection
ssh username@ubuntu-server-ip
```

Configure your local `~/.ssh/config` to make connections easier to manage:

```text
# ~/.ssh/config
Host myubuntu
    HostName 192.168.1.100
    User myusername
    IdentityFile ~/.ssh/id_ed25519
    ServerAliveInterval 60
    ServerAliveCountMax 3

Host dev-server
    HostName dev.mycompany.com
    User deploy
    IdentityFile ~/.ssh/deploy_key
    Port 2222
```

With this config, VS Code will automatically discover available SSH hosts from your config file.

## Connecting with Remote - SSH

Open VS Code and use the Command Palette (Ctrl+Shift+P) and search for "Remote-SSH: Connect to Host". You'll see your configured hosts listed.

Alternatively, click the green remote indicator in the bottom-left corner of VS Code.

When you first connect to a host, VS Code installs its server component on the remote machine automatically. This takes a minute the first time.

```bash
# The VS Code server installs itself here on the remote
ls ~/.vscode-server/

# You can also check the VS Code server process
ps aux | grep vscode-server
```

### Troubleshooting SSH Connections

If VS Code can't connect:

```bash
# Test SSH connectivity manually first
ssh -v username@hostname

# Check if the remote machine has enough disk space
# (VS Code server needs ~200MB)
df -h ~/.vscode-server

# Check that bash is available (VS Code server requires it)
which bash

# If connecting through a jump host, add to your SSH config
Host target
    HostName 10.0.0.5
    User admin
    ProxyJump jumphost.example.com
```

## Installing Extensions on Remote

Extensions installed on your local VS Code don't automatically appear on remote machines. You need to install them on the remote:

1. Open a remote window
2. Go to the Extensions panel
3. Extensions will show as "Install on Remote" or "Install on SSH: hostname"

Some extensions are "workspace" extensions that only make sense running on the remote (language servers, debuggers). Others are "UI" extensions that should stay local (themes, keybindings).

Force-install an extension on the remote via the command line:

```bash
# List installed extensions
code --list-extensions

# The extension syncing happens through the VS Code UI,
# but you can pre-install extensions on the remote server
# by placing them in the right directory
ls ~/.vscode-server/extensions/
```

## Remote Development with Dev Containers

Dev Containers let you define your entire development environment in a `devcontainer.json` file. This requires Docker on your Ubuntu machine.

```bash
# Install Docker on Ubuntu
sudo apt update
sudo apt install -y docker.io
sudo usermod -aG docker $USER
newgrp docker

# Verify Docker works
docker run hello-world
```

A basic `.devcontainer/devcontainer.json`:

```json
{
    "name": "Ubuntu Dev Environment",
    "image": "ubuntu:22.04",
    "features": {
        "ghcr.io/devcontainers/features/common-utils:2": {
            "installZsh": true,
            "username": "vscode"
        },
        "ghcr.io/devcontainers/features/node:1": {
            "version": "20"
        },
        "ghcr.io/devcontainers/features/python:1": {
            "version": "3.11"
        }
    },
    "customizations": {
        "vscode": {
            "extensions": [
                "ms-python.python",
                "dbaeumer.vscode-eslint"
            ],
            "settings": {
                "terminal.integrated.defaultProfile.linux": "zsh"
            }
        }
    },
    "postCreateCommand": "pip install -r requirements.txt",
    "remoteUser": "vscode",
    "mounts": [
        "source=${localWorkspaceFolder},target=/workspace,type=bind"
    ]
}
```

To use it on a remote Ubuntu machine:
1. First connect to the Ubuntu machine via Remote - SSH
2. Then use "Dev Containers: Reopen in Container" from the Command Palette

VS Code handles the Docker interaction on the remote machine.

## Setting Up Remote Tunnels

Remote Tunnels don't require a direct network connection or open firewall ports. They work through Microsoft's relay service, which is useful for machines behind NAT or strict firewalls.

On the Ubuntu machine you want to access:

```bash
# Download the VS Code CLI
wget -O vscode_cli.tar.gz \
    "https://code.visualstudio.com/sha/download?build=stable&os=cli-alpine-x64"
tar xf vscode_cli.tar.gz

# Start a tunnel (you'll authenticate with GitHub or Microsoft)
./code tunnel

# To run as a systemd service for persistent tunnels
./code tunnel service install
sudo systemctl enable --now code-tunnel
```

The tunnel command gives you a URL like `https://vscode.dev/tunnel/my-machine-name`. Open that URL in any browser or connect from VS Code desktop using "Remote Tunnels: Connect to Tunnel".

## Port Forwarding

When running services on the remote machine, VS Code can forward ports to your local machine:

```bash
# VS Code automatically detects ports that processes start listening on
# You can also manually add port forwards

# The forwarded ports panel shows active forwards
# Access remote port 3000 as localhost:3000 locally
```

In the PORTS panel at the bottom of VS Code, click "Forward a Port" and enter the remote port number. You can set forwarding as public or private.

For a service running on the remote:

```bash
# Start a web server on the remote
python3 -m http.server 8080

# VS Code will detect port 8080 and offer to forward it
# You can then access it at localhost:8080 on your local machine
```

## Optimizing Remote Performance

Remote development adds network latency to every file operation. A few settings improve the experience:

```json
// settings.json (remote)
{
    // Reduce file watcher overhead on large repos
    "files.watcherExclude": {
        "**/node_modules/**": true,
        "**/.git/objects/**": true,
        "**/dist/**": true
    },
    // Disable telemetry on remote
    "telemetry.telemetryLevel": "off",
    // Use the remote terminal
    "terminal.integrated.defaultProfile.linux": "bash"
}
```

On the remote machine, ensure it has adequate resources:

```bash
# Check available memory (VS Code server needs at least 1GB free)
free -h

# Check CPU load
uptime

# Check disk space for VS Code server and extensions
df -h ~
```

VS Code Remote Development makes working on Ubuntu servers feel nearly identical to local development. The SSH mode requires minimal setup and works well for most server environments. Dev Containers add environment reproducibility, and Remote Tunnels handle cases where direct network access isn't available.
