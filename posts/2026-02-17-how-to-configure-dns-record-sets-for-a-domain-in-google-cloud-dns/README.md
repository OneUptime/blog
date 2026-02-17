# How to Configure DNS Record Sets for a Domain in Google Cloud DNS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud DNS, DNS Records, Domain Configuration, Networking

Description: A comprehensive guide to configuring DNS record sets in Google Cloud DNS, covering A, AAAA, CNAME, MX, TXT, SRV, and other record types with practical examples.

---

Once you have a managed DNS zone set up in Google Cloud DNS, the next step is adding the records that actually make your domain work. Every subdomain, email configuration, service verification, and SSL certificate validation relies on DNS records. Getting them right is essential - a wrong MX record means no email, a wrong A record means your site is unreachable, and a missing TXT record means you cannot verify domain ownership for third-party services.

This post covers every common DNS record type you will encounter, with practical examples and tips for each one.

## DNS Record Basics

A DNS record set consists of:
- **Name**: The fully qualified domain name (e.g., `www.example.com.`)
- **Type**: The record type (A, CNAME, MX, etc.)
- **TTL**: Time to live - how long resolvers should cache the record (in seconds)
- **Data**: The record value (IP address, domain name, text, etc.)

All names in Cloud DNS must end with a trailing dot, which indicates the root of the DNS hierarchy.

## A Records - IPv4 Addresses

A records map a domain name to an IPv4 address. This is the most fundamental record type.

```bash
# Point the root domain to a single IP
gcloud dns record-sets create example.com. \
    --zone=my-zone \
    --type=A \
    --ttl=300 \
    --rrdatas="203.0.113.10"

# Point a subdomain to an IP
gcloud dns record-sets create app.example.com. \
    --zone=my-zone \
    --type=A \
    --ttl=300 \
    --rrdatas="203.0.113.20"

# Multiple IPs for round-robin DNS load balancing
gcloud dns record-sets create web.example.com. \
    --zone=my-zone \
    --type=A \
    --ttl=300 \
    --rrdatas="203.0.113.10,203.0.113.11,203.0.113.12"
```

With multiple IPs, DNS resolvers return all addresses but may rotate the order, providing basic load distribution.

## AAAA Records - IPv6 Addresses

AAAA records are the IPv6 equivalent of A records:

```bash
# Create an AAAA record for IPv6 connectivity
gcloud dns record-sets create example.com. \
    --zone=my-zone \
    --type=AAAA \
    --ttl=300 \
    --rrdatas="2001:db8::1"

# Multiple IPv6 addresses
gcloud dns record-sets create web.example.com. \
    --zone=my-zone \
    --type=AAAA \
    --ttl=300 \
    --rrdatas="2001:db8::1,2001:db8::2"
```

## CNAME Records - Canonical Name Aliases

CNAME records point one domain name to another. The DNS resolver follows the chain to find the final IP address.

```bash
# Point www to the root domain
gcloud dns record-sets create www.example.com. \
    --zone=my-zone \
    --type=CNAME \
    --ttl=300 \
    --rrdatas="example.com."

# Point a service subdomain to a cloud provider hostname
gcloud dns record-sets create blog.example.com. \
    --zone=my-zone \
    --type=CNAME \
    --ttl=300 \
    --rrdatas="my-blog.netlify.app."

# Point to a load balancer DNS name
gcloud dns record-sets create api.example.com. \
    --zone=my-zone \
    --type=CNAME \
    --ttl=300 \
    --rrdatas="my-service-abc123-uc.a.run.app."
```

Important CNAME restrictions:
- You cannot create a CNAME at the zone apex (e.g., `example.com.` cannot be a CNAME)
- CNAME records cannot coexist with other record types for the same name
- Use A records for the root domain and CNAME for subdomains

## MX Records - Mail Exchange

MX records tell other mail servers where to deliver email for your domain:

```bash
# Configure Google Workspace mail servers
gcloud dns record-sets create example.com. \
    --zone=my-zone \
    --type=MX \
    --ttl=3600 \
    --rrdatas="1 aspmx.l.google.com.,5 alt1.aspmx.l.google.com.,5 alt2.aspmx.l.google.com.,10 alt3.aspmx.l.google.com.,10 alt4.aspmx.l.google.com."
```

The number before each server is the priority (lower = higher priority). Mail servers try the lowest number first and fall back to higher numbers if the preferred server is unavailable.

For Microsoft 365:

```bash
# Configure Microsoft 365 mail servers
gcloud dns record-sets create example.com. \
    --zone=my-zone \
    --type=MX \
    --ttl=3600 \
    --rrdatas="0 example-com.mail.protection.outlook.com."
```

## TXT Records - Text Records

TXT records hold arbitrary text. They are used for domain verification, email security (SPF, DKIM, DMARC), and more.

### SPF (Sender Policy Framework)

SPF tells receiving mail servers which IP addresses are authorized to send email for your domain:

```bash
# SPF record for Google Workspace
gcloud dns record-sets create example.com. \
    --zone=my-zone \
    --type=TXT \
    --ttl=300 \
    --rrdatas='"v=spf1 include:_spf.google.com ~all"'
```

### DKIM (DomainKeys Identified Mail)

DKIM adds cryptographic signatures to outgoing emails:

```bash
# DKIM record (the value comes from your email provider)
gcloud dns record-sets create google._domainkey.example.com. \
    --zone=my-zone \
    --type=TXT \
    --ttl=300 \
    --rrdatas='"v=DKIM1; k=rsa; p=MIIBIjANBgkqh..."'
```

### DMARC (Domain-based Message Authentication)

DMARC builds on SPF and DKIM to define how to handle authentication failures:

```bash
# DMARC record with reporting
gcloud dns record-sets create _dmarc.example.com. \
    --zone=my-zone \
    --type=TXT \
    --ttl=300 \
    --rrdatas='"v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@example.com; pct=100"'
```

### Domain Verification

Many third-party services require TXT records for verification:

```bash
# Google Search Console verification
gcloud dns record-sets create example.com. \
    --zone=my-zone \
    --type=TXT \
    --ttl=300 \
    --rrdatas='"google-site-verification=abc123xyz"'
```

Multiple TXT records can exist for the same name. To add another TXT record to an existing name, you need to update the existing record set to include both values:

```bash
# Update an existing TXT record to add additional values
gcloud dns record-sets update example.com. \
    --zone=my-zone \
    --type=TXT \
    --ttl=300 \
    --rrdatas='"v=spf1 include:_spf.google.com ~all"','"google-site-verification=abc123xyz"'
```

## SRV Records - Service Locator

SRV records specify the location of servers for specific services:

```bash
# SRV record for a SIP service
gcloud dns record-sets create _sip._tcp.example.com. \
    --zone=my-zone \
    --type=SRV \
    --ttl=300 \
    --rrdatas="10 60 5060 sip.example.com."
```

The format is: `priority weight port target`. This is commonly used for SIP, XMPP, LDAP, and Minecraft servers.

## CAA Records - Certificate Authority Authorization

CAA records specify which certificate authorities are allowed to issue SSL certificates for your domain:

```bash
# Allow only Google and Let's Encrypt to issue certificates
gcloud dns record-sets create example.com. \
    --zone=my-zone \
    --type=CAA \
    --ttl=3600 \
    --rrdatas='0 issue "pki.goog"','0 issue "letsencrypt.org"','0 iodef "mailto:security@example.com"'
```

## NS Records - Name Server Delegation

NS records delegate a subdomain to different name servers. This is useful for split DNS or delegating subdomains to other teams:

```bash
# Delegate a subdomain to different name servers
gcloud dns record-sets create dev.example.com. \
    --zone=my-zone \
    --type=NS \
    --ttl=300 \
    --rrdatas="ns1.dev-team-dns.com.,ns2.dev-team-dns.com."
```

## Updating Existing Records

To modify an existing record:

```bash
# Update an A record to point to a new IP
gcloud dns record-sets update app.example.com. \
    --zone=my-zone \
    --type=A \
    --ttl=300 \
    --rrdatas="203.0.113.99"
```

## Deleting Records

```bash
# Delete a record set
gcloud dns record-sets delete old-app.example.com. \
    --zone=my-zone \
    --type=A
```

## Listing All Records

```bash
# List all record sets in the zone
gcloud dns record-sets list --zone=my-zone

# Filter by record type
gcloud dns record-sets list --zone=my-zone --filter="type=A"

# Filter by name
gcloud dns record-sets list --zone=my-zone --filter="name=app.example.com."
```

## Bulk Operations with Transactions

For applying multiple changes atomically:

```bash
# Start a transaction
gcloud dns record-sets transaction start --zone=my-zone

# Queue up changes
gcloud dns record-sets transaction add \
    --zone=my-zone --name="new-service.example.com." \
    --type=A --ttl=300 "203.0.113.50"

gcloud dns record-sets transaction remove \
    --zone=my-zone --name="old-service.example.com." \
    --type=A --ttl=300 "203.0.113.40"

# Apply all changes at once
gcloud dns record-sets transaction execute --zone=my-zone
```

## TTL Best Practices

Choose TTL values based on how often the record changes:

| Scenario | Recommended TTL |
|----------|----------------|
| During migration/changes | 60-300 seconds |
| Normal operation, may change | 300-3600 seconds |
| Stable records (MX, NS) | 3600-86400 seconds |
| Rarely changing records | 86400 seconds (24 hours) |

Lower TTLs mean changes propagate faster but generate more DNS queries. Higher TTLs reduce query volume but take longer to propagate changes.

## Wrapping Up

DNS record management in Google Cloud DNS is straightforward once you understand the record types and their formats. The key things to remember: always use trailing dots on domain names, use transactions for bulk changes, set appropriate TTLs based on how often records change, and be careful with TXT records that need special quoting. With these fundamentals in place, you can manage DNS for domains of any size and complexity.
