# How to Build IPv6 Address Management Scripts in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Python, IPAM, Address Management, Automation

Description: Build IPv6 address management (IPAM) scripts in Python to automate prefix allocation, track assignments, generate reports, and integrate with network infrastructure.

## Simple SQLite-Based IPAM

```python
import sqlite3
import ipaddress
from datetime import datetime, timezone

class IPv6IPAM:
    """Simple IPv6 IPAM using SQLite."""

    def __init__(self, db_path: str = "ipam.db"):
        self.conn = sqlite3.connect(db_path)
        self.conn.execute("PRAGMA foreign_keys = ON")
        self._init_schema()

    def _init_schema(self):
        self.conn.executescript("""
            CREATE TABLE IF NOT EXISTS pools (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                prefix TEXT NOT NULL,
                prefixlen INTEGER NOT NULL,
                description TEXT
            );
            CREATE TABLE IF NOT EXISTS allocations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pool_id INTEGER REFERENCES pools(id),
                prefix TEXT NOT NULL UNIQUE,
                prefixlen INTEGER NOT NULL,
                assignee TEXT NOT NULL,
                assigned_at TEXT NOT NULL,
                released_at TEXT,
                notes TEXT
            );
        """)
        self.conn.commit()

    def add_pool(self, name: str, prefix: str, description: str = ""):
        """Register an address pool."""
        net = ipaddress.ip_network(prefix, strict=True)
        if net.version != 6:
            raise ValueError("Pool must be an IPv6 prefix")
        self.conn.execute(
            "INSERT OR IGNORE INTO pools (name, prefix, prefixlen, description) VALUES (?,?,?,?)",
            (name, str(net.network_address), net.prefixlen, description)
        )
        self.conn.commit()
        print(f"Pool '{name}' added: {prefix}")

    def allocate(self, pool_name: str, alloc_len: int, assignee: str, notes: str = "") -> str | None:
        """Allocate next available prefix from pool."""
        pool = self.conn.execute(
            "SELECT id, prefix, prefixlen FROM pools WHERE name = ?", (pool_name,)
        ).fetchone()
        if not pool:
            raise ValueError(f"Pool '{pool_name}' not found")

        pool_id, pool_prefix, pool_len = pool
        pool_net = ipaddress.ip_network(f"{pool_prefix}/{pool_len}")

        # Get all active allocations for this pool
        allocated = [
            ipaddress.ip_network(f"{row[0]}/{row[1]}")
            for row in self.conn.execute(
                "SELECT prefix, prefixlen FROM allocations WHERE pool_id = ? AND released_at IS NULL",
                (pool_id,)
            )
        ]

        # Find first unallocated subnet
        for candidate in pool_net.subnets(new_prefix=alloc_len):
            if not any(candidate.overlaps(existing) for existing in allocated):
                self.conn.execute(
                    """INSERT INTO allocations
                       (pool_id, prefix, prefixlen, assignee, assigned_at, notes)
                       VALUES (?,?,?,?,?,?)""",
                    (pool_id, str(candidate.network_address), alloc_len,
                     assignee, datetime.now(timezone.utc).isoformat(), notes)
                )
                self.conn.commit()
                result = f"{candidate.network_address}/{alloc_len}"
                print(f"Allocated {result} → {assignee}")
                return result

        print(f"Pool '{pool_name}' exhausted at /{alloc_len}")
        return None

    def release(self, prefix: str):
        """Release an allocated prefix."""
        net = ipaddress.ip_network(prefix, strict=False)
        self.conn.execute(
            "UPDATE allocations SET released_at = ? WHERE prefix = ? AND released_at IS NULL",
            (datetime.now(timezone.utc).isoformat(), str(net.network_address))
        )
        self.conn.commit()
        print(f"Released {prefix}")

    def report(self):
        """Print allocation report."""
        for pool in self.conn.execute("SELECT id, name, prefix, prefixlen FROM pools"):
            pool_id, name, prefix, plen = pool
            net = ipaddress.ip_network(f"{prefix}/{plen}")
            allocs = self.conn.execute(
                "SELECT prefix, prefixlen, assignee, assigned_at FROM allocations "
                "WHERE pool_id = ? AND released_at IS NULL ORDER BY prefix",
                (pool_id,)
            ).fetchall()
            print(f"\nPool: {name} ({prefix}/{plen})")
            print(f"  Capacity: {net.num_addresses:,} addresses")
            print(f"  Active allocations: {len(allocs)}")
            for a_prefix, a_len, assignee, ts in allocs:
                print(f"    {a_prefix}/{a_len}  → {assignee}  (since {ts[:10]})")

# Usage

ipam = IPv6IPAM("/tmp/ipv6_ipam.db")
ipam.add_pool("isp-home", "2001:db8:1000::/40", "Home subscriber prefixes")
ipam.allocate("isp-home", 56, "customer-001", notes="Account ID 1001")
ipam.allocate("isp-home", 56, "customer-002", notes="Account ID 1002")
ipam.allocate("isp-home", 56, "customer-003")
ipam.report()
```

