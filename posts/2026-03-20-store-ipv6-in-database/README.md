# How to Store IPv6 Addresses in Database Columns

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Database, IPv6, PostgreSQL, MySQL, SQL, Data Modeling

Description: Store IPv6 addresses efficiently and correctly in PostgreSQL, MySQL, and other databases using native IP types, binary storage, or text with proper indexing strategies.

## Introduction

Storing IPv6 addresses in databases requires careful design decisions. Text storage is simple but inefficient and error-prone; native IP types or binary storage provides better performance, easier comparisons, and proper indexing. This guide covers storage strategies for PostgreSQL, MySQL, and SQLite.

## PostgreSQL: Native inet and cidr Types

PostgreSQL has native `inet` and `cidr` types that handle both IPv4 and IPv6:

```sql
-- Create a table with native IPv6 storage
CREATE TABLE connection_logs (
    id          BIGSERIAL PRIMARY KEY,
    client_ip   inet NOT NULL,          -- Accepts IPv4 or IPv6
    server_ip   inet NOT NULL,
    network     cidr,                   -- For subnet storage (e.g., 2001:db8::/32)
    logged_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Insert IPv6 addresses
INSERT INTO connection_logs (client_ip, server_ip, network)
VALUES
    ('2001:db8::1', '2001:db8::10', '2001:db8::/32'),
    ('::1', '::1', '::1/128'),
    ('192.168.1.5', '10.0.0.1', '192.168.0.0/16');

-- Query: find all IPv6 clients
SELECT client_ip, logged_at
FROM connection_logs
WHERE family(client_ip) = 6;

-- Query: find clients in a specific IPv6 subnet
SELECT client_ip
FROM connection_logs
WHERE client_ip << '2001:db8::/32';  -- << means "is strictly contained in"
```

## PostgreSQL Indexing for IP Addresses

```sql
-- Create a GiST index for IP range queries (containment operations)
CREATE INDEX idx_client_ip_gist ON connection_logs USING GIST (client_ip inet_ops);

-- Create a B-tree index for equality lookups
CREATE INDEX idx_client_ip_btree ON connection_logs (client_ip);

-- Query performance example
EXPLAIN ANALYZE
SELECT * FROM connection_logs
WHERE client_ip << '2001:db8::/32';
```

## MySQL/MariaDB: VARBINARY(16) Storage

MySQL doesn't have a native inet type for IPv6. MariaDB 10.5+ also offers an `INET6` type, but for portable MySQL/MariaDB schemas you can use `VARBINARY(16)` for efficient binary storage:

```sql
-- Create table with binary IP storage
CREATE TABLE access_logs (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    client_ip  VARBINARY(16) NOT NULL,  -- Up to 16 bytes for IPv6; IPv4 uses 4 bytes
    client_ip_str VARCHAR(45) GENERATED ALWAYS AS (INET6_NTOA(client_ip)) VIRTUAL,
    logged_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_client_ip (client_ip)
);

-- Insert using INET6_ATON() for conversion
INSERT INTO access_logs (client_ip)
VALUES
    (INET6_ATON('2001:db8::1')),
    (INET6_ATON('::1')),
    (INET6_ATON('192.168.1.5'));  -- INET6_ATON handles IPv4 too

-- Query: retrieve as string
SELECT INET6_NTOA(client_ip) AS ip, logged_at
FROM access_logs;

-- Query: match by IPv6 address
SELECT * FROM access_logs
WHERE client_ip = INET6_ATON('2001:db8::1');
```

## MySQL: CIDR Subnet Queries

```sql
-- Check if an IP is in a /64 subnet in MySQL
-- Requires checking the first 8 bytes (64 bits)
SELECT INET6_NTOA(client_ip)
FROM access_logs
WHERE SUBSTRING(client_ip, 1, 8) = SUBSTRING(INET6_ATON('2001:db8::'), 1, 8);
```

## Application Layer: Normalizing Before Storage

Always normalize IPv6 addresses before inserting them:

```python
import ipaddress

def normalize_ipv6_for_storage(addr_str: str) -> str:
    """
    Normalize an IPv6 address to compressed form before storing.
    Handles IPv4-mapped addresses, zone IDs, and brackets.
    """
    # Strip brackets (URL notation)
    addr_str = addr_str.strip()
    if addr_str.startswith('[') and addr_str.endswith(']'):
        addr_str = addr_str[1:-1]
    # Strip zone ID
    addr_str = addr_str.split('%', 1)[0]

    # Normalize to compressed form
    try:
        addr = ipaddress.ip_address(addr_str)
    except ValueError:
        raise ValueError(f"Invalid IP address: {addr_str}")

    if isinstance(addr, ipaddress.IPv6Address) and addr.ipv4_mapped:
        return str(addr.ipv4_mapped)

    return str(addr)

# Examples

print(normalize_ipv6_for_storage('2001:0DB8:0000::0001'))  # 2001:db8::1
print(normalize_ipv6_for_storage('[::1]'))                  # ::1
print(normalize_ipv6_for_storage('::ffff:192.168.1.1'))    # 192.168.1.1
```

## SQLite: TEXT Storage with Normalization

SQLite has no native IP type; use normalized TEXT:

```sql
-- SQLite: store normalized IPv6 as text
CREATE TABLE requests (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    client_ip  TEXT NOT NULL,           -- Store normalized IPv6
    user_agent TEXT,
    requested_at TEXT DEFAULT (datetime('now'))
);

-- Index for exact match lookups
CREATE INDEX idx_client_ip ON requests (client_ip);

-- Full-text prefix search won't work well for subnets with TEXT
-- Use application-layer filtering for range queries
```

## Schema Design Recommendations

```sql
-- Recommended PostgreSQL schema for dual-stack applications
CREATE TABLE audit_log (
    id          BIGSERIAL PRIMARY KEY,
    -- Use inet for all IPs (handles IPv4 and IPv6)
    source_ip   inet NOT NULL,
    -- Optional: store the original string representation
    source_ip_raw VARCHAR(46),
    -- Version column for easy filtering
    ip_version  SMALLINT GENERATED ALWAYS AS (family(source_ip)) STORED,
    event_type  VARCHAR(50),
    occurred_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_source_ip ON audit_log USING GIST (source_ip inet_ops);
CREATE INDEX idx_ip_version ON audit_log (ip_version);
```

## Conclusion

PostgreSQL's native `inet` type is the best option for IPv6 storage, providing built-in CIDR operators, GiST indexing, and automatic normalization. MySQL requires `VARBINARY(16)` with `INET6_ATON()`/`INET6_NTOA()` functions. Always normalize addresses at the application layer before storage to ensure consistent comparison and indexing behavior.
