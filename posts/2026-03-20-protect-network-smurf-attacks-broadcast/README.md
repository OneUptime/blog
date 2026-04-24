# How to Protect Your Network from Smurf Attacks Using Broadcast

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, Security, Smurf Attack, Broadcast, DDoS, Cisco, iptables

Description: Protect your network from Smurf amplification DDoS attacks by disabling directed broadcasts on routers, blocking ICMP echo to broadcast addresses, and filtering at the network perimeter.

## Introduction

A Smurf attack exploits directed broadcast to amplify ICMP traffic: an attacker sends a spoofed ICMP echo to a subnet's broadcast address, and hosts on that subnet that answer broadcast pings reply to the (forged) victim. The amplification factor is up to the number of hosts on the target subnet.

This guide covers both router-side and host-side protections.

## Step 1: Disable Directed Broadcast on All Router Interfaces

This is the most effective countermeasure. Without directed broadcast forwarding, the router will not propagate the attack packet into the target subnet.

On Cisco IOS:

```text
! Apply to every routed interface connected to a broadcast-capable subnet
interface GigabitEthernet0/0
 no ip directed-broadcast

interface GigabitEthernet0/1
 no ip directed-broadcast
```

Verify no interfaces are explicitly enabled for directed broadcast:

```text
show running-config | include directed-broadcast
```

## Step 2: Block ICMP Echo to Broadcast at the Perimeter

As defense in depth, block ICMP echo requests aimed at the limited broadcast address and your subnet-directed broadcast addresses at your border router:

```text
! Deny ICMP echo requests to broadcast addresses
ip access-list extended ANTI-SMURF-IN
 deny   icmp any host 255.255.255.255 echo
 ! Replace these example addresses with each local subnet's directed-broadcast address
 deny   icmp any host 192.0.2.255 echo
 deny   icmp any host 198.51.100.255 echo
 permit ip any any

interface GigabitEthernet0/0
 ip access-group ANTI-SMURF-IN in
```

## Step 3: Enable iptables Rules on Linux Hosts

Hosts should also refuse to respond to ICMP echo requests sent to broadcast addresses:

```bash
# Drop ICMP echo requests to broadcast addresses

sudo iptables -A INPUT -m addrtype --dst-type BROADCAST -p icmp --icmp-type echo-request -j DROP
sudo iptables -A INPUT -d 255.255.255.255 -p icmp --icmp-type echo-request -j DROP

# Linux kernel option - ignore broadcast pings
echo 1 | sudo tee /proc/sys/net/ipv4/icmp_echo_ignore_broadcasts

# Make persistent
echo "net.ipv4.icmp_echo_ignore_broadcasts = 1" | sudo tee -a /etc/sysctl.d/99-antismurf.conf
sudo sysctl --system
```

## Step 4: Enable Unicast Reverse Path Forwarding (uRPF)

uRPF helps drop packets with spoofed source addresses, removing the attacker's ability to impersonate a victim when used on interfaces with symmetric return paths:

On Cisco:

```text
! Strict uRPF on the upstream interface
interface GigabitEthernet0/0
 ip verify unicast source reachable-via rx
```

On Linux:

```bash
# Enable strict RP filtering on the uplink interface
echo 1 | sudo tee /proc/sys/net/ipv4/conf/eth0/rp_filter

# Make persistent
echo "net.ipv4.conf.all.rp_filter = 1" | sudo tee -a /etc/sysctl.d/99-antismurf.conf
sudo sysctl --system
```

## Step 5: Rate-Limit ICMP at the Perimeter

As a secondary defense, rate-limit ICMP echo replies leaving your network to reduce the reply volume during an ongoing attack:

```text
! Cisco - limit ICMP echo-reply to 512 kbps
interface GigabitEthernet0/0
 rate-limit output access-group 101 512000 8000 8000 conform-action transmit exceed-action drop

access-list 101 permit icmp any any echo-reply
```

## Verification Checklist

- [ ] `no ip directed-broadcast` on all router interfaces
- [ ] `icmp_echo_ignore_broadcasts = 1` on all Linux hosts
- [ ] Perimeter ACL blocks ICMP echo to broadcast
- [ ] uRPF enabled on upstream interfaces
- [ ] ICMP rate limits configured

## Conclusion

Smurf attacks have been largely mitigated by ISPs and vendors, but any misconfigured network with directed broadcast enabled remains vulnerable. The combination of disabling directed broadcast, ignoring broadcast pings, and enabling uRPF provides layered protection.
