# How to Install and Configure Unbound as a Recursive DNS Resolver on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, DNS, Unbound, Linux

Description: Learn how to install and Configure Unbound as a Recursive DNS Resolver on RHEL with step-by-step instructions, configuration examples, and best practices.

---

Unbound is a fast, secure, and validating DNS resolver that is well-suited for use as a RHEL or network-wide recursive resolver. Unlike BIND, Unbound focuses purely on the resolver role and does not serve authoritative zones, making it simpler to configure and maintain.

## Prerequisites

- RHEL with a minimal installation
- Root or sudo access
- Network connectivity to root DNS servers

## Step 1: Install Unbound

```bash
sudo dnf install -y unbound
```

## Step 2: Configure Unbound

Edit the main configuration:

```bash
sudo vi /etc/unbound/unbound.conf
```

```conf
server:
    interface: 0.0.0.0
    access-control: 10.0.0.0/8 allow
    access-control: 192.168.0.0/16 allow
    access-control: 127.0.0.0/8 allow

    # Performance tuning
    num-threads: 4
    msg-cache-slabs: 4
    rrset-cache-slabs: 4
    infra-cache-slabs: 4
    key-cache-slabs: 4
    msg-cache-size: 256m
    rrset-cache-size: 512m

    # Security
    hide-identity: yes
    hide-version: yes
    harden-glue: yes
    harden-dnssec-stripped: yes
    use-caps-for-id: yes

    # Logging
    verbosity: 1
    log-queries: no

    # Root hints
    root-hints: /etc/unbound/root.hints
```

## Step 3: Download Root Hints

```bash
sudo curl -o /etc/unbound/root.hints https://www.internic.net/domain/named.cache
```

## Step 4: Configure Firewall

```bash
sudo firewall-cmd --permanent --add-service=dns
sudo firewall-cmd --reload
```

## Step 5: Start and Enable Unbound

```bash
sudo systemctl restart unbound-keygen
sudo systemctl enable --now unbound
sudo systemctl status unbound
```

## Step 6: Test Resolution

```bash
dig @127.0.0.1 example.com
dig @127.0.0.1 google.com +short
```

## Step 7: Configure Clients

On the resolver host, point `/etc/resolv.conf` to the local Unbound service. On other clients, use the Unbound server's LAN IP address instead of `127.0.0.1`:

```bash
sudo nmcli con mod "<connection-name>" ipv4.dns "127.0.0.1" ipv4.ignore-auto-dns yes
sudo nmcli con up "<connection-name>"
```

## Step 8: Verify Cache Performance

```bash
sudo unbound-control stats_noreset | grep total.num
```

Run the same query twice and note the faster response on the second attempt.

## Conclusion

Unbound provides a high-performance recursive DNS resolver on RHEL 9 with built-in DNSSEC validation and extensive caching. It is simpler to configure than BIND for resolver-only deployments and offers excellent security defaults.
