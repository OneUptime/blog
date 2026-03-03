# How to Configure VS Code Remote SSH on Ubuntu Servers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, VS Code, SSH, Development, Remote Development

Description: Set up VS Code Remote SSH to develop directly on Ubuntu servers, covering SSH key setup, VS Code configuration, port forwarding, and troubleshooting common connection issues.

---

VS Code Remote SSH lets you open a folder on a remote Ubuntu server and work with it as if it were local. The editor, IntelliSense, debugging, and extensions run on the remote machine while the VS Code window runs on your local workstation. This means you get full IDE features against code that lives on the server - no more editing in vim over SSH or syncing files manually.

## Prerequisites

You need:
- VS Code installed on your local machine
- SSH access to the Ubuntu server
- A VS Code account is not required

On the Ubuntu server, ensure SSH server is running:

```bash
sudo apt update
sudo apt install openssh-server -y
sudo systemctl enable --now ssh
```

## Installing the Remote SSH Extension

In VS Code, install the Remote - SSH extension:

1. Open VS Code
2. Press `Ctrl+Shift+X` to open Extensions
3. Search for "Remote - SSH"
4. Install the extension published by Microsoft (the official one)

Alternatively, install from the command line:

```bash
code --install-extension ms-vscode-remote.remote-ssh
```

## Setting Up SSH Key Authentication

Password authentication over SSH works but key-based authentication is recommended for convenience and security.

### Generating an SSH Key Pair

On your local machine:

```bash
# Generate an Ed25519 key (recommended over RSA)
ssh-keygen -t ed25519 -C "your-email@example.com" -f ~/.ssh/id_ed25519_devserver

# Or RSA if Ed25519 is not supported by an older server
ssh-keygen -t rsa -b 4096 -C "your-email@example.com" -f ~/.ssh/id_rsa_devserver
```

### Copying the Public Key to the Server

```bash
# Copy the public key to the server
ssh-copy-id -i ~/.ssh/id_ed25519_devserver.pub user@server-ip-address

# Or manually if ssh-copy-id is not available
cat ~/.ssh/id_ed25519_devserver.pub | ssh user@server-ip-address \
  "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

Verify the key works:

```bash
ssh -i ~/.ssh/id_ed25519_devserver user@server-ip-address
```

You should connect without a password prompt.

## Configuring the SSH Config File

The SSH config file at `~/.ssh/config` defines server connection settings so you do not have to type them every time. VS Code Remote SSH reads from this file.

```bash
nano ~/.ssh/config
```

Add an entry for your server:

```text
# Development server
Host devserver
    HostName 203.0.113.10
    User ubuntu
    Port 22
    IdentityFile ~/.ssh/id_ed25519_devserver
    ForwardAgent no
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

Options explained:
- `Host devserver` - the alias you use to connect (type `ssh devserver`)
- `HostName` - actual IP address or domain name
- `User` - the SSH username on the server
- `IdentityFile` - which key to use
- `ServerAliveInterval 60` - send keepalive packets every 60 seconds to prevent disconnections

For servers behind a jump host (bastion):

```text
# Bastion host
Host bastion
    HostName bastion.example.com
    User ubuntu
    IdentityFile ~/.ssh/id_ed25519_devserver

# Production server via bastion
Host prod-server
    HostName 10.0.1.50
    User ubuntu
    IdentityFile ~/.ssh/id_ed25519_devserver
    ProxyJump bastion
```

## Connecting to a Server in VS Code

Once the SSH config is set up:

1. Press `Ctrl+Shift+P` to open the command palette
2. Type "Remote-SSH: Connect to Host"
3. Select your configured host (e.g., `devserver`)
4. VS Code opens a new window and connects

The first connection downloads and installs the VS Code server component on the remote machine. This happens automatically and takes a minute.

### Opening a Folder

After connecting:

1. Click "Open Folder" in the Explorer
2. Navigate to your project directory on the server
3. Click OK

VS Code now shows the remote folder's contents. All file operations (open, save, search) operate on the remote filesystem.

## Port Forwarding for Local Development

