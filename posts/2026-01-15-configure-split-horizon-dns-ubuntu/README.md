# How to Configure Split-Horizon DNS on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, DNS, BIND9, Networking, Linux, Infrastructure, Security

Description: A complete guide to implementing Split-Horizon DNS on Ubuntu using BIND9 views and dnsmasq, enabling different DNS responses for internal and external networks.

---

Split-Horizon DNS (also called split-brain DNS or split-view DNS) allows a DNS server to return different answers depending on where the query originates. Internal users receive private IP addresses while external users receive public IPs for the same domain name. This guide walks through setting up Split-Horizon DNS on Ubuntu using BIND9 and covers an alternative dnsmasq approach.

## What Is Split-Horizon DNS?

Split-Horizon DNS is a DNS configuration technique where the same domain name resolves to different IP addresses depending on the source of the DNS query. The DNS server examines the client's IP address and returns results from different zone files based on predefined access control lists (ACLs).

### Common Use Cases

- **Internal vs. External Access**: Employees on the corporate network access `app.company.com` via the internal IP `192.168.1.100`, while external users resolve it to the public IP `203.0.113.50`.
- **Load Balancing**: Different geographic regions receive different server IPs.
- **Security**: Hide internal infrastructure details from external queries.
- **Development Environments**: Route internal requests to staging servers while external traffic hits production.
- **VPN Users**: Provide VPN clients with internal DNS resolution without exposing private IPs publicly.

### How It Works

When a DNS query arrives, the server checks the source IP against configured ACLs. Each ACL maps to a "view" containing its own set of zone files. The server responds using the zone data from the matching view. If no ACL matches, a default view handles the query.

## Prerequisites

Before configuring Split-Horizon DNS, ensure you have the following in place.

**System Requirements:**

- Ubuntu 22.04 LTS or later (this guide also works on 20.04 and 24.04)
- Root or sudo access
- Static IP address configured on the server
- Basic understanding of DNS concepts (zones, records, TTL)

**Network Requirements:**

- Clear understanding of your internal network ranges (e.g., `192.168.0.0/16`, `10.0.0.0/8`)
- Public IP address(es) for external resolution
- Firewall access to allow DNS traffic (UDP/TCP port 53)

Update your system and install the required packages.

```bash
# Update package lists and upgrade existing packages
sudo apt update && sudo apt upgrade -y

# Install BIND9 DNS server and utilities
# bind9 - the DNS server daemon
# bind9utils - administrative utilities like rndc
# bind9-doc - documentation (optional but helpful)
sudo apt install bind9 bind9utils bind9-doc -y

# Verify BIND9 installation and check the version
named -v
```

## BIND9 Views Configuration

BIND9 views are the core mechanism for Split-Horizon DNS. Each view contains its own zone definitions and is selected based on client IP matching. The order of views matters because BIND9 uses the first matching view.

### Understanding the Configuration Structure

BIND9 configuration files on Ubuntu are organized as follows:

- `/etc/bind/named.conf` - Main configuration file (usually just includes others)
- `/etc/bind/named.conf.options` - Server options (forwarders, recursion, etc.)
- `/etc/bind/named.conf.local` - Local zone definitions and views
- `/etc/bind/named.conf.default-zones` - Default zones (localhost, broadcast, etc.)

### Backup Existing Configuration

Always backup your existing configuration before making changes.

```bash
# Create a timestamped backup directory
sudo mkdir -p /etc/bind/backup-$(date +%Y%m%d)

# Copy all configuration files to the backup directory
sudo cp -r /etc/bind/*.conf* /etc/bind/backup-$(date +%Y%m%d)/

# Verify the backup was created
ls -la /etc/bind/backup-$(date +%Y%m%d)/
```

### Configure Server Options

Edit the main options file to set up global DNS server behavior. This configuration enables recursion for internal clients while preventing it for external queries to avoid being used as an open resolver.

```bash
# Open the options configuration file for editing
sudo nano /etc/bind/named.conf.options
```

Replace the contents with the following configuration.

