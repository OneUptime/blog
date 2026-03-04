# How to Configure DNS Services in IdM on RHEL 9

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, IdM, DNS, Identity Management, BIND, Linux

Description: Learn how to manage DNS zones, records, and forwarding in Red Hat Identity Management on RHEL 9 for integrated name resolution.

---

IdM integrated DNS on RHEL 9 provides automatic management of DNS records needed for Kerberos and LDAP service discovery. Beyond automatic records, you can manage custom zones, records, and forwarding policies to make IdM your primary DNS solution for your RHEL infrastructure.

## Understanding IdM DNS

IdM uses BIND with the `bind-dyndb-ldap` plugin to store DNS data in the LDAP directory. This means:

- DNS records are replicated across all IdM servers with DNS
- Changes made on one server appear on all servers
- Records can be managed through the `ipa` CLI or web UI

## Managing DNS Zones

### Listing Zones

```bash
ipa dnszone-find
```

### Creating a Forward Zone

```bash
ipa dnszone-add internal.example.com
```

With specific settings:

```bash
ipa dnszone-add internal.example.com \
    --admin-email=admin@example.com \
    --minimum=3600 \
    --default-ttl=3600
```

### Creating a Reverse Zone

```bash
ipa dnszone-add 1.168.192.in-addr.arpa.
```

### Modifying Zone Settings

```bash
ipa dnszone-mod example.com \
    --default-ttl=7200 \
    --refresh=3600 \
    --retry=600
```

### Enabling Dynamic Updates

```bash
ipa dnszone-mod example.com --dynamic-update=true
```

### Disabling a Zone

```bash
ipa dnszone-disable internal.example.com
ipa dnszone-enable internal.example.com
```

## Managing DNS Records

### Adding Records

```bash
# A record
ipa dnsrecord-add example.com server1 --a-rec=192.168.1.20

# AAAA record
ipa dnsrecord-add example.com server1 --aaaa-rec=fd00::20

# CNAME record
ipa dnsrecord-add example.com www --cname-rec=server1.example.com.

# MX record
ipa dnsrecord-add example.com @ --mx-rec="10 mail.example.com."

# TXT record
ipa dnsrecord-add example.com @ --txt-rec="v=spf1 mx -all"

# SRV record
ipa dnsrecord-add example.com _http._tcp --srv-rec="10 50 80 web.example.com."

# PTR record (in reverse zone)
ipa dnsrecord-add 1.168.192.in-addr.arpa. 20 --ptr-rec=server1.example.com.
```

### Viewing Records

```bash
# All records in a zone
ipa dnsrecord-find example.com

# Specific record
ipa dnsrecord-show example.com server1
```

### Modifying Records

```bash
ipa dnsrecord-mod example.com server1 --a-rec=192.168.1.25
```

### Deleting Records

```bash
ipa dnsrecord-del example.com server1 --a-rec=192.168.1.20
```

## Configuring DNS Forwarding

### Global Forwarders

```bash
ipa dnsconfig-mod --forwarder=8.8.8.8 --forwarder=8.8.4.4
```

Set the forwarding policy:

```bash
# Forward first, then try to resolve locally
ipa dnsconfig-mod --forward-policy=first

# Forward only (never try local resolution)
ipa dnsconfig-mod --forward-policy=only
```

### Forward Zones

For forwarding specific domains to other DNS servers:

```bash
ipa dnsforwardzone-add ad.example.com \
    --forwarder=10.0.0.1 \
    --forward-policy=only
```

List forward zones:

```bash
ipa dnsforwardzone-find
```

## Configuring DNS for Active Directory Trust

When setting up a trust, add a forward zone for the AD domain:

```bash
ipa dnsforwardzone-add ad.example.com \
    --forwarder=10.0.0.1 \
    --forward-policy=only
```

Add a forward zone for the AD forest root if different:

```bash
ipa dnsforwardzone-add _msdcs.ad.example.com \
    --forwarder=10.0.0.1 \
    --forward-policy=only
```

## Managing DNS Permissions

### Allow Specific Hosts to Update DNS

```bash
ipa dnszone-mod example.com \
    --update-policy="grant EXAMPLE.COM krb5-self * A; grant EXAMPLE.COM krb5-self * AAAA; grant EXAMPLE.COM krb5-self * SSHFP;"
```

## Checking DNS Configuration

### Verify Name Resolution

```bash
dig @idm1.example.com server1.example.com
dig @idm1.example.com -t SRV _ldap._tcp.example.com
dig @idm1.example.com -t SRV _kerberos._tcp.example.com
```

### Verify Reverse Lookup

```bash
dig @idm1.example.com -x 192.168.1.20
```

## Monitoring DNS

Check BIND service status:

```bash
sudo systemctl status named
```

View DNS query logs:

```bash
sudo journalctl -u named -f
```

## Troubleshooting

### Records Not Resolving

```bash
# Check if the record exists in LDAP
ipa dnsrecord-find example.com server1

# Force BIND to reload
sudo rndc reload
```

### Replication Delays

DNS records stored in LDAP replicate with normal LDAP replication. Check replication:

```bash
ipa-replica-manage list
```

### Forwarder Not Working

```bash
# Test the forwarder directly
dig @8.8.8.8 google.com

# Check forward zone configuration
ipa dnsforwardzone-show ad.example.com
```

## Summary

IdM DNS on RHEL 9 provides integrated DNS management that simplifies Kerberos and LDAP service discovery. Manage zones and records through the `ipa` CLI, configure forwarding for external domains and AD integration, and rely on LDAP replication for consistent DNS across all IdM servers. The integrated approach reduces manual DNS administration and ensures service discovery records are always correct.
