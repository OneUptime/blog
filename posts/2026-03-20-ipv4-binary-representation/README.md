# How to Convert IPv4 Addresses to Binary Representation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, IPv4, Binary, Networking, Ipaddress, Subnetting

Description: Learn how to convert IPv4 addresses to their binary (bit-string) representation in Python, useful for understanding subnetting, CIDR masking, and teaching network concepts.

## Octet-by-Octet Binary String

```python
def ipv4_to_binary(ip: str) -> str:
    """Return 32-bit binary string with dots between octets."""
    octets = ip.split(".")
    return ".".join(f"{int(o):08b}" for o in octets)

print(ipv4_to_binary("192.168.1.1"))
# 11000000.10101000.00000001.00000001

print(ipv4_to_binary("255.255.255.0"))
# 11111111.11111111.11111111.00000000

print(ipv4_to_binary("0.0.0.0"))
# 00000000.00000000.00000000.00000000

```

## Flat 32-Bit Binary String

```python
import ipaddress

def ipv4_to_bits(ip: str) -> str:
    """Return 32-character binary string without separators."""
    n = int(ipaddress.IPv4Address(ip))
    return f"{n:032b}"

print(ipv4_to_bits("10.0.0.1"))   # 00001010000000000000000000000001
print(ipv4_to_bits("8.8.8.8"))    # 00001000000000001000000000001000
```

## Visualising Network vs Host Bits

```python
import ipaddress

def show_network_host_bits(cidr: str) -> None:
    """Display network bits (N) and host bits (H) for a CIDR block."""
    iface = ipaddress.IPv4Interface(cidr)
    ip_bits = f"{int(iface.ip):032b}"
    prefix  = iface.network.prefixlen

    # Reinsert dots at octet boundaries
    full = ip_bits[:8]+"."+ip_bits[8:16]+"."+ip_bits[16:24]+"."+ip_bits[24:]
    annotation_bits = "".join(
        "N" if i < prefix else "H"
        for i in range(32)
    )
    annotation = ".".join(
        annotation_bits[i:i+8]
        for i in range(0, 32, 8)
    )

    print(f"IP:         {cidr}")
    print(f"Binary:     {full}")
    print(f"N/H map:    {annotation}")
    print(f"            Prefix={prefix}  host_bits={32-prefix}")

show_network_host_bits("192.168.1.50/24")
# IP:         192.168.1.50/24
# Binary:     11000000.10101000.00000001.00110010
# N/H map:    NNNNNNNN.NNNNNNNN.NNNNNNNN.HHHHHHHH
#             Prefix=24  host_bits=8
```

## Binary to IPv4 String

```python
def binary_to_ipv4(bits: str) -> str:
    """Convert 32-character binary string back to dotted-decimal."""
    bits = bits.replace(".", "")  # remove dots if present
    if len(bits) != 32 or not all(c in "01" for c in bits):
        raise ValueError(f"Expected 32 binary digits, got: {bits!r}")
    octets = [int(bits[i:i+8], 2) for i in range(0, 32, 8)]
    return ".".join(str(o) for o in octets)

print(binary_to_ipv4("11000000101010000000000100000001"))  # 192.168.1.1
print(binary_to_ipv4("00001010.00000000.00000000.00000001"))  # 10.0.0.1
```

## Subnet Mask AND Operation

```python
import ipaddress

def apply_mask(ip: str, prefix: int) -> str:
    """Show bitwise AND of IP with subnet mask to derive network address."""
    ip_int   = int(ipaddress.IPv4Address(ip))
    mask_int = int(ipaddress.IPv4Network(f"0.0.0.0/{prefix}").netmask)
    net_int  = ip_int & mask_int
    return str(ipaddress.IPv4Address(net_int))

print(apply_mask("192.168.1.50", 24))  # 192.168.1.0
print(apply_mask("10.20.30.40",  16))  # 10.20.0.0
```

## Conclusion

Binary representation reveals the structure of IPv4 addresses that decimal notation hides. Converting with `f"{int(IPv4Address(ip)):032b}"` gives a clean 32-bit string. The `N/H` annotation shows which bits belong to the network prefix and which to the host portion, making subnetting concepts intuitive. The bitwise AND of an address with its subnet mask always yields the network address - the foundation of all routing decisions.
