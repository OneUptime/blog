# How to Configure Elemental Cloud-Config

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elemental, Cloud-Config, Kubernetes, Edge, Configuration

Description: A detailed guide to configuring Elemental cloud-config for customizing OS initialization, users, networking, and services on bare metal and edge nodes.

## Introduction

Elemental cloud-config is a YAML-based configuration system that supports a subset of cloud-init syntax and can also use yip stages. Standard cloud-config entries are applied at boot and re-executed on every boot because Elemental uses yip, and install/reset/upgrade hooks are available through Elemental-specific workflows. It allows you to configure users, SSH keys, network settings, custom scripts, and system services declaratively, ensuring nodes are correctly configured when they join the fleet.

## Cloud-Config Structure

```yaml
# Example contents of spec.config in a MachineRegistration resource

cloud-config:
  # User accounts
  users: []
  # SSH keys
  ssh_authorized_keys: []
  # Static hostname
  hostname: ""
  # Files to create
  write_files: []
  # Commands to run
  runcmd: []

elemental:
  registration: {}
  install: {}
  reset: {}
```

## Configuring Users and Authentication

```yaml
cloud-config:
  users:
    # Configure the root user
    - name: root
      # SHA-512 password hash (use: mkpasswd --method=SHA-512 --rounds=4096)
      passwd: "$6$rounds=4096$saltsalt$hashedpasswordhere"

    # Create an admin user
    - name: admin
      groups:
        - wheel
      shell: /bin/bash
      # Public SSH key for access
      ssh_authorized_keys:
        - "ssh-rsa AAAAB3NzaC1yc2E... admin@example.com"
      # Allow password login in addition to SSH keys
      lock_passwd: false
      passwd: "$6$rounds=4096$saltsalt$hashedpasswordhere"
```

## Configuring SSH

```yaml
cloud-config:
  # Global SSH authorized keys (assigned to the first user in users, or root if no users are defined)
  ssh_authorized_keys:
    - "ssh-rsa AAAAB3NzaC1yc2E... ops-team@example.com"
    - "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5... automation@example.com"

  # Write SSH daemon configuration
  write_files:
    - path: /etc/ssh/sshd_config.d/custom.conf
      content: |
        # Disable password authentication
        PasswordAuthentication no
        # Allow only specific users
        AllowUsers admin root
        # Enable pubkey authentication
        PubkeyAuthentication yes
        # Disable root login via password
        PermitRootLogin prohibit-password
      permissions: "0600"
```

## Writing Custom Files

```yaml
cloud-config:
  write_files:
    # Helper script to derive a hostname from the first Ethernet MAC address
    - path: /etc/hostname-script.sh
      content: |
        #!/bin/bash
        IFACE=$(ls /sys/class/net | grep -E '^(en|eth)' | head -n1)
        if [ -n "${IFACE}" ]; then
          MAC=$(tr ':' '-' < "/sys/class/net/${IFACE}/address")
          hostnamectl set-hostname "node-${MAC}"
        fi
      permissions: "0755"

    # Custom network configuration
    - path: /etc/NetworkManager/conf.d/custom.conf
      content: |
        [main]
        dns=none
        [keyfile]
        unmanaged-devices=interface-name:lo
      permissions: "0644"

    # Custom sysctl settings
    - path: /etc/sysctl.d/99-custom.conf
      content: |
        # Increase connection tracking table size
        net.netfilter.nf_conntrack_max = 131072
        # Enable IP forwarding for Kubernetes
        net.ipv4.ip_forward = 1
        net.ipv6.conf.all.forwarding = 1
      permissions: "0644"
```

## Running Custom Commands

```yaml
cloud-config:
  runcmd:
    # Apply sysctl settings immediately
    - sysctl --system

    # Set timezone
    - timedatectl set-timezone UTC

    # Enable NTP
    - timedatectl set-ntp true

    # Configure hostname from DMI serial, when available
    - sh -c 'if [ -r /sys/class/dmi/id/product_serial ]; then SERIAL=$(tr " " "-" < /sys/class/dmi/id/product_serial); hostnamectl set-hostname "node-${SERIAL}"; fi'

    # Start required services
    - systemctl enable --now firewalld

    # Configure firewall
    - firewall-cmd --permanent --add-port=10250/tcp
    - firewall-cmd --permanent --add-port=30000-32767/tcp
    - firewall-cmd --reload
```

## Configuring Systemd Services

```yaml
cloud-config:
  write_files:
    # Create the setup script
    - path: /usr/local/bin/node-setup.sh
      content: |
        #!/bin/bash
        set -e
        echo "Node setup complete" > /var/log/node-setup.log
      permissions: "0755"

    # Create a custom systemd service
    - path: /etc/systemd/system/node-setup.service
      content: |
        [Unit]
        Description=Node Initial Setup
        After=network-online.target
        Wants=network-online.target
        ConditionPathExists=!/var/lib/node-setup-done

        [Service]
        Type=oneshot
        ExecStart=/usr/local/bin/node-setup.sh
        ExecStartPost=/usr/bin/touch /var/lib/node-setup-done
        RemainAfterExit=yes

        [Install]
        WantedBy=multi-user.target
      permissions: "0644"

  runcmd:
    # Enable the service
    - systemctl daemon-reload
    - systemctl enable --now node-setup.service
```

## Elemental-Specific Configuration

```yaml
elemental:
  install:
    # Target disk device
    device: /dev/sda
    # Reboot after install
    reboot: true
    # Enable debug output
    debug: true

  # Configuration applied during reset
  reset:
    enabled: true
    reboot: true
    reset-persistent: true
    reset-oem: true
```

## Validating Cloud-Config

```bash
# Validate a standalone #cloud-config file (the contents of the cloud-config section)
cloud-init schema --config-file user-data.yaml --annotate
```

## Conclusion

Elemental cloud-config provides a powerful, declarative way to configure nodes at provisioning time. By combining user management, file creation, command execution, and service configuration, you can ensure every node in your fleet starts with exactly the right configuration. This approach helps reduce configuration drift and makes node provisioning more repeatable.
