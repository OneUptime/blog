# How to Configure systemd Portable Services on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Systemd, Linux, DevOps, System Administration

Description: Learn how to configure systemd Portable Services on Ubuntu to run self-contained service images with filesystem isolation and minimal dependencies on the host system.

---

Portable services are a feature in systemd that lets you package a service along with its root filesystem into a self-contained image, then attach it to a host system without requiring full installation. Think of it as a middle ground between a traditional system service and a full container runtime - you get some of the isolation benefits without needing Docker or Podman.

This approach works well when you need to ship a service with all its dependencies locked in, but want to manage it through the native systemd tooling your ops team already knows.

## What Are Portable Services?

A portable service is essentially a disk image (or directory tree) that contains:

- A root filesystem with all the service's dependencies
- One or more systemd unit files describing the service
- Optional extension images for layered composition

The `portablectl` command is used to attach, detach, and inspect these images. When attached, the service units are made available to the host's systemd instance, and the service runs in a lightweight namespace with its own filesystem root.

Key differences from containers:
- No separate container runtime needed
- Uses the host kernel and network stack by default
- Managed through standard `systemctl` commands after attachment
- No image registry involved

## Prerequisites

Before starting, make sure you have:

- Ubuntu 20.04 or later (systemd 247+ recommended for full portable service support)
- Root or sudo access
- `systemd-container` package installed

```bash
# Check your systemd version
systemd --version

# Install systemd-container which includes portablectl
sudo apt update
sudo apt install systemd-container
```

## Creating a Portable Service Image

The simplest way to create a portable image is to build a directory tree that looks like a minimal root filesystem.

### Building the Root Filesystem

```bash
# Create a directory to hold our portable service
sudo mkdir -p /var/lib/portables/myapp

# Set up a basic directory structure
sudo mkdir -p /var/lib/portables/myapp/{usr/bin,etc,lib,lib64,tmp,var/log,proc,sys,dev,run}

# Install a minimal OS into the directory using debootstrap
sudo apt install debootstrap
sudo debootstrap --variant=minbase focal /var/lib/portables/myapp http://archive.ubuntu.com/ubuntu/
```

For a simpler approach without debootstrap, you can use `mkosi` which is designed specifically for building portable service images:

```bash
# Install mkosi
sudo apt install mkosi

# Create a mkosi configuration
mkdir myapp-portable && cd myapp-portable

cat > mkosi.conf << 'EOF'
[Distribution]
Distribution=ubuntu
Release=focal

[Output]
Format=directory
OutputDirectory=image

[Packages]
Packages=
    nginx
EOF

# Build the image
sudo mkosi
```

### Writing the Unit File

The unit file must live inside the portable image at a path like `usr/lib/systemd/system/`. The service name should match what you want to manage on the host.

```bash
# Create the unit file inside the portable image
sudo tee /var/lib/portables/myapp/usr/lib/systemd/system/myapp.service << 'EOF'
[Unit]
Description=My Portable Application
After=network.target

[Service]
Type=simple
# The binary lives at this path inside the image
ExecStart=/usr/bin/myapp-server
# Restart on failure
Restart=on-failure
RestartSec=5

# Security hardening - these work well in portable services
NoNewPrivileges=yes
PrivateTmp=yes

[Install]
WantedBy=multi-user.target
EOF
```

There is a naming convention to be aware of: portable service unit files must have a specific prefix that matches the image name, or the attachment will fail. If your image is named `myapp`, units like `myapp.service`, `myapp-worker.service`, or `myapp-scheduler.service` are all valid.

### Packaging as a Squashfs Image

While a plain directory works, a squashfs image is more portable and efficient:

```bash
# Install squashfs tools
sudo apt install squashfs-tools

# Create a squashfs image from the directory
sudo mksquashfs /var/lib/portables/myapp /var/lib/portables/myapp.raw \
    -comp xz \
    -noappend

# Verify the image
file /var/lib/portables/myapp.raw
```

## Attaching a Portable Service

