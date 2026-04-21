# How to Perform Subnetting in Your Head Without a Calculator

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Subnetting, Networking, Mental Math, Certification

Description: Mental subnetting uses the 'block size' (magic number) method and memorized octet values to quickly determine network addresses, broadcast addresses, and host ranges without a calculator.

## The Magic Number / Block Size Method

For any subnet mask with a partial octet, the "block size" (or magic number) in the interesting octet is:
```text
Block size = 256 - (interesting octet of the mask)
```

The interesting octet is the first mask octet that is neither 255 nor 0.

## Step-by-Step Example: 192.168.10.45/26

1. /26 mask = 255.255.255.**192**
2. Block size = 256 - 192 = **64**
3. Subnets start at multiples of 64 in the last octet: 0, 64, 128, 192
4. 45 falls in the 0–63 range → subnet is **192.168.10.0/26**
5. Broadcast = next multiple − 1 = 64 − 1 = **192.168.10.63**
6. Host range: .1 to .62

## Practice Examples

**172.16.100.200/20**
1. /20 mask = 255.255.**240**.0 → interesting octet is the third
2. Block size = 256 - 240 = **16**
3. Multiples of 16 in third octet: ..., 96, 112, ...
4. 100 falls in 96–111 → subnet is **172.16.96.0/20**
5. Broadcast: **172.16.111.255**
6. Host range: 172.16.96.1 to 172.16.111.254

**10.5.3.200/25**
1. /25 mask = 255.255.255.**128** → interesting octet is last
2. Block size = 256 - 128 = **128**
3. Subnets: .0 and .128
4. 200 ≥ 128 → subnet is **10.5.3.128/25**
5. Broadcast: **10.5.3.255**
6. Host range: .129 to .254

## Memorization Shortcuts

| Last mask octet | Block size | Prefix |
|----------------|-----------|--------|
| 128 | 128 | /25 |
| 192 | 64 | /26 |
| 224 | 32 | /27 |
| 240 | 16 | /28 |
| 248 | 8 | /29 |
| 252 | 4 | /30 |

## Quick Formula Summary

```text
For typical IPv4 subnets that have separate network and broadcast addresses:
1. Find the interesting octet (first mask octet that is neither 255 nor 0)
2. Block = 256 - mask_octet
3. Network address = largest multiple of Block ≤ IP octet in that octet; lower host octets become 0
4. Broadcast address = Network + Block - 1 in that octet; lower host octets become 255
5. First host = Network address + 1
6. Last host = Broadcast address - 1
```

## Python Validator

Use this to verify your mental calculations:

```python
import ipaddress

def mental_check(ip_cidr: str):
    iface = ipaddress.IPv4Interface(ip_cidr)
    net = iface.network
    hosts = list(net.hosts())
    print(f"IP:        {iface.ip}")
    print(f"Subnet:    {net.network_address}")
    print(f"Broadcast: {net.broadcast_address}")
    print(f"First:     {hosts[0]}")
    print(f"Last:      {hosts[-1]}")

mental_check("192.168.10.45/26")
```

## Key Takeaways

- For masks with a partial octet, block size = 256 − interesting_mask_octet.
- The subnet start is the largest multiple of block size ≤ the IP in that octet.
- Broadcast = subnet + block − 1 (in that octet).
- Practice with the prefix sizes /25 through /30 until the block sizes are instant recall.
