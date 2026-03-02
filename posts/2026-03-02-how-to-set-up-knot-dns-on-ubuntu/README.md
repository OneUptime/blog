# How to Set Up Knot DNS on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, DNS, Knot, Networking, Linux

Description: Install and configure Knot DNS as an authoritative name server on Ubuntu, covering zone configuration, DNSSEC, zone transfers, and performance tuning for production use.

---

Knot DNS is a high-performance authoritative DNS server developed by CZ.NIC, the Czech domain registry. Unlike BIND, Knot focuses exclusively on authoritative serving - it doesn't do recursive resolution. This simplification makes it faster, more secure, and easier to configure. If you're running your own DNS infrastructure for authoritative zones, Knot is worth a serious look.

## Installing Knot DNS

CZ.NIC maintains a PPA for Ubuntu with up-to-date Knot DNS packages:

```bash
# Add the Knot DNS PPA
sudo apt install -y software-properties-common
sudo add-apt-repository ppa:cz.nic-labs/knot-dns

# Update and install
sudo apt update
sudo apt install -y knot

# Alternatively, install from Ubuntu's default repositories
# (may be an older version)
sudo apt install -y knot

# Verify the installation
knotd --version
knotc version
```

## Understanding the Configuration Format

Knot DNS uses YAML-based configuration. The main file is typically `/etc/knot/knot.conf`. The structure separates server settings, zones, ACLs, and keys into distinct sections:

```bash
sudo nano /etc/knot/knot.conf
```

## Basic Server Configuration

Here's a complete configuration for an authoritative server:

```yaml
# /etc/knot/knot.conf

# Server-wide settings
server:
    # Listen on all interfaces, DNS port 53
    listen: [ 0.0.0.0@53, "::@53" ]

    # User and group to run as after dropping root
    user: knot:knot

    # Number of worker threads (set to CPU count)
    background-workers: 4
    udp-workers: 4
    tcp-workers: 4

    # Maximum number of concurrent TCP connections
    tcp-max-clients: 250

    # Rate limiting (prevent DNS amplification attacks)
    rate-limit: 200
    rate-limit-slip: 2

# Logging configuration
log:
  - target: syslog
    any: info
    # Increase to debug when troubleshooting
    # any: debug

  - target: stderr
    any: warning

# Access Control Lists
acl:
  # Allow zone transfer to secondary servers
  - id: secondary-servers
    address: [ 192.168.1.20, 192.168.1.21 ]
    action: transfer

  # Allow dynamic DNS updates from trusted hosts
  - id: trusted-updates
    address: 192.168.1.0/24
    key: update-key
    action: update

# TSIG keys for zone transfer authentication
key:
  - id: transfer-key
    algorithm: hmac-sha256
    secret: "base64-encoded-secret-here"

  - id: update-key
    algorithm: hmac-sha256
    secret: "another-base64-encoded-secret"

# Template for zone defaults
template:
  - id: default
    storage: /var/lib/knot
    file: "%s.zone"   # Zone filename derived from zone name
    # Check zone serial automatically
    zonefile-sync: -1
    # Reload zone when file changes
    zonefile-load: difference-no-serial

# Zone definitions
zone:
  - domain: example.com
    file: example.com.zone
    acl: [ secondary-servers ]

  - domain: 1.168.192.in-addr.arpa
    file: 192.168.1.zone
    acl: [ secondary-servers ]
```

## Writing Zone Files

Zone files use the standard BIND zone file format:

```bash
# /var/lib/knot/example.com.zone
sudo nano /var/lib/knot/example.com.zone
```

```dns
; /var/lib/knot/example.com.zone
; Standard DNS zone file format

$ORIGIN example.com.
$TTL 3600  ; Default TTL: 1 hour

; Start of Authority record
@   IN  SOA ns1.example.com. hostmaster.example.com. (
            2024011501  ; Serial (YYYYMMDDXX format)
            3600        ; Refresh: 1 hour
            900         ; Retry: 15 minutes
            604800      ; Expire: 1 week
            300         ; Negative cache TTL: 5 minutes
        )

; Name servers
@           IN  NS      ns1.example.com.
@           IN  NS      ns2.example.com.

; A records for name servers
ns1         IN  A       203.0.113.10
ns2         IN  A       203.0.113.11

; Main domain records
@           IN  A       203.0.113.20
@           IN  AAAA    2001:db8::20
www         IN  CNAME   @

; Mail records
@           IN  MX  10  mail.example.com.
mail        IN  A       203.0.113.30

; SPF record
@           IN  TXT     "v=spf1 mx -all"

; DKIM (add your actual DKIM key)
mail._domainkey IN TXT  "v=DKIM1; k=rsa; p=MIGf..."

; Subdomains
api         IN  A       203.0.113.40
blog        IN  CNAME   @

; Service record example
_http._tcp  IN  SRV 10 5 80 www.example.com.
```

