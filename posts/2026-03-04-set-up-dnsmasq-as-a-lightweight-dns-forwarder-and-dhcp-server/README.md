# How to Set Up dnsmasq as a Lightweight DNS Forwarder and DHCP Server on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, DNS, Dnsmasq, Linux

Description: Learn how to set Up dnsmasq as a Lightweight DNS Forwarder and DHCP Server on RHEL with step-by-step instructions, configuration examples, and best practices.

---

dnsmasq combines DNS forwarding, DHCP, and TFTP services in a single lightweight daemon. IRHELdeal for small networks, development environments, and lab setups where aRHELBIND or ISC DHCP deployment would be excessive.

## Prerequisites

- RHEL
- Root or sudo access
- A static IP address on the server

## Step 1: Install dnsmasq

```bash
sudo dnf install -y dnsmasq
```

## Step 2: Configure DNS Forwarding

```bash
sudo vi /etc/dnsmasq.conf
```

```ini
# Listen on specific interface
interface=eth0
bind-interfaces

# Upstream DNS servers
server=8.8.8.8
server=8.8.4.4

# Local domain
domain=lab.local
local=/lab.local/

# Cache size
cache-size=1000

# Log queries (optional)
log-queries
log-facility=/var/log/dnsmasq.log
```

## Step 3: Add Local DNS Entries

```bash
sudo vi /etc/hosts
```

```bash
192.168.1.10  server1.lab.local server1
192.168.1.11  server2.lab.local server2
192.168.1.12  db.lab.local db
```

dnsmasq reads /etc/hosts and serves those entries to DNS clients.

## Step 4: Configure DHCP

Add to `/etc/dnsmasq.conf`:

```ini
# DHCP range
dhcp-range=192.168.1.100,192.168.1.200,12h

# Default gateway
dhcp-option=option:router,192.168.1.1

# DNS server (this machine)
dhcp-option=option:dns-server,192.168.1.10

# Static leases
dhcp-host=aa:bb:cc:dd:ee:01,server1,192.168.1.11
dhcp-host=aa:bb:cc:dd:ee:02,server2,192.168.1.12
```

## Step 5: Configure Firewall

```bash
sudo firewall-cmd --permanent --add-service=dns
sudo firewall-cmd --permanent --add-service=dhcp
sudo firewall-cmd --reload
```

## Step 6: Start and Enable dnsmasq

```bash
sudo systemctl enable --now dnsmasq
sudo systemctl status dnsmasq
```

## Step 7: Test DNS

```bash
dig @192.168.1.10 server1.lab.local
nslookup server2.lab.local 192.168.1.10
```

## Step 8: View DHCP Leases

```bash
cat /var/lib/dnsmasq/dnsmasq.leases
```

## Conclusion

dnsmasq provides a lightweight all-in-one DNS and DHCP solution for RHEL. It is particularly well-suited for lab environments, small offices, and development networks where simplicity and ease of configuration are priorities.
RHEL