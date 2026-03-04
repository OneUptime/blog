# How to Configure Podman Desktop with Remote Podman Machines on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Podman Desktop, Remote, Containers, SSH

Description: Connect Podman Desktop to remote Podman instances on RHEL servers over SSH, allowing you to manage containers on remote machines from your local workstation.

---

Podman Desktop can manage containers not only on your local machine but also on remote RHEL servers. By connecting to a remote Podman socket over SSH, you can build, run, and monitor containers on remote hosts from your desktop.

## Prerequisites

On the remote RHEL server:

```bash
# Install Podman
sudo dnf install -y podman

# Enable the Podman socket for the user (rootless)
systemctl --user enable --now podman.socket

# Verify the socket is running
systemctl --user status podman.socket

# Check the socket path
echo $XDG_RUNTIME_DIR/podman/podman.sock
```

For rootful Podman on the remote server:

```bash
# Enable the system-wide Podman socket
sudo systemctl enable --now podman.socket

# Verify
sudo systemctl status podman.socket
# Socket is at /run/podman/podman.sock
```

## Set Up SSH Access

Ensure you can SSH to the remote server without a password prompt:

```bash
# Generate an SSH key if you do not have one
ssh-keygen -t ed25519 -f ~/.ssh/podman_remote

# Copy the key to the remote server
ssh-copy-id -i ~/.ssh/podman_remote.pub user@remote-server.example.com

# Test the connection
ssh -i ~/.ssh/podman_remote user@remote-server.example.com podman info
```

## Configure the Remote Connection via CLI

Add the remote Podman connection on your local workstation:

```bash
# Add a rootless remote connection
podman system connection add rhel-server \
    --identity ~/.ssh/podman_remote \
    ssh://user@remote-server.example.com/run/user/1000/podman/podman.sock

# Add a rootful remote connection
podman system connection add rhel-server-root \
    --identity ~/.ssh/podman_remote \
    ssh://root@remote-server.example.com/run/podman/podman.sock

# List all connections
podman system connection list

# Set the default connection
podman system connection default rhel-server
```

## Test the Remote Connection

```bash
# Run a command on the remote server
podman --connection rhel-server info

# List remote containers
podman --connection rhel-server ps -a

# List remote images
podman --connection rhel-server images
```

## Connect in Podman Desktop

Open Podman Desktop and navigate to Settings > Resources:

1. Click "Create new" under Podman connections
2. Enter the connection details:
   - Name: rhel-server
   - SSH connection URI
   - Path to your SSH key
3. Click "Connect"

The remote Podman instance appears as a selectable engine in Podman Desktop. You can switch between local and remote in the environment selector.

## Run Containers Remotely

```bash
# Start a container on the remote server
podman --connection rhel-server run -d --name web -p 8080:80 nginx

# Check it is running
podman --connection rhel-server ps

# View logs
podman --connection rhel-server logs web
```

In Podman Desktop, containers running on the remote server appear in the Containers panel when the remote connection is selected.

## Manage Multiple Remotes

```bash
# Add additional remote servers
podman system connection add staging-server \
    --identity ~/.ssh/podman_remote \
    ssh://user@staging.example.com/run/user/1000/podman/podman.sock

# Switch between connections
podman system connection default staging-server

# List all connections with their default status
podman system connection list
```

## Firewall on the Remote Server

The connection goes over SSH, so only the SSH port needs to be open:

```bash
# On the remote server, ensure SSH is allowed
sudo firewall-cmd --list-services | grep ssh
```

Remote Podman connections through Podman Desktop let you manage containers across multiple RHEL servers from a single interface on your workstation.
