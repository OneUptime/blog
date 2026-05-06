# How to Compare Two IPv4 Addresses Programmatically

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, IPv4, Comparison, Sorting, Ipaddress, Networking

Description: Learn how to compare IPv4 addresses programmatically in Python and other languages, using integer-based comparison to correctly handle ordering, equality, and range checks.

## Python: Comparison with ipaddress

```python
import ipaddress

a = ipaddress.IPv4Address("192.168.1.1")
b = ipaddress.IPv4Address("192.168.1.100")
c = ipaddress.IPv4Address("192.168.1.1")

# All standard comparison operators work

print(a == c)   # True
print(a < b)    # True
print(b > a)    # True
print(a <= c)   # True
print(a != b)   # True
```

## Python: String Comparison Pitfall

```python
# WRONG: lexicographic string comparison gives wrong order
ips_str = ["10.0.0.200", "10.0.0.10", "10.0.0.9"]
print(sorted(ips_str))  # ['10.0.0.10', '10.0.0.200', '10.0.0.9']  ← WRONG

# CORRECT: use IPv4Address as sort key
import ipaddress
print(sorted(ips_str, key=ipaddress.IPv4Address))
# ['10.0.0.9', '10.0.0.10', '10.0.0.200']  ← CORRECT
```

## Python: Integer Comparison

```python
import ipaddress

def compare_ips(ip1: str, ip2: str) -> int:
    """
    Returns -1 if ip1 < ip2, 0 if equal, 1 if ip1 > ip2.
    """
    n1 = int(ipaddress.IPv4Address(ip1))
    n2 = int(ipaddress.IPv4Address(ip2))
    if n1 < n2:
        return -1
    elif n1 > n2:
        return 1
    return 0

print(compare_ips("10.0.0.1",   "10.0.0.2"))    # -1
print(compare_ips("192.168.1.1","192.168.1.1"))  # 0
print(compare_ips("172.16.0.1", "10.0.0.1"))    # 1
```

## JavaScript: Comparison via Integer Conversion

```javascript
function ipToInt(ip) {
    return ip.split(".").reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

function compareIPs(a, b) {
    return Math.sign(ipToInt(a) - ipToInt(b));
}

const ips = ["10.0.0.200", "10.0.0.10", "10.0.0.9", "192.168.1.1"];
ips.sort((a, b) => ipToInt(a) - ipToInt(b));
console.log(ips);  // ['10.0.0.9', '10.0.0.10', '10.0.0.200', '192.168.1.1']
```

## Go: Comparison via net.ParseIP().To4() and bytes.Compare

```go
package main

import (
    "bytes"
    "fmt"
    "net"
)

func compareIPv4(a, b string) int {
    ia := net.ParseIP(a).To4()
    ib := net.ParseIP(b).To4()
    return bytes.Compare(ia, ib)
}

func main() {
    fmt.Println(compareIPv4("10.0.0.1",   "10.0.0.2"))    // -1
    fmt.Println(compareIPv4("192.168.1.1","192.168.1.1")) // 0
    fmt.Println(compareIPv4("172.16.0.1", "10.0.0.1"))   // 1
}
```

## Range Check: Is IP Between Two Addresses?

```python
import ipaddress

def ip_in_range(ip: str, lo: str, hi: str) -> bool:
    """Return True if lo <= ip <= hi (inclusive)."""
    return (ipaddress.IPv4Address(lo) <=
            ipaddress.IPv4Address(ip) <=
            ipaddress.IPv4Address(hi))

print(ip_in_range("10.0.0.50", "10.0.0.1", "10.0.0.100"))  # True
print(ip_in_range("10.0.0.101","10.0.0.1", "10.0.0.100"))  # False
```

## Conclusion

Never compare IPv4 addresses as plain strings - lexicographic order produces wrong results (e.g., `"10.0.0.200" < "10.0.0.9"`). Always convert to an integer or use a typed wrapper (`IPv4Address` in Python, `net.IP` + `bytes.Compare` in Go) before comparing. Python's `IPv4Address` implements all six comparison operators, making it a drop-in replacement wherever ordered comparisons are needed.
