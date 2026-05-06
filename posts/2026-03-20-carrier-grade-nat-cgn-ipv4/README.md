# How to Use Carrier-Grade NAT (CGN) for IPv4 Address Sharing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CGN, NAT444, IPv4, RFC 6598, ISP, Address Sharing

Description: Learn how Carrier-Grade NAT (CGN) works, how to configure it using RFC 6598 shared address space, and the trade-offs compared to one-to-one public IP assignment.

## What Is Carrier-Grade NAT?

Carrier-Grade NAT (CGN, also called NAT444 or Large-Scale NAT) adds an additional NAT layer between the ISP's network and the customer's router:

```text
Customer Device → Customer Router NAT (RFC 1918)
                → ISP CGN NAT (RFC 6598 100.64.0.0/10)
                → Internet (Public IP)
```

This allows one public IP to serve hundreds of customers, extending IPv4 address life.

## RFC 6598 Shared Address Space

IANA assigned 100.64.0.0/10 specifically for CGN use:
- Range: 100.64.0.0 – 100.127.255.255
- 4,194,304 addresses
- Not globally routable
- Distinct from RFC 1918 to avoid conflicts with customer networks

## Step 1: Configure CGN on Linux (iptables)

```bash
# Configure a Linux server as a CGN gateway

# Enable IP forwarding

sysctl -w net.ipv4.ip_forward=1

# Configure CGN NAT:
# Inside interface (toward customers): eth0 (100.64.0.0/10)
# Outside interface (toward internet): eth1 (dynamically assigned public IP)

# NAT all customer traffic to the public IP
# MASQUERADE is appropriate when the outside address is assigned dynamically
iptables -t nat -A POSTROUTING -s 100.64.0.0/10 -o eth1 -j MASQUERADE

# Allow forwarding
iptables -A FORWARD -i eth0 -o eth1 -j ACCEPT
iptables -A FORWARD -i eth1 -o eth0 -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Assign CGN addresses to customers via DHCP
# ISP DHCP server assigns 100.64.x.x to customer CPE WAN interfaces
```

## Step 2: Configure CGN DHCP Pool

```bash
# /etc/dhcp/dhcpd.conf - CGN DHCP for customer CPE devices

subnet 100.64.0.0 netmask 255.192.0.0 {
    range 100.64.0.2 100.127.255.254;   # Full RFC 6598 pool, excluding the gateway
    option routers 100.64.0.1;           # CGN gateway
    option domain-name-servers 8.8.8.8, 8.8.4.4;
    default-lease-time 86400;
    max-lease-time 604800;
}
```

## Step 3: Monitor CGN Session Table

CGN requires a large session/conntrack table for thousands of customers:

```bash
# Check current conntrack table limit
sysctl net.netfilter.nf_conntrack_max

# Increase for high-capacity CGN
sysctl -w net.netfilter.nf_conntrack_max=2097152
echo "net.netfilter.nf_conntrack_max = 2097152" >> /etc/sysctl.d/99-cgn.conf

# Monitor table usage
cat /proc/sys/net/netfilter/nf_conntrack_count

# Alert if near max
CURRENT=$(cat /proc/sys/net/netfilter/nf_conntrack_count)
MAX=$(sysctl -n net.netfilter.nf_conntrack_max)
PCTUSED=$(( CURRENT * 100 / MAX ))
echo "Conntrack usage: $CURRENT/$MAX ($PCTUSED%)"
```

## Step 4: Port Allocation for CGN

CGN must track port mappings to allow return traffic, and capacity planning depends on the translated source ports available per public IP:

```bash
# Constrain translated source ports for TCP and UDP if you want a defined NAT port pool
iptables -t nat -I POSTROUTING 1 -s 100.64.0.0/10 -p tcp -o eth1 -j MASQUERADE --to-ports 1024-65535
iptables -t nat -I POSTROUTING 2 -s 100.64.0.0/10 -p udp -o eth1 -j MASQUERADE --to-ports 1024-65535

# Calculate capacity:
# Ports per public IP: 64512 (1024-65535)
# Port budget per customer: 512 ports (example planning assumption)
# Customers per public IP: 64512 / 512 = 126 customers

# For 1000 customers at 512 ports each:
# Public IPs needed: 1000 * 512 / 64512 = 7.94, so 8 public IPs
```

## Step 5: CGN Logging for Law Enforcement Compliance

ISPs often need to log CGN translations for abuse handling and law enforcement requests:

```bash
# Packet logging alone does not record a full CGN mapping
# Requires conntrack-tools
conntrack -E | while IFS= read -r event; do
    case "$event" in
        *"[NEW]"*)
            echo "$(date -Iseconds) $event" >> /var/log/cgn-translations.log
            ;;
    esac
done

# Log format should include:
# Timestamp, Customer IP (100.64.x.x), Public IP, Public Port, Protocol
```

## Step 6: Trade-offs of CGN

| Feature | CGN | Native Public IP |
|---|---|---|
| Cost | Lower (shared public IPs) | Higher (one IP per customer) |
| Performance | Slight overhead from double NAT | No extra overhead |
| P2P applications | Often broken | Works fine |
| Port forwarding | Complex/impossible | Simple |
| Gaming/VPN | May have issues | Works fine |
| Law enforcement | Translation logging often needed | Direct customer mapping |
| IPv6 readiness | Delays IPv6 need | Better to use IPv6 directly |

## Conclusion

CGN uses RFC 6598 (100.64.0.0/10) shared address space to NAT many customers to few public IPs. Configure with iptables NAT rules, increase the conntrack table for high customer counts, and implement translation logging for compliance. CGN is a stopgap that delays IPv6 adoption - for long-term scalability, deploy IPv6 natively and use transition mechanisms such as NAT64/DNS64 where appropriate for IPv4 internet access rather than adding CGN complexity.
