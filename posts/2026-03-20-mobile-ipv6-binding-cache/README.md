# How to Understand Mobile IPv6 Binding Cache

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Mobile IPv6, Binding Cache, MIPv6, Home Agent, State Management, RFC 6275

Description: Understand the Mobile IPv6 Binding Cache maintained by Home Agents and Correspondent Nodes, including its structure, lifecycle, and role in traffic forwarding.

## Introduction

The Binding Cache is the state table maintained by Home Agents (and optionally Correspondent Nodes in Route Optimization) that maps Mobile Node Home Addresses to their current Care-of Addresses. It is the central data structure enabling Mobile IPv6 traffic forwarding.

## Binding Cache Structure

Each entry in the Binding Cache contains:

```text
Binding Cache Entry:
├── Home Address (HoA)        - Key: MN's permanent address
├── Care-of Address (CoA)     - Current location
├── Binding ID                - Unique identifier
├── Lifetime                  - Remaining validity in seconds
├── Sequence Number           - Last accepted BU sequence
├── Flags
│   ├── R: Registration       - True for Home Registrations
│   ├── P: Proxy Registration - True for PMIPv6 entries
│   └── A: Active             - True when routing via this entry
└── Timestamp                 - When entry was created/updated
```

## Binding Cache Operations

```python
# binding_cache.py - simplified Binding Cache implementation

import time
from dataclasses import dataclass, field
from typing import Optional, Dict

@dataclass
class BindingCacheEntry:
    hoa: str                          # Home Address (key)
    coa: str                          # Care-of Address
    lifetime: int                      # Seconds remaining
    sequence_number: int              # Last accepted BU sequence
    created_at: float = field(default_factory=time.time)
    is_home_registration: bool = True

    @property
    def expires_at(self) -> float:
        return self.created_at + self.lifetime

    @property
    def is_expired(self) -> bool:
        return time.time() > self.expires_at

    @property
    def remaining_lifetime(self) -> int:
        return max(0, int(self.expires_at - time.time()))


class BindingCache:
    def __init__(self):
        self._cache: Dict[str, BindingCacheEntry] = {}

    def update(self, hoa: str, coa: str, lifetime: int,
               sequence: int) -> bool:
        """
        Add or update a binding. Returns True if accepted.
        """
        existing = self._cache.get(hoa)

        # Reject if sequence number is not newer (RFC 6275 §9.5.1)
        if existing and not self._is_newer_sequence(
            sequence, existing.sequence_number
        ):
            return False

        # Deregistration: lifetime = 0 removes the binding
        if lifetime == 0:
            self._cache.pop(hoa, None)
            return True

        self._cache[hoa] = BindingCacheEntry(
            hoa=hoa,
            coa=coa,
            lifetime=lifetime,
            sequence_number=sequence
        )
        return True

    def lookup(self, hoa: str) -> Optional[str]:
        """Return the CoA for a given HoA, or None if not found/expired."""
        entry = self._cache.get(hoa)
        if entry and not entry.is_expired:
            return entry.coa
        elif entry and entry.is_expired:
            del self._cache[hoa]
        return None

    def _is_newer_sequence(self, new_seq: int, old_seq: int) -> bool:
        """Handle sequence number wrap-around (RFC 6275 §9.5.1)."""
        diff = (new_seq - old_seq) % 65536
        return 0 < diff < 32768

    def gc(self):
        """Remove expired entries."""
        expired = [hoa for hoa, e in self._cache.items() if e.is_expired]
        for hoa in expired:
            del self._cache[hoa]

    def show(self):
        """Print all active bindings."""
        for hoa, entry in self._cache.items():
            print(f"HoA={hoa} CoA={entry.coa} "
                  f"TTL={entry.remaining_lifetime}s")
```

## Binding Cache on the Home Agent (UMIP)

```bash
# View the Binding Cache contents

sudo mip6d -n

# Example output:
# ========================
# Home Agent Binding Cache
# ========================
# HoA: 2001:db8:home::100
#   CoA: 2001:db8:foreign::50
#   Lifetime: 542s (expires in 9min 2sec)
#   Seq: 47
#   Flags: R (home registration)
#
# HoA: 2001:db8:home::200
#   CoA: 2001:db8:other::30
#   Lifetime: 283s
#   Seq: 12
#   Flags: R

# Watch for binding updates in real time
journalctl -u mip6d -f | grep -i "binding\|BU\|registered"
```

## Binding Cache on Correspondent Nodes

CNs maintain a smaller binding cache for Route Optimization entries only.

```bash
# The CN kernel maintains BC entries in its IPv6 routing table
# View CN binding cache entries (Linux kernel)
ip -6 route show | grep "via.*mip6"

# Or check via procfs
cat /proc/net/mip6
```

## Lifetime Management

```text
Binding lifetime negotiation:
  MN requests:  600 seconds (MN's BU lifetime field)
  HA grants:    600 seconds (or less, based on policy)
  MN refreshes: at 300 seconds (half of granted lifetime)

Maximum lifetime: 262140 seconds (≈ 72.8 hours / ~3 days)
  (Limited by 16-bit field × 4-second units: 65535 × 4)
```

## Conclusion

The Binding Cache is the critical state that makes Mobile IPv6 work. Home Agents use it to tunnel traffic to absent MNs; CNs use it for direct Route Optimization. Understanding BC entry lifecycle helps diagnose connectivity failures. Monitor Binding Cache entry counts and expiry rates with custom metrics exported to OneUptime.
