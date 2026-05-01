# How to Configure Firewall Rules for 6in4 and 6to4 Tunnels (Protocol 41)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Firewall, Tunneling, 6in4, iptables, Network Security

Description: Learn how to configure iptables and firewall rules to correctly permit IPv6-in-IPv4 tunnel traffic (Protocol 41) for 6in4 and 6to4 tunnel mechanisms.

## Understanding Protocol 41

Both 6in4 and 6to4 tunnels work by encapsulating IPv6 packets inside IPv4 packets. The IPv4 header uses protocol number 41 to indicate this encapsulation. If your firewall drops protocol 41, all tunnel traffic will be silently discarded, breaking IPv6 connectivity even when the tunnel appears configured correctly.

## Step 1: Check Current Firewall Rules

Before adding new rules, inspect what is already in place:

```bash
# List all IPv4 filter rules with line numbers

sudo iptables -L -n -v --line-numbers

# Check for INPUT rules that reference protocol 41 / IPv6 encapsulation
sudo iptables -S INPUT | grep -E -- '-p (41|ipv6)( |$)'
```

If protocol 41 is not explicitly permitted and the default policy is DROP, tunnel traffic is being silently discarded.

## Step 2: Allow Protocol 41 for 6in4 Tunnels

For a 6in4 tunnel where your remote tunnel endpoint is a known static IP (e.g., a Hurricane Electric tunnel broker endpoint), allow protocol 41 only from that IP:

```bash
# Allow 6in4 traffic from the specific tunnel broker endpoint
sudo iptables -A INPUT -p 41 -s 216.66.80.30 -j ACCEPT
sudo iptables -A OUTPUT -p 41 -d 216.66.80.30 -j ACCEPT

# Save rules so they persist across reboots on Debian/Ubuntu
# systems using netfilter-persistent / iptables-persistent
sudo netfilter-persistent save
```

Replace `216.66.80.30` with your actual tunnel broker IPv4 endpoint address.

## Step 3: Allow Protocol 41 for 6to4 Tunnels

6to4 is a legacy transition mechanism. RFC 7526 deprecated the anycast relay address `192.88.99.1`, so it should not be used for new deployments. If you are maintaining an existing 6to4 setup, you may need a broader rule because traffic can arrive from arbitrary 6to4 peers:

```bash
# Allow legacy 6to4 tunnel traffic from/to any source
sudo iptables -A INPUT -p 41 -j ACCEPT
sudo iptables -A OUTPUT -p 41 -j ACCEPT
```

## Step 4: Configure ip6tables for the Tunnel Interface

Once IPv6 packets are unwrapped from the tunnel, ip6tables governs their treatment. Allow forwarded IPv6 traffic through the tunnel interface (typically `sit0`, `sit1`, or `tun6to4`):

```bash
# Allow forwarded IPv6 traffic on the tunnel interface
sudo ip6tables -A FORWARD -i sit1 -j ACCEPT
sudo ip6tables -A FORWARD -o sit1 -j ACCEPT

# Allow inbound IPv6 traffic on the tunnel interface
sudo ip6tables -A INPUT -i sit1 -j ACCEPT
```

## Step 5: Configure nftables (Modern Alternative)

If your system uses nftables instead of iptables, add Protocol 41 rules to an existing `inet` filter table:

```bash
# Add to /etc/nftables.conf or run interactively
nft add rule inet filter input ip protocol 41 ip saddr 216.66.80.30 accept
nft add rule inet filter output ip protocol 41 ip daddr 216.66.80.30 accept

# List the current nftables ruleset
nft list ruleset
```

## Step 6: Verify Tunnel Functionality After Rule Changes

After applying rules, verify the tunnel is passing traffic:

```bash
# Ping a known reachable IPv6 host through the tunnel
ping -6 2001:4860:4860::8888

# Trace the path over the tunnel
traceroute -6 2001:4860:4860::8888

# Check tunnel interface statistics
ip -s link show sit1
```

## Common Pitfalls

- **Stateful inspection:** Do not assume generic TCP/UDP-oriented state rules will match protocol 41 traffic. Explicit protocol 41 ACCEPT rules are often still required.
- **NAT and 6in4:** If your Linux router is behind NAT, the outer IPv4 source address changes, breaking the tunnel. Use a tunnel type that can traverse NAT (like Teredo or a VPN-based approach).
- **Default DROP policy:** Always ensure protocol 41 is explicitly accepted before applying a DROP default policy.

## Conclusion

Configuring firewall rules for 6in4 and 6to4 tunnels requires explicitly permitting protocol number 41 on the IPv4 firewall layer, then managing IPv6 traffic on the tunnel interface with ip6tables or nftables. Restrict protocol 41 rules to known tunnel endpoint IPs where possible to maintain security.
