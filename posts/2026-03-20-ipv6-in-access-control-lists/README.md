# How to Handle IPv6 in Access Control Lists in Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, ACL, Security, Access Control, Web Development, Firewall

Description: Implement IPv6-aware access control lists in web applications to whitelist and blacklist IP addresses and subnets, handling both IPv4 and IPv6 clients.

## Introduction

Application-layer access control lists (ACLs) must handle IPv6 addresses for subnet matching, prefix-based whitelisting, and IP blacklisting. This guide covers implementing IPv6 ACLs in Python and Node.js, including handling IPv4-mapped IPv6 addresses and efficient subnet matching.

## ACL Requirements for IPv6

IPv6 ACLs must handle:
- Full IPv6 addresses (`2001:db8::1`)
- IPv6 CIDR ranges (`2001:db8::/32`)
- IPv4-mapped IPv6 (`::ffff:192.168.1.1`)
- Case-insensitive matching (IPv6 is hex)
- Multiple equivalent representations of the same address

## Python: IPv6-Aware ACL Class

```python
import ipaddress
from typing import List, Union

class IPv6ACL:
    """
    Access Control List that handles both IPv4 and IPv6 addresses and subnets.
    """

    def __init__(self):
        self._whitelist: List[Union[ipaddress.IPv4Network, ipaddress.IPv6Network]] = []
        self._blacklist: List[Union[ipaddress.IPv4Network, ipaddress.IPv6Network]] = []

    def _normalize_network(self, network):
        """Convert IPv4-mapped IPv6 networks to pure IPv4 when possible."""
        if (
            isinstance(network, ipaddress.IPv6Network)
            and network.network_address.ipv4_mapped
            and network.prefixlen >= 96
        ):
            mapped = network.network_address.ipv4_mapped
            return ipaddress.ip_network(f'{mapped}/{network.prefixlen - 96}', strict=False)
        return network

    def _parse_network(self, entry: str):
        """Parse an IP address or CIDR block, stripping zone IDs and brackets."""
        clean = entry.strip().strip('[]').split('%')[0]
        try:
            # Try as network first (CIDR notation)
            network = ipaddress.ip_network(clean, strict=False)
        except ValueError:
            # Try as single address (convert to /128 or /32)
            network = ipaddress.ip_network(ipaddress.ip_address(clean))
        return self._normalize_network(network)

    def add_whitelist(self, *entries: str):
        for entry in entries:
            self._whitelist.append(self._parse_network(entry))

    def add_blacklist(self, *entries: str):
        for entry in entries:
            self._blacklist.append(self._parse_network(entry))

    def _normalize_ip(self, ip_str: str) -> ipaddress.IPv4Address | ipaddress.IPv6Address:
        """Normalize IP, converting IPv4-mapped IPv6 to pure IPv4."""
        clean = ip_str.strip().strip('[]').split('%')[0]
        addr = ipaddress.ip_address(clean)
        if isinstance(addr, ipaddress.IPv6Address) and addr.ipv4_mapped:
            return addr.ipv4_mapped
        return addr

    def is_allowed(self, ip_str: str) -> bool:
        """
        Check if an IP is allowed.
        Returns True if whitelisted (or whitelist is empty) and not blacklisted.
        """
        try:
            addr = self._normalize_ip(ip_str)
        except ValueError:
            return False  # Invalid IP is denied

        # Check blacklist first
        for network in self._blacklist:
            if addr in network:
                return False

        # If whitelist exists, IP must be in it
        if self._whitelist:
            for network in self._whitelist:
                if addr in network:
                    return True
            return False  # Not in whitelist

        return True  # No whitelist = allow all non-blacklisted

# Usage

acl = IPv6ACL()

# Whitelist internal networks
acl.add_whitelist(
    '127.0.0.0/8',
    '::1/128',
    '10.0.0.0/8',
    '192.168.0.0/16',
    '2001:db8::/32',
    'fd00::/8',
)

# Blacklist specific IPs
acl.add_blacklist('2001:db8::bad', '192.168.1.100')

# Test
test_ips = [
    '2001:db8::1',        # Whitelisted IPv6
    '::ffff:10.0.0.5',    # IPv4-mapped, whitelisted
    '10.0.0.5',           # IPv4 whitelisted
    '8.8.8.8',            # Not in whitelist - denied
    '2001:db8::bad',      # Blacklisted
]

for ip in test_ips:
    print(f"{ip}: {'ALLOWED' if acl.is_allowed(ip) else 'DENIED'}")
```