```bind
// /etc/bind/named.conf.options
// Global BIND9 options for Split-Horizon DNS setup

// Define ACLs at the top level for use in views
// Internal networks - adjust these ranges to match your infrastructure
acl "internal-networks" {
    127.0.0.0/8;        // Localhost
    10.0.0.0/8;         // RFC1918 private range (Class A)
    172.16.0.0/12;      // RFC1918 private range (Class B)
    192.168.0.0/16;     // RFC1918 private range (Class C)
    // Add your specific internal subnets here
    // Example: 10.50.0.0/16;
};

// External networks - everything not in internal-networks
// This is implicit but can be explicitly defined if needed
acl "external-networks" {
    !internal-networks;  // Negation - everything NOT internal
    any;                 // Match any remaining addresses
};

options {
    // Directory where zone files are stored
    directory "/var/cache/bind";

    // Listen on all interfaces for both IPv4 and IPv6
    listen-on { any; };
    listen-on-v6 { any; };

    // Disable recursion globally - we enable it per-view
    // This prevents the server from being an open resolver
    recursion no;

    // DNSSEC validation for secure DNS responses
    dnssec-validation auto;

    // Hide BIND version to reduce information disclosure
    version "not disclosed";

    // Forwarders for recursive queries (used by internal view)
    // Replace with your preferred upstream DNS servers
    forwarders {
        8.8.8.8;         // Google Public DNS
        8.8.4.4;         // Google Public DNS secondary
        1.1.1.1;         // Cloudflare DNS
    };

    // Query logging (useful for debugging, disable in production)
    querylog yes;

    // Rate limiting to prevent DNS amplification attacks
    rate-limit {
        responses-per-second 10;
        window 5;
    };
};
```

## ACL Configuration

Access Control Lists determine which view handles each DNS query. Place ACL definitions before views in the configuration. ACLs can reference IP addresses, CIDR ranges, other ACLs, and the special keywords `any`, `none`, `localhost`, and `localnets`.

### Detailed ACL Examples

Create a separate file for complex ACL configurations to keep things organized.

```bash
# Create an ACL configuration file
sudo nano /etc/bind/named.conf.acls
```

Add detailed ACL definitions for your network topology.

```bind
// /etc/bind/named.conf.acls
// Detailed ACL definitions for Split-Horizon DNS

// Corporate office networks
acl "office-networks" {
    192.168.1.0/24;     // Main office LAN
    192.168.2.0/24;     // Secondary office LAN
    192.168.10.0/24;    // IT department
};

// Data center networks
acl "datacenter-networks" {
    10.100.0.0/16;      // Production servers
    10.200.0.0/16;      // Staging servers
    10.250.0.0/24;      // Database servers
};

// VPN client pools
acl "vpn-clients" {
    10.8.0.0/24;        // OpenVPN client range
    10.9.0.0/24;        // WireGuard client range
};

// Trusted partner networks (if you have B2B connections)
acl "partner-networks" {
    203.0.113.0/24;     // Partner A network
    198.51.100.0/24;    // Partner B network
};

// Combined internal ACL - all trusted networks
acl "all-internal" {
    localhost;           // Local queries
    localnets;           // Networks directly connected
    office-networks;     // Reference previous ACL
    datacenter-networks;
    vpn-clients;
};

// Blocked networks (known bad actors, if needed)
acl "blocked" {
    // Add IP ranges to block here
    // 192.0.2.0/24;    // Example blocked range
};
```

Include this file in the main configuration.

```bash
# Edit named.conf to include the ACL file
sudo nano /etc/bind/named.conf
```

Add the include directive near the top.

```bind
// /etc/bind/named.conf
// Include ACL definitions before other configurations
include "/etc/bind/named.conf.acls";
include "/etc/bind/named.conf.options";
include "/etc/bind/named.conf.local";
include "/etc/bind/named.conf.default-zones";
```

## Internal vs External Zone Files

Zone files contain the actual DNS records. For Split-Horizon DNS, you maintain separate zone files for internal and external views. Each file can have completely different records or just differ in IP addresses.

### Create Zone File Directory Structure

Organize zone files by view for clarity.

```bash
# Create directories for internal and external zone files
sudo mkdir -p /etc/bind/zones/internal
sudo mkdir -p /etc/bind/zones/external

# Set proper ownership and permissions
sudo chown -R bind:bind /etc/bind/zones
sudo chmod -R 755 /etc/bind/zones
```

### Internal Zone File

Create the internal zone file with private IP addresses. Internal zones typically include more records since internal users need to access more services.

```bash
# Create the internal zone file for example.com
sudo nano /etc/bind/zones/internal/db.example.com
```

Add the following zone configuration.