## Prefix Utilization Report

```python
import ipaddress
import sqlite3

def utilization_report(db_path: str = "ipam.db"):
    """Generate IPv6 address utilization report."""
    conn = sqlite3.connect(db_path)

    for pool in conn.execute("SELECT id, name, prefix, prefixlen FROM pools"):
        pool_id, name, prefix, plen = pool
        pool_net = ipaddress.ip_network(f"{prefix}/{plen}")

        # Count active /56 allocations
        allocs = conn.execute(
            "SELECT COUNT(*) FROM allocations "
            "WHERE pool_id = ? AND prefixlen = 56 AND released_at IS NULL",
            (pool_id,)
        ).fetchone()[0]

        # How many /56s fit in the pool?
        total_56s = 2 ** (56 - pool_net.prefixlen) if pool_net.prefixlen <= 56 else 0
        util_pct = (allocs / total_56s) * 100 if total_56s > 0 else 0

        print(f"Pool: {name} ({prefix}/{plen})")
        print(f"  Allocated /56s: {allocs} / {total_56s} ({util_pct:.1f}%)")
        if util_pct > 80:
            print(f"  WARNING: Pool over 80% utilized!")

utilization_report("/tmp/ipv6_ipam.db")
```

## Bulk Import from CSV

```python
import csv
import ipaddress
from datetime import datetime, timezone
from ipv6_ipam import IPv6IPAM   # the class above

def bulk_import(ipam: IPv6IPAM, pool_name: str, csv_file: str):
    """
    Import existing allocations from CSV.
    CSV columns: prefix, assignee, notes
    """
    pool = ipam.conn.execute(
        "SELECT id, prefix, prefixlen FROM pools WHERE name = ?",
        (pool_name,)
    ).fetchone()
    if not pool:
        raise ValueError(f"Pool '{pool_name}' not found")

    pool_id, pool_prefix, pool_len = pool
    pool_net = ipaddress.ip_network(f"{pool_prefix}/{pool_len}")
    imported = 0
    errors = 0
    with open(csv_file, newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                net = ipaddress.ip_network(row["prefix"], strict=False)
                if net.version != 6:
                    continue
                if not net.subnet_of(pool_net):
                    raise ValueError(f"{net} is outside pool {pool_net}")

                active_allocations = [
                    ipaddress.ip_network(f"{prefix}/{prefixlen}")
                    for prefix, prefixlen in ipam.conn.execute(
                        "SELECT prefix, prefixlen FROM allocations "
                        "WHERE pool_id = ? AND released_at IS NULL",
                        (pool_id,)
                    )
                ]
                if any(net.overlaps(existing) for existing in active_allocations):
                    raise ValueError(f"{net} overlaps an existing allocation")

                # Directly insert (bypasses pool allocation logic)
                ipam.conn.execute(
                    """INSERT OR IGNORE INTO allocations
                       (pool_id, prefix, prefixlen, assignee, assigned_at, notes)
                       VALUES (?, ?, ?, ?, ?, ?)""",
                    (pool_id, str(net.network_address), net.prefixlen,
                     row.get("assignee", "imported"),
                     datetime.now(timezone.utc).isoformat(),
                     row.get("notes", ""))
                )
                imported += 1
            except Exception as e:
                print(f"Error importing {row}: {e}")
                errors += 1
    ipam.conn.commit()
    print(f"Imported {imported} allocations ({errors} errors)")
```

## Conclusion

A Python IPv6 IPAM script uses `ipaddress.ip_network()` to enumerate candidate prefixes and SQLite to track allocations. The core algorithm iterates subnets of a pool with `pool_net.subnets(new_prefix=alloc_len)` and checks the first candidate that does not overlap any active allocation. Generate utilization reports by comparing active `/56` allocation count to total capacity (`2 ** (56 - pool_prefixlen)` when the pool prefix length is `/56` or shorter). For production use, replace SQLite with PostgreSQL and add REST API endpoints via FastAPI. Integrate with your RADIUS server to provision the allocated prefix as a `Delegated-IPv6-Prefix` attribute for new subscriber sessions, or with a Kea DHCP server to automate DHCPv6 prefix delegation from configured `pd-pools`.
