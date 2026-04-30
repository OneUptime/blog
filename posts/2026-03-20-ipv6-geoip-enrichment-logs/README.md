# How to Create IPv6 GeoIP Enrichment in Log Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, GeoIP, Log Enrichment, MaxMind, Elasticsearch

Description: Enrich log records with geographic information for IPv6 addresses using MaxMind GeoLite2 databases, covering Elasticsearch ingest pipelines, Logstash, Fluent Bit, and Python implementations.

## Introduction

GeoIP enrichment adds geographic context (country, city, coordinates) to IP addresses in log data. MaxMind's GeoLite2 databases support IPv6 lookups. This guide covers enrichment at different points in the log pipeline using common tools.

## Step 1: Download MaxMind GeoLite2 Database

```bash
# Register for free at https://www.maxmind.com then:

# Download GeoLite2-City database (supports IPv6)
wget -O /tmp/GeoLite2-City.tar.gz \
  --user=YOUR_ACCOUNT_ID --password=YOUR_LICENSE_KEY \
  "https://download.maxmind.com/geoip/databases/GeoLite2-City/download?suffix=tar.gz"

mkdir -p /etc/geoip
tar -xzf /tmp/GeoLite2-City.tar.gz -C /tmp/
mv /tmp/GeoLite2-City_*/GeoLite2-City.mmdb /etc/geoip/

# Install the official MaxMind Python client
python3 -m pip install geoip2

# Verify the database handles IPv6
python3 -c "
import geoip2.database
with geoip2.database.Reader('/etc/geoip/GeoLite2-City.mmdb') as r:
    resp = r.city('2001:4860:4860::8888')  # Google Public DNS IPv6
    print(resp.country.name, resp.city.name)
"
```

## Step 2: Elasticsearch Ingest Pipeline for IPv6 GeoIP

`GeoLite2-City.mmdb` here refers to Elasticsearch's managed GeoIP database, or to a custom `.mmdb` copied to `$ES_CONFIG/ingest-geoip`.

```http
PUT _ingest/pipeline/geoip-ipv6-pipeline
{
  "description": "Enrich logs with GeoIP data for IPv6 addresses",
  "processors": [
    {
      "geoip": {
        "field": "client_ip",
        "target_field": "geoip",
        "database_file": "GeoLite2-City.mmdb",
        "ignore_missing": true,
        "ignore_failure": true,
        "properties": ["continent_name", "country_iso_code", "country_name",
                       "city_name", "region_iso_code", "location"]
      }
    }
  ]
}
```

To index `geoip.location` as a `geo_point`, define it in the destination index mapping rather than writing `geoip.location.type` into the document:

```http
PUT my-logs
{
  "mappings": {
    "properties": {
      "geoip": {
        "properties": {
          "location": { "type": "geo_point" }
        }
      }
    }
  }
}
```

```http
POST _ingest/pipeline/geoip-ipv6-pipeline/_simulate
{
  "docs": [
    {
      "_source": {
        "client_ip": "2001:4860:4860::8888",
        "message": "Test request"
      }
    }
  ]
}
```

## Step 3: Python GeoIP Enrichment

```python
#!/usr/bin/env python3
# geoip_enrich.py

import geoip2.database
import geoip2.errors
import ipaddress
from functools import lru_cache

class IPv6GeoIPEnricher:
    def __init__(self, db_path: str):
        self.reader = geoip2.database.Reader(db_path)

    @lru_cache(maxsize=4096)
    def lookup(self, ip: str) -> dict:
        """Look up GeoIP data for an IPv4 or IPv6 address."""
        try:
            response = self.reader.city(ip)
            return {
                "country_code": response.country.iso_code,
                "country_name": response.country.name,
                "city": response.city.name,
                "latitude": response.location.latitude,
                "longitude": response.location.longitude,
            }
        except geoip2.errors.AddressNotFoundError:
            return {}
        except Exception as e:
            return {"geoip_error": str(e)}

    def enrich_record(self, record: dict) -> dict:
        """Add GeoIP data to a log record."""
        ip = record.get("client_ip") or record.get("src_ip")
        if not ip:
            return record

        # Normalize
        ip = ip.split('%')[0].strip('[]')

        # Skip non-global or multicast addresses
        try:
            addr = ipaddress.ip_address(ip)
            if not addr.is_global or addr.is_multicast:
                record["geoip"] = {"type": "special"}
                return record
        except ValueError:
            return record

        geo = self.lookup(ip)
        if geo:
            record["geoip"] = geo
        return record

    def close(self):
        self.reader.close()

# Usage
enricher = IPv6GeoIPEnricher("/etc/geoip/GeoLite2-City.mmdb")

# Test with IPv6 addresses
records = [
    {"client_ip": "2001:4860:4860::8888", "path": "/api/test"},  # Google
    {"client_ip": "2400:cb00:2048::1",    "path": "/"},           # Cloudflare
    {"client_ip": "::1",                  "path": "/health"},     # Loopback
]

for record in records:
    enriched = enricher.enrich_record(record)
    print(enriched)

enricher.close()
```

## Step 4: Logstash GeoIP Filter for IPv6

```ruby
# logstash.conf
filter {
  # First normalize the IP address
  mutate {
    gsub => [
      "client_ip", "\\[", "",
      "client_ip", "\\]", "",
      "client_ip", "%.*$", ""
    ]  # Strip brackets and zone ID
  }

  geoip {
    source => "client_ip"
    target => "geoip"
    database => "/etc/geoip/GeoLite2-City.mmdb"
    # GeoIP filter handles IPv6 automatically
  }
}
```

## Step 5: Fluent Bit GeoIP Enrichment

```ini
# Requires fluent-bit built with geoip2 support
[FILTER]
    Name          geoip2
    Match         nginx.*
    Database      /etc/geoip/GeoLite2-City.mmdb
    Lookup_key    client_ip
    Record        country_code  client_ip  %{country.iso_code}
    Record        city          client_ip  %{city.names.en}
    Record        latitude      client_ip  %{location.latitude}
    Record        longitude     client_ip  %{location.longitude}
```

## Conclusion

MaxMind GeoLite2 databases support IPv6 addresses in the same lookup calls as IPv4, making IPv6 GeoIP enrichment straightforward. Always normalize IPv6 addresses (strip zone IDs, brackets) before lookup, and skip non-global or multicast addresses that have no geographic meaning. Cache lookup results with `@lru_cache` or equivalent since many log entries will share the same source IPv6 address. Enrich at collection time (Logstash/Fluent Bit) rather than query time for better performance at scale.