```bind
; /etc/bind/zones/internal/db.example.com
; Internal DNS zone file for example.com
; Contains private IP addresses for internal resolution

; SOA Record - Start of Authority
; Defines the primary nameserver and zone parameters
$TTL 86400  ; Default TTL: 24 hours (in seconds)
@   IN  SOA ns1.example.com. admin.example.com. (
        2026011501  ; Serial number (YYYYMMDDNN format)
                    ; Increment this with every zone change
        3600        ; Refresh: 1 hour - how often secondaries check for updates
        1800        ; Retry: 30 minutes - retry interval if refresh fails
        604800      ; Expire: 1 week - when secondary stops answering
        86400       ; Minimum TTL: 24 hours - negative cache TTL
    )

; NS Records - Authoritative nameservers for this zone
; List all nameservers that host this zone
@           IN  NS      ns1.example.com.
@           IN  NS      ns2.example.com.

; A Records - IPv4 address mappings
; These are the internal/private IP addresses
ns1         IN  A       192.168.1.10    ; Primary DNS server
ns2         IN  A       192.168.1.11    ; Secondary DNS server

; Main domain points to internal load balancer
@           IN  A       192.168.1.100

; Web services - internal addresses
www         IN  A       192.168.1.100   ; Main website
app         IN  A       192.168.1.101   ; Application server
api         IN  A       192.168.1.102   ; API endpoint

; Internal-only services (not exposed externally)
intranet    IN  A       192.168.1.50    ; Company intranet
wiki        IN  A       192.168.1.51    ; Internal wiki
gitlab      IN  A       192.168.1.52    ; Internal GitLab
jenkins     IN  A       192.168.1.53    ; CI/CD server
grafana     IN  A       192.168.1.54    ; Monitoring dashboard
prometheus  IN  A       192.168.1.55    ; Metrics server

; Database servers (internal only)
db-master   IN  A       192.168.1.200   ; Primary database
db-replica  IN  A       192.168.1.201   ; Database replica
redis       IN  A       192.168.1.210   ; Redis cache
rabbitmq    IN  A       192.168.1.220   ; Message queue

; Development and staging environments
dev         IN  A       192.168.2.10    ; Development server
staging     IN  A       192.168.2.20    ; Staging server

; Mail server records
mail        IN  A       192.168.1.25    ; Mail server
@           IN  MX  10  mail.example.com.  ; Mail exchange record

; CNAME Records - Aliases pointing to canonical names
ftp         IN  CNAME   www             ; FTP service on web server
cdn         IN  CNAME   www             ; CDN alias
assets      IN  CNAME   www             ; Static assets

; TXT Records - SPF and verification records
@           IN  TXT     "v=spf1 mx ip4:192.168.1.25 -all"

; SRV Records - Service discovery (optional)
; Format: _service._protocol.name TTL class SRV priority weight port target
_ldap._tcp  IN  SRV     0 0 389 ldap.example.com.
```

### External Zone File

Create the external zone file with public IP addresses. This file should only contain records that external users need access to.

```bash
# Create the external zone file for example.com
sudo nano /etc/bind/zones/external/db.example.com
```

Add the external zone configuration.

```bind
; /etc/bind/zones/external/db.example.com
; External DNS zone file for example.com
; Contains public IP addresses for external resolution
; Note: Internal-only services are NOT included here

$TTL 3600   ; Default TTL: 1 hour (shorter for external, faster failover)
@   IN  SOA ns1.example.com. admin.example.com. (
        2026011501  ; Serial - keep in sync with internal zone
        3600        ; Refresh: 1 hour
        1800        ; Retry: 30 minutes
        604800      ; Expire: 1 week
        3600        ; Minimum TTL: 1 hour
    )

; NS Records - Public nameservers
@           IN  NS      ns1.example.com.
@           IN  NS      ns2.example.com.

; A Records - Public IP addresses
; Replace 203.0.113.x with your actual public IPs
ns1         IN  A       203.0.113.10    ; Public DNS server IP
ns2         IN  A       203.0.113.11    ; Secondary public DNS IP

; Main domain - public load balancer or CDN
@           IN  A       203.0.113.100

; Publicly accessible services only
www         IN  A       203.0.113.100   ; Main website
app         IN  A       203.0.113.101   ; Public application
api         IN  A       203.0.113.102   ; Public API endpoint

; Mail server (public IP)
mail        IN  A       203.0.113.25
@           IN  MX  10  mail.example.com.

; CNAME Records
cdn         IN  CNAME   www
assets      IN  CNAME   www

; TXT Records - SPF, DKIM, DMARC for email authentication
@           IN  TXT     "v=spf1 mx ip4:203.0.113.25 -all"
_dmarc      IN  TXT     "v=DMARC1; p=quarantine; rua=mailto:dmarc@example.com"

; CAA Records - Certificate Authority Authorization
; Specifies which CAs can issue certificates for this domain
@           IN  CAA     0 issue "letsencrypt.org"
@           IN  CAA     0 issuewild "letsencrypt.org"
@           IN  CAA     0 iodef "mailto:security@example.com"
```

### Configure Views in named.conf.local

Now configure the views to use the appropriate zone files based on client IP.

```bash
# Edit the local configuration to define views
sudo nano /etc/bind/named.conf.local
```

Add the view configuration.