## Node.js: IPv6 ACL Middleware

```javascript
const ipaddr = require('ipaddr.js');  // npm install ipaddr.js

class IPv6ACL {
  constructor() {
    this.whitelist = [];
    this.blacklist = [];
  }

  _normalizeRange([network, bits]) {
    if (network.kind() === 'ipv6' && network.isIPv4MappedAddress() && bits >= 96) {
      return [network.toIPv4Address(), bits - 96];
    }
    return [network, bits];
  }

  _parseRange(entry) {
    try {
      // Remove brackets and zone IDs
      const clean = entry.trim().replace(/[\[\]]/g, '').split('%')[0];
      if (clean.includes('/')) {
        return this._normalizeRange(ipaddr.parseCIDR(clean));
      }
      const addr = ipaddr.parse(clean);
      // Convert to CIDR for consistent matching
      const bits = addr.kind() === 'ipv6' ? 128 : 32;
      return this._normalizeRange([addr, bits]);
    } catch (e) {
      throw new Error(`Invalid IP/CIDR: ${entry} - ${e.message}`);
    }
  }

  addWhitelist(...entries) {
    entries.forEach(e => this.whitelist.push(this._parseRange(e)));
    return this;
  }

  addBlacklist(...entries) {
    entries.forEach(e => this.blacklist.push(this._parseRange(e)));
    return this;
  }

  isAllowed(ipStr) {
    let addr;
    try {
      const clean = ipStr.replace(/[\[\]]/g, '').split('%')[0];
      addr = ipaddr.parse(clean);
      // Convert IPv4-mapped IPv6 to IPv4
      if (addr.kind() === 'ipv6' && addr.isIPv4MappedAddress()) {
        addr = addr.toIPv4Address();
      }
    } catch {
      return false;
    }

    // Check blacklist
    for (const [network, bits] of this.blacklist) {
      if (addr.kind() === network.kind() && addr.match([network, bits])) {
        return false;
      }
    }

    // Check whitelist
    if (this.whitelist.length === 0) return true;
    for (const [network, bits] of this.whitelist) {
      if (addr.kind() === network.kind() && addr.match([network, bits])) {
        return true;
      }
    }
    return false;
  }

  // Express middleware
  middleware() {
    return (req, res, next) => {
      const ip = req.ip || req.socket.remoteAddress || '';
      if (this.isAllowed(ip)) {
        next();
      } else {
        res.status(403).json({ error: 'Access denied' });
      }
    };
  }
}

// Usage
const acl = new IPv6ACL()
  .addWhitelist('127.0.0.0/8', '::1/128', '10.0.0.0/8', '2001:db8::/32')
  .addBlacklist('2001:db8::bad:1');

// Apply as Express middleware
app.use('/admin', acl.middleware());
```

## Nginx ACL with IPv6

```nginx
# /etc/nginx/conf.d/acl.conf
# Allow/deny specific IPv6 addresses and subnets

geo $allowed_ip {
    default         0;
    # Allowed IPv4
    127.0.0.0/8     1;
    10.0.0.0/8      1;
    192.168.0.0/16  1;
    # Allowed IPv6
    ::1/128         1;
    2001:db8::/32   1;
    fd00::/8        1;
}

server {
    location /admin {
        if ($allowed_ip = 0) {
            return 403;
        }
        proxy_pass http://backend_admin;
    }
}
```

## Conclusion

IPv6 application ACLs require subnet matching with CIDR notation, handling of IPv4-mapped addresses, and case-insensitive comparison. Libraries like Python's `ipaddress` and Node.js's `ipaddr.js` abstract these complexities. Always normalize client IPs (strip zone IDs, convert IPv4-mapped) before ACL evaluation to prevent bypass through equivalent address representations.
