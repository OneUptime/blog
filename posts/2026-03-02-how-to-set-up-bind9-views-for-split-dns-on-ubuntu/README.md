# How to Set Up BIND9 Views for Split DNS on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, BIND9, DNS, Networking, Split DNS

Description: Learn how to configure BIND9 views on Ubuntu to implement split DNS, serving different DNS responses to internal and external clients from the same server.

---

Split DNS (also called split-horizon DNS) is a technique where your DNS server returns different answers to the same query depending on who's asking. Internal clients get private IP addresses, while external clients get public IPs. This is useful when your services are accessible both internally (via private RFC1918 addresses) and externally (via public addresses), and you want each group to use the most efficient path.

BIND9's `view` feature makes this straightforward. This guide walks through configuring BIND9 with two views: one for internal clients and one for everyone else.

## Use Cases for Split DNS

- Your web server is at `192.168.1.10` internally but `203.0.113.50` externally. You want internal clients to connect directly without hairpinning through the firewall.
- You have services that should only be visible internally (like `internal.example.com`) and shouldn't appear in external DNS at all.
- You want to serve different MX records to internal mail clients vs external senders.

## Prerequisites

- Ubuntu 22.04 or 24.04
- BIND9 installed
- Basic understanding of DNS zones and records

## Installing BIND9

```bash
sudo apt update
sudo apt install -y bind9 bind9utils bind9-doc dnsutils

# Enable and start
sudo systemctl enable named
sudo systemctl start named
sudo systemctl status named
```

## Understanding BIND9 Views

Views in BIND9 work by matching clients based on their source IP address against ACLs (Access Control Lists). The first matching view handles the query. A typical setup has two views:

1. `internal` - matches clients on your private network(s)
2. `external` - matches everyone else (the default)

Each view has its own set of zones, so you can serve different data to each group.

## Setting Up the ACL and Views

The main BIND9 configuration file is `/etc/bind/named.conf`. The actual options are in `/etc/bind/named.conf.options` and `/etc/bind/named.conf.local`. We'll add our views to `named.conf.local`.

First, add an ACL for internal clients:

```bash
sudo nano /etc/bind/named.conf.local
```

```nginx
// /etc/bind/named.conf.local

// Define ACL for internal networks
// Add all your internal IP ranges here
acl "internal_clients" {
    127.0.0.1;          // Localhost
    10.0.0.0/8;         // Class A private range
    172.16.0.0/12;      // Class B private range
    192.168.0.0/16;     // Class C private range
};

// Internal view - matches internal clients first
view "internal" {
    // This view matches only internal clients
    match-clients { internal_clients; };

    // Allow recursive queries from internal clients
    recursion yes;
    allow-recursion { internal_clients; };

    // Internal zone for example.com
    zone "example.com" {
        type master;
        file "/etc/bind/zones/internal/db.example.com";
        allow-query { internal_clients; };
    };

    // Reverse zone for internal network
    zone "1.168.192.in-addr.arpa" {
        type master;
        file "/etc/bind/zones/internal/db.192.168.1";
        allow-query { internal_clients; };
    };

    // Include standard root hints and localhost zones
    include "/etc/bind/named.conf.default-zones";
};

// External view - matches everyone else
view "external" {
    // This view matches any client not matched by the internal view
    match-clients { any; };

    // Do NOT allow recursion from external clients (security!)
    recursion no;

    // External zone for example.com
    zone "example.com" {
        type master;
        file "/etc/bind/zones/external/db.example.com";
        allow-query { any; };
    };
};
```

## Creating the Zone Directories

```bash
# Create directories for internal and external zone files
sudo mkdir -p /etc/bind/zones/internal
sudo mkdir -p /etc/bind/zones/external
```

## Writing the Internal Zone File

The internal zone file contains private IP addresses:

```bash
sudo nano /etc/bind/zones/internal/db.example.com
```

```dns
; /etc/bind/zones/internal/db.example.com
; Internal zone - served only to clients on the private network

$TTL 86400
$ORIGIN example.com.

; SOA record - update serial after every change
@    IN    SOA    ns1.example.com. hostmaster.example.com. (
                        2024030201  ; Serial (YYYYMMDDnn format)
                        3600        ; Refresh - how often secondaries check for updates
                        1800        ; Retry - how long secondaries wait before retrying
                        604800      ; Expire - when secondaries stop answering
                        86400 )     ; Minimum TTL

; Name servers
@    IN    NS    ns1.example.com.

; Name server A record
ns1  IN    A     192.168.1.1

; Internal A records - pointing to private IPs
@    IN    A     192.168.1.10    ; Main website - internal IP
www  IN    A     192.168.1.10    ; www - internal IP
mail IN    A     192.168.1.20    ; Mail server - internal IP

; Services only visible internally
internal    IN    A    192.168.1.30
jenkins     IN    A    192.168.1.31
grafana     IN    A    192.168.1.32
gitlab      IN    A    192.168.1.33

; MX record pointing to internal mail server
@    IN    MX    10    mail.example.com.
```