```bind
// /etc/bind/named.conf.local
// Split-Horizon DNS view configuration

// IMPORTANT: Views must be defined in order of specificity
// More specific ACLs should come before more general ones
// The first matching view is used

// Internal View - for queries from internal networks
// This view is checked first due to more restrictive match-clients
view "internal" {
    // Match queries from internal networks only
    match-clients { all-internal; };

    // Allow recursion for internal clients
    // Internal users can resolve any domain through this server
    recursion yes;

    // Additional options specific to internal view
    allow-query { all-internal; };
    allow-query-cache { all-internal; };

    // Include default zones (localhost, broadcast addresses)
    // These should be available in all views
    include "/etc/bind/named.conf.default-zones";

    // Internal zone definition for example.com
    zone "example.com" {
        type master;                                    // Primary/master zone
        file "/etc/bind/zones/internal/db.example.com"; // Internal zone file
        allow-transfer { 192.168.1.11; };              // Allow zone transfers to secondary
        also-notify { 192.168.1.11; };                 // Notify secondary on changes
    };

    // Reverse DNS zone for internal network
    // Allows PTR lookups (IP to hostname)
    zone "1.168.192.in-addr.arpa" {
        type master;
        file "/etc/bind/zones/internal/db.192.168.1";
        allow-transfer { 192.168.1.11; };
    };

    // Add additional internal zones as needed
    // zone "internal.example.com" { ... };
};

// External View - for queries from external/public networks
// This view catches all queries not matched by internal view
view "external" {
    // Match all clients not matched by previous views
    match-clients { any; };

    // Disable recursion for external clients
    // Prevents the server from being used as an open resolver
    recursion no;

    // Only allow queries to zones we're authoritative for
    allow-query { any; };

    // External zone definition for example.com
    zone "example.com" {
        type master;
        file "/etc/bind/zones/external/db.example.com";  // External zone file
        // Be careful with zone transfers to external secondaries
        allow-transfer { none; };  // Disable unless needed
    };

    // External reverse DNS (if you own the IP block)
    // zone "113.0.203.in-addr.arpa" {
    //     type master;
    //     file "/etc/bind/zones/external/db.203.0.113";
    // };
};
```

### Create Reverse DNS Zone (Internal)

Reverse DNS allows IP-to-hostname lookups, useful for logging and debugging.

```bash
# Create internal reverse zone file
sudo nano /etc/bind/zones/internal/db.192.168.1
```

Add the reverse zone records.

```bind
; /etc/bind/zones/internal/db.192.168.1
; Reverse DNS zone for 192.168.1.0/24 network

$TTL 86400
@   IN  SOA ns1.example.com. admin.example.com. (
        2026011501
        3600
        1800
        604800
        86400
    )

; NS Records
@       IN  NS  ns1.example.com.
@       IN  NS  ns2.example.com.

; PTR Records - IP to hostname mapping
; The number is the last octet of the IP address
10      IN  PTR ns1.example.com.        ; 192.168.1.10
11      IN  PTR ns2.example.com.        ; 192.168.1.11
25      IN  PTR mail.example.com.       ; 192.168.1.25
50      IN  PTR intranet.example.com.   ; 192.168.1.50
100     IN  PTR www.example.com.        ; 192.168.1.100
101     IN  PTR app.example.com.        ; 192.168.1.101
102     IN  PTR api.example.com.        ; 192.168.1.102
200     IN  PTR db-master.example.com.  ; 192.168.1.200
201     IN  PTR db-replica.example.com. ; 192.168.1.201
```

### Validate and Apply Configuration

Always validate configuration before restarting BIND9.

```bash
# Check main configuration syntax
# This validates all included files and zone definitions
sudo named-checkconf

# Check individual zone files for errors
# Format: named-checkzone <zone-name> <zone-file>
sudo named-checkzone example.com /etc/bind/zones/internal/db.example.com
sudo named-checkzone example.com /etc/bind/zones/external/db.example.com
sudo named-checkzone 1.168.192.in-addr.arpa /etc/bind/zones/internal/db.192.168.1

# If all checks pass, restart BIND9 to apply changes
sudo systemctl restart bind9

# Verify BIND9 is running without errors
sudo systemctl status bind9

# Check for any errors in the system log
sudo journalctl -u bind9 --since "5 minutes ago" --no-pager
```

## Testing from Different Networks

Thorough testing ensures Split-Horizon DNS works correctly. Test from both internal and external perspectives.

### Testing Internal Resolution

Test DNS resolution from a machine on the internal network.

```bash
# Query the DNS server for internal resolution
# The @192.168.1.10 specifies which DNS server to query
# Replace with your DNS server's IP address

# Test A record resolution
dig @192.168.1.10 www.example.com A +short
# Expected output: 192.168.1.100 (internal IP)

# Test with full output for debugging
dig @192.168.1.10 www.example.com A

# Test internal-only services (should resolve)
dig @192.168.1.10 intranet.example.com A +short
# Expected output: 192.168.1.50

dig @192.168.1.10 gitlab.example.com A +short
# Expected output: 192.168.1.52

# Test reverse DNS lookup
dig @192.168.1.10 -x 192.168.1.100 +short
# Expected output: www.example.com.

# Test MX record
dig @192.168.1.10 example.com MX +short
# Expected output: 10 mail.example.com.

# Test SOA record to verify zone is loaded
dig @192.168.1.10 example.com SOA +short
```

