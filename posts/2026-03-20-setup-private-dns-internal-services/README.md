# How to Set Up Private DNS for Internal Network Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DNS, Private, Internal, Linux, Dnsmasq, Networking, Infrastructure

Description: Set up a private DNS server for internal network services using dnsmasq or Unbound to resolve internal hostnames and route external queries to public resolvers.

## Introduction

Internal networks need DNS to resolve internal service names without depending on external DNS providers. A private DNS server resolves hostnames like `db.internal`, `api.company.internal`, or `redis.prod.example.com` to internal IP addresses, while forwarding all other queries to public resolvers. This guide covers setting up private DNS with dnsmasq (simpler) and Unbound (more capable).

## Option 1: dnsmasq (Simple Internal DNS)

```bash
# Install dnsmasq:

apt-get install dnsmasq -y

# Configure dnsmasq:
cat > /etc/dnsmasq.d/internal.conf << 'EOF'
# Listen on specific interface:
interface=eth0
bind-interfaces

# Don't use /etc/resolv.conf nameservers for client queries:
no-resolv

# Forward all queries to these upstreams:
server=8.8.8.8
server=1.1.1.1

# Internal domain: don't forward to internet
local=/internal./
local=/company.internal./

# Static host entries:
address=/db.internal/10.20.0.20
address=/redis.internal/10.20.0.21
address=/api.internal/10.20.0.11
address=/app.internal/10.20.0.12

# Wildcard: all *.internal.company.com → load balancer:
address=/internal.company.com/10.20.0.100

# Reverse DNS for internal range:
ptr-record=20.0.20.10.in-addr.arpa.,db.internal
ptr-record=21.0.20.10.in-addr.arpa.,redis.internal

# Cache settings:
cache-size=10000
neg-ttl=60

# Logging (optional):
log-queries
log-facility=/var/log/dnsmasq.log
EOF

# Restart dnsmasq:
systemctl restart dnsmasq
systemctl enable dnsmasq

# Test:
dig @10.20.0.1 db.internal +short     # Should return 10.20.0.20
dig @10.20.0.1 google.com +short      # Should return public IP
```

## Option 2: Unbound (Production DNS)

```bash
# Unbound configuration for internal DNS:
cat > /etc/unbound/unbound.conf << 'EOF'
server:
    interface: 10.20.0.1   # DNS server's own IP
    interface: 127.0.0.1

    # Allow queries from LAN:
    access-control: 10.20.0.0/16 allow
    access-control: 127.0.0.0/8 allow

    # Internal zone definitions:
    local-zone: "internal." static
    local-data: "db.internal. IN A 10.20.0.20"
    local-data: "redis.internal. IN A 10.20.0.21"
    local-data: "api.internal. IN A 10.20.0.11"
    local-data: "app.internal. IN A 10.20.0.12"

    # Reverse DNS:
    local-data-ptr: "10.20.0.20 db.internal"
    local-data-ptr: "10.20.0.21 redis.internal"
    local-data-ptr: "10.20.0.11 api.internal"

    # Hide server info:
    hide-version: yes
    hide-identity: yes

    # Cache settings:
    cache-max-ttl: 3600
    prefetch: yes

# Forward external queries to public DNS:
forward-zone:
    name: "."
    forward-addr: 8.8.8.8
    forward-addr: 1.1.1.1
EOF

systemctl restart unbound
```

## Push DNS to Clients via DHCP

```bash
# If using dnsmasq as both DNS and DHCP:
cat >> /etc/dnsmasq.conf << 'EOF'
# DHCP configuration:
dhcp-range=10.20.0.100,10.20.0.200,24h

# Push DNS server (this machine) and domain to clients:
dhcp-option=6,10.20.0.1         # DNS server IP
dhcp-option=15,company.internal  # Domain name
dhcp-option=119,company.internal # DNS search domain
EOF

# If using ISC DHCP server separately:
# In /etc/dhcp/dhcpd.conf:
# option domain-name-servers 10.20.0.1;
# option domain-name "company.internal";
# option domain-search "company.internal", "internal";
```

## Dynamic DNS Updates (for DHCP clients)

```bash
# DHCP clients get IPs dynamically; dnsmasq can publish lease hostnames in DNS
# Using dnsmasq with dynamic DNS:
cat >> /etc/dnsmasq.d/internal.conf << 'EOF'
# Assign hostnames from DHCP MAC addresses:
dhcp-host=aa:bb:cc:dd:ee:ff,dev-laptop,10.20.0.50,24h

# Push this DNS server to DHCP clients:
dhcp-option=option:dns-server,10.20.0.1
EOF

# Using nsupdate for dynamic DNS updates to BIND:
# When DHCP assigns an IP, call nsupdate to add A and PTR records.
# BIND must allow dynamic updates for both the forward and reverse zones.
nsupdate << 'EOF'
server 10.20.0.1
zone example.com.
update delete newhost.example.com. A
update add newhost.example.com. 3600 A 10.20.0.50
send
EOF

nsupdate << 'EOF'
server 10.20.0.1
zone 20.10.in-addr.arpa.
update delete 50.0.20.10.in-addr.arpa. PTR
update add 50.0.20.10.in-addr.arpa. 3600 PTR newhost.example.com.
send
EOF
```

## Verify Internal DNS

```bash
# From the DNS server:
dig @127.0.0.1 db.internal
dig @127.0.0.1 api.internal
dig @127.0.0.1 google.com  # External should still work

# From a client on the network (using this DNS server):
dig @10.20.0.1 db.internal
nslookup db.internal 10.20.0.1
ping db.internal

# Test reverse DNS:
dig @10.20.0.1 -x 10.20.0.20
```

## Conclusion

Private internal DNS separates internal from external resolution. dnsmasq is ideal for small networks: simple configuration, handles DHCP+DNS together. Unbound is better for larger networks: more control, DNSSEC validation, better performance. Push the DNS server address to clients via DHCP option 6. Define internal zones as `local-zone: "internal." static` in Unbound or use `address=/hostname/ip` in dnsmasq. Forward everything else to public resolvers. Verify both internal and external resolution work before propagating to production clients.
