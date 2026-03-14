# How to Boot a Full RHEL System Inside systemd-nspawn

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Systemd-nspawn, Containers, Virtualization, Systemd

Description: Boot a complete RHEL system with full systemd init inside a systemd-nspawn container, including service management and networking.

---

While systemd-nspawn can run a simple shell, it can also boot a complete RHEL system with systemd as PID 1. This gives you a full init system, service management, and journald logging inside the container.

## Prepare the Container Image

First, create a full RHEL installation inside a machine directory:

```bash
# Install the container tools
sudo dnf install -y systemd-container

# Create the machine directory
sudo mkdir -p /var/lib/machines/rhel-full

# Install a more complete system for full boot
sudo dnf --releasever=9 --installroot=/var/lib/machines/rhel-full \
    install -y basesystem systemd dnf bash passwd \
    systemd-resolved NetworkManager-tui vim-minimal
```

## Set Up the Root Password

Before booting, set a root password inside the container:

```bash
# Enter the container without booting
sudo systemd-nspawn -D /var/lib/machines/rhel-full

# Inside the container, set root password
passwd root

# Exit
exit
```

## Boot the Full System

Use the `-b` flag to boot with systemd as init:

```bash
# Boot the container as a full system
sudo systemd-nspawn -bD /var/lib/machines/rhel-full
```

You will see the systemd boot sequence and eventually get a login prompt. Log in as root.

## Manage Services Inside the Container

Once booted, you can manage services normally:

```bash
# Check running services
systemctl list-units --type=service

# Enable and start a service
systemctl enable --now chronyd

# View the journal
journalctl -xe
```

## Create a Persistent nspawn Configuration

Create a configuration file so you do not have to remember flags:

```bash
sudo vi /etc/systemd/nspawn/rhel-full.nspawn
```

```ini
[Exec]
Boot=yes
Capability=CAP_NET_ADMIN

[Network]
VirtualEthernet=yes

[Files]
Bind=/srv/data:/data
```

Now you can boot using machinectl:

```bash
# Start the container using the nspawn config
sudo machinectl start rhel-full

# Get a login shell
sudo machinectl login rhel-full
```

## Shut Down the Container

From inside the container:

```bash
poweroff
```

Or from the host:

```bash
sudo machinectl poweroff rhel-full
```

## Enable Auto-Start on Boot

```bash
# Enable the machine to start on host boot
sudo machinectl enable rhel-full
```

This approach is useful for running isolated RHEL environments for development or testing where you need full systemd functionality without the overhead of a virtual machine.