### Testing External Resolution

Test from an external network or simulate external queries.

```bash
# If testing from the same server, you need to simulate external source
# Option 1: Test from an actual external machine

# From an external server, query your DNS server's public IP
dig @203.0.113.10 www.example.com A +short
# Expected output: 203.0.113.100 (public IP)

# Test that internal-only services don't resolve externally
dig @203.0.113.10 intranet.example.com A +short
# Expected output: (empty - no record)

dig @203.0.113.10 gitlab.example.com A +short
# Expected output: (empty - no record)

# Option 2: Use online DNS lookup tools
# - https://toolbox.googleapps.com/apps/dig/
# - https://www.whatsmydns.net/
# - https://dnschecker.org/

# Option 3: Query from a VPS or cloud instance outside your network
```

### Comprehensive Test Script

Create a test script for automated verification.

```bash
# Create a DNS testing script
sudo nano /usr/local/bin/test-split-dns.sh
```

Add the following script content.

```bash
#!/bin/bash
# /usr/local/bin/test-split-dns.sh
# Split-Horizon DNS testing script

# Configuration - adjust these values
INTERNAL_DNS="192.168.1.10"
EXTERNAL_DNS="203.0.113.10"  # Or use a public DNS for comparison
DOMAIN="example.com"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================"
echo "Split-Horizon DNS Test Suite"
echo "========================================"
echo ""

# Function to test DNS resolution
test_dns() {
    local server=$1
    local query=$2
    local expected=$3
    local description=$4

    result=$(dig @$server $query +short 2>/dev/null | head -1)

    if [ "$result" == "$expected" ]; then
        echo -e "${GREEN}[PASS]${NC} $description"
        echo "       Query: $query -> $result"
    else
        echo -e "${RED}[FAIL]${NC} $description"
        echo "       Query: $query"
        echo "       Expected: $expected"
        echo "       Got: $result"
    fi
    echo ""
}

echo "--- Internal View Tests ---"
echo ""

# Test internal resolution
test_dns "$INTERNAL_DNS" "www.$DOMAIN" "192.168.1.100" \
    "www.$DOMAIN should resolve to internal IP"

test_dns "$INTERNAL_DNS" "intranet.$DOMAIN" "192.168.1.50" \
    "intranet.$DOMAIN should resolve internally"

test_dns "$INTERNAL_DNS" "api.$DOMAIN" "192.168.1.102" \
    "api.$DOMAIN should resolve to internal IP"

echo "--- External View Tests ---"
echo "(Run these from an external network)"
echo ""

# Note: These tests need to be run from outside your network
# or you need to configure a way to simulate external queries

echo "--- Recursion Tests ---"
echo ""

# Test recursion (should work internally)
echo "Testing recursion from internal network..."
internal_recursive=$(dig @$INTERNAL_DNS google.com A +short 2>/dev/null | head -1)
if [ -n "$internal_recursive" ]; then
    echo -e "${GREEN}[PASS]${NC} Recursion works for internal clients"
else
    echo -e "${YELLOW}[WARN]${NC} Recursion may not be working for internal clients"
fi

echo ""
echo "========================================"
echo "Test suite complete"
echo "========================================"
```

Make the script executable and run it.

```bash
# Make the script executable
sudo chmod +x /usr/local/bin/test-split-dns.sh

# Run the test suite
sudo /usr/local/bin/test-split-dns.sh
```

## Alternative: dnsmasq for Simple Split-Horizon

For simpler setups or smaller networks, dnsmasq provides an easier alternative to BIND9. It combines DNS and DHCP functionality with a straightforward configuration format.

### When to Use dnsmasq Instead of BIND9

- Small to medium networks (fewer than 1000 clients)
- Simple split-horizon requirements (just internal/external)
- Combined DNS and DHCP server needs
- Lower resource requirements
- Faster configuration and maintenance

### Install and Configure dnsmasq

```bash
# Stop BIND9 if running (dnsmasq uses the same port)
sudo systemctl stop bind9
sudo systemctl disable bind9

# Install dnsmasq
sudo apt install dnsmasq -y

# Backup the default configuration
sudo cp /etc/dnsmasq.conf /etc/dnsmasq.conf.backup
```

Create the main dnsmasq configuration.

```bash
# Edit the dnsmasq configuration
sudo nano /etc/dnsmasq.conf
```

Add the Split-Horizon configuration.

