# How to Set Up BIND9 as a Primary DNS Server on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, DNS, BIND9, Networking, Sysadmin

Description: Step-by-step guide to installing and configuring BIND9 as an authoritative primary DNS server on Ubuntu, including zone files and forward/reverse lookup zones.

---

BIND9 (Berkeley Internet Name Domain) is one of the most widely deployed DNS servers in the world. Running your own authoritative DNS server gives you full control over your domain's DNS records, enables split-horizon DNS for internal networks, and reduces dependency on third-party DNS providers.

This tutorial walks through setting up BIND9 as a primary authoritative DNS server for a domain. We'll configure forward and reverse lookup zones with realistic record examples.

## Installing BIND9

Start by updating your package list and installing BIND9 along with its utilities:

```bash
# Update package cache
sudo apt update

# Install BIND9 and utilities
sudo apt install -y bind9 bind9-utils bind9-doc

# Verify the installation
named -v
```

After installation, BIND9 starts automatically. Check its status:

```bash
sudo systemctl status bind9
```

The main configuration directory is `/etc/bind/`. The primary configuration files are:
- `/etc/bind/named.conf` - main configuration entry point
- `/etc/bind/named.conf.options` - global options
- `/etc/bind/named.conf.local` - your zone definitions
- `/etc/bind/named.conf.default-zones` - default zones (root, localhost, etc.)

## Configuring Global Options

Edit the global options file to set appropriate settings for an authoritative server:

```bash
sudo nano /etc/bind/named.conf.options
```

```
options {
    directory "/var/cache/bind";

    // Listen on all interfaces, or restrict to specific ones
    listen-on { any; };
    listen-on-v6 { any; };

    // Only allow queries from your network
    allow-query { localhost; 192.168.1.0/24; 10.0.0.0/8; };

    // Allow recursive queries only for internal clients
    allow-recursion { localhost; 192.168.1.0/24; };

    // Disable recursion for an authoritative-only server
    // recursion no;

    // Prevent zone transfers to unauthorized servers
    allow-transfer { none; };

    // Forward unresolved queries to upstream DNS
    forwarders {
        8.8.8.8;
        1.1.1.1;
    };

    // Enable DNSSEC validation
    dnssec-validation auto;

    // Logging
    querylog yes;
};
```

## Defining Your Zones

Edit the local configuration file to define your zones:

```bash
sudo nano /etc/bind/named.conf.local
```

```
// Primary zone for example.com
zone "example.com" {
    type master;
    file "/etc/bind/zones/db.example.com";
    // Allow zone transfers to secondary servers
    allow-transfer { 192.168.1.20; };  // Secondary DNS server IP
    // Notify secondary servers of changes
    also-notify { 192.168.1.20; };
};

// Reverse lookup zone for 192.168.1.0/24
zone "1.168.192.in-addr.arpa" {
    type master;
    file "/etc/bind/zones/db.192.168.1";
    allow-transfer { 192.168.1.20; };
};
```

## Creating Zone Files

Create the zones directory and the forward lookup zone file:

```bash
sudo mkdir /etc/bind/zones
```

```bash
sudo nano /etc/bind/zones/db.example.com
```

```dns
; Forward lookup zone for example.com
; Serial format: YYYYMMDDNN (year, month, day, sequence)
$TTL    86400
@       IN      SOA     ns1.example.com. admin.example.com. (
                        2026030201      ; Serial
                        3600            ; Refresh (1 hour)
                        900             ; Retry (15 minutes)
                        604800          ; Expire (1 week)
                        86400 )         ; Negative Cache TTL (1 day)

; Name servers
@       IN      NS      ns1.example.com.
@       IN      NS      ns2.example.com.

; A records for name servers
ns1     IN      A       192.168.1.10
ns2     IN      A       192.168.1.20

; Main domain records
@       IN      A       192.168.1.100
www     IN      A       192.168.1.100
mail    IN      A       192.168.1.110

; Mail exchange records
@       IN      MX      10 mail.example.com.

; Text records
@       IN      TXT     "v=spf1 mx ~all"

; CNAME records
ftp     IN      CNAME   www.example.com.
webmail IN      CNAME   mail.example.com.

; Internal hosts
server1 IN      A       192.168.1.50
server2 IN      A       192.168.1.51
db1     IN      A       192.168.1.60
```

