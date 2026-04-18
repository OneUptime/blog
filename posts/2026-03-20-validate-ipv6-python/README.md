# How to Validate IPv6 Addresses in Python - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Python, Validation, Ipaddress, Input Sanitization

Description: Validate IPv6 addresses in Python applications using the ipaddress module, regex, and custom validators that check address type, prefix length, and scope constraints.

## Basic Validation with ipaddress

The safest way to validate an IPv6 address is to let Python parse it.

```python
import ipaddress

def is_valid_ipv6(address: str) -> bool:
    """Return True if string is a valid IPv6 address."""
    try:
        ip = ipaddress.ip_address(address)
        return ip.version == 6
    except ValueError:
        return False

# Test cases

test_addresses = [
    ("2001:db8::1", True),
    ("::1", True),
    ("fe80::1", True),
    ("2001:db8::", True),
    ("::", True),
    ("2001:db8::1::1", False),  # double ::
    ("2001:db8::xyz", False),   # invalid hex
    ("192.168.1.1", False),     # IPv4 not IPv6
    ("2001:db8::1%eth0", True),  # zone ID accepted in Python 3.9+
    ("", False),
]

for addr, expected in test_addresses:
    result = is_valid_ipv6(addr)
    status = "OK" if result == expected else "FAIL"
    print(f"{status}: {addr!r:30s} -> {result} (expected {expected})")
```

## Validate with Prefix Length

For CIDR notation (address/prefix), use `ip_network` or `ip_interface`.

```python
import ipaddress

def validate_ipv6_prefix(prefix_str: str, strict: bool = False) -> dict:
    """
    Validate an IPv6 prefix in CIDR notation.
    strict=True: host bits must be zero (network address)
    strict=False: allow host addresses with prefix length
    """
    result = {"valid": False, "network": None, "prefixlen": None, "error": None}
    try:
        if strict:
            net = ipaddress.ip_network(prefix_str, strict=True)
        else:
            net = ipaddress.ip_interface(prefix_str).network
        if net.version != 6:
            result["error"] = "Not an IPv6 prefix"
            return result
        result.update({"valid": True, "network": str(net), "prefixlen": net.prefixlen})
    except ValueError as e:
        result["error"] = str(e)
    return result

# Test
prefixes = [
    "2001:db8::/32",
    "2001:db8::1/64",      # host bits set - strict=False allows this
    "2001:db8::/129",      # invalid prefix length
    "fd00::/8",
    "::/0",
    "not-a-prefix",
]
for p in prefixes:
    r = validate_ipv6_prefix(p)
    print(f"{p:25s} -> valid={r['valid']}, len={r['prefixlen']}, err={r['error']}")
```

## Type-Constrained Validation

Validate that an address is of a specific type.

```python
import ipaddress

class IPv6AddressValidator:
    """Validate IPv6 address with type constraints."""

    @staticmethod
    def validate(addr_str: str,
                 allow_link_local: bool = False,
                 allow_loopback: bool = False,
                 allow_multicast: bool = False,
                 allow_ula: bool = True,
                 require_global: bool = False) -> tuple[bool, str]:
        """
        Returns (is_valid, reason).
        """
        try:
            addr = ipaddress.ip_address(addr_str)
        except ValueError:
            return False, f"Invalid IPv6 address: {addr_str!r}"

        if addr.version != 6:
            return False, "Address is IPv4, not IPv6"

        if addr.is_loopback and not allow_loopback:
            return False, "Loopback address not allowed"

        if addr.is_link_local and not allow_link_local:
            return False, "Link-local address not allowed"

        if addr.is_multicast and not allow_multicast:
            return False, "Multicast address not allowed"

        if addr.is_private and not allow_ula:
            return False, "ULA address not allowed"

        if require_global and not addr.is_global:
            return False, "Global unicast address required"

        return True, "OK"

v = IPv6AddressValidator()
tests = [
    ("2001:db8::1", {"require_global": True}),
    ("::1", {"allow_loopback": True}),
    ("fe80::1", {}),
    ("fd00::1", {"allow_ula": True}),
    ("ff02::1", {}),
]
for addr, kwargs in tests:
    valid, reason = v.validate(addr, **kwargs)
    print(f"{addr:20s} kwargs={kwargs} -> {valid}: {reason}")
```

## Validate IPv6 in Web Forms (FastAPI/Flask)

```python
import ipaddress
from typing import Optional

# FastAPI example with Pydantic
from pydantic import BaseModel, field_validator

class DeviceForm(BaseModel):
    name: str
    ipv6_address: Optional[str] = None

    @field_validator("ipv6_address")
    @classmethod
    def validate_ipv6(cls, v):
        if v is None:
            return v
        # Strip zone ID if present
        addr_str = v.split('%')[0]
        try:
            addr = ipaddress.ip_address(addr_str)
            if addr.version != 6:
                raise ValueError("Must be an IPv6 address")
            if not (addr.is_global or addr.is_private or addr.is_loopback):
                raise ValueError("Address must be global, ULA, or loopback")
            return str(addr)  # normalize to compressed form
        except ValueError as e:
            raise ValueError(f"Invalid IPv6: {e}") from e

# Test
try:
    d = DeviceForm(name="server", ipv6_address="2001:DB8::0001")
    print(f"Normalized: {d.ipv6_address}")  # 2001:db8::1
except Exception as e:
    print(f"Error: {e}")
```

## Bulk Validation from File or API

```python
import ipaddress
import json
from typing import Iterator

def validate_ipv6_bulk(addresses: Iterator[str]) -> dict:
    """Validate a list of IPv6 addresses, return stats and errors."""
    results = {"valid": [], "invalid": [], "stats": {}}
    type_counts = {}

    for raw in addresses:
        addr_str = raw.strip().split('%')[0]
        try:
            addr = ipaddress.ip_address(addr_str)
            if addr.version == 6:
                normalized = str(addr)
                results["valid"].append(normalized)
                # Count types
                atype = "global" if addr.is_global else \
                        "link_local" if addr.is_link_local else \
                        "ula" if addr.is_private else \
                        "multicast" if addr.is_multicast else "other"
                type_counts[atype] = type_counts.get(atype, 0) + 1
            else:
                results["invalid"].append({"input": raw, "reason": "IPv4"})
        except ValueError as e:
            results["invalid"].append({"input": raw, "reason": str(e)})

    results["stats"] = {
        "total": len(results["valid"]) + len(results["invalid"]),
        "valid_count": len(results["valid"]),
        "invalid_count": len(results["invalid"]),
        "types": type_counts,
    }
    return results

# Example usage
sample = ["2001:db8::1", "fe80::1", "::1", "bad-addr", "10.0.0.1", "2001:db8::2"]
report = validate_ipv6_bulk(iter(sample))
print(json.dumps(report["stats"], indent=2))
```

## Conclusion

Use Python's `ipaddress.ip_address()` as the primary validation method - it handles all valid IPv6 formats and raises `ValueError` for invalid input. For web APIs and forms, normalize the validated address with `str(addr)` to return a consistent compressed form. Add type constraints (`is_global`, `is_link_local`, `is_private`) to enforce address scope requirements for your application. For CIDR prefix validation, use `ip_network(strict=False)` to allow host addresses with prefix length, or `strict=True` to require clean network addresses. Since Python 3.9, `ip_address()` accepts zone identifiers (`%eth0`) and exposes them via the `scope_id` attribute; strip them beforehand if you need to normalize away the zone or support older interpreters.
