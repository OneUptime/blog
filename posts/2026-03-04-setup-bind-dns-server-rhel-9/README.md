# How to Set Up a BIND DNS Server on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, BIND, DNS, Server, Linux

Description: Step-by-step guide to installing and configuring a BIND DNS server on RHEL, from package installation to zone configuration and testing.

---

Running your own DNS server gives you full control over name resolution in your environment. BIND (Berkeley Internet Name Domain) has been the standard DNS server on Linux for decades, and RHEL ships version 9.16 in its repositories. This guide walks through setting up an authoritative DNS server from scratch.

## Installing BIND

Install the BIND packages:

```bash
dnf install bind bind-utils -y
```

The `bind` package provides the named daemon, and `bind-utils` gives you tools like `dig` and `nslookup` for testing.

## Understanding the File Layout

BIND on RHEL uses these key files and directories:

| Path | Purpose |
|------|---------|
| `/etc/named.conf` | Main configuration file |
| `/var/named/` | Zone data files |
| `/var/log/named/` | Log files (if configured) |
| `/etc/named/` | Additional configuration files |

## Configuring named.conf

Back up the default configuration and create a new one:

```bash
cp /etc/named.conf /etc/named.conf.bak
```

Edit the main configuration file:

```bash
cat > /etc/named.conf << 'NAMEDCONF'
// BIND configuration for RHEL
options {
    listen-on port 53 { any; };
    listen-on-v6 port 53 { any; };
    directory "/var/named";
    dump-file "/var/named/data/cache_dump.db";
    statistics-file "/var/named/data/named_stats.txt";
    memstatistics-file "/var/named/data/named_mem_stats.txt";
    secroots-file "/var/named/data/named.secroots";
    recursing-file "/var/named/data/named.recursing";

    // Allow queries from local network
    allow-query { localhost; 10.0.0.0/8; 192.168.0.0/16; };

    // Disable recursion for an authoritative-only server
    // Set to yes if this is also a resolver
    recursion no;

    dnssec-validation auto;

    managed-keys-directory "/var/named/dynamic";
    geoip-directory "/usr/share/GeoIP";

    pid-file "/run/named/named.pid";
    session-keyfile "/run/named/session.key";
};

// Logging configuration
logging {
    channel default_log {
        file "/var/log/named/default.log" versions 3 size 5m;
        severity info;
        print-time yes;
        print-severity yes;
    };
    category default { default_log; };
};

// Root hints
zone "." IN {
    type hint;
    file "named.ca";
};

// Forward zone for example.com
zone "example.com" IN {
    type primary;
    file "example.com.zone";
    allow-update { none; };
};

// Reverse zone for 192.168.1.0/24
zone "1.168.192.in-addr.arpa" IN {
    type primary;
    file "192.168.1.rev";
    allow-update { none; };
};
NAMEDCONF
```

## Creating the Forward Zone File

Create the zone file for your domain:

```bash
cat > /var/named/example.com.zone << 'ZONEFILE'
$TTL 86400
@   IN  SOA ns1.example.com. admin.example.com. (
            2026030401  ; Serial (YYYYMMDDNN)
            3600        ; Refresh (1 hour)
            1800        ; Retry (30 minutes)
            604800      ; Expire (1 week)
            86400       ; Minimum TTL (1 day)
)

; Name servers
@       IN  NS  ns1.example.com.
@       IN  NS  ns2.example.com.

; A records for name servers
ns1     IN  A   192.168.1.10
ns2     IN  A   192.168.1.11

; Mail server
@       IN  MX  10  mail.example.com.

; Host records
@       IN  A       192.168.1.100
www     IN  A       192.168.1.100
mail    IN  A       192.168.1.20
ftp     IN  A       192.168.1.30
db      IN  A       192.168.1.40

; CNAME records
webmail IN  CNAME   mail.example.com.
ZONEFILE
```

## Creating the Reverse Zone File

Create the reverse lookup zone:

```bash
cat > /var/named/192.168.1.rev << 'REVZONE'
$TTL 86400
@   IN  SOA ns1.example.com. admin.example.com. (
            2026030401  ; Serial
            3600        ; Refresh
            1800        ; Retry
            604800      ; Expire
            86400       ; Minimum TTL
)

; Name servers
@       IN  NS  ns1.example.com.
@       IN  NS  ns2.example.com.

; PTR records
10      IN  PTR ns1.example.com.
11      IN  PTR ns2.example.com.
20      IN  PTR mail.example.com.
30      IN  PTR ftp.example.com.
40      IN  PTR db.example.com.
100     IN  PTR www.example.com.
REVZONE
```

## Setting Permissions

BIND runs as the `named` user. Set ownership accordingly:

```bash
chown named:named /var/named/example.com.zone
chown named:named /var/named/192.168.1.rev

# Create log directory
mkdir -p /var/log/named
chown named:named /var/log/named
```

## Validating the Configuration

Check the main configuration for syntax errors:

```bash
named-checkconf /etc/named.conf
```

Validate the zone files:

```bash
named-checkzone example.com /var/named/example.com.zone
named-checkzone 1.168.192.in-addr.arpa /var/named/192.168.1.rev
```

Both should return "OK" if the syntax is correct.

## Starting BIND

Enable and start the service:

```bash
systemctl enable --now named
```

Check the status:

```bash
systemctl status named
```

## Firewall Configuration

Allow DNS traffic through the firewall:

```bash
firewall-cmd --permanent --add-service=dns
firewall-cmd --reload
```

## Testing with dig

Test forward resolution:

```bash
dig @localhost example.com A
dig @localhost www.example.com A
dig @localhost mail.example.com A
```

Test reverse resolution:

```bash
dig @localhost -x 192.168.1.100
```

Test from another machine on the network:

```bash
dig @192.168.1.10 www.example.com
```

## Updating Zone Records

When you add or modify records, always increment the serial number in the SOA record. The convention is `YYYYMMDDNN` where NN is a sequence number for changes made on the same day.

After editing the zone file:

```bash
# Increment serial from 2026030401 to 2026030402
# Then reload the zone
rndc reload example.com
```

You can also reload all zones:

```bash
rndc reload
```

## Monitoring

Check BIND statistics:

```bash
rndc status
```

View query logs:

```bash
tail -f /var/log/named/default.log
```

That's a working DNS server. From here, you can add more zones, configure secondary servers for redundancy, set up DNSSEC, or enable recursion if you also need it as a resolver.