Now create the reverse lookup zone file:

```bash
sudo nano /etc/bind/zones/db.192.168.1
```

```dns
; Reverse lookup zone for 192.168.1.0/24
$TTL    86400
@       IN      SOA     ns1.example.com. admin.example.com. (
                        2026030201      ; Serial
                        3600            ; Refresh
                        900             ; Retry
                        604800          ; Expire
                        86400 )         ; Negative Cache TTL

; Name servers
@       IN      NS      ns1.example.com.
@       IN      NS      ns2.example.com.

; PTR records (last octet of IP -> hostname)
10      IN      PTR     ns1.example.com.
20      IN      PTR     ns2.example.com.
50      IN      PTR     server1.example.com.
51      IN      PTR     server2.example.com.
60      IN      PTR     db1.example.com.
100     IN      PTR     www.example.com.
110     IN      PTR     mail.example.com.
```

## Setting File Permissions

BIND runs as the `bind` user and needs to read these files:

```bash
# Set proper ownership
sudo chown -R bind:bind /etc/bind/zones/

# Set permissions (read-only for bind user)
sudo chmod 640 /etc/bind/zones/*
```

## Validating Configuration

Before restarting BIND9, always validate your configuration and zone files:

```bash
# Check named.conf syntax
sudo named-checkconf

# Check the forward zone file
sudo named-checkzone example.com /etc/bind/zones/db.example.com

# Check the reverse zone file
sudo named-checkzone 1.168.192.in-addr.arpa /etc/bind/zones/db.192.168.1
```

If the commands return no errors, your configuration is syntactically correct.

## Starting and Testing

Restart BIND9 to apply the configuration:

```bash
sudo systemctl restart bind9
sudo systemctl enable bind9

# Check for errors in the logs
sudo journalctl -u bind9 -n 50
```

Test DNS resolution from the server itself:

```bash
# Query the local DNS server directly
dig @localhost example.com A
dig @localhost www.example.com A
dig @localhost example.com MX
dig @localhost example.com NS

# Test reverse lookup
dig @localhost -x 192.168.1.100

# Test from another machine pointing to this server
dig @192.168.1.10 example.com A
```

## Configuring Logging

Add detailed logging to help with troubleshooting. Add a logging section to `/etc/bind/named.conf.local`:

```bash
sudo nano /etc/bind/named.conf.local
```

Append at the end:

```
logging {
    channel default_log {
        file "/var/log/named/default.log" versions 3 size 10m;
        severity dynamic;
        print-time yes;
        print-severity yes;
        print-category yes;
    };

    channel query_log {
        file "/var/log/named/query.log" versions 3 size 20m;
        severity info;
        print-time yes;
    };

    category default { default_log; };
    category queries { query_log; };
    category security { default_log; };
};
```

Create the log directory:

```bash
sudo mkdir /var/log/named
sudo chown bind:bind /var/log/named
sudo systemctl restart bind9
```

## Updating Zone Records

Whenever you make changes to a zone file, you must increment the serial number and reload BIND9. The serial number format `YYYYMMDDNN` makes this easy to track.

```bash
# After editing a zone file, increment the serial and reload
sudo named-checkzone example.com /etc/bind/zones/db.example.com

# Reload just the zones without restarting the server
sudo rndc reload

# Or reload a specific zone
sudo rndc reload example.com
```

## Firewall Configuration

Allow DNS traffic through the firewall:

```bash
# Allow DNS on UDP and TCP
sudo ufw allow 53/udp
sudo ufw allow 53/tcp

# If you have secondary servers, allow zone transfers
sudo ufw allow from 192.168.1.20 to any port 53
```

Running BIND9 as a primary authoritative DNS server requires careful attention to zone file syntax and serial number management. The key habit to develop is always running `named-checkconf` and `named-checkzone` before restarting the service - catching errors before they cause an outage is much easier than debugging a live DNS failure.
