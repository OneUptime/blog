# How to Configure Podman Desktop with Remote Machines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Podman Desktop, Remote, SSH, Distributed

Description: Learn how to configure Podman Desktop to manage containers on remote machines using SSH connections and Podman's remote client capabilities.

---

> Podman Desktop can manage containers on remote machines over SSH, letting you run heavy workloads on powerful servers while controlling everything from your local interface.

Podman supports remote management through its client-server architecture. You can connect Podman Desktop on your local machine to a remote Podman instance running on a Linux server, allowing you to build images, run containers, and manage resources on remote hardware. This is useful for offloading resource-intensive builds and running containers on dedicated servers.

---

## Understanding Podman Remote Architecture

Podman's remote mode uses a REST API served over SSH or a Unix socket. The local Podman client sends commands to the remote Podman service, which executes them on the server.

```bash
# Check if your local Podman supports remote connections

podman system connection list

# The connection list shows configured remote machines
# NAME        URI                                    IDENTITY
# server1     ssh://user@server1:22/run/user/1000/podman/podman.sock  ~/.ssh/id_ed25519
```

## Setting Up the Remote Server

Configure the remote Linux server to accept Podman connections:

```bash
# On the remote server: install Podman
sudo dnf install -y podman  # RHEL/Fedora
# sudo apt install -y podman  # Ubuntu/Debian

# Enable the Podman socket for your user
systemctl --user enable --now podman.socket

# Verify the socket is active
systemctl --user status podman.socket

# Check the socket path
echo $XDG_RUNTIME_DIR/podman/podman.sock
ls -la /run/user/$(id -u)/podman/podman.sock

# Ensure lingering is enabled (keeps services running after logout)
sudo loginctl enable-linger $(whoami)
```

## Configuring SSH Access

Set up SSH key-based authentication for seamless connections:

```bash
# Generate an SSH key if you do not have one
ssh-keygen -t ed25519 -C "podman-remote"

# Copy your public key to the remote server
ssh-copy-id user@remote-server.example.com

# Test the SSH connection
ssh user@remote-server.example.com "podman --version"

# Verify passwordless access works
ssh -o BatchMode=yes user@remote-server.example.com echo "SSH OK"
```

## Adding a Remote Connection

Register the remote machine with Podman:

```bash
# Add a remote connection
podman system connection add server1 \
  ssh://user@remote-server.example.com/run/user/1000/podman/podman.sock \
  --identity ~/.ssh/id_ed25519

# List configured connections
podman system connection list

# Set the remote as the default connection
podman system connection default server1

# Test the connection
podman --connection server1 info
```

## Connecting via Podman Desktop

Podman Desktop can manage remote connections from the Podman system connection list:

1. Open Podman Desktop and go to **Settings**.
2. Navigate to the Podman extension settings.
3. Enable loading remote system connections over SSH.
4. Make sure the remote connection appears in `podman system connection list`.
5. Open the **Containers** or **Images** section to confirm the remote environment is visible.

The remote machine's containers and images will appear in Podman Desktop.

## Managing Containers on Remote Machines

Once connected, all commands target the remote machine:

```bash
# Run a container on the remote machine
podman --connection server1 run -d \
  --name remote-web \
  -p 8080:80 \
  nginx:alpine

# List containers on the remote machine
podman --connection server1 ps

# View logs from a remote container
podman --connection server1 logs remote-web

# Execute a command in a remote container
podman --connection server1 exec remote-web nginx -v

# Stop and remove a remote container
podman --connection server1 stop remote-web
podman --connection server1 rm remote-web
```

## Building Images Remotely

Offload image builds to a more powerful remote machine:

```bash
# Build an image on the remote machine
podman --connection server1 build \
  -t my-app:latest \
  -f Containerfile \
  .

# List images on the remote machine
podman --connection server1 images

# The build context is sent to the remote machine over SSH
# Large contexts may take time to transfer
```

## Managing Multiple Remote Connections

Work with several remote machines:

```bash
# Add multiple remote connections
podman system connection add dev-server \
  ssh://dev@dev.example.com/run/user/1000/podman/podman.sock

podman system connection add build-server \
  ssh://builder@build.example.com/run/user/1000/podman/podman.sock

podman system connection add prod-server \
  ssh://deploy@prod.example.com/run/user/1000/podman/podman.sock

# List all connections
podman system connection list

# Switch between connections
podman --connection dev-server ps
podman --connection build-server images
podman --connection prod-server ps

# Remove a connection
podman system connection remove old-server
```

## Transferring Images Between Machines

Move images between local and remote environments:

```bash
# Save an image from the remote machine
podman --connection server1 save my-app:latest -o my-app.tar

# Load the image on another remote machine
podman --connection build-server load -i my-app.tar

# Or pipe between machines
podman --connection server1 save my-app:latest | \
  podman --connection build-server load
```

## Troubleshooting Remote Connections

Common issues and solutions:

```bash
# Test SSH connectivity
ssh -v user@remote-server.example.com

# Verify the Podman socket on the remote server
ssh user@remote-server.example.com \
  "systemctl --user status podman.socket"

# Check if the socket path is correct
ssh user@remote-server.example.com \
  "ls -la /run/user/$(ssh user@remote-server.example.com id -u)/podman/podman.sock"

# Restart the Podman socket on the remote server
ssh user@remote-server.example.com \
  "systemctl --user restart podman.socket"

# Check that SSH can reach the remote host
ssh -o BatchMode=yes user@remote-server.example.com "echo SSH OK"

# Remove and re-add a broken connection
podman system connection remove server1
podman system connection add server1 \
  ssh://user@remote-server.example.com/run/user/1000/podman/podman.sock
```

## Summary

Configuring Podman Desktop with remote machines extends your container management capabilities beyond your local workstation. By establishing SSH connections to remote Podman instances, you can build images on powerful servers, run containers on dedicated infrastructure, and manage multiple environments from a single interface. The connection system supports multiple remotes, making it practical for teams that maintain separate development, build, and production servers.
