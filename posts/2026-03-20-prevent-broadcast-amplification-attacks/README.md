# How to Prevent Broadcast Amplification Attacks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, Security, DDoS, Broadcast, iptables, Linux, Cisco

Description: Prevent broadcast amplification attacks including Smurf and fraggle by disabling directed broadcasts, blocking ICMP/UDP echo to broadcast addresses, and enabling source address validation.

## Introduction

Broadcast amplification attacks exploit the property that a single packet sent to a broadcast address can trigger replies from every host on the segment that responds to the targeted protocol or service. The most famous are the **Smurf attack** (ICMP) and **Fraggle attack** (UDP), both of which use a spoofed victim IP as the source. Modern networks are largely protected, but misconfigurations still create vulnerability.

## Attack Mechanism

```mermaid
graph LR
    A[Attacker\nSpoofs victim IP] --> B[Broadcast Address\n192.168.1.255]
    B --> H1[Host 1 → reply to victim]
    B --> H2[Host 2 → reply to victim]
    B --> HN[Host N → reply to victim]
    H1 --> V[Victim\nFlooded]
    H2 --> V
    HN --> V
```

The amplification factor is roughly the number of replying hosts on the target subnet.

## Layer 1: Disable Directed Broadcasts at the Router

```text
! Cisco IOS - already default since IOS 12.0; verify explicitly
interface GigabitEthernet0/0
 no ip directed-broadcast

interface GigabitEthernet0/1
 no ip directed-broadcast

! Verify no interfaces have it enabled
show running-config | include directed-broadcast
```

## Layer 2: Configure Hosts to Ignore Broadcast Pings

```bash
# Linux - ignore ICMP echo requests to broadcast/multicast

echo 1 | sudo tee /proc/sys/net/ipv4/icmp_echo_ignore_broadcasts

# Make permanent
echo "net.ipv4.icmp_echo_ignore_broadcasts = 1" \
  | sudo tee -a /etc/sysctl.d/99-security.conf
sudo sysctl --system
```

## Layer 3: Block ICMP Echo to Broadcast in iptables

```bash
# Drop ICMP echo requests arriving at broadcast destinations
sudo iptables -A INPUT -d 255.255.255.255 -p icmp --icmp-type echo-request -j DROP
sudo iptables -A INPUT -m addrtype --dst-type BROADCAST -p icmp --icmp-type echo-request -j DROP
sudo iptables -A INPUT -m addrtype --dst-type MULTICAST -p icmp --icmp-type echo-request -j DROP
```

## Layer 4: Block UDP Echo (Fraggle Attack Prevention)

The Fraggle attack abuses UDP echo (port 7); CHARGEN (port 19) is another legacy UDP diagnostic service worth blocking:

```bash
# Block UDP port 7 (echo) to broadcast
sudo iptables -A INPUT -p udp --dport 7 -d 255.255.255.255 -j DROP
sudo iptables -A INPUT -p udp --dport 7 -m addrtype --dst-type BROADCAST -j DROP

# Block UDP port 19 (chargen) to broadcast
sudo iptables -A INPUT -p udp --dport 19 -d 255.255.255.255 -j DROP
sudo iptables -A INPUT -p udp --dport 19 -m addrtype --dst-type BROADCAST -j DROP
```

## Layer 5: Enable Reverse Path Filtering (Anti-Spoofing)

Reverse path filtering helps drop packets with spoofed or unroutable source IPs. Strict mode can break asymmetric routing; use loose mode (`2`) if needed:

```bash
# Enable strict RP filtering when routing is symmetric
echo 1 | sudo tee /proc/sys/net/ipv4/conf/all/rp_filter
echo 1 | sudo tee /proc/sys/net/ipv4/conf/default/rp_filter

# Make permanent
cat >> /etc/sysctl.d/99-security.conf << 'EOF'
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1
EOF
sudo sysctl --system
```

## Layer 6: Rate-Limit ICMP Echo Replies at a Linux Perimeter

Even if one misconfigured host generates replies, limit their impact on a Linux router/firewall:

```bash
# On a Linux router/firewall, limit forwarded ICMP echo-replies to 100/second
sudo iptables -A FORWARD -p icmp --icmp-type echo-reply \
  -m limit --limit 100/sec --limit-burst 200 \
  -j ACCEPT
sudo iptables -A FORWARD -p icmp --icmp-type echo-reply -j DROP
```

## Verification

```bash
# Test that broadcast pings are ignored
ping -b 192.168.1.255 -c 3
# Should receive 0 replies from your hosts
```

## Conclusion

Combining disabled directed broadcasts (router), ignored broadcast pings (kernel), iptables DROP rules (host/perimeter), and source address validation (where supported) provides defense-in-depth against broadcast amplification attacks. Any one layer alone is insufficient; all of these layers together make the attack economically unfeasible.