```conf
# /etc/dnsmasq.conf
# dnsmasq Split-Horizon DNS configuration

# General Settings
# -----------------

# Listen on specific interfaces (adjust to your setup)
interface=eth0
interface=eth1
# Or bind to specific IPs
# listen-address=192.168.1.10
# listen-address=127.0.0.1

# Don't read /etc/resolv.conf for upstream servers
no-resolv

# Upstream DNS servers for recursive queries
server=8.8.8.8
server=8.8.4.4
server=1.1.1.1

# Cache size (number of DNS entries to cache)
cache-size=10000

# Don't forward short names (single-label queries)
domain-needed

# Never forward addresses in non-routed address spaces
bogus-priv

# Security: don't read /etc/hosts
no-hosts

# Log queries for debugging (disable in production)
log-queries
log-facility=/var/log/dnsmasq.log

# Split-Horizon Configuration
# ---------------------------
# dnsmasq uses source IP matching for different responses

# Define which networks are "internal"
# Queries from these ranges get internal IPs

# Internal hosts file - contains internal IP mappings
addn-hosts=/etc/dnsmasq.d/hosts.internal

# For external queries, use a different hosts file
# This is achieved by running a second dnsmasq instance
# or using conditional forwarding

# Address mappings for internal networks
# Format: address=/domain/ip
# These respond to queries from any source

# Internal-only services (return NXDOMAIN to external queries)
# Use localise-queries for automatic view selection based on interface

# Method 1: Interface-based split-horizon
# Respond with different IPs based on which interface received the query
# Requires requests to come in on different interfaces

# For eth0 (internal interface) - return internal IPs
# For eth1 (external interface) - return external IPs
localise-queries

# Method 2: Use address records with interface binding
# Internal records (only served to internal interface)
interface-name=intranet.example.com,eth0,192.168.1.50
interface-name=gitlab.example.com,eth0,192.168.1.52
```

### Create Internal Hosts File

```bash
# Create directory for additional configuration
sudo mkdir -p /etc/dnsmasq.d

# Create internal hosts file
sudo nano /etc/dnsmasq.d/hosts.internal
```

Add internal hostname mappings.

```text
# /etc/dnsmasq.d/hosts.internal
# Internal DNS records for dnsmasq
# Format: IP_ADDRESS    HOSTNAME [ALIASES...]

# DNS servers
192.168.1.10    ns1.example.com ns1
192.168.1.11    ns2.example.com ns2

# Web services
192.168.1.100   example.com www.example.com www
192.168.1.101   app.example.com app
192.168.1.102   api.example.com api

# Internal-only services
192.168.1.50    intranet.example.com intranet
192.168.1.51    wiki.example.com wiki
192.168.1.52    gitlab.example.com gitlab
192.168.1.53    jenkins.example.com jenkins
192.168.1.54    grafana.example.com grafana

# Database servers
192.168.1.200   db-master.example.com db-master
192.168.1.201   db-replica.example.com db-replica

# Mail server
192.168.1.25    mail.example.com mail
```

### Start and Verify dnsmasq

```bash
# Check configuration syntax
sudo dnsmasq --test

# Start dnsmasq service
sudo systemctl start dnsmasq
sudo systemctl enable dnsmasq

# Verify it's running
sudo systemctl status dnsmasq

# Test resolution
dig @127.0.0.1 www.example.com +short
```

### Advanced dnsmasq: Two-Instance Split-Horizon

For true Split-Horizon with dnsmasq, run two instances on different IPs.

```bash
# Create external instance configuration
sudo nano /etc/dnsmasq.d/external.conf
```

```conf
# /etc/dnsmasq.d/external.conf
# External dnsmasq instance configuration

# Listen only on the external interface
listen-address=203.0.113.10
bind-interfaces

# Use different port to avoid conflict (if on same machine)
# port=5353

# External hosts file
addn-hosts=/etc/dnsmasq.d/hosts.external

# Disable recursion for external queries
# (dnsmasq doesn't have per-client recursion control like BIND9)
```

Create the external hosts file with public IPs.

```bash
# Create external hosts file
sudo nano /etc/dnsmasq.d/hosts.external
```

```text
# /etc/dnsmasq.d/hosts.external
# External DNS records (public IPs only)

203.0.113.10    ns1.example.com
203.0.113.11    ns2.example.com
203.0.113.100   example.com www.example.com
203.0.113.101   app.example.com
203.0.113.102   api.example.com
203.0.113.25    mail.example.com
```

## Firewall Rules

Configure your firewall to allow DNS traffic while protecting the server. These rules use UFW (Uncomplicated Firewall), the default on Ubuntu.

### Basic UFW Configuration

