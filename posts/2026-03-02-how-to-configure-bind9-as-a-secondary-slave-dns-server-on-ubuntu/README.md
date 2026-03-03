# How to Configure BIND9 as a Secondary (Slave) DNS Server on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, DNS, BIND9, High Availability, Networking

Description: Configure BIND9 as a secondary DNS server on Ubuntu to provide redundancy and load distribution by replicating zones from a primary BIND9 server.

---

Running a single DNS server is a single point of failure. DNS is so fundamental to network operation that its failure takes down everything that depends on hostnames. A secondary DNS server replicates zones from the primary and answers queries independently, so DNS continues working even when the primary is offline.

This tutorial covers setting up a BIND9 secondary (also called slave) server that synchronizes zones from a BIND9 primary server. The secondary server holds read-only copies of your zones and keeps them current through zone transfers.

## How Zone Transfers Work

Before configuring anything, understanding zone transfers makes the configuration choices clearer.

When a zone changes on the primary server, it increments the serial number in the SOA record. The secondary server periodically checks whether the primary's serial is newer than what it holds locally. If it is, the secondary requests a full or incremental zone transfer to update its copy.

There are two transfer types:
- AXFR (full transfer): transfers the complete zone
- IXFR (incremental transfer): transfers only changes since the last serial

The timing is controlled by the SOA record values: Refresh (how often to check), Retry (how often to retry if the primary is unreachable), and Expire (how long to keep serving the zone if the primary never responds).

## Prerequisites

This guide assumes you already have a primary BIND9 server configured and running. The primary server must:
- Allow zone transfers from the secondary's IP address (`allow-transfer`)
- Have `also-notify` configured to push change notifications to the secondary
- Have both forward and reverse zones defined

For this tutorial, assume:
- Primary DNS server: 192.168.1.10
- Secondary DNS server: 192.168.1.20

## Installing BIND9 on the Secondary Server

```bash
# Install BIND9
sudo apt update
sudo apt install -y bind9 bind9-utils

# Check the service is running
sudo systemctl status bind9
```

## Configuring Global Options

```bash
sudo nano /etc/bind/named.conf.options
```

```text
options {
    directory "/var/cache/bind";

    // Listen on all interfaces
    listen-on { any; };
    listen-on-v6 { any; };

    // Accept queries from local network
    allow-query { localhost; 192.168.1.0/24; 10.0.0.0/8; };

    // Allow recursive queries for internal clients
    allow-recursion { localhost; 192.168.1.0/24; };

    // Secondary servers should not allow zone transfers by default
    allow-transfer { none; };

    // Forward to upstream for names we don't know
    forwarders {
        8.8.8.8;
        1.1.1.1;
    };

    dnssec-validation auto;
};
```

## Defining Secondary Zones

This is the key difference from a primary configuration. The zone type is `slave` (or `secondary` in newer BIND versions), and you specify where to get the zone data:

```bash
sudo nano /etc/bind/named.conf.local
```

```text
// Secondary zone for example.com
zone "example.com" {
    type slave;
    // The primary server to transfer from
    masters { 192.168.1.10; };
    // Where to store the local copy of the zone
    file "/var/cache/bind/db.example.com";
    // This secondary can also transfer to other secondaries if needed
    allow-transfer { none; };
};

// Secondary reverse lookup zone
zone "1.168.192.in-addr.arpa" {
    type slave;
    masters { 192.168.1.10; };
    file "/var/cache/bind/db.192.168.1";
    allow-transfer { none; };
};
```

Note that the zone files for a secondary are stored in `/var/cache/bind/` rather than `/etc/bind/zones/`. This is because the secondary writes these files automatically during zone transfers - they're cache files, not manually maintained configuration files.

## Verifying Primary Server Configuration

On the primary server, ensure the secondary is allowed to receive zone transfers. Check `/etc/bind/named.conf.local` on the primary:

```text
zone "example.com" {
    type master;
    file "/etc/bind/zones/db.example.com";
    // Allow the secondary server to pull zones
    allow-transfer { 192.168.1.20; };
    // Push notifications to the secondary when zones change
    also-notify { 192.168.1.20; };
};
```

If you need to add TSIG (Transaction SIGnature) authentication for zone transfers, generate a key on the primary:

```bash
# Generate a TSIG key on the primary server
tsig-keygen -a hmac-sha256 secondary-key
```

This outputs something like:

```text
key "secondary-key" {
    algorithm hmac-sha256;
    secret "base64encodedkeyvalue==";
};
```

Add this key to both servers' configurations and reference it in the zone definition.

## Validating the Configuration

```bash
# Check the configuration for syntax errors
sudo named-checkconf

# Should return no output if everything is correct
```

The secondary won't have zone files to check with `named-checkzone` yet since they're downloaded from the primary.

## Starting the Secondary Server

```bash
sudo systemctl restart bind9
sudo systemctl enable bind9
```

On startup, BIND9 will immediately attempt to transfer zones from the primary server. Watch the logs:

```bash
# Monitor the transfer process
sudo journalctl -u bind9 -f
```

You should see log entries like:
```text
transfer of 'example.com/IN' from 192.168.1.10#53: Transfer started.
transfer of 'example.com/IN' from 192.168.1.10#53: connected using 192.168.1.20#43521
transfer of 'example.com/IN' from 192.168.1.10#53: Transfer completed: 1 messages, 15 records, 752 bytes, 0.001 secs
```

## Verifying Zone Transfers

After the service starts, verify that zones were transferred successfully:

```bash
# Check if the zone files exist in the cache directory
ls -la /var/cache/bind/

# Query the secondary directly
dig @192.168.1.20 example.com SOA
dig @192.168.1.20 example.com NS
dig @192.168.1.20 www.example.com A

# Test reverse lookup
dig @192.168.1.20 -x 192.168.1.100

# Check the serial number matches the primary
dig @192.168.1.10 example.com SOA
dig @192.168.1.20 example.com SOA
```

Both servers should return the same serial number.

## Forcing a Zone Transfer

If you want to force an immediate zone transfer (useful after updating the primary):

```bash
# On the primary, update a zone and reload
sudo rndc reload example.com

# On the secondary, force a transfer
sudo rndc retransfer example.com

# Or refresh (checks serial and transfers if needed)
sudo rndc refresh example.com
```

## Adding the Secondary to Your SOA Record

Update the primary's zone file to list the secondary server in the NS records:

```dns
; Nameserver records - both primary and secondary
@       IN      NS      ns1.example.com.
@       IN      NS      ns2.example.com.

; A records for both nameservers
ns1     IN      A       192.168.1.10
ns2     IN      A       192.168.1.20
```

After updating the zone file, increment the serial number and reload the primary:

```bash
sudo named-checkzone example.com /etc/bind/zones/db.example.com
sudo rndc reload example.com
```

## Firewall Rules

Allow DNS traffic on the secondary server:

```bash
sudo ufw allow 53/udp
sudo ufw allow 53/tcp

# Allow zone transfers from primary (port 53 TCP)
sudo ufw allow from 192.168.1.10 to any port 53 proto tcp
```

On the primary, ensure the secondary can connect:

```bash
# On the primary server
sudo ufw allow from 192.168.1.20 to any port 53 proto tcp
```

## Monitoring Transfer Health

A useful check is to compare the SOA serial numbers between primary and secondary regularly. A simple script can alert when they diverge:

```bash
#!/bin/bash
# Check DNS secondary sync status
# Save as /usr/local/bin/check-dns-sync.sh

PRIMARY="192.168.1.10"
SECONDARY="192.168.1.20"
ZONE="example.com"

PRIMARY_SERIAL=$(dig @$PRIMARY $ZONE SOA +short | awk '{print $3}')
SECONDARY_SERIAL=$(dig @$SECONDARY $ZONE SOA +short | awk '{print $3}')

if [ "$PRIMARY_SERIAL" = "$SECONDARY_SERIAL" ]; then
    echo "OK: Primary and secondary are in sync (serial: $PRIMARY_SERIAL)"
else
    echo "WARNING: Serial mismatch - Primary: $PRIMARY_SERIAL, Secondary: $SECONDARY_SERIAL"
    exit 1
fi
```

```bash
chmod +x /usr/local/bin/check-dns-sync.sh

# Add to crontab to run every 15 minutes
echo "*/15 * * * * /usr/local/bin/check-dns-sync.sh" | crontab -
```

A secondary DNS server is straightforward to configure but requires keeping the primary's `allow-transfer` and `also-notify` settings aligned with it. The most common problem encountered is zone transfers failing due to firewall rules blocking TCP port 53 between the servers - DNS normally runs on UDP but zone transfers use TCP.
