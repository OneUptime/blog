# How to Configure Ubuntu Server for IPv6-Only Networking During Install

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, IPv6, Networking, Server Administration

Description: How to configure Ubuntu Server for IPv6-only networking during and after installation, covering address assignment, routing, DNS, and common compatibility issues.

---

IPv4 address exhaustion is a real operational problem, and many cloud providers and ISPs now offer IPv6-only or IPv6-primary allocations. Setting up Ubuntu Server to operate in an IPv6-only environment requires attention to several configuration points that are often overlooked when you have always had an IPv4 address available.

## Understanding IPv6-Only vs. Dual-Stack

An IPv6-only host has no IPv4 address assigned to its network interface. To reach IPv4-only services, it typically relies on:

- **NAT64/DNS64**: A translation layer provided by the network that allows IPv6 hosts to connect to IPv4 destinations. DNS64 synthesizes AAAA records for A-only domains.
- **464XLAT**: A client-side translation mechanism combining CLAT and PLAT for broader compatibility.

If your network provider offers NAT64, IPv6-only operation is practical. If they do not, you will find it difficult to reach many services.

## Configuring IPv6 During Subiquity Installation

When the Ubuntu Server installer reaches the network configuration step, you can configure IPv6 addressing.

For static IPv6:

1. Select the network interface
2. Choose "Edit IPv6"
3. Set method to "Manual"
4. Enter the IPv6 address (e.g., `2001:db8:1::10/64`)
5. Enter the gateway (e.g., `2001:db8:1::1`)
6. Enter DNS servers (e.g., `2001:4860:4860::8888` for Google's IPv6 DNS)

For SLAAC (Stateless Address Autoconfiguration) or DHCPv6:

1. Select the interface
2. Choose "Edit IPv6"
3. Set method to "DHCPv6" or "Automatic (SLAAC)"

SLAAC generates an address from the router advertisement prefix and the interface's MAC address. DHCPv6 gets an address assigned by a DHCP server (similar to DHCPv4 but for IPv6).

## Post-Installation Netplan Configuration

Ubuntu Server uses Netplan for network configuration. The configuration lives in `/etc/netplan/`:

```bash
ls /etc/netplan/
# Usually: 00-installer-config.yaml
```

### Static IPv6 Configuration

```bash
sudo nano /etc/netplan/00-installer-config.yaml
```

```yaml
network:
  version: 2
  ethernets:
    ens3:
      # Disable IPv4 entirely for a true IPv6-only setup
      dhcp4: false
      dhcp6: false
      addresses:
        - 2001:db8:1::10/64
      routes:
        - to: default
          via: 2001:db8:1::1
      nameservers:
        addresses:
          - 2001:4860:4860::8888   # Google IPv6 DNS
          - 2606:4700:4700::1111   # Cloudflare IPv6 DNS
```

### DHCPv6 Configuration

```yaml
network:
  version: 2
  ethernets:
    ens3:
      dhcp4: false
      dhcp6: true
      # Optional: accept router advertisements for additional config
      accept-ra: true
```

### SLAAC Configuration

```yaml
network:
  version: 2
  ethernets:
    ens3:
      dhcp4: false
      dhcp6: false
      # Enable SLAAC via router advertisements
      accept-ra: true
```

Apply the configuration:

```bash
sudo netplan apply

# Verify the address was assigned
ip -6 addr show
ip -6 route show
```

## Verifying IPv6 Connectivity

```bash
# Ping the gateway
ping6 2001:db8:1::1

# Ping an external IPv6 address
ping6 2001:4860:4860::8888

# Test DNS resolution
host google.com 2001:4860:4860::8888

# Check if you can reach IPv6-capable sites
curl -6 https://ipv6.google.com
```

## Configuring DNS64 for IPv4 Compatibility

If your network provides a DNS64 resolver, configure it as your nameserver. DNS64 resolvers synthesize IPv6 addresses for IPv4-only destinations using a well-known prefix (typically `64:ff9b::/96`):

```yaml
# In your netplan config
nameservers:
  addresses:
    - your-dns64-server-ipv6-address
```

Test that DNS64 is working:

```bash
# Look up a domain that only has A records (IPv4 only)
# DNS64 should return a synthesized AAAA record
host ipv4only.example.com your-dns64-server

# The response should show an AAAA record with 64:ff9b:: prefix
```

## APT and Package Management on IPv6-Only

Ubuntu's package repositories are reachable over IPv6. APT should work without modification on an IPv6-capable system:

```bash
# Verify apt can reach the repositories
sudo apt update

# If it fails, check what addresses are being resolved
nslookup archive.ubuntu.com
```

If APT is trying IPv4 addresses and failing (because there is no IPv4), you can force IPv6:

```bash
# Tell apt to prefer IPv6
echo 'Acquire::ForceIPv6 "true";' | sudo tee /etc/apt/apt.conf.d/99force-ipv6
```

## SSH on IPv6

SSH works natively with IPv6 addresses. Connect using brackets around the address:

```bash
ssh user@[2001:db8:1::10]
```

In `~/.ssh/config` on the client side:

```
Host myserver
    HostName 2001:db8:1::10
    User deploy
    IdentityFile ~/.ssh/id_ed25519
```

The SSH daemon on the server listens on both IPv4 and IPv6 by default. To restrict to IPv6 only, edit `/etc/ssh/sshd_config`:

```
ListenAddress ::
```

The `::` notation means all IPv6 addresses. If you want a specific IPv6 address:

```
ListenAddress 2001:db8:1::10
```

## Firewall Configuration with UFW for IPv6

UFW manages both IPv4 and IPv6 rules. Ensure IPv6 is enabled in UFW configuration:

```bash
sudo nano /etc/default/ufw
```

```
# Ensure this line is set
IPV6=yes
```

Rules with UFW apply to both address families:

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# View IPv6 rules specifically
sudo ip6tables -L
```

## Common Compatibility Issues

### curl and wget

Most versions of curl and wget handle IPv6 well. If a tool insists on IPv4:

```bash
# Force curl to use IPv6
curl -6 https://example.com

# Force wget to use IPv6
wget --inet6-only https://example.com
```

### Applications That Bind to 0.0.0.0

Some applications bind to `0.0.0.0` (all IPv4 interfaces) rather than `::` (all IPv6 interfaces) or `::0` (all interfaces). On IPv6-only systems, these services will fail to start or will be unreachable.

Check which address a service is listening on:

```bash
ss -tlnp | grep LISTEN
# Look for :: (IPv6) vs 0.0.0.0 (IPv4)
```

For services with configuration options, change the bind address to `::` to listen on IPv6 (which on Linux also accepts IPv4 connections via IPv4-mapped addresses, unless `/proc/sys/net/ipv6/bindv6only` is set to 1).

### Docker on IPv6-Only Systems

Docker requires explicit IPv6 configuration. Edit Docker's daemon config:

```bash
sudo nano /etc/docker/daemon.json
```

```json
{
  "ipv6": true,
  "fixed-cidr-v6": "fd00::/64",
  "ip6tables": true
}
```

```bash
sudo systemctl restart docker
```

## Checking IPv6 Address Types

IPv6 addresses have different scopes worth understanding:

```bash
ip -6 addr show
```

- `fe80::/10` - Link-local addresses (auto-configured, not routable)
- `fc00::/7` - Unique local addresses (private, similar to RFC1918)
- `2000::/3` - Global unicast (publicly routable)

For server networking, you need a global unicast address from your ISP or provider for external connectivity.

## Troubleshooting

```bash
# Check routing table
ip -6 route show

# Check if the default route exists
ip -6 route show default

# Trace the path to an external host
traceroute6 2001:4860:4860::8888

# Check neighbor discovery cache (IPv6 equivalent of ARP)
ip -6 neigh show

# Monitor ICMPv6 messages (router advertisements, etc.)
sudo tcpdump -i ens3 icmp6
```

IPv6-only operation is viable for server workloads where you control the software stack and can verify IPv6 compatibility. The biggest practical challenge is reaching legacy IPv4-only third-party services, which requires either a NAT64 gateway or a dual-stack proxy.