When running a web server or development server on the remote machine, you need to access it from your local browser. VS Code handles this with port forwarding.

### Automatic Port Forwarding

VS Code detects when a process on the remote machine starts listening on a port and automatically offers to forward it. A notification appears offering to open the forwarded port in your browser.

### Manual Port Forwarding

1. Open the Terminal panel in VS Code
2. Click the "Ports" tab (next to Terminal)
3. Click "Forward a Port"
4. Enter the port number (e.g., 3000 for a Node.js dev server)

The port is now accessible at `localhost:3000` on your local machine.

### Forwarding from the Command Line

You can also set up forwarding in the SSH config:

```text
Host devserver
    HostName 203.0.113.10
    User ubuntu
    IdentityFile ~/.ssh/id_ed25519_devserver
    # Forward remote port 3000 to local port 3000
    LocalForward 3000 localhost:3000
    # Forward remote port 5432 (PostgreSQL) to local port 5432
    LocalForward 5432 localhost:5432
```

## Installing Extensions on the Remote Server

Extensions can be installed locally (running on your machine) or remotely (running on the server). When using Remote SSH, many extensions need to run remotely to work with the server's code.

To install an extension on the remote server:

1. Open the Extensions panel (`Ctrl+Shift+X`)
2. Find the extension you want
3. If it shows an "Install in SSH: devserver" button, click it
4. Extensions with a "Remote Extension" badge need to be installed on the server

Common extensions to install remotely:
- Python (pylance, black formatter)
- ESLint, Prettier
- Docker
- GitLens

## Configuring the Remote Settings

VS Code maintains separate settings for local and remote environments. To set remote-specific settings:

1. Open the Command Palette (`Ctrl+Shift+P`)
2. Type "Open Remote Settings"
3. This opens `settings.json` specific to the remote connection

Example remote settings:

```json
{
    // Python path on the remote server
    "python.defaultInterpreterPath": "/usr/bin/python3",

    // Use the server's git installation
    "git.path": "/usr/bin/git",

    // Terminal profile for the remote
    "terminal.integrated.defaultProfile.linux": "bash",

    // File associations
    "files.associations": {
        "*.conf": "ini"
    }
}
```

## Using Tasks and Debugging Remotely

Tasks defined in `.vscode/tasks.json` run on the remote machine. This means `npm run build`, `make`, or any other build command executes in the server environment:

```json
{
    "version": "2.0.0",
    "tasks": [
        {
            "label": "Build",
            "type": "shell",
            "command": "make build",
            "group": "build",
            "presentation": {
                "reveal": "always",
                "panel": "shared"
            }
        }
    ]
}
```

Similarly, the debugger attaches to processes on the server. For Node.js:

```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Attach to Remote Node",
            "type": "node",
            "request": "attach",
            "port": 9229,
            "localRoot": "${workspaceFolder}",
            "remoteRoot": "/home/ubuntu/project"
        }
    ]
}
```

## Troubleshooting Connection Issues

**Connection timeout:**

```bash
# Verify SSH connection works from terminal
ssh -v devserver

# Check SSH service status on server
sudo systemctl status ssh
```

**VS Code server fails to install:**

```bash
# Check available disk space on server
df -h ~

# Manually clean the VS Code server directory
rm -rf ~/.vscode-server
```

**Permission denied errors:**

```bash
# Check authorized_keys permissions
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys

# Check SSH config file permissions
chmod 600 ~/.ssh/config
```

**Slow connection or frequent disconnects:**

Add keepalive settings to the SSH config:

```text
Host devserver
    ServerAliveInterval 30
    ServerAliveCountMax 6
    TCPKeepAlive yes
```

## Summary

VS Code Remote SSH turns a remote Ubuntu server into a local development environment. After installing the Remote - SSH extension, setting up SSH key authentication, and creating an entry in `~/.ssh/config`, connecting to the server is a single command palette action. Port forwarding makes locally-running dev servers accessible in your local browser. Extensions, tasks, and the debugger all run on the server side, giving you full IDE capabilities against server-resident code without the latency of remote desktop solutions.