```bash
# Check current UFW status
sudo ufw status verbose

# Enable UFW if not already enabled
sudo ufw enable

# Allow DNS traffic (both TCP and UDP on port 53)
# TCP is used for zone transfers and large responses
# UDP is used for normal queries
sudo ufw allow 53/tcp comment 'DNS TCP'
sudo ufw allow 53/udp comment 'DNS UDP'

# If you want to restrict DNS to specific source networks
# Delete the general rules and add specific ones
sudo ufw delete allow 53/tcp
sudo ufw delete allow 53/udp

# Allow DNS only from internal networks
sudo ufw allow from 192.168.0.0/16 to any port 53 proto tcp comment 'DNS TCP internal'
sudo ufw allow from 192.168.0.0/16 to any port 53 proto udp comment 'DNS UDP internal'
sudo ufw allow from 10.0.0.0/8 to any port 53 proto tcp comment 'DNS TCP datacenter'
sudo ufw allow from 10.0.0.0/8 to any port 53 proto udp comment 'DNS UDP datacenter'

# Allow DNS from anywhere (for public-facing DNS server)
sudo ufw allow from any to any port 53 proto tcp comment 'DNS TCP public'
sudo ufw allow from any to any port 53 proto udp comment 'DNS UDP public'

# Verify the rules
sudo ufw status numbered
```

### Advanced iptables Rules

For more granular control, use iptables directly.

```bash
# Create a script for iptables rules
sudo nano /etc/iptables/dns-rules.sh
```

Add comprehensive firewall rules.

```bash
#!/bin/bash
# /etc/iptables/dns-rules.sh
# Advanced iptables rules for Split-Horizon DNS

# Variables - adjust to your network
INTERNAL_NET="192.168.0.0/16"
DATACENTER_NET="10.0.0.0/8"
VPN_NET="10.8.0.0/24"
DNS_PORT="53"

# Flush existing DNS-related rules (be careful in production)
# iptables -F INPUT
# iptables -F OUTPUT

# Allow DNS queries from internal networks (UDP)
iptables -A INPUT -p udp --dport $DNS_PORT -s $INTERNAL_NET -j ACCEPT \
    -m comment --comment "DNS UDP from internal"
iptables -A INPUT -p udp --dport $DNS_PORT -s $DATACENTER_NET -j ACCEPT \
    -m comment --comment "DNS UDP from datacenter"
iptables -A INPUT -p udp --dport $DNS_PORT -s $VPN_NET -j ACCEPT \
    -m comment --comment "DNS UDP from VPN"

# Allow DNS queries from internal networks (TCP)
iptables -A INPUT -p tcp --dport $DNS_PORT -s $INTERNAL_NET -j ACCEPT \
    -m comment --comment "DNS TCP from internal"
iptables -A INPUT -p tcp --dport $DNS_PORT -s $DATACENTER_NET -j ACCEPT \
    -m comment --comment "DNS TCP from datacenter"

# Rate limiting for external DNS queries (prevent amplification attacks)
# Allow 10 queries per second with burst of 20
iptables -A INPUT -p udp --dport $DNS_PORT \
    -m state --state NEW \
    -m recent --set --name DNS
iptables -A INPUT -p udp --dport $DNS_PORT \
    -m state --state NEW \
    -m recent --update --seconds 1 --hitcount 10 --name DNS \
    -j DROP \
    -m comment --comment "DNS rate limit exceeded"

# Allow established connections
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Log dropped DNS packets (for debugging)
iptables -A INPUT -p udp --dport $DNS_PORT -j LOG \
    --log-prefix "DNS-DROPPED: " --log-level 4
iptables -A INPUT -p tcp --dport $DNS_PORT -j LOG \
    --log-prefix "DNS-DROPPED: " --log-level 4

# Default drop for other DNS traffic (if needed)
# iptables -A INPUT -p udp --dport $DNS_PORT -j DROP
# iptables -A INPUT -p tcp --dport $DNS_PORT -j DROP

echo "DNS firewall rules applied successfully"
```

Make the script executable and run it.

```bash
# Make executable
sudo chmod +x /etc/iptables/dns-rules.sh

# Apply the rules
sudo /etc/iptables/dns-rules.sh

# Save iptables rules to persist across reboots
sudo apt install iptables-persistent -y
sudo netfilter-persistent save
```

## Troubleshooting

Common issues and their solutions when implementing Split-Horizon DNS.

### Check BIND9 Service Status

```bash
# Check if BIND9 is running
sudo systemctl status bind9

# View recent BIND9 logs
sudo journalctl -u bind9 -n 50 --no-pager

# Check for configuration errors
sudo named-checkconf -z

# View the BIND9 log file directly
sudo tail -f /var/log/syslog | grep named
```

### Common Issues and Solutions

**Issue 1: Zone file not loading**

```bash
# Check zone file syntax
sudo named-checkzone example.com /etc/bind/zones/internal/db.example.com

# Common causes:
# - Missing semicolons at end of lines
# - Incorrect serial number format
# - Missing trailing dots on FQDNs in NS/MX records
# - File permissions (must be readable by bind user)

# Fix permissions
sudo chown bind:bind /etc/bind/zones/internal/db.example.com
sudo chmod 644 /etc/bind/zones/internal/db.example.com
```

**Issue 2: Wrong view being selected**

