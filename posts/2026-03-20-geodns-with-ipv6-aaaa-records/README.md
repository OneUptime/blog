# How to Set Up GeoDNS with IPv6 AAAA Records

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, GeoDNS, DNS, AAAA Records, Content Delivery

Description: Learn how to configure GeoDNS to return different IPv6 AAAA records based on the client's geographic location, enabling regional traffic routing for dual-stack services.

## What Is GeoDNS?

GeoDNS returns different DNS responses based on location inferred from the DNS requester or from EDNS Client Subnet data when a resolver provides it. For IPv6, this means serving different AAAA records to users in different regions, directing them to the nearest or most appropriate server.

## GeoDNS with PowerDNS GeoIP Backend

PowerDNS has a native GeoIP backend that supports IPv6 AAAA responses based on client location:

### Install the GeoIP Backend

```bash
# Ubuntu/Debian

apt install pdns-backend-geoip

# Download MaxMind GeoLite2 database (requires free registration)
# Place database at /etc/powerdns/geoip/GeoLite2-City.mmdb
```

### Configure the GeoIP Backend

```yaml
# /etc/powerdns/geoip.yaml
domains:
  - domain: example.com
    ttl: 300
    records:
      # Root apex
      example.com:
        - soa: ns1.example.com. admin.example.com. 2026032001 7200 1800 604800 300
        - ns: ns1.example.com.
        - ns: ns2.example.com.
      # Regional IPv6 targets
      us.na.www.example.com:
        - aaaa: 2001:db8:100::1
      na.www.example.com:
        - aaaa: 2001:db8:100::1
      de.eu.www.example.com:
        - aaaa: 2001:db8:200::1
      gb.eu.www.example.com:
        - aaaa: 2001:db8:200::1
      fr.eu.www.example.com:
        - aaaa: 2001:db8:200::1
      eu.www.example.com:
        - aaaa: 2001:db8:200::1
      jp.as.www.example.com:
        - aaaa: 2001:db8:300::1
      au.oc.www.example.com:
        - aaaa: 2001:db8:300::1
      as.www.example.com:
        - aaaa: 2001:db8:300::1
      oc.www.example.com:
        - aaaa: 2001:db8:300::1
      default.www.example.com:
        - aaaa: 2001:db8:100::1
    services:
      # Try country+continent first, then continent, then a global default
      www.example.com:
        default:
          - "%cc.%cn.www.example.com"
          - "%cn.www.example.com"
          - "default.www.example.com"
```

### Enable the GeoIP Backend in pdns.conf

```ini
# /etc/powerdns/pdns.conf
launch=geoip
geoip-database-files=/etc/powerdns/geoip/GeoLite2-City.mmdb
geoip-zones-file=/etc/powerdns/geoip.yaml
edns-subnet-processing=yes
```

## GeoDNS with BIND Views

BIND's `view` directive allows returning different responses to different client or resolver subnets. For geographic routing, you map those subnets to regions yourself:

```named
// /etc/named.conf - Regional routing with views

// ACLs for regional resolver/client subnets
acl "north-america" {
    192.0.2.0/24;       // example subnet mapped to North America
    2001:db8:100::/48;
};

acl "europe" {
    198.51.100.0/24;    // example subnet mapped to Europe
    2001:db8:200::/48;
};

// View for North America clients
view "north-america" {
    match-clients { north-america; };

    zone "example.com" {
        type master;
        file "/var/named/example.com.na.zone";  // US server AAAA
    };
};

// View for Europe clients
view "europe" {
    match-clients { europe; };

    zone "example.com" {
        type master;
        file "/var/named/example.com.eu.zone";  // EU server AAAA
    };
};

// Default view
view "default" {
    match-clients { any; };

    zone "example.com" {
        type master;
        file "/var/named/example.com.default.zone";
    };
};
```

Example zone files for each region:

```dns
; /var/named/example.com.na.zone - North America
$TTL 300
@   IN  SOA ns1.example.com. admin.example.com. (
        2026032001 7200 1800 604800 300 )
    IN  NS  ns1.example.com.
    IN  NS  ns2.example.com.
www IN  A     203.0.113.1
www IN  AAAA  2001:db8:100::1

; /var/named/example.com.eu.zone - Europe
$TTL 300
@   IN  SOA ns1.example.com. admin.example.com. (
        2026032001 7200 1800 604800 300 )
    IN  NS  ns1.example.com.
    IN  NS  ns2.example.com.
www IN  A     198.51.100.1
www IN  AAAA  2001:db8:200::1
```

## Testing GeoDNS Responses

With PowerDNS GeoIP, you can test EDNS Client Subnet-aware routing with `dig +subnet=`. BIND views match the source IP of the querying client or resolver instead, so test those from networks that actually match the configured ACLs.

```bash
# PowerDNS GeoIP: pass a real public subnet in EDNS Client Subnet
dig AAAA www.example.com @ns1.example.com \
    +subnet=REAL_PUBLIC_SUBNET/24

# Example with a public IPv4 address from the target region
dig AAAA www.example.com @ns1.example.com +subnet=REAL_PUBLIC_IPV4/32

# Example with a public IPv6 prefix from the target region
dig AAAA www.example.com @ns1.example.com +subnet=REAL_PUBLIC_IPV6_PREFIX/56

# Verify different AAAA records are returned for different regions
```

## Monitoring GeoDNS with OneUptime

Configure regional monitors in OneUptime to verify each datacenter's AAAA response:

1. Create a DNS monitor checking `www.example.com` AAAA from a North American probe
2. Create a DNS monitor checking `www.example.com` AAAA from a European probe
3. Alert if the wrong AAAA is returned for a region

## Summary

GeoDNS with IPv6 AAAA records enables geographic traffic steering by returning different IPv6 addresses based on resolver location or EDNS Client Subnet data. PowerDNS GeoIP backend provides a YAML-based configuration with MaxMind database support and can use `dig +subnet=` for ECS-aware testing. BIND views provide subnet-based split-horizon DNS, but they do not use authoritative ECS in current BIND releases.
