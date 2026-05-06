# How to Configure Dynamic DNS Updates for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dynamic DNS, DDNS, IPv6, BIND, Nsupdate, TSIG, AAAA

Description: Configure dynamic DNS updates (RFC 2136) for IPv6 AAAA records using BIND and nsupdate with TSIG authentication, enabling hosts to register their IPv6 addresses automatically.

## Introduction

Dynamic DNS (DDNS) allows hosts to automatically update their DNS records when their IP addresses change - critical in IPv6 networks where SLAAC and DHCPv6 assign addresses that may change over time. BIND supports RFC 2136 dynamic updates authenticated with TSIG keys.

## Step 1: Generate a TSIG Key

```bash
# Generate a HMAC-SHA256 TSIG key for dynamic updates

tsig-keygen -a HMAC-SHA256 ddns-key.example.com

# Output:
# key "ddns-key.example.com" {
#     algorithm hmac-sha256;
#     secret "base64encodedkey==";
# };

# Save to key file
tsig-keygen -a HMAC-SHA256 ddns-key.example.com \
    > /etc/bind/ddns-key.example.com
chmod 640 /etc/bind/ddns-key.example.com
chown root:bind /etc/bind/ddns-key.example.com
```

## Step 2: Configure BIND Zone for Dynamic Updates

```nginx
# /etc/bind/named.conf.local

include "/etc/bind/ddns-key.example.com";

zone "example.com" {
    type master;
    file "/var/lib/bind/db.example.com";

    # Allow dynamic updates authenticated with the TSIG key.
    # For finer-grained restrictions, prefer update-policy.
    allow-update {
        key "ddns-key.example.com";
    };

    # Notify secondaries on dynamic update
    notify yes;
    also-notify { 2001:db8:1::53; };
};

# Dynamic IPv6 reverse zone
zone "8.b.d.0.1.0.0.2.ip6.arpa" {
    type master;
    file "/var/lib/bind/db.2001.db8.rev";
    allow-update {
        key "ddns-key.example.com";
    };
};
```

## Step 3: Update AAAA Records with nsupdate

```bash
# Update a single AAAA record
nsupdate -k /etc/bind/ddns-key.example.com << 'EOF'
server 2001:db8::53
zone example.com
update delete host1.example.com. AAAA
update add host1.example.com. 300 AAAA 2001:db8::42
send
EOF

# Update the corresponding PTR record
nsupdate -k /etc/bind/ddns-key.example.com << 'EOF'
server 2001:db8::53
zone 8.b.d.0.1.0.0.2.ip6.arpa
update delete 2.4.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa. PTR
update add 2.4.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa. 300 PTR host1.example.com.
send
EOF
```

## Step 4: Automatic Update Script for SLAAC Addresses

```bash
#!/bin/bash
# /usr/local/bin/ddns-update-ipv6.sh
# Run from NetworkManager dispatcher or systemd

INTERFACE=${1:-eth0}
ACTION=${2:-manual}
HOSTNAME=$(hostname -f)
ZONE="example.com"
DNS_SERVER="2001:db8::53"
TSIG_KEY="/etc/bind/ddns-key.example.com"
TTL=300

# Only act on relevant NetworkManager events; manual runs skip this guard.
case "$ACTION" in
    up|dhcp6-change|manual) ;;
    *) exit 0 ;;
esac

# Get current global, non-temporary IPv6 address
IPV6=$(ip -6 addr show dev "$INTERFACE" scope global primary \
    | awk '/inet6/ {print $2}' | cut -d/ -f1 | head -1)

if [[ -z "$IPV6" ]]; then
    echo "No global IPv6 address found on $INTERFACE"
    exit 1
fi

echo "Updating DNS: $HOSTNAME → $IPV6"

nsupdate -k "$TSIG_KEY" << EOF
server $DNS_SERVER
zone $ZONE
update delete ${HOSTNAME}. AAAA
update add ${HOSTNAME}. $TTL AAAA $IPV6
send
EOF

echo "DDNS update complete: $HOSTNAME AAAA $IPV6"
```

```bash
chmod +x /usr/local/bin/ddns-update-ipv6.sh

# Run on network change (NetworkManager dispatcher)
ln -s /usr/local/bin/ddns-update-ipv6.sh \
    /etc/NetworkManager/dispatcher.d/50-ddns-ipv6
```

## Step 5: Verify

```bash
# Verify the update was applied
dig AAAA host1.example.com @2001:db8::53

# Check the BIND journal file (BIND writes dynamic updates here)
ls /var/lib/bind/db.example.com.jnl

# Force BIND to write journal to zone file
rndc sync -clean example.com
```

## Conclusion

DDNS for IPv6 AAAA records works with the same TSIG-authenticated nsupdate mechanism as IPv4. The critical addition is handling PTR updates in the ip6.arpa zone. Automate updates via NetworkManager dispatcher scripts or DHCP client hooks so hosts always have current DNS entries. Monitor record freshness with OneUptime's DNS checks.
