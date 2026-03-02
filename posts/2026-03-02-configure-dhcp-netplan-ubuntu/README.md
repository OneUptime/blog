# How to Configure DHCP with Netplan on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, Netplan, DHCP, Configuration

Description: Configure DHCP networking with Netplan on Ubuntu, including IPv4 and IPv6 DHCP, DHCP client options, and overriding specific DHCP-provided settings.

---

DHCP (Dynamic Host Configuration Protocol) lets your network infrastructure automatically assign IP addresses, gateways, and DNS servers to your Ubuntu system. Netplan makes DHCP configuration straightforward, but there are useful options beyond the basic `dhcp4: true` setting that give you more control over what the DHCP client accepts and how it behaves.

## Basic DHCP Configuration

The simplest Netplan DHCP configuration is minimal:

```yaml
# /etc/netplan/01-dhcp.yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    enp3s0:
      dhcp4: true
```

Apply it:

```bash
sudo netplan apply
```

This tells the system to use DHCP for IPv4 on the `enp3s0` interface. The interface name will vary - check yours with `ip link show`.

## Enabling DHCPv6

For IPv6 DHCP (as opposed to stateless address autoconfiguration):

```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    enp3s0:
      dhcp4: true
      dhcp6: true
```

Or if you want only IPv6 with a static IPv6 prefix and DHCP for other configuration:

```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    enp3s0:
      dhcp4: true
      dhcp6: true
      ipv6-privacy: true    # use temporary/private IPv6 addresses
```

The `ipv6-privacy` option enables RFC 4941 privacy extensions, which generate temporary addresses that rotate periodically to reduce tracking.

## Checking What DHCP Assigned

After applying DHCP configuration:

```bash
# Show assigned IP address
ip addr show enp3s0

# Show the lease information
# With systemd-networkd backend
networkctl status enp3s0

# Show DHCP lease details
cat /run/systemd/netif/leases/*

# With NetworkManager backend
nmcli device show enp3s0
```

## DHCP with Override Options

Sometimes you want DHCP for address assignment but need to override specific values the DHCP server provides. Common scenarios: your DHCP server provides wrong DNS servers, or you want to add additional routes.

### Override DNS Servers

```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    enp3s0:
      dhcp4: true
      nameservers:
        addresses:
          - 1.1.1.1    # use Cloudflare DNS instead of DHCP-provided DNS
          - 8.8.8.8
```

When you specify `nameservers.addresses`, Netplan uses those instead of what DHCP provides.

### Use DHCP but Ignore the Default Route

Useful on multi-homed systems where you want DHCP to assign an IP but manage routes manually:

```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    enp3s0:
      dhcp4: true
      dhcp4-overrides:
        use-routes: false       # ignore routes from DHCP
        use-dns: false          # ignore DNS from DHCP
        route-metric: 200       # set a specific metric for DHCP routes
```

### Control Which DHCP Options Are Used

```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    enp3s0:
      dhcp4: true
      dhcp4-overrides:
        use-dns: true           # accept DNS from DHCP
        use-ntp: false          # ignore NTP servers from DHCP
        use-hostname: false     # don't set hostname from DHCP
        use-routes: true        # accept routes from DHCP
        use-mtu: true           # accept MTU from DHCP
        send-hostname: false    # don't send our hostname to DHCP server
```

### Set a Custom DHCP Client Identifier

By default, the DHCP client uses the MAC address or DUID as its identifier. You can customize this:

```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    enp3s0:
      dhcp4: true
      dhcp-identifier: mac    # use MAC address (default)
      # or:
      dhcp-identifier: duid   # use DUID (better for IPv6)
```

## DHCP on Multiple Interfaces

Configure DHCP on multiple interfaces in a single file:

```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    enp3s0:
      dhcp4: true      # primary interface
    enp4s0:
      dhcp4: true      # secondary interface
      dhcp4-overrides:
        use-routes: false    # don't add default route via this interface
        route-metric: 200    # lower priority than primary
```

This is common on servers with separate management and data interfaces.

## DHCP with Additional Static Addresses

You can get an address via DHCP and also have static addresses on the same interface:

```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    enp3s0:
      dhcp4: true
      addresses:
        - 192.168.1.200/24    # static alias address
```

The interface will have both the DHCP-assigned address and the static address simultaneously.

## Requesting a Specific DHCP Address

Some DHCP servers support client-requested addresses. While DHCP technically cannot guarantee a specific address, well-configured servers usually honor the request:

```bash
# With systemd-networkd, you can set this in a .network file override
# Netplan doesn't directly expose this option, so create a drop-in:
sudo mkdir -p /etc/systemd/network/enp3s0.network.d/

cat << 'EOF' | sudo tee /etc/systemd/network/enp3s0.network.d/dhcp-request.conf
[DHCPv4]
RequestAddress=192.168.1.100
EOF

sudo systemctl restart systemd-networkd
```

## Debugging DHCP Issues

When DHCP is not working:

```bash
# Check the interface status
networkctl status enp3s0

# Check systemd-networkd logs for DHCP messages
sudo journalctl -u systemd-networkd -f

# Look for DHCP DISCOVER/OFFER/REQUEST/ACK messages
sudo journalctl -u systemd-networkd | grep -i dhcp

# Check if the interface is up
ip link show enp3s0

# Manually trigger DHCP renewal
# With networkd backend:
sudo networkctl renew enp3s0

# With NetworkManager backend:
nmcli device reapply enp3s0
```

Common DHCP problems:
- Interface is down: `sudo ip link set enp3s0 up`
- Wrong interface name in the Netplan config
- DHCP server not running or unreachable
- Firewall blocking DHCP (UDP ports 67/68)

```bash
# Check if firewall is blocking DHCP
sudo ufw status
# DHCP uses broadcast on UDP port 68 - UFW usually allows this by default

# Test DHCP manually
sudo dhclient -v enp3s0
```

## Verifying DHCP Lease

```bash
# For systemd-networkd
networkctl status enp3s0 | grep -i "dhcp\|address\|gateway"

# View raw lease file
ls /run/systemd/netif/leases/
sudo cat /run/systemd/netif/leases/$(ip link show enp3s0 | head -1 | cut -d: -f1)

# For NetworkManager
nmcli -f DHCP4 device show enp3s0
```

## DHCP Timeout Configuration

In environments where the DHCP server is sometimes slow to respond, you can increase the timeout before Netplan gives up:

```bash
# Create a systemd-networkd drop-in for DHCP timeout
sudo mkdir -p /etc/systemd/network/enp3s0.network.d/

cat << 'EOF' | sudo tee /etc/systemd/network/enp3s0.network.d/dhcp-timeout.conf
[DHCPv4]
# Wait up to 60 seconds for a DHCP response
RequestTimeout=60
EOF

sudo systemctl daemon-reload
sudo systemctl restart systemd-networkd
```

## Switching from Static to DHCP

If you have an existing static configuration and want to switch to DHCP:

```bash
# Edit the existing Netplan file
sudo nano /etc/netplan/01-config.yaml

# Change from:
#   dhcp4: false
#   addresses:
#     - 192.168.1.100/24
#   routes:
#     - to: default
#       via: 192.168.1.1

# To:
#   dhcp4: true

# Apply with the safety net (auto-reverts if connectivity breaks)
sudo netplan try
```

The `netplan try` approach is especially valuable when switching networking configuration over SSH - if DHCP does not work and you lose the session, it will roll back after 120 seconds.

DHCP configuration in Netplan is simple at the basic level but has enough override options to handle complex multi-interface setups where you need fine-grained control over what the DHCP client accepts.
