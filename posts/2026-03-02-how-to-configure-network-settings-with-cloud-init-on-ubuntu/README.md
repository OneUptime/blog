# How to Configure Network Settings with cloud-init on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, cloud-init, Networking, Netplan, Cloud

Description: A detailed guide to configuring static IPs, DNS, VLANs, and bonding through cloud-init network configuration on Ubuntu instances.

---

Network configuration is one of the most important tasks cloud-init handles during instance initialization. By default, cloud images use DHCP, which works fine for most cloud deployments. But bare metal servers, private cloud environments, and multi-homed instances often need static IP addresses, specific DNS servers, network bonds, or VLANs. cloud-init handles all of this through its network configuration format.

## Network Configuration Versions

cloud-init supports two versions of its network configuration format:

- **Version 1** - the original format using a list of config items
- **Version 2** - based on Netplan's YAML syntax, more expressive

On Ubuntu 18.04+, cloud-init generates Netplan configuration from its network config. Version 2 is the preferred format since it maps directly to Netplan.

## Where Network Config Goes

When cloud-init processes network configuration, it writes Netplan YAML files to `/etc/netplan/`:

```bash
# Check what cloud-init wrote
ls /etc/netplan/
cat /etc/netplan/50-cloud-init.yaml

# See rendered network config
netplan get
```

## Providing Network Config via User Data

You can include network configuration directly in your cloud-config user data using the `network:` key:

```yaml
#cloud-config
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: false
      addresses:
        - 192.168.1.100/24
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses: [8.8.8.8, 8.8.4.4]
        search: [example.com]
```

## Static IP Configuration

### Single Interface Static IP

```yaml
#cloud-config
network:
  version: 2
  ethernets:
    # Match by interface name
    ens3:
      dhcp4: false
      dhcp6: false
      addresses:
        - 10.0.0.10/24
      routes:
        - to: default
          via: 10.0.0.1
          metric: 100
      nameservers:
        addresses:
          - 10.0.0.53
          - 8.8.8.8
        search:
          - internal.example.com
          - example.com
```

### Matching by MAC Address

In cloud environments, interface names can be unpredictable. Match by MAC address for reliability:

```yaml
#cloud-config
network:
  version: 2
  ethernets:
    primary-nic:
      match:
        macaddress: "aa:bb:cc:dd:ee:ff"
      set-name: eth0   # rename the interface
      dhcp4: false
      addresses:
        - 10.0.1.50/24
      routes:
        - to: default
          via: 10.0.1.1
      nameservers:
        addresses: [10.0.1.1]
```

### Multiple Interfaces

```yaml
#cloud-config
network:
  version: 2
  ethernets:
    # Management interface
    eth0:
      dhcp4: true

    # Application interface - static
    eth1:
      dhcp4: false
      addresses:
        - 192.168.10.20/24
      nameservers:
        addresses: [192.168.10.1]

    # Storage interface
    eth2:
      dhcp4: false
      addresses:
        - 10.20.0.30/24
```

## IPv6 Configuration

```yaml
#cloud-config
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: true
      dhcp6: true
      # Or static IPv6
      # dhcp6: false
      # addresses:
      #   - 2001:db8::10/64
      # routes:
      #   - to: default
      #     via: 2001:db8::1
```

## Network Bonding

Bond two interfaces for redundancy or increased throughput:

```yaml
#cloud-config
network:
  version: 2
  ethernets:
    # Physical interfaces that make up the bond
    eth0:
      dhcp4: false
    eth1:
      dhcp4: false

  bonds:
    bond0:
      interfaces:
        - eth0
        - eth1
      parameters:
        mode: active-backup      # failover mode
        # mode: 802.3ad          # LACP
        # mode: balance-rr       # round-robin
        mii-monitor-interval: 100
        primary: eth0
      dhcp4: false
      addresses:
        - 10.0.0.100/24
      routes:
        - to: default
          via: 10.0.0.1
      nameservers:
        addresses: [10.0.0.1, 8.8.8.8]
```

## VLAN Configuration

```yaml
#cloud-config
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: false

  vlans:
    # VLAN 100 - Production
    vlan100:
      id: 100
      link: eth0
      dhcp4: false
      addresses:
        - 10.100.0.50/24
      routes:
        - to: 10.100.0.0/16
          via: 10.100.0.1

    # VLAN 200 - Management
    vlan200:
      id: 200
      link: eth0
      dhcp4: false
      addresses:
        - 10.200.0.50/24
```

## Bridge Configuration

Used for KVM hosts or container networking:

```yaml
#cloud-config
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: false

  bridges:
    br0:
      interfaces:
        - eth0
      dhcp4: true
      parameters:
        stp: false
        forward-delay: 0
```

## Providing Network Config via Metadata

For NoCloud and some other datasources, you can provide network config separately from user data:

```bash
# Create the network config file
cat > network-config.yaml << 'EOF'
version: 2
ethernets:
  eth0:
    dhcp4: false
    addresses: [192.168.1.50/24]
    routes:
      - to: default
        via: 192.168.1.1
    nameservers:
      addresses: [192.168.1.1, 8.8.8.8]
EOF

# Include it when creating the NoCloud seed
cloud-localds --network-config=network-config.yaml seed.iso user-data.yaml
```

## Version 1 Network Config Format

Some older tools or documentation use Version 1 format:

```yaml
#cloud-config
network:
  version: 1
  config:
    # Physical interface
    - type: physical
      name: eth0
      mac_address: "aa:bb:cc:dd:ee:ff"
      subnets:
        - type: static
          address: 10.0.0.100
          netmask: 255.255.255.0
          gateway: 10.0.0.1
          dns_nameservers:
            - 8.8.8.8
          dns_search:
            - example.com

    # VLAN
    - type: vlan
      name: eth0.100
      vlan_link: eth0
      vlan_id: 100
      subnets:
        - type: static
          address: 10.100.0.50
          netmask: 255.255.255.0
```

Version 1 still works but Version 2 is preferred for new configurations.

## Disabling cloud-init Network Configuration

If you want to manage networking outside of cloud-init:

```bash
# Create a marker file that tells cloud-init not to touch networking
sudo touch /etc/cloud/cloud.cfg.d/99-disable-network-config.cfg

# Or configure it in the cloud.cfg
sudo tee /etc/cloud/cloud.cfg.d/99-disable-network-config.cfg << 'EOF'
network:
  config: disabled
EOF
```

Then manage your Netplan configuration directly:

```bash
# Write your own Netplan config
sudo tee /etc/netplan/01-config.yaml << 'EOF'
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: true
EOF

# Apply the configuration
sudo netplan apply
```

## Verifying Network Configuration

After cloud-init runs, verify the network came up as expected:

```bash
# Check interface addresses
ip addr show

# Check routing table
ip route show

# Check DNS configuration
resolvectl status
cat /etc/resolv.conf

# Test connectivity
ping -c 3 8.8.8.8
dig example.com

# Check what Netplan files were created
ls /etc/netplan/
cat /etc/netplan/50-cloud-init.yaml
```

## Troubleshooting Network Issues

```bash
# Check if network config was applied
cloud-init status --long

# Look for network-related errors
grep -i "network\|netplan\|ip\|route" /var/log/cloud-init.log

# Check if netplan applied successfully
journalctl -u netplan-wpa-eth0.service
journalctl -u systemd-networkd.service

# Manually re-apply netplan configuration
sudo netplan apply --debug
```

cloud-init's network configuration is powerful enough to handle complex networking setups including bonds, VLANs, and multi-homed servers. The Version 2 format's close alignment with Netplan makes it straightforward to write configurations that work consistently across different cloud providers and bare-metal deployments.
