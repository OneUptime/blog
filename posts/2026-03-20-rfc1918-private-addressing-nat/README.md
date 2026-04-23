# How to Implement RFC 1918 Private Addressing with NAT for Internet Access

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RFC 1918, NAT, IPv4, Private Addressing, Linux, Cisco

Description: Learn how to implement RFC 1918 private IP addressing with Network Address Translation (NAT) to give internal hosts internet access using a single public IP address.

## RFC 1918 Private Address Ranges

RFC 1918 defines three ranges for private (not globally routable on the public internet) IPv4 use:

| Range | CIDR | Addresses | Common Use |
|---|---|---|---|
| 10.0.0.0 - 10.255.255.255 | 10.0.0.0/8 | 16.7 million | Large enterprises |
| 172.16.0.0 - 172.31.255.255 | 172.16.0.0/12 | 1 million | Medium networks |
| 192.168.0.0 - 192.168.255.255 | 192.168.0.0/16 | 65,536 | Home/small networks |

## Step 1: NAT Fundamentals

NAT translates private source IPs to a public IP on outbound packets:

```text
Internal host: 192.168.1.10 → internet destination 8.8.8.8
NAT gateway replaces:
  Source IP: 192.168.1.10 → 203.0.113.1 (example public-facing IP)
  Source port: 45678        → 55001 (allocated translated port)

Return traffic:
  Destination: 203.0.113.1:55001 → reversed to 192.168.1.10:45678
```

The 203.0.113.0/24 addresses used below are RFC 5737 documentation examples; replace them with your provider-assigned public address or routed public prefix.

## Step 2: Configure NAT on Linux (iptables)

```bash
# Enable IP forwarding

echo 1 > /proc/sys/net/ipv4/ip_forward
echo "net.ipv4.ip_forward = 1" >> /etc/sysctl.d/99-nat.conf
sysctl -p /etc/sysctl.d/99-nat.conf

# Configure MASQUERADE NAT (dynamic source NAT)
# eth0 = LAN (192.168.1.0/24)
# eth1 = WAN (internet, public IP)

# NAT rule: masquerade all traffic from LAN leaving via WAN
iptables -t nat -A POSTROUTING -s 192.168.1.0/24 -o eth1 -j MASQUERADE

# Allow forwarding from LAN to WAN
iptables -A FORWARD -i eth0 -o eth1 -j ACCEPT

# Allow established connections back
iptables -A FORWARD -i eth1 -o eth0 -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Make persistent (Debian/Ubuntu with iptables-persistent)
iptables-save > /etc/iptables/rules.v4
```

## Step 3: Configure NAT on Cisco IOS (PAT)

Port Address Translation (PAT) = many-to-one NAT:

```text
! Define inside and outside interfaces
interface GigabitEthernet0/0
 ip address 192.168.1.1 255.255.255.0
 ip nat inside
 no shutdown

interface GigabitEthernet0/1
 ip address 203.0.113.2 255.255.255.252
 ip nat outside
 no shutdown

! Define which traffic to NAT (all RFC 1918 from inside)
ip access-list standard INTERNAL_HOSTS
 permit 10.0.0.0 0.255.255.255
 permit 172.16.0.0 0.15.255.255
 permit 192.168.0.0 0.0.255.255

! Configure PAT using the outside interface IP
ip nat inside source list INTERNAL_HOSTS interface GigabitEthernet0/1 overload

! Verify NAT translations
show ip nat translations
show ip nat statistics
```

## Step 4: Configure NAT with a Static Pool

For outbound NAT with a pool of public IPs (instead of single IP):

```text
! Define NAT pool
ip nat pool PUBLIC_POOL 203.0.113.100 203.0.113.110 netmask 255.255.255.0

! Use pool for inside source NAT
ip nat inside source list INTERNAL_HOSTS pool PUBLIC_POOL overload
```

## Step 5: Configure Static NAT for Servers

For servers that must be reachable from the internet:

```text
! Map internal server to public IP (static NAT)
ip nat inside source static 192.168.1.50 203.0.113.50

! Port-specific static NAT (port forwarding)
ip nat inside source static tcp 192.168.1.80 80 203.0.113.2 80    ! Web server
ip nat inside source static tcp 192.168.1.80 443 203.0.113.2 443  ! HTTPS
ip nat inside source static tcp 192.168.1.22 22 203.0.113.2 2222  ! SSH on custom port
```

## Step 6: Verify NAT Operation

```text
# Linux: Check NAT conntrack table
cat /proc/net/nf_conntrack | grep "src=192.168.1" | head -10

# View active connections
conntrack -L | grep "src=192.168.1"

# Count active conntrack entries
conntrack -C

# Cisco IOS: View active NAT translations
show ip nat translations verbose

# Output:
# Pro Inside global    Inside local      Outside local    Outside global
# tcp 203.0.113.2:55001 192.168.1.10:45678 8.8.8.8:53    8.8.8.8:53
```

## Conclusion

RFC 1918 private addressing with NAT is the foundation of most IPv4 networks. Configure MASQUERADE on Linux with `iptables -t nat -A POSTROUTING -o eth1 -j MASQUERADE` and enable IP forwarding with `sysctl net.ipv4.ip_forward=1`. On Cisco IOS, mark inside/outside interfaces, define an ACL for private traffic, and configure `ip nat inside source list ... interface ... overload`. For servers, add static NAT entries to make them reachable from the internet at specific public IPs or ports.