## Writing the External Zone File

The external zone file has public IP addresses and omits internal-only hosts:

```bash
sudo nano /etc/bind/zones/external/db.example.com
```

```dns
; /etc/bind/zones/external/db.example.com
; External zone - served to all external clients

$TTL 300
$ORIGIN example.com.

@    IN    SOA    ns1.example.com. hostmaster.example.com. (
                        2024030201  ; Serial (must match internal or be different)
                        3600        ; Refresh
                        1800        ; Retry
                        604800      ; Expire
                        300 )       ; Minimum TTL (lower for external = faster propagation)

; Name servers
@    IN    NS    ns1.example.com.
@    IN    NS    ns2.example.com.

; Name server A records - public IPs
ns1  IN    A     203.0.113.1
ns2  IN    A     203.0.113.2

; Public A records
@    IN    A     203.0.113.50    ; Main website - public IP
www  IN    A     203.0.113.50    ; www - public IP
mail IN    A     203.0.113.51    ; Mail server - public IP

; MX record
@    IN    MX    10    mail.example.com.

; SPF record for email validation
@    IN    TXT   "v=spf1 mx ip4:203.0.113.51 ~all"
```

## Creating the Internal Reverse Zone

```bash
sudo nano /etc/bind/zones/internal/db.192.168.1
```

```dns
; Reverse zone for 192.168.1.0/24

$TTL 86400
@    IN    SOA    ns1.example.com. hostmaster.example.com. (
                        2024030201
                        3600
                        1800
                        604800
                        86400 )

@    IN    NS    ns1.example.com.

; PTR records (last octet maps to hostname)
1    IN    PTR    ns1.example.com.
10   IN    PTR    www.example.com.
20   IN    PTR    mail.example.com.
30   IN    PTR    internal.example.com.
```

## Important: named.conf.options with Views

When using views, you must move any `zone` statements from `named.conf.default-zones` into the appropriate view blocks, or include the file within each view. The default zones (like `localhost` and root hints) need to be inside a view:

```bash
# Check what's in named.conf
sudo cat /etc/bind/named.conf
```

If `named.conf` includes `named.conf.default-zones`, you need to either move those zones into your internal view or comment out the include and add the zones manually within the `internal` view block (as shown in the example above with `include "/etc/bind/named.conf.default-zones"` inside the view).

## Checking Configuration and Reloading

```bash
# Check for syntax errors in the configuration
sudo named-checkconf

# Check individual zone files
sudo named-checkzone example.com /etc/bind/zones/internal/db.example.com
sudo named-checkzone example.com /etc/bind/zones/external/db.example.com

# Reload BIND9 if no errors
sudo systemctl reload named
```

## Testing the Views

```bash
# Test from an internal client (should return internal IPs)
dig @192.168.1.1 www.example.com A +short
# Expected: 192.168.1.10

# Test from an external perspective (use the loopback if testing locally)
# Simulate external by using a different source that doesn't match the internal ACL
# Or use an external DNS resolver that queries your server

# Test that internal-only names don't appear externally
dig @203.0.113.1 internal.example.com A +short
# Expected: NXDOMAIN (not found)

# Test recursion is disabled externally (important for security)
dig @203.0.113.1 google.com A +short
# Expected: REFUSED
```

## Updating Zone Serial Numbers

Whenever you modify a zone file, increment the serial number:

```bash
# Simple approach: use date-based serial
# Format: YYYYMMDDnn (nn is a 2-digit revision number for that day)
# Example: 2024030201 = March 2, 2024, first change of the day
```

After editing, always run `named-checkzone` and then `rndc reload` or `systemctl reload named`.

## Common Troubleshooting

```bash
# Check BIND9 logs
sudo journalctl -u named -f

# Or check syslog
sudo tail -f /var/log/syslog | grep named

# Test a query with full verbose output
dig @127.0.0.1 www.example.com +all
```

Monitor your DNS server's availability and response times with [OneUptime](https://oneuptime.com) to ensure your split DNS setup stays healthy and your internal and external clients always get the right answers.
