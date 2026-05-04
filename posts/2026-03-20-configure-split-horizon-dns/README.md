# How to Configure Split-Horizon DNS for Internal and External Resolution

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DNS, Split-Horizon, Internal, External, BIND, Linux, Networking

Description: Configure split-horizon DNS to return different IP addresses for internal and external clients querying the same hostname, using BIND views or separate DNS servers.

## Introduction

Split-horizon DNS (also called split-brain DNS) returns different answers based on where the query originates. External clients get public IP addresses; internal clients get private IP addresses for the same hostname. This is common for load balancers, services with both internal and external interfaces, and organizations that want internal traffic to stay on the internal network rather than hairpinning through the internet.

## Architecture

```text
External query:  dig example.com → 1.2.3.4 (public IP)
Internal query:  dig example.com → 10.20.0.10 (private IP)

Why useful:
- Keeps internal traffic on internal network (no NAT hairpin)
- Different security levels for internal vs external records
- Internal hosts can have shorter names (e.g., just "db" not "db.example.com")
```

## Method 1: BIND Views

```bash
# BIND views are the standard way to implement split-horizon:

# /etc/bind/named.conf.local:

cat >> /etc/bind/named.conf.local << 'EOF'
// ACLs for view selection:
acl "internal" { 10.0.0.0/8; 192.168.0.0/16; 172.16.0.0/12; 127.0.0.0/8; };
acl "external" { any; };

// Internal view: returns private IP addresses
view "internal" {
    match-clients { "internal"; };

    zone "example.com" {
        type master;
        file "/etc/bind/zones/internal/db.example.com";
    };
};

// External view: returns public IP addresses
view "external" {
    match-clients { "external"; };

    zone "example.com" {
        type master;
        file "/etc/bind/zones/external/db.example.com";
    };
};
EOF
```

```bash
# Internal zone file (for 10.x.x.x clients):
mkdir -p /etc/bind/zones/internal /etc/bind/zones/external

cat > /etc/bind/zones/internal/db.example.com << 'EOF'
$TTL 300
@   IN SOA ns1.example.com. admin.example.com. (2026032001 3600 900 604800 300)
@   IN NS  ns1.example.com.
@   IN A   10.20.0.10     ; Internal IP
www IN A   10.20.0.10     ; Internal IP
api IN A   10.20.0.11     ; Internal IP (different service)
EOF

cat > /etc/bind/zones/external/db.example.com << 'EOF'
$TTL 3600
@   IN SOA ns1.example.com. admin.example.com. (2026032001 3600 900 604800 300)
@   IN NS  ns1.example.com.
@   IN A   1.2.3.4        ; Public IP
www IN A   1.2.3.4        ; Public IP
api IN A   1.2.3.5        ; Public IP
EOF

# Verify:
named-checkconf
named-checkzone example.com /etc/bind/zones/internal/db.example.com
named-checkzone example.com /etc/bind/zones/external/db.example.com
systemctl restart bind9
```

## Method 2: Separate Internal DNS Server

```bash
# Simpler alternative: run two DNS servers
# Internal DNS server (Unbound with local zones):
# local-zone and local-data must live inside the server: clause, so
# write a drop-in file under unbound.conf.d/ rather than appending to the main file.

cat > /etc/unbound/unbound.conf.d/split-horizon.conf << 'EOF'
server:
    local-zone: "example.com." static
    local-data: "example.com. IN A 10.20.0.10"
    local-data: "www.example.com. IN A 10.20.0.10"
    local-data: "api.example.com. IN A 10.20.0.11"
EOF

unbound-checkconf
unbound-control reload

# Internal clients configured to use this Unbound server (via DHCP):
# dhcp-option=6,10.20.0.53  # Push internal DNS to clients
```

## Method 3: /etc/hosts Override (Simple Cases)

```bash
# For a single host that needs to resolve a hostname internally:
echo "10.20.0.10 api.example.com" >> /etc/hosts
echo "10.20.0.11 db.example.com" >> /etc/hosts

# Verify:
getent hosts api.example.com   # Should return 10.20.0.10
```

## Verify Split-Horizon Works

```bash
# Test from internal network:
dig @10.20.0.53 example.com
# Should return: 10.20.0.10

# Test from external (or simulate with dig @public_ip):
dig @1.2.3.4 example.com   # Using public IP of DNS server
# Should return: 1.2.3.4 (public IP)

# Check that views are working in BIND:
rndc status | grep "views"

# Debug: enable per-query logging to see which view matched each client:
# In BIND named.conf.local:
# logging {
#     channel default_log { stderr; severity dynamic; };
#     category queries { default_log; };
# };
# Then turn querylog on at runtime:
# rndc querylog on
```

## Conclusion

Split-horizon DNS prevents internal traffic from unnecessarily traversing the internet. Use BIND views for complex scenarios with multiple zones and ACL-based routing. For simpler setups, a dedicated internal DNS server with Unbound and `local-data` entries is easier to manage. Use `/etc/hosts` only for individual hosts that need a single override. Always test from both internal and external networks after deployment to confirm clients receive the intended IP address based on their source location.