The reverse zone for `192.168.1.0/24`:

```bash
sudo nano /var/lib/knot/192.168.1.zone
```

```dns
; /var/lib/knot/192.168.1.zone
$ORIGIN 1.168.192.in-addr.arpa.
$TTL 3600

@   IN  SOA ns1.example.com. hostmaster.example.com. (
            2024011501
            3600
            900
            604800
            300
        )

@       IN  NS  ns1.example.com.
@       IN  NS  ns2.example.com.

; PTR records (last octet)
10      IN  PTR ns1.example.com.
11      IN  PTR ns2.example.com.
20      IN  PTR www.example.com.
30      IN  PTR mail.example.com.
```

## Setting Correct Permissions

```bash
# Set ownership for Knot's data directory
sudo chown -R knot:knot /var/lib/knot
sudo chmod 750 /var/lib/knot

# Zone files need to be readable by the knot user
sudo chown knot:knot /var/lib/knot/example.com.zone
sudo chmod 640 /var/lib/knot/example.com.zone
```

## Starting and Managing Knot DNS

```bash
# Validate configuration before starting
sudo knotc conf-check

# Validate zone files
sudo knotc zone-check example.com

# Enable and start Knot DNS
sudo systemctl enable knot
sudo systemctl start knot

# Check service status
sudo systemctl status knot

# Test the server is responding
dig @127.0.0.1 example.com A
dig @127.0.0.1 example.com NS
dig @127.0.0.1 example.com SOA
```

## Reloading Zones Without Restart

```bash
# Reload a single zone after editing the zone file
sudo knotc zone-reload example.com

# Reload all zones
sudo knotc zone-reload

# Reload configuration
sudo knotc reload

# Check zone status
sudo knotc zone-status example.com

# List all zones
sudo knotc zone-list
```

## Configuring DNSSEC

Knot can automatically sign zones with DNSSEC:

```bash
# Add DNSSEC configuration to knot.conf
sudo nano /etc/knot/knot.conf
```

Add a policy and update the zone definition:

```yaml
# DNSSEC policy
policy:
  - id: auto-signing
    algorithm: ECDSAP256SHA256
    ksk-lifetime: 365d
    zsk-lifetime: 90d
    # Automatically roll keys
    manual: false

# Update zone to use DNSSEC
zone:
  - domain: example.com
    file: example.com.zone
    acl: [ secondary-servers ]
    # Enable DNSSEC with the policy
    dnssec-signing: on
    dnssec-policy: auto-signing
    # Key storage directory
    kasp-db: /var/lib/knot/keys
```

```bash
# Create the key storage directory
sudo mkdir -p /var/lib/knot/keys
sudo chown knot:knot /var/lib/knot/keys

# Reload to apply DNSSEC configuration
sudo knotc reload

# Check DNSSEC signing status
sudo knotc zone-status example.com

# Get the DS record to submit to your registrar
sudo knotc zone-ksk-status example.com
# Or directly query:
dig @127.0.0.1 example.com DNSKEY
dig @127.0.0.1 example.com DS
```

## Setting Up Zone Transfers

For a secondary server, configure it to receive zone transfers from the primary:

```yaml
# On the secondary server's knot.conf

remote:
  - id: primary
    address: 203.0.113.10@53
    key: transfer-key

zone:
  - domain: example.com
    file: example.com.zone
    master: primary
    # How often to check for zone updates
    refresh-min-interval: 60
    refresh-max-interval: 3600
```

Generate a TSIG key for secure zone transfers:

```bash
# Generate a TSIG key
keymgr -t transfer-key hmac-sha256

# Output will look like:
# key:
#   id: transfer-key
#   algorithm: hmac-sha256
#   secret: "AbCdEf123456...base64encoded..."

# Add this to both primary and secondary knot.conf under the key: section
```

## Monitoring and Statistics

```bash
# Check server statistics
sudo knotc stats

# Specific statistics
sudo knotc stats server.zone-count
sudo knotc stats server.query-received
sudo knotc stats resolver.answer-nodata

# Real-time monitoring with systemd journal
journalctl -u knot -f

# Query rate by checking statistics over time
watch -n 5 "knotc stats server.query-received"
```

Knot DNS's focus on authoritative serving means it does one job and does it well. The configuration is cleaner than BIND's, DNSSEC automation is solid, and the performance headroom is substantial even on modest hardware.
