# How to Set Up Port Forwarding with NAT

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, NAT, Port Forwarding, Linux, IPv4

Description: Learn how to configure port forwarding using DNAT to redirect incoming connections on a public IP to an internal server.

## What Is Port Forwarding?

Port forwarding is a form of DNAT (Destination NAT) that redirects incoming traffic on a specific port from a public IP to a private host and port inside your network.

**Common use cases:**

- Hosting a web server behind a NAT router (HTTP/HTTPS)
- SSH access to an internal host
- Game server hosting
- Remote desktop access

## Port Forwarding with iptables on Linux

### Basic Structure

```bash
# Redirect public_ip:public_port → private_ip:private_port

iptables -t nat -A PREROUTING -i eth1 \
    -d PUBLIC_IP -p tcp --dport PUBLIC_PORT \
    -j DNAT --to-destination PRIVATE_IP:PRIVATE_PORT
```

### Example 1: Forward HTTP (port 80) to Internal Web Server

```bash
# Enable IP forwarding
echo 1 > /proc/sys/net/ipv4/ip_forward

# Forward port 80 from public to web server at 192.168.1.10:80
iptables -t nat -A PREROUTING -i eth1 -p tcp --dport 80 \
    -j DNAT --to-destination 192.168.1.10:80

# Allow new forwarded traffic to the web server
iptables -A FORWARD -i eth1 -o eth0 -p tcp -d 192.168.1.10 --dport 80 \
    -m conntrack --ctstate NEW -j ACCEPT

# Allow return traffic
iptables -A FORWARD -i eth0 -o eth1 \
    -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
```

### Example 2: Forward External Port 2222 to Internal SSH (port 22)

```bash
iptables -t nat -A PREROUTING -i eth1 -p tcp --dport 2222 \
    -j DNAT --to-destination 192.168.1.20:22

iptables -A FORWARD -i eth1 -o eth0 -p tcp -d 192.168.1.20 --dport 22 \
    -m conntrack --ctstate NEW -j ACCEPT

iptables -A FORWARD -i eth0 -o eth1 \
    -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
```

## Port Forwarding with nftables

```bash
table inet nat {
    chain prerouting {
        type nat hook prerouting priority -100;
        # Forward port 80 to internal web server
        tcp dport 80 dnat ip to 192.168.1.10:80
        # Forward port 2222 to internal SSH
        tcp dport 2222 dnat ip to 192.168.1.20:22
    }
    chain postrouting {
        type nat hook postrouting priority 100;
    }
}
```

## Port Forwarding on Cisco IOS

Assume the inside and outside interfaces are already configured with `ip nat inside` and `ip nat outside`.

```cisco
! Forward TCP port 80 to 192.168.1.10
ip nat inside source static tcp 192.168.1.10 80 203.0.113.1 80

! Forward external 8080 to internal 192.168.1.10:80
ip nat inside source static tcp 192.168.1.10 80 203.0.113.1 8080

! Forward UDP port 53 (DNS)
ip nat inside source static udp 192.168.1.53 53 203.0.113.1 53
```

## Port Range Forwarding

```bash
# Forward ports 8000-8010 to the same ports on the internal host
iptables -t nat -A PREROUTING -i eth1 -p tcp --dport 8000:8010 \
    -j DNAT --to-destination 192.168.1.10
```

## Verify Port Forwarding

```bash
# Check PREROUTING rules
iptables -t nat -L PREROUTING -n -v

# Check active connections
conntrack -L | grep 192.168.1.10

# Test from external host
curl http://203.0.113.1:80
nc -zv 203.0.113.1 2222
```

## Common Issues

| Problem | Cause | Fix |
|---------|-------|-----|
| Connection refused | FORWARD chain missing rule | Add FORWARD accept rule |
| Traffic not reaching server | IP forwarding disabled | `echo 1 > /proc/sys/net/ipv4/ip_forward` |
| Works from outside, not inside | Missing hairpin NAT | Configure NAT hairpinning |
| Intermittent failures | conntrack table full | Increase `nf_conntrack_max` |

## Key Takeaways

- Port forwarding uses DNAT in the PREROUTING chain to redirect incoming traffic.
- If your FORWARD policy is restrictive, add a corresponding FORWARD rule to allow the forwarded traffic.
- SNAT or MASQUERADE is only needed when replies would not otherwise pass back through the NAT device, such as hairpin NAT.
- On Cisco, `ip nat inside source static tcp private_ip port public_ip port` creates the port mapping after inside and outside interfaces are defined.

**Related Reading:**

- [How to Configure PAT (Port Address Translation)](https://oneuptime.com/blog/post/2026-03-20-configure-pat-nat-overload/view)
- [How to Configure Destination NAT (DNAT) on Linux](https://oneuptime.com/blog/post/2026-03-20-configure-dnat-linux/view)
- [How to Configure Hairpin NAT for Internal Access to Public Services](https://oneuptime.com/blog/post/2026-03-20-hairpin-nat-internal-access/view)
