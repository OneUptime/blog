# How to Calculate Broadcast Address from IPv4 and Subnet Mask in Code

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Networking, Subnetting, C, Python, JavaScript

Description: Calculate the IPv4 broadcast address from a host address and subnet mask using bitwise OR of the network address with the inverted mask in C, Python, and JavaScript.

## Introduction

For a typical IPv4 subnet that defines a directed broadcast address, that address is the last address in the subnet. It is computed by performing a bitwise OR of the network address with the bitwise NOT of the subnet mask. Packets sent to this address are intended for all hosts on that subnet.

## C Implementation

```c
#include <stdio.h>
#include <stdint.h>
#include <arpa/inet.h>

void calc_broadcast(const char *ip_str, const char *mask_str) {
    struct in_addr ip, mask, bcast;
    inet_pton(AF_INET, ip_str,   &ip);
    inet_pton(AF_INET, mask_str, &mask);

    /* broadcast = (ip & mask) | ~mask */
    bcast.s_addr = (ip.s_addr & mask.s_addr) | ~mask.s_addr;

    char buf[INET_ADDRSTRLEN];
    inet_ntop(AF_INET, &bcast, buf, INET_ADDRSTRLEN);
    printf("Broadcast: %s\n", buf);
}

uint32_t prefix_to_mask(int prefix) {
    return prefix == 0 ? 0 : htonl(~((1u << (32 - prefix)) - 1));
}

int main(void) {
    calc_broadcast("192.168.10.45", "255.255.255.0");   /* 192.168.10.255 */
    calc_broadcast("10.20.30.100",  "255.255.0.0");     /* 10.20.255.255 */

    /* CIDR /20 example */
    struct in_addr ip, mask, bcast;
    inet_pton(AF_INET, "172.16.5.200", &ip);
    mask.s_addr = prefix_to_mask(20);
    bcast.s_addr = (ip.s_addr & mask.s_addr) | ~mask.s_addr;
    char buf[INET_ADDRSTRLEN];
    printf("Broadcast (/20): %s\n",
           inet_ntop(AF_INET, &bcast, buf, INET_ADDRSTRLEN));
    return 0;
}
```

## Python Implementation

```python
import ipaddress

def broadcast_address(ip: str, mask: str) -> str:
    interface = ipaddress.IPv4Interface(f"{ip}/{mask}")
    return str(interface.network.broadcast_address)

def broadcast_from_cidr(cidr: str) -> str:
    net = ipaddress.IPv4Interface(cidr).network
    return str(net.broadcast_address)

print(broadcast_address("192.168.10.45", "255.255.255.0"))  # 192.168.10.255
print(broadcast_address("10.20.30.100",  "255.255.0.0"))    # 10.20.255.255
print(broadcast_from_cidr("172.16.5.200/20"))               # 172.16.15.255
```

## JavaScript Implementation

```javascript
function ipToInt(ip) {
    return ip.split('.').reduce((acc, o) => (acc << 8) | parseInt(o), 0) >>> 0;
}
function intToIp(n) {
    return [(n >>> 24) & 0xff, (n >>> 16) & 0xff,
            (n >>> 8)  & 0xff,  n         & 0xff].join('.');
}
function cidrToMask(prefix) {
    return prefix === 0 ? 0 : (~((1 << (32 - prefix)) - 1)) >>> 0;
}

function broadcastAddress(ip, mask) {
    const ipInt   = ipToInt(ip);
    const maskInt = ipToInt(mask);
    const netInt  = (ipInt & maskInt) >>> 0;
    const bcast   = (netInt | (~maskInt >>> 0)) >>> 0;
    return intToIp(bcast);
}

function broadcastFromCidr(cidr) {
    const [ip, prefix] = cidr.split('/');
    const mask = cidrToMask(parseInt(prefix));
    const net  = (ipToInt(ip) & mask) >>> 0;
    return intToIp((net | (~mask >>> 0)) >>> 0);
}

console.log(broadcastAddress("192.168.10.45", "255.255.255.0")); // 192.168.10.255
console.log(broadcastFromCidr("172.16.5.200/20"));               // 172.16.15.255
```

## Conclusion

For IPv4 subnets that define a directed broadcast address, it is `(network_address) | (inverted_mask)`. Python's `ipaddress` module exposes it directly. In C and JavaScript, invert the mask bits after the AND with the IP and mask to compute the broadcast, remembering to handle unsigned 32-bit arithmetic carefully in JavaScript.