With the image ready, you can attach it to the host system:

```bash
# List available portable images in the default search paths
portablectl list

# Attach the image - this makes the unit files available to the host systemd
sudo portablectl attach /var/lib/portables/myapp.raw

# With the --now flag, attach and start immediately
sudo portablectl attach --now /var/lib/portables/myapp.raw

# Attach with specific profile (default, nonetwork, strict, trusted)
# The 'default' profile allows access to most host resources
sudo portablectl attach --profile=default /var/lib/portables/myapp.raw
```

After attaching, the service appears in the normal systemd unit list:

```bash
# Check status like any other service
systemctl status myapp.service

# Start the service
sudo systemctl start myapp.service

# Enable it to start on boot
sudo systemctl enable myapp.service

# View logs
journalctl -u myapp.service -f
```

## Inspecting and Managing Portable Services

```bash
# See what's currently attached
portablectl list

# Get detailed info about an attached image
portablectl inspect myapp

# Check which unit files an image provides
portablectl inspect /var/lib/portables/myapp.raw

# Detach a portable service (stop it first)
sudo systemctl stop myapp.service
sudo portablectl detach myapp
```

## Profiles and Isolation Levels

Portable services use profiles to determine how much the service can access from the host. Ubuntu ships with several built-in profiles:

```bash
# List available profiles
ls /usr/lib/systemd/portable/

# The profiles directory contains drop-in configurations
# default - allows basic host access
# nonetwork - no network access from inside the service
# strict - maximum isolation
# trusted - minimum restrictions, full host access
```

You can create custom profiles by adding files to `/etc/systemd/portable/profiles/`:

```bash
# Create a custom profile
sudo mkdir -p /etc/systemd/portable/profiles/webservice

# Add a drop-in that restricts network and filesystem access
sudo tee /etc/systemd/portable/profiles/webservice/service.conf << 'EOF'
[Service]
# Only allow access to specific directories
BindReadOnlyPaths=/etc/ssl/certs
PrivateNetwork=no
IPAddressAllow=any
IPAddressDeny=
ProtectSystem=strict
ProtectHome=yes
EOF
```

## Using Extension Images

Extension images let you layer additional content on top of a base image without modifying it. This is useful for configuration, secrets, or additional binaries:

```bash
# Create an extension image with configuration
sudo mkdir -p /var/lib/portables/myapp-config/etc/myapp
echo "setting=production" | sudo tee /var/lib/portables/myapp-config/etc/myapp/config.conf

sudo mksquashfs /var/lib/portables/myapp-config /var/lib/portables/myapp-config.raw \
    -comp xz -noappend

# Attach with extension
sudo portablectl attach --extension /var/lib/portables/myapp-config.raw \
    /var/lib/portables/myapp.raw
```

## Updating a Portable Service

Updating is clean because you're replacing the image rather than updating packages in place:

```bash
# Stop the service
sudo systemctl stop myapp.service

# Detach the old image
sudo portablectl detach myapp

# Replace the image file with the new version
sudo cp /tmp/myapp-v2.raw /var/lib/portables/myapp.raw

# Reattach
sudo portablectl attach --now /var/lib/portables/myapp.raw
```

## Troubleshooting

```bash
# If attachment fails, check the journal for details
journalctl -xe | grep portablectl

# Verify the image contains valid unit files with correct prefixes
systemd-analyze verify /var/lib/portables/myapp.raw

# Check that the image can be mounted
sudo mount -o loop,ro /var/lib/portables/myapp.raw /mnt
ls /mnt/usr/lib/systemd/system/
sudo umount /mnt
```

Common issues include unit file naming mismatches (the unit prefix must match the image name) and missing os-release files inside the image. Every portable image should have `/usr/lib/os-release` or `/etc/os-release` for systemd to validate it.

Portable services fit well in environments where you want reproducible service packaging without adopting a full container orchestration stack. Combined with systemd's built-in security features, they provide a reasonable level of isolation while staying close to familiar Linux administration workflows.