```bash
# Enable query logging to see which view handles queries
# Add to named.conf.options:
# querylog yes;

# Check logs to see view selection
sudo tail -f /var/log/syslog | grep "query:"

# Verify ACL is correct
# Test which ACL your client IP matches
# Add debug logging:
sudo rndc querylog on

# Check your client's source IP
# The view selection is based on the source IP of the query
```

**Issue 3: Recursion not working for internal clients**

```bash
# Verify recursion is enabled in the internal view
# Check named.conf.local:
# view "internal" {
#     recursion yes;
#     ...
# }

# Verify forwarders are configured in named.conf.options
# Test forwarders directly
dig @8.8.8.8 google.com +short

# Check if the client IP matches the internal ACL
# Debug with:
sudo rndc status
```

**Issue 4: Zone transfer failures**

```bash
# Check zone transfer configuration
# In named.conf.local, verify:
# allow-transfer { secondary-ip; };
# also-notify { secondary-ip; };

# Test zone transfer manually
dig @192.168.1.10 example.com AXFR

# Check secondary server can reach primary
# On secondary, check logs:
sudo journalctl -u bind9 | grep transfer
```

**Issue 5: SERVFAIL responses**

```bash
# SERVFAIL usually indicates:
# - Zone file syntax errors
# - DNSSEC validation failures
# - Forwarder connectivity issues

# Disable DNSSEC temporarily to test
# In named.conf.options:
# dnssec-validation no;

# Check upstream DNS connectivity
dig @8.8.8.8 google.com

# Verify zone file loads correctly
sudo named-checkzone example.com /etc/bind/zones/internal/db.example.com
```

### Diagnostic Commands Reference

```bash
# Check BIND9 status and statistics
sudo rndc status

# Reload configuration without restart
sudo rndc reload

# Reload specific zone
sudo rndc reload example.com

# Flush DNS cache
sudo rndc flush

# View current cache statistics
sudo rndc stats
cat /var/cache/bind/named.stats

# Check which processes are listening on port 53
sudo ss -tulnp | grep :53
sudo lsof -i :53

# Test DNS resolution with verbose output
dig @192.168.1.10 www.example.com A +trace
dig @192.168.1.10 www.example.com A +dnssec

# Query specific record types
dig @192.168.1.10 example.com ANY +noall +answer
dig @192.168.1.10 example.com SOA +short
dig @192.168.1.10 example.com NS +short

# Check DNS response time
dig @192.168.1.10 www.example.com A | grep "Query time"

# Verify zone serial numbers match between primary and secondary
dig @192.168.1.10 example.com SOA +short
dig @192.168.1.11 example.com SOA +short
```

### Performance Tuning

```bash
# Edit named.conf.options for performance improvements
sudo nano /etc/bind/named.conf.options
```

Add performance-related options.

```bind
options {
    // ... existing options ...

    // Increase maximum cache size (in bytes)
    max-cache-size 512M;

    // Reduce cache cleaning interval
    cleaning-interval 60;

    // Limit recursive clients to prevent resource exhaustion
    recursive-clients 10000;

    // TCP client limits
    tcp-clients 1000;

    // Disable empty zones for faster startup
    empty-zones-enable no;

    // Minimize logging in production
    // querylog no;

    // Use multiple CPU threads
    // (BIND9 9.16+ supports this)
};
```

## Monitoring Split-Horizon DNS with OneUptime

Maintaining reliable DNS infrastructure requires continuous monitoring. DNS issues can cascade into widespread service outages since nearly every application depends on name resolution. OneUptime provides comprehensive monitoring capabilities to ensure your Split-Horizon DNS configuration remains healthy and responsive.

### Why Monitor DNS Infrastructure?

- **Availability**: Detect DNS server outages before users are affected
- **Performance**: Track query response times and identify slowdowns
- **Configuration Drift**: Alert on unexpected DNS resolution changes
- **Security**: Monitor for DNS hijacking or cache poisoning attempts
- **Capacity Planning**: Track query volumes to plan infrastructure scaling

### What to Monitor

With OneUptime, you can set up monitors for:

- **DNS Server Health**: TCP/UDP port 53 availability checks
- **Resolution Accuracy**: Verify correct IPs are returned for critical domains
- **Response Time**: Alert when DNS queries exceed acceptable latency thresholds
- **Zone Transfer Status**: Monitor primary-secondary synchronization
- **Certificate Expiration**: Track SSL certificates for DNS-over-HTTPS endpoints

OneUptime's synthetic monitoring can query your DNS servers from multiple geographic locations, verifying that both internal and external views return the expected results. Set up alerts to notify your team via Slack, PagerDuty, or email when DNS anomalies are detected.

Get started with OneUptime at [https://oneuptime.com](https://oneuptime.com) to ensure your Split-Horizon DNS infrastructure maintains the reliability your applications depend on.
