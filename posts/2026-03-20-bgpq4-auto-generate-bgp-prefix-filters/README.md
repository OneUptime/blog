# How to Use bgpq4 to Auto-Generate BGP Prefix Filters from IRR Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BGP, Bgpq4, IRR, Prefix Filters, Route Security, Automation

Description: Learn how to use bgpq4 to automatically generate accurate BGP prefix filter lists from Internet Routing Registry (IRR) data, reducing manual effort and improving routing security.

## What Is bgpq4 and Why Use It?

Maintaining accurate BGP prefix lists manually is error-prone and time-consuming. When a customer adds new prefixes, you need to update filters immediately-or traffic gets dropped. bgpq4 queries Internet Routing Registry (IRR) databases and automatically generates prefix-list configurations from AS-SET and route objects.

## Step 1: Install bgpq4

```bash
# On Ubuntu/Debian

sudo apt-get install bgpq4

# Or build from source
git clone https://github.com/bgp/bgpq4.git
cd bgpq4
./bootstrap
./configure && make && sudo make install
```

## Step 2: Query a Single AS for Its Prefixes

Generate plain prefix output or a Cisco IOS prefix list for AS112:

```bash
# Generate plain prefix/mask output for all prefixes in AS112
bgpq4 -4 -F "%n/%l\n" AS112

# Generate a full Cisco IOS prefix-list configuration
bgpq4 -4 -l CUSTOMER_AS112 AS112

# Example output:
# no ip prefix-list CUSTOMER_AS112
# ip prefix-list CUSTOMER_AS112 permit 192.31.196.0/24
# ip prefix-list CUSTOMER_AS112 permit 192.175.48.0/24
```

## Step 3: Generate a Prefix List for an AS-SET

Most ISPs register their prefixes under an AS-SET object, which includes their customers' ASes. Query the AS-SET instead of individual ASes:

```bash
# Generate prefix list from an AS-SET (includes all member ASes)
bgpq4 -4 -l UPSTREAM_FILTER AS-VOSTRON

# Allow more-specifics up to /24
bgpq4 -4 -l UPSTREAM_FILTER -R 24 AS-VOSTRON

# Generate for IPv6 from an IPv6 AS-SET
bgpq4 -6 -l UPSTREAM_FILTER_V6 AS-RETN6
```

## Step 4: Use bgpq4 in an Automation Script

Create a shell script that regenerates and applies prefix filters for all customers:

```bash
#!/bin/bash
# regenerate_bgp_filters.sh - Auto-generate and apply BGP prefix filters

# List of IRR objects: object_name:description
CUSTOMERS=(
    "AS112:customer-a"
    "AS20597:customer-b"
    "AS-VOSTRON:upstream-isp"
)

OUTPUT_FILE="/tmp/bgp_filters.conf"
> "$OUTPUT_FILE"

for ENTRY in "${CUSTOMERS[@]}"; do
    AS="${ENTRY%%:*}"
    NAME="${ENTRY##*:}"
    LIST_NAME="FILTER_${NAME//-/_}"

    echo "! Auto-generated filter for $AS on $(date)" >> "$OUTPUT_FILE"

    # Generate IPv4 prefix list
    bgpq4 -4 -l "$LIST_NAME" -R 24 "$AS" >> "$OUTPUT_FILE"

    echo "" >> "$OUTPUT_FILE"
done

echo "Generated filters saved to $OUTPUT_FILE"

# Apply the generated config with your router's supported deployment method.
# For example, hand "$OUTPUT_FILE" to your SSH/NETCONF/Ansible workflow here.
```

## Step 5: Generate Filters for Different Router Formats

bgpq4 supports multiple router formats:

```bash
# Cisco IOS format (default)
bgpq4 -4 -l MYFILTER AS112

# Cisco IOS XR format
bgpq4 -4 -X -l MYFILTER AS112

# BIRD format
bgpq4 -4 -b AS112

# OpenBGPD format
bgpq4 -4 -B AS112

# JSON output for programmatic use
bgpq4 -4 -j AS112
```

## Step 6: Specify IRR Sources

By default, bgpq4 queries `rr.ntt.net` and uses the mirrored IRR sources available there. Use `-S` to limit the sources you trust, and use `SOURCE::OBJECT` notation when you want to pin the root object to an authoritative source:

```bash
# Query only RIPE data
bgpq4 -S RIPE -4 -l RIPE_FILTER AS-VOSTRON

# Query RIPE and ARIN data
bgpq4 -S RIPE,ARIN -4 -l FILTER AS-VOSTRON

# Pin the root AS-SET to RIPE while leaving member lookups on the default source list
bgpq4 -4 -l FILTER RIPE::AS-VOSTRON
```

## Step 7: Automate with Cron

Refresh prefix filters daily to pick up customer changes automatically:

```bash
# Add to crontab (run at 2am daily)
# crontab -e
0 2 * * * /usr/local/bin/regenerate_bgp_filters.sh >> /var/log/bgp_filters.log 2>&1
```

## Conclusion

bgpq4 eliminates the manual work of maintaining BGP prefix filters by generating them directly from IRR data. Run it as part of a scheduled automation pipeline to ensure filters stay current as customers update their IRR objects. Choose prefix-length controls carefully: use `-R 24` only when you want to allow more-specifics up to /24, and use `-m 24` if you want to filter out prefixes longer than /24.
