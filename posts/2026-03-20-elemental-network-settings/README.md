# How to Configure Elemental Network Settings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elemental, Kubernetes, Networking, Edge, Configuration

Description: Configure network settings for Elemental nodes including static IPs, bonding, VLANs, and DNS using cloud-config and NetworkManager.

## Introduction

Proper network configuration is essential for Elemental nodes, especially in edge environments where DHCP may not be available or where specific network topologies are required. Elemental supports full NetworkManager-based network configuration through cloud-config, allowing you to define static IPs, bonded interfaces, VLANs, and custom DNS settings. When you add these snippets to a MachineRegistration, they are applied to the installed system after installation and reboot; if you need custom networking while booting the installation ISO itself, use the same cloud-config in a SeedImage instead.

## Basic DHCP Configuration (Default)

By default, Elemental nodes use DHCP on Ethernet interfaces through NetworkManager. No additional cloud-config is typically needed for DHCP environments.

## Configuring Static IP Addresses

```yaml
# static-ip-config.yaml - Include in your MachineRegistration cloud-config

cloud-config:
  write_files:
    # Create NetworkManager connection profile for static IP
    - path: /etc/NetworkManager/system-connections/eth0.nmconnection
      content: |
        [connection]
        id=eth0-static
        type=ethernet
        interface-name=eth0
        autoconnect=true

        [ethernet]
        auto-negotiate=true

        [ipv4]
        method=manual
        address1=192.168.1.100/24,192.168.1.1
        dns=8.8.8.8;8.8.4.4;
        dns-search=example.com;

        [ipv6]
        method=auto
      permissions: "0600"

  runcmd:
    # Reload NetworkManager to apply configuration
    - nmcli connection reload
    - nmcli connection up eth0-static
```

## Configuring Network Bonding

```yaml
cloud-config:
  write_files:
    # Bond controller connection
    - path: /etc/NetworkManager/system-connections/bond0.nmconnection
      content: |
        [connection]
        id=bond0
        type=bond
        interface-name=bond0
        autoconnect=true

        [bond]
        mode=active-backup
        miimon=100
        primary=eth0

        [ipv4]
        method=manual
        address1=10.0.1.50/24,10.0.1.1
        dns=10.0.1.1;
      permissions: "0600"

    # Bond port 1
    - path: /etc/NetworkManager/system-connections/eth0-bond.nmconnection
      content: |
        [connection]
        id=eth0-bond-port
        type=ethernet
        interface-name=eth0
        controller=bond0
        port-type=bond
        autoconnect=true
      permissions: "0600"

    # Bond port 2
    - path: /etc/NetworkManager/system-connections/eth1-bond.nmconnection
      content: |
        [connection]
        id=eth1-bond-port
        type=ethernet
        interface-name=eth1
        controller=bond0
        port-type=bond
        autoconnect=true
      permissions: "0600"

  runcmd:
    - nmcli connection reload
    - nmcli connection up bond0
```

## Configuring VLANs

```yaml
cloud-config:
  write_files:
    # VLAN 100 - Management
    - path: /etc/NetworkManager/system-connections/vlan100.nmconnection
      content: |
        [connection]
        id=vlan100
        type=vlan
        interface-name=eth0.100
        autoconnect=true

        [vlan]
        id=100
        parent=eth0

        [ipv4]
        method=manual
        address1=172.16.100.50/24,172.16.100.1
      permissions: "0600"

  runcmd:
    - nmcli connection reload
    - nmcli connection up vlan100
```

## Configuring Custom DNS

```yaml
cloud-config:
  write_files:
    # DHCP on eth0 with custom DNS servers
    - path: /etc/NetworkManager/system-connections/eth0-dns.nmconnection
      content: |
        [connection]
        id=eth0-custom-dns
        type=ethernet
        interface-name=eth0
        autoconnect=true
        autoconnect-priority=100

        [ipv4]
        method=auto
        ignore-auto-dns=true
        dns=10.0.0.1;8.8.8.8;
        dns-search=example.com;internal.example.com;

        [ipv6]
        method=auto
        ignore-auto-dns=true
      permissions: "0600"

  runcmd:
    - nmcli connection reload
    - nmcli connection up eth0-custom-dns
```

## Setting Static Hostname

```yaml
# Include under spec in your MachineRegistration

# For a single node, you can use a fixed value such as node-datacenter1-001.
# For shared registrations, use a template so each node gets a unique hostname.
machineName: "node-${System Information/Serial Number}"
```

## Conclusion

Elemental's cloud-config networking support gives you full control over node network configuration on the installed system. Whether you need simple static IPs, complex bonded interfaces for high availability, or VLAN segmentation, NetworkManager profiles deployed via cloud-config provide a reliable and reproducible approach to network setup across your entire edge fleet. If you need those settings during live ISO boot, place them in a SeedImage rather than a MachineRegistration.
