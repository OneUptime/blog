# How to Configure DNS Services in IdM on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, IdM, DNS, FreeIPA, BIND, Identity Management, Linux

Description: Learn how to manage DNS zones, records, and forwarding in Red Hat Identity Management (IdM) on RHEL using the integrated DNS service.

---

IdM with integrated DNS runs a BIND DNS server managed through the IdM API. This gives you a single interface for managing both identity and DNS. All DNS changes replicate automatically across IdM replicas.

## Managing DNS Zones

```bash
# Authenticate to IdM
kinit admin

# List existing DNS zones
ipa dnszone-find

# Create a new forward zone
ipa dnszone-add internal.example.com \
  --admin-email=admin@example.com \
  --minimum=3600

# Create a reverse zone
ipa dnszone-add 1.168.192.in-addr.arpa. \
  --admin-email=admin@example.com

# Delete a zone
ipa dnszone-del internal.example.com
```

## Managing DNS Records

```bash
# Add an A record
ipa dnsrecord-add example.com webserver --a-rec=192.168.1.50

# Add a CNAME record
ipa dnsrecord-add example.com www --cname-rec=webserver.example.com.

# Add an MX record
ipa dnsrecord-add example.com @ --mx-preference=10 --mx-exchanger=mail.example.com.

# Add a TXT record (e.g., for SPF)
ipa dnsrecord-add example.com @ --txt-rec="v=spf1 mx -all"

# Add a PTR record (reverse lookup)
ipa dnsrecord-add 1.168.192.in-addr.arpa. 50 --ptr-rec=webserver.example.com.

# List all records in a zone
ipa dnsrecord-find example.com

# Delete a record
ipa dnsrecord-del example.com webserver --a-rec=192.168.1.50
```

## Configuring DNS Forwarding

```bash
# Add a global forwarder
ipa dnsconfig-mod --forwarder=8.8.8.8 --forwarder=8.8.4.4

# Add a forward zone for a specific domain
ipa dnsforwardzone-add partner.com \
  --forwarder=10.0.0.53 \
  --forward-policy=only

# List forward zones
ipa dnsforwardzone-find
```

## Configuring Zone Transfer Policies

```bash
# Allow zone transfers to specific secondary DNS servers
ipa dnszone-mod example.com \
  --allow-transfer="10.0.0.53;10.0.1.53"

# Disable zone transfers (default)
ipa dnszone-mod example.com --allow-transfer="none;"
```

## Enabling Dynamic DNS Updates

```bash
# Allow clients to dynamically update their DNS records
ipa dnszone-mod example.com --dynamic-update=TRUE

# IdM clients can then update their own A/AAAA records
# This is handled automatically during client enrollment
```

## Verifying DNS

```bash
# Test record resolution
dig @idm1.example.com webserver.example.com

# Test reverse lookup
dig @idm1.example.com -x 192.168.1.50

# Check DNS service status
ipactl status | grep named
```

IdM DNS integrates tightly with the identity layer. When you add a host to IdM, DNS records are created automatically. When you remove a host, the records are cleaned up. This reduces the manual DNS management overhead significantly.
