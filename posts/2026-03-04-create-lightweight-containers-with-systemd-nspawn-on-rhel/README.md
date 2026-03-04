# How to Create Lightweight Containers with systemd-nspawn on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, systemd-nspawn, Containers, Virtualization, Linux

Description: Use systemd-nspawn to create lightweight containers on RHEL without needing Docker or Podman, leveraging built-in systemd capabilities.

---

systemd-nspawn is a lightweight container runtime built directly into systemd. It runs a full OS tree in an isolated namespace, making it useful for testing, building packages, or running services without the overhead of a full virtual machine.

## Install Required Packages

```bash
# Install systemd-container which provides systemd-nspawn and machinectl
sudo dnf install -y systemd-container
```

## Create a Minimal RHEL Container Root

Use dnf to bootstrap a minimal filesystem into a directory:

```bash
# Create the container directory
sudo mkdir -p /var/lib/machines/mycontainer

# Bootstrap a minimal RHEL system
sudo dnf --releasever=9 --installroot=/var/lib/machines/mycontainer \
    --setopt=install_weak_deps=False \
    install -y basesystem systemd dnf bash
```

This installs a bare-bones RHEL 9 filesystem tree under `/var/lib/machines/mycontainer`.

## Boot the Container

Launch the container interactively:

```bash
# Start the container with a shell
sudo systemd-nspawn -D /var/lib/machines/mycontainer

# You are now inside the container as root
# Set the root password
passwd

# Exit the container
exit
```

## Boot as a Full System

You can also boot the container as a full systemd-managed system:

```bash
# Boot the container with systemd as PID 1
sudo systemd-nspawn -bD /var/lib/machines/mycontainer
```

The `-b` flag tells nspawn to boot the init system. You will see the familiar systemd startup sequence. Log in with the root password you set earlier.

To shut down, press `Ctrl+]` three times in quick succession, or run `poweroff` inside the container.

## Run with Read-Only Root

For extra isolation, mount the root filesystem read-only:

```bash
# Read-only root with a writable tmpfs overlay
sudo systemd-nspawn --read-only -D /var/lib/machines/mycontainer \
    --tmpfs=/var --tmpfs=/tmp
```

## Bind Mount Host Directories

Share files between the host and container:

```bash
# Mount /srv/shared from host into /mnt inside the container
sudo systemd-nspawn -D /var/lib/machines/mycontainer \
    --bind=/srv/shared:/mnt
```

## Clean Up

Remove a container by simply deleting its directory:

```bash
sudo rm -rf /var/lib/machines/mycontainer
```

systemd-nspawn provides a fast and simple way to spin up isolated environments on RHEL without installing additional container runtimes. It is especially useful for build environments and quick testing.
