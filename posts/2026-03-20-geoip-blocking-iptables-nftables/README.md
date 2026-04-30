# How to Set Up GeoIP Blocking with iptables or nftables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GeoIP, iptables, nftables, Linux, Security, Firewall

Description: Block traffic from specific countries using GeoIP databases with iptables or nftables to reduce attack surface from high-risk geographic regions.

GeoIP blocking restricts traffic by country of origin, reducing the attack surface when your services have no legitimate users in certain regions. It doesn't stop sophisticated attackers who use proxies, but it eliminates a large percentage of automated attacks.

## Method 1: GeoIP with xtables-addons (iptables)

```bash
# Install xtables-addons (userspace helpers + geoip kernel module)

sudo apt install xtables-addons-common xtables-addons-dkms \
  linux-headers-$(uname -r) libtext-csv-xs-perl \
  libnet-cidr-lite-perl wget -y

# Download and install GeoIP database
sudo mkdir -p /usr/share/xt_geoip
cd /usr/share/xt_geoip

# Download DB-IP Country Lite database and convert it to xtables format
sudo /usr/libexec/xtables-addons/xt_geoip_dl
sudo /usr/libexec/xtables-addons/xt_geoip_build -D /usr/share/xt_geoip \
  -i dbip-country-lite.csv
```

## Block Countries with xtables geoip

```bash
# Block all traffic from country code CN (China)
sudo iptables -A INPUT -m geoip --src-cc CN -j DROP

# Block multiple countries
sudo iptables -A INPUT -m geoip --src-cc CN,RU,KP -j DROP

# Log and block
sudo iptables -A INPUT -m geoip --src-cc CN \
  -j LOG --log-prefix "GEOIP-DROP-CN: "
sudo iptables -A INPUT -m geoip --src-cc CN -j DROP
```

## Method 2: ipset + Country IP Lists

Use publicly available IPv4 country CIDR lists with ipset:

```bash
#!/bin/bash
set -euo pipefail

# block-country.sh - Block a country by downloading its IP ranges

COUNTRY="CN"  # ISO country code
IPSET_NAME="block-${COUNTRY}"

# Get IP ranges from ipdeny.com
URL="https://www.ipdeny.com/ipblocks/data/countries/${COUNTRY,,}.zone"

# Create ipset
sudo ipset create -exist "$IPSET_NAME" hash:net family inet
sudo ipset flush "$IPSET_NAME"

# Download and add ranges
curl -fsSL "$URL" | while read -r cidr; do
    sudo ipset add -exist "$IPSET_NAME" "$cidr"
done

# Apply iptables rule
sudo iptables -C INPUT -m set --match-set "$IPSET_NAME" src -j DROP 2>/dev/null || \
  sudo iptables -A INPUT -m set --match-set "$IPSET_NAME" src -j DROP

echo "Blocked $(sudo ipset list $IPSET_NAME | grep 'Number of entries')"
```

## Method 3: nftables with GeoIP

With nftables, use a set loaded from a file:

```bash
# Create a file with blocked IPv4 CIDR ranges
curl -fsSL https://www.ipdeny.com/ipblocks/data/countries/cn.zone > /tmp/cn-ranges.txt

# nftables ruleset
sudo tee /etc/nftables-geoip.conf << 'EOF'
table inet geoip {
    set blocked_countries {
        type ipv4_addr
        flags interval
        # Ranges loaded via nft add element
    }

    chain input {
        type filter hook input priority 0; policy accept;
        ip saddr @blocked_countries drop
    }
}
EOF

sudo nft -f /etc/nftables-geoip.conf

# Add IP ranges to the set
sudo nft flush set inet geoip blocked_countries
while read -r cidr; do
    sudo nft add element inet geoip blocked_countries "{ $cidr }"
done < /tmp/cn-ranges.txt
```

## Allow Your Country, Block Everything Else

For services only used domestically:

```bash
#!/bin/bash
set -euo pipefail

# Allowlist: only accept traffic from US
COUNTRY="US"
IPSET_NAME="allow-${COUNTRY}"

sudo ipset create -exist "$IPSET_NAME" hash:net family inet
sudo ipset flush "$IPSET_NAME"

curl -fsSL "https://www.ipdeny.com/ipblocks/data/countries/${COUNTRY,,}.zone" \
  | while read -r cidr; do sudo ipset add -exist "$IPSET_NAME" "$cidr"; done

# Allow traffic from US to 443, drop other traffic to 443
sudo iptables -C INPUT -p tcp --dport 443 \
  -m set --match-set "$IPSET_NAME" src -j ACCEPT 2>/dev/null || \
  sudo iptables -A INPUT -p tcp --dport 443 \
    -m set --match-set "$IPSET_NAME" src -j ACCEPT
sudo iptables -C INPUT -p tcp --dport 443 -j DROP 2>/dev/null || \
  sudo iptables -A INPUT -p tcp --dport 443 -j DROP
```

## Update GeoIP Databases Regularly

Country IP allocations change frequently; schedule updates:

```bash
# /etc/cron.weekly/update-geoip
#!/bin/bash
# Re-run the block-country.sh script to refresh IP ranges
bash /opt/scripts/block-country.sh
```

GeoIP blocking is most valuable for services like SSH or admin panels where you know all legitimate users are in specific countries, dramatically reducing the attack surface.
