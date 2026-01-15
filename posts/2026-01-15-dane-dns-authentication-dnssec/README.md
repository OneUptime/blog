# How to Implement DANE (DNS-Based Authentication of Named Entities) with DNSSEC

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DNSSEC, DANE, DNS, Security, TLS, Email

Description: A comprehensive guide to implementing DANE with DNSSEC for secure certificate pinning, covering TLSA record configuration, certificate matching types, and practical deployment strategies for web servers and email infrastructure.

---

Traditional TLS relies on hundreds of Certificate Authorities (CAs) that your browser or mail client trusts by default. If any one of them issues a rogue certificate for your domain, attackers can intercept traffic without triggering warnings. DANE (DNS-Based Authentication of Named Entities) fixes this by letting you publish your certificate fingerprints directly in DNS, protected by DNSSEC. No compromised CA can forge your DNS records if your zone is properly signed.

## Why DANE Matters

The CA ecosystem has a fundamental trust problem: over 150 root CAs can issue certificates for any domain. High-profile breaches at DigiNotar, Comodo, and others have shown that certificate misissuance is not theoretical. Certificate Transparency logs help detect rogue certs after the fact, but DANE prevents them from working in the first place.

With DANE:

- **You control the trust anchor.** Your TLSA records specify exactly which certificates are valid for your domain.
- **DNSSEC provides cryptographic proof.** Resolvers can verify that TLSA records have not been tampered with.
- **Opportunistic encryption becomes authenticated.** SMTP servers can verify peer certificates without relying on the CA system.
- **No external dependencies.** You do not need to trust a third-party pinning service or wait for browser vendors to ship HPKP (now deprecated).

## Prerequisites

Before implementing DANE, you need:

1. **DNSSEC-signed zone.** Your authoritative DNS servers must sign your zone with DNSSEC keys.
2. **Valid TLS certificates.** You need working certificates from any CA (Let's Encrypt, commercial, or self-signed for internal use).
3. **DNS control.** You must be able to add TLSA records to your zone.
4. **DNSSEC-validating resolvers.** Clients must use resolvers that validate DNSSEC (most major ISPs and public resolvers like 1.1.1.1, 8.8.8.8, and 9.9.9.9 do).

## TLSA Record Anatomy

DANE uses TLSA (Transport Layer Security Authentication) records to publish certificate information. A TLSA record has four fields:

```
_port._protocol.hostname. IN TLSA usage selector matching-type certificate-data
```

### Example TLSA Record

```
_443._tcp.www.example.com. IN TLSA 3 1 1 a9b42f8e...
```

Let us break down each component:

### Usage Field (Certificate Usage)

| Value | Name | Description |
| --- | --- | --- |
| 0 | PKIX-TA | CA constraint: certificate must chain to the specified CA |
| 1 | PKIX-EE | Service certificate constraint: end entity must match and chain to a trusted CA |
| 2 | DANE-TA | Trust anchor assertion: specified certificate is the trust anchor (no PKIX validation) |
| 3 | DANE-EE | Domain-issued certificate: end entity must match (no PKIX validation required) |

**Recommendation:** Use `3` (DANE-EE) for most deployments. It provides the strongest security by removing CA dependency entirely. The certificate in the TLSA record is the only valid certificate, regardless of CA signatures.

### Selector Field

| Value | Name | Description |
| --- | --- | --- |
| 0 | Full certificate | Match against the entire DER-encoded certificate |
| 1 | SubjectPublicKeyInfo | Match against only the public key (SPKI) |

**Recommendation:** Use `1` (SPKI) because it survives certificate renewal. When you renew your certificate with the same key pair, the TLSA record remains valid. Using `0` requires updating DNS records with every certificate change.

### Matching Type Field

| Value | Name | Description |
| --- | --- | --- |
| 0 | Exact match | Full data stored in the record |
| 1 | SHA-256 hash | SHA-256 hash of the selected data |
| 2 | SHA-512 hash | SHA-512 hash of the selected data |

**Recommendation:** Use `1` (SHA-256) for a good balance of security and record size. SHA-512 offers more bits but is rarely necessary, and exact match makes records unwieldy.

## Generating TLSA Records

### Method 1: Using OpenSSL

Extract the SPKI hash from your certificate:

```bash
# For a certificate file
openssl x509 -in certificate.pem -pubkey -noout | \
  openssl pkey -pubin -outform DER | \
  openssl dgst -sha256 -binary | \
  xxd -p -c 256

# For a live server
echo | openssl s_client -connect www.example.com:443 2>/dev/null | \
  openssl x509 -pubkey -noout | \
  openssl pkey -pubin -outform DER | \
  openssl dgst -sha256 -binary | \
  xxd -p -c 256
```

### Method 2: Using the `tlsa` Command

Many systems include the `tlsa` utility from the ldns package:

```bash
# Install on Debian/Ubuntu
apt-get install ldnsutils

# Generate TLSA record
ldns-dane create www.example.com 443 tcp
```

### Method 3: Using hash-slinger

The `hash-slinger` package provides `tlsa` command for generating records:

```bash
# Install on RHEL/CentOS/Fedora
dnf install hash-slinger

# Generate TLSA record from certificate file
tlsa --create --certificate /etc/letsencrypt/live/example.com/cert.pem \
     --port 443 --protocol tcp --host www.example.com

# Generate from live server
tlsa --create --port 443 --protocol tcp --host www.example.com
```

### Method 4: Manual Generation Script

Create a reusable script for generating TLSA records:

```bash
#!/bin/bash
# generate-tlsa.sh - Generate TLSA records for DANE

DOMAIN="${1:?Usage: $0 domain [port] [protocol]}"
PORT="${2:-443}"
PROTO="${3:-tcp}"

# Usage: 3 (DANE-EE)
# Selector: 1 (SPKI)
# Matching Type: 1 (SHA-256)

HASH=$(echo | openssl s_client -connect "${DOMAIN}:${PORT}" 2>/dev/null | \
       openssl x509 -pubkey -noout 2>/dev/null | \
       openssl pkey -pubin -outform DER 2>/dev/null | \
       openssl dgst -sha256 -binary | \
       xxd -p -c 256)

if [ -z "$HASH" ]; then
    echo "Error: Could not connect to ${DOMAIN}:${PORT}" >&2
    exit 1
fi

echo "_${PORT}._${PROTO}.${DOMAIN}. IN TLSA 3 1 1 ${HASH}"
```

Usage:

```bash
chmod +x generate-tlsa.sh
./generate-tlsa.sh www.example.com
./generate-tlsa.sh mail.example.com 25 tcp
./generate-tlsa.sh mail.example.com 587 tcp
```

## Setting Up DNSSEC

DANE without DNSSEC is useless-attackers who can modify DNS responses can simply replace your TLSA records. You must sign your zone before adding TLSA records.

### Option 1: Managed DNS with DNSSEC

Most managed DNS providers support DNSSEC with one-click activation:

| Provider | DNSSEC Support | Notes |
| --- | --- | --- |
| Cloudflare | Yes, automatic | One-click enable, DS record provided |
| AWS Route 53 | Yes | Manual key management or automatic |
| Google Cloud DNS | Yes | Automatic signing available |
| DNSimple | Yes | Managed signing |
| NS1 | Yes | Enterprise feature |
| Hetzner DNS | Yes | Free with hosting |

**Cloudflare example:**

1. Navigate to DNS > Settings
2. Enable DNSSEC
3. Copy the DS record details
4. Add DS record at your registrar

### Option 2: Self-Hosted BIND with DNSSEC

For self-hosted authoritative servers using BIND 9:

```bash
# Generate Zone Signing Key (ZSK)
dnssec-keygen -a ECDSAP256SHA256 -n ZONE example.com

# Generate Key Signing Key (KSK)
dnssec-keygen -a ECDSAP256SHA256 -n ZONE -f KSK example.com

# Sign the zone
dnssec-signzone -A -3 $(head -c 16 /dev/urandom | xxd -p) \
                -N INCREMENT -o example.com -t example.com.zone
```

Configure BIND to use the signed zone:

```
// named.conf
zone "example.com" {
    type master;
    file "/var/named/example.com.zone.signed";
    key-directory "/var/named/keys";
    auto-dnssec maintain;
    inline-signing yes;
};
```

### Option 3: PowerDNS with DNSSEC

PowerDNS makes DNSSEC straightforward:

```bash
# Enable DNSSEC for zone
pdnsutil secure-zone example.com

# Show DS records to add at registrar
pdnsutil show-zone example.com

# Add TSIG key for dynamic updates if needed
pdnsutil activate-tsig-key example.com mykey master
```

### Verifying DNSSEC

Check that your zone is properly signed:

```bash
# Using dig
dig +dnssec example.com SOA

# Using delv (DNSSEC-aware lookup)
delv @8.8.8.8 example.com SOA +rtrace

# Using drill
drill -TD example.com

# Online tools
# - https://dnssec-analyzer.verisignlabs.com/
# - https://dnsviz.net/
```

Expected output shows `ad` (Authenticated Data) flag:

```
;; flags: qr rd ra ad; QUERY: 1, ANSWER: 2, AUTHORITY: 0, ADDITIONAL: 1
```

## Adding TLSA Records

Once DNSSEC is active, add your TLSA records.

### BIND Zone File

```
; TLSA records for HTTPS
_443._tcp.www.example.com. 3600 IN TLSA 3 1 1 (
    a9b42f8e1d3c4b5a6789012345678901234567890abcdef0123456789abcdef0
)

; TLSA records for SMTP (MTA-to-MTA)
_25._tcp.mail.example.com. 3600 IN TLSA 3 1 1 (
    b8c51f9e2d4c5b6a7890123456789012345678901bcdef01234567890bcdef01
)

; TLSA records for submission (client-to-server)
_587._tcp.mail.example.com. 3600 IN TLSA 3 1 1 (
    b8c51f9e2d4c5b6a7890123456789012345678901bcdef01234567890bcdef01
)

; TLSA records for IMAPS
_993._tcp.mail.example.com. 3600 IN TLSA 3 1 1 (
    b8c51f9e2d4c5b6a7890123456789012345678901bcdef01234567890bcdef01
)
```

### Cloudflare Dashboard

1. Go to DNS > Records
2. Add record:
   - Type: TLSA
   - Name: `_443._tcp.www`
   - Usage: 3
   - Selector: 1
   - Matching Type: 1
   - Certificate: (paste hash)

### AWS Route 53 CLI

```bash
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "_443._tcp.www.example.com",
        "Type": "TLSA",
        "TTL": 3600,
        "ResourceRecords": [{
          "Value": "3 1 1 a9b42f8e1d3c4b5a6789012345678901234567890abcdef0123456789abcdef0"
        }]
      }
    }]
  }'
```

### PowerDNS

```bash
pdnsutil add-record example.com _443._tcp.www TLSA 3600 \
  "3 1 1 a9b42f8e1d3c4b5a6789012345678901234567890abcdef0123456789abcdef0"
```

## Verifying DANE Configuration

### Using dig

```bash
# Query TLSA record
dig +dnssec TLSA _443._tcp.www.example.com

# Should return the record with RRSIG
;; ANSWER SECTION:
_443._tcp.www.example.com. 3600 IN TLSA 3 1 1 a9b42f8e...
_443._tcp.www.example.com. 3600 IN RRSIG TLSA 13 5 3600 ...
```

### Using openssl with DANE

OpenSSL 1.1.0+ supports DANE verification:

```bash
# Verify DANE for HTTPS
openssl s_client -connect www.example.com:443 \
  -dane_tlsa_domain www.example.com \
  -dane_tlsa_rrdata "3 1 1 a9b42f8e..."

# Check DANE status in output
# Look for: "Verified peername: www.example.com"
# and: "DANE TLSA 3 1 1 ... matched EE certificate"
```

### Using ldns-dane

```bash
# Verify DANE for a server
ldns-dane verify www.example.com 443 tcp

# Should output: "TLSA record matches server certificate"
```

### Using danetool (GnuTLS)

```bash
# Check DANE records
danetool --check www.example.com --port 443

# Generate TLSA from server
danetool --tlsa-rr --host www.example.com --port 443
```

### Online Verification Tools

- **Hardenize:** https://www.hardenize.com/
- **Internet.nl:** https://internet.nl/
- **DANE SMTP Validator:** https://dane.sys4.de/
- **Immuniweb:** https://www.immuniweb.com/ssl/

## DANE for Email (SMTP)

Email is where DANE provides the most practical security improvement. SMTP STARTTLS is opportunistic by default-attackers can strip encryption by manipulating the initial handshake. With DANE, receiving servers publish TLSA records, and sending servers refuse to deliver over unencrypted or wrongly-certified connections.

### MTA-STS vs DANE

| Feature | MTA-STS | DANE |
| --- | --- | --- |
| Requires DNSSEC | No | Yes |
| Certificate pinning | No (policy-based) | Yes (TLSA records) |
| First-use vulnerability | Yes (TOFU) | No |
| Browser support | N/A | N/A |
| Email support | Growing | Growing |
| Deployment complexity | Low | Medium |

**Recommendation:** Implement both. MTA-STS catches senders that do not support DANE, and DANE provides stronger guarantees for those that do.

### Postfix DANE Configuration

Configure Postfix to use DANE for outbound connections:

```bash
# /etc/postfix/main.cf

# Enable DANE for outbound
smtp_tls_security_level = dane
smtp_dns_support_level = dnssec

# Logging for debugging
smtp_tls_loglevel = 1

# Enable DANE for specific destinations (optional)
smtp_tls_policy_maps = hash:/etc/postfix/tls_policy
```

Create the policy map for explicit DANE enforcement:

```bash
# /etc/postfix/tls_policy
# Force DANE for specific domains
example.com     dane-only
example.org     dane-only

# Fallback to encrypt for domains without DANE
.               encrypt
```

Rebuild and reload:

```bash
postmap /etc/postfix/tls_policy
systemctl reload postfix
```

### Exim DANE Configuration

```
# /etc/exim4/exim4.conf.template

# Enable DNSSEC
dns_dnssec_ok = 1

# Remote SMTP transport with DANE
remote_smtp:
  driver = smtp
  dnssec_request_domains = *
  hosts_try_dane = *
  tls_verify_certificates = system
```

### DANE TLSA Records for Email

Publish TLSA records for all email-related ports:

```
; Port 25 - MTA-to-MTA SMTP
_25._tcp.mail.example.com. 3600 IN TLSA 3 1 1 (hash)

; Port 465 - SMTPS (implicit TLS)
_465._tcp.mail.example.com. 3600 IN TLSA 3 1 1 (hash)

; Port 587 - Submission (STARTTLS)
_587._tcp.mail.example.com. 3600 IN TLSA 3 1 1 (hash)

; Port 993 - IMAPS
_993._tcp.mail.example.com. 3600 IN TLSA 3 1 1 (hash)

; Port 995 - POP3S
_995._tcp.mail.example.com. 3600 IN TLSA 3 1 1 (hash)
```

### Testing Email DANE

```bash
# Check if a domain publishes DANE for email
dig +short TLSA _25._tcp.mail.example.com

# Use swaks to test DANE-enabled delivery
swaks --to test@example.com \
      --from sender@yourdomain.com \
      --server mail.example.com \
      --tls \
      --tls-verify

# Check DANE status with openssl
openssl s_client -connect mail.example.com:25 \
  -starttls smtp \
  -dane_tlsa_domain mail.example.com \
  -dane_tlsa_rrdata "3 1 1 ..."
```

## Certificate Pinning Strategies

### Strategy 1: Pin the End Entity Certificate (DANE-EE)

Usage `3` pins your exact certificate. This is the strongest but requires DNS updates when certificates change:

```
_443._tcp.www.example.com. IN TLSA 3 1 1 (current-cert-hash)
```

**Key rotation workflow:**

1. Generate new certificate with new key pair
2. Add second TLSA record with new hash (keep old one)
3. Deploy new certificate to server
4. Wait for DNS TTL to expire globally
5. Remove old TLSA record

### Strategy 2: Pin the Public Key (DANE-EE with SPKI)

Usage `3` with selector `1` pins only the public key. You can renew certificates freely as long as you keep the same key pair:

```
_443._tcp.www.example.com. IN TLSA 3 1 1 (spki-hash)
```

**Pros:** No DNS changes on routine certificate renewal
**Cons:** Key compromise requires DNS update; some argue rotating keys with each cert is better hygiene

### Strategy 3: Pin the CA (DANE-TA or PKIX-TA)

Usage `2` pins a CA certificate as the trust anchor. Any certificate issued by that CA (and chaining to it) is valid:

```
_443._tcp.www.example.com. IN TLSA 2 0 1 (ca-cert-hash)
```

**Use case:** Organizations that run their own CA or have a long-term relationship with a specific CA.

### Strategy 4: Backup Pins

Publish multiple TLSA records with different certificates or keys. This provides rollover capability and disaster recovery:

```
; Primary certificate
_443._tcp.www.example.com. IN TLSA 3 1 1 (primary-hash)

; Backup certificate (different key pair, stored offline)
_443._tcp.www.example.com. IN TLSA 3 1 1 (backup-hash)
```

## Automating DANE with Let's Encrypt

Let's Encrypt certificates renew every 60-90 days. Automating TLSA record updates is essential for DANE-EE with full certificate matching.

### Using acme.sh with DNS API

```bash
# Install acme.sh
curl https://get.acme.sh | sh

# Issue certificate with DNS-01 challenge (Cloudflare example)
export CF_Token="your-cloudflare-api-token"
export CF_Zone_ID="your-zone-id"

acme.sh --issue -d www.example.com \
        --dns dns_cf \
        --post-hook "/usr/local/bin/update-tlsa.sh"
```

### TLSA Update Script

```bash
#!/bin/bash
# /usr/local/bin/update-tlsa.sh
# Update TLSA records after certificate renewal

DOMAIN="www.example.com"
CERT_PATH="/root/.acme.sh/${DOMAIN}/${DOMAIN}.cer"
CF_TOKEN="your-cloudflare-api-token"
CF_ZONE_ID="your-zone-id"

# Generate new TLSA hash (SPKI, SHA-256)
NEW_HASH=$(openssl x509 -in "$CERT_PATH" -pubkey -noout | \
           openssl pkey -pubin -outform DER | \
           openssl dgst -sha256 -binary | \
           xxd -p -c 256)

# Get existing TLSA record ID from Cloudflare
RECORD_ID=$(curl -s -X GET \
  "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records?type=TLSA&name=_443._tcp.${DOMAIN}" \
  -H "Authorization: Bearer ${CF_TOKEN}" \
  -H "Content-Type: application/json" | \
  jq -r '.result[0].id')

# Update TLSA record
curl -s -X PUT \
  "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records/${RECORD_ID}" \
  -H "Authorization: Bearer ${CF_TOKEN}" \
  -H "Content-Type: application/json" \
  --data "{
    \"type\": \"TLSA\",
    \"name\": \"_443._tcp.${DOMAIN}\",
    \"data\": {
      \"usage\": 3,
      \"selector\": 1,
      \"matching_type\": 1,
      \"certificate\": \"${NEW_HASH}\"
    },
    \"ttl\": 3600
  }"

echo "TLSA record updated for ${DOMAIN}"
```

### Key Reuse Strategy (Preferred)

To avoid constant TLSA updates, reuse your private key during renewals:

```bash
# Generate a long-lived key pair
openssl ecparam -genkey -name prime256v1 -out /etc/ssl/private/example.com.key

# Issue certificate with existing key
acme.sh --issue -d www.example.com \
        --dns dns_cf \
        --keylength ec-256 \
        --reuse-key

# TLSA record only needs to be set once (SPKI never changes)
```

## Web Server Configuration

### Nginx with DANE Considerations

While Nginx does not directly implement DANE (it is a client-side feature), ensure your TLS configuration is compatible:

```nginx
server {
    listen 443 ssl http2;
    server_name www.example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    # Strong TLS configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # OCSP stapling (helps clients verify certificate status)
    ssl_stapling on;
    ssl_stapling_verify on;
    ssl_trusted_certificate /etc/letsencrypt/live/example.com/chain.pem;
    resolver 1.1.1.1 8.8.8.8 valid=300s;
    resolver_timeout 5s;

    # Security headers
    add_header Strict-Transport-Security "max-age=63072000" always;
}
```

### Apache with DANE Considerations

```apache
<VirtualHost *:443>
    ServerName www.example.com

    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/example.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/example.com/privkey.pem

    # Modern TLS configuration
    SSLProtocol all -SSLv3 -TLSv1 -TLSv1.1
    SSLCipherSuite ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256
    SSLHonorCipherOrder off

    # OCSP stapling
    SSLUseStapling on
    SSLStaplingResponderTimeout 5
    SSLStaplingReturnResponderErrors off

    Header always set Strict-Transport-Security "max-age=63072000"
</VirtualHost>

SSLStaplingCache shmcb:/var/run/ocsp(128000)
```

## Monitoring DANE Health

### Using OneUptime for DANE Monitoring

Monitor your DANE configuration with custom health checks:

```bash
#!/bin/bash
# dane-health-check.sh
# Returns exit code 0 if DANE is valid, 1 if not

DOMAIN="${1:?Usage: $0 domain port}"
PORT="${2:-443}"

# Check DNSSEC validation
DNSSEC_STATUS=$(dig +dnssec +short "${DOMAIN}" A | grep -c "RRSIG")
if [ "$DNSSEC_STATUS" -eq 0 ]; then
    echo "CRITICAL: DNSSEC not validated for ${DOMAIN}"
    exit 1
fi

# Check TLSA record exists
TLSA_RECORD=$(dig +short TLSA "_${PORT}._tcp.${DOMAIN}")
if [ -z "$TLSA_RECORD" ]; then
    echo "CRITICAL: No TLSA record for _${PORT}._tcp.${DOMAIN}"
    exit 1
fi

# Verify DANE matches server certificate
DANE_CHECK=$(ldns-dane verify "${DOMAIN}" "${PORT}" tcp 2>&1)
if echo "$DANE_CHECK" | grep -q "matches"; then
    echo "OK: DANE verification passed for ${DOMAIN}:${PORT}"
    exit 0
else
    echo "CRITICAL: DANE verification failed - ${DANE_CHECK}"
    exit 1
fi
```

### Prometheus Metrics

Export DANE status as Prometheus metrics:

```yaml
# prometheus-dane-exporter config
targets:
  - domain: www.example.com
    port: 443
  - domain: mail.example.com
    port: 25
  - domain: mail.example.com
    port: 587

metrics:
  - name: dane_valid
    help: "DANE validation status (1=valid, 0=invalid)"
  - name: dane_tlsa_records
    help: "Number of TLSA records published"
  - name: dane_certificate_expiry_days
    help: "Days until certificate expires"
```

### Alert Rules

```yaml
# alertmanager rules
groups:
  - name: dane
    rules:
      - alert: DANEValidationFailed
        expr: dane_valid == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "DANE validation failed for {{ $labels.domain }}"

      - alert: TLSARecordMissing
        expr: dane_tlsa_records == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "No TLSA records for {{ $labels.domain }}"

      - alert: CertificateExpiringSoon
        expr: dane_certificate_expiry_days < 14
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "Certificate for {{ $labels.domain }} expires in {{ $value }} days"
```

## Troubleshooting Common Issues

### Issue 1: TLSA Record Not Resolving

**Symptoms:** `dig TLSA _443._tcp.www.example.com` returns no answer

**Causes:**
- Record not published
- DNS propagation delay
- DNSSEC validation failure upstream

**Solutions:**

```bash
# Check authoritative server directly
dig @ns1.example.com TLSA _443._tcp.www.example.com

# Check DNSSEC chain
delv @8.8.8.8 TLSA _443._tcp.www.example.com +rtrace

# Verify DS record at registrar
dig DS example.com
```

### Issue 2: DANE Verification Fails Despite Valid TLSA

**Symptoms:** `ldns-dane verify` fails but TLSA record looks correct

**Causes:**
- Certificate changed but TLSA not updated
- Hash mismatch (selector/matching type wrong)
- Intermediate certificate issues

**Solutions:**

```bash
# Regenerate hash from current certificate
echo | openssl s_client -connect www.example.com:443 2>/dev/null | \
  openssl x509 -pubkey -noout | \
  openssl pkey -pubin -outform DER | \
  openssl dgst -sha256 -binary | \
  xxd -p -c 256

# Compare with published TLSA
dig +short TLSA _443._tcp.www.example.com

# Check certificate chain
openssl s_client -connect www.example.com:443 -showcerts
```

### Issue 3: Email Delivery Fails with DANE

**Symptoms:** Sending servers reject delivery; logs show DANE failures

**Causes:**
- TLSA record for wrong port
- Certificate mismatch
- STARTTLS not offered on port 25

**Solutions:**

```bash
# Check STARTTLS is advertised
openssl s_client -connect mail.example.com:25 -starttls smtp

# Verify TLSA for port 25
dig +short TLSA _25._tcp.mail.example.com

# Check sender logs for specific error
# Look for "DANE" in mail logs
```

### Issue 4: DNSSEC Validation Fails

**Symptoms:** `ad` flag missing from DNS responses

**Causes:**
- DS record not at registrar
- Key rollover issues
- Signature expired

**Solutions:**

```bash
# Check DNSKEY and RRSIG
dig +dnssec DNSKEY example.com
dig +dnssec SOA example.com

# Verify DS at parent
dig DS example.com @$(dig +short NS com. | head -1)

# Use DNSViz for visual debugging
# https://dnsviz.net/d/example.com/analyze/
```

## Security Considerations

### DNSSEC Key Management

- **ZSK rotation:** Rotate Zone Signing Keys every 1-3 months
- **KSK rotation:** Rotate Key Signing Keys annually
- **Algorithm migration:** Plan upgrades (e.g., RSA to ECDSA) during low-traffic periods
- **Key backup:** Store offline copies of KSK private keys

### TLSA Record TTL

Choose TTL carefully:

| TTL | Pros | Cons |
| --- | --- | --- |
| Short (300s) | Fast rollover, quick fixes | More DNS queries, higher load |
| Medium (3600s) | Balanced approach | Reasonable rollover time |
| Long (86400s) | Fewer queries, better caching | Slow rollover, long outages if wrong |

**Recommendation:** Use 3600 seconds (1 hour) for production. Use shorter TTLs during certificate transitions.

### Backup and Disaster Recovery

1. **Pre-generate backup keys:** Create and store backup key pairs; publish backup TLSA records
2. **Document rollback procedures:** Know how to quickly remove DANE if it causes issues
3. **Monitor certificate expiry:** Alert well before expiration to update TLSA records
4. **Test in staging:** Validate DANE changes in a staging environment first

## DANE Adoption Status

### Browser Support

As of 2026, native browser support for DANE remains limited:

| Browser | DANE Support |
| --- | --- |
| Firefox | Via extension (DNSSEC/TLSA Validator) |
| Chrome | No native support |
| Safari | No native support |
| Edge | No native support |

**Note:** Browser vendors have been slow to adopt DANE partly due to the WebPKI investments and partly because DNSSEC deployment is not universal. However, DANE excels in server-to-server communication (email, APIs).

### Email Provider Support

| Provider | DANE Support (Sending) | DANE Support (Receiving) |
| --- | --- | --- |
| Gmail | Yes | Yes |
| Microsoft 365 | Yes | Yes |
| Proton Mail | Yes | Yes |
| Fastmail | Yes | Yes |
| Mailgun | Yes | Configurable |
| Postmark | Partial | No |

### DNS Provider Support

Most major DNS providers now support TLSA records and DNSSEC:

- Cloudflare, AWS Route 53, Google Cloud DNS, Azure DNS
- DNSimple, NS1, Hetzner, OVH
- PowerDNS, BIND 9, Knot DNS (self-hosted)

## Summary Table

| Component | Recommendation | Notes |
| --- | --- | --- |
| **TLSA Usage** | 3 (DANE-EE) | Strongest security, no CA dependency |
| **TLSA Selector** | 1 (SPKI) | Survives certificate renewal |
| **TLSA Matching Type** | 1 (SHA-256) | Good balance of security and size |
| **DNSSEC Algorithm** | ECDSAP256SHA256 | Modern, efficient, widely supported |
| **TLSA TTL** | 3600 seconds | Balance between caching and rollover |
| **Key Rotation** | ZSK: monthly, KSK: yearly | Document and automate |
| **Backup Keys** | At least 1 backup TLSA | Pre-generate and publish |
| **Monitoring** | DNS + certificate + DANE | Alert on expiry and validation failures |
| **Email** | Implement with MTA-STS | Defense in depth |

## Conclusion

DANE with DNSSEC shifts certificate trust from the CA ecosystem to your own DNS infrastructure. This eliminates entire classes of attacks where compromised or malicious CAs issue fraudulent certificates. For email infrastructure, DANE is particularly powerful-it transforms opportunistic encryption into authenticated encryption without relying on TOFU (Trust On First Use) models.

Implementation requires:

1. **DNSSEC-signed zones** with proper key management
2. **TLSA records** for each TLS-enabled service
3. **Automation** for certificate renewals and TLSA updates
4. **Monitoring** to catch misconfigurations before they cause outages

The investment pays off in reduced attack surface, compliance with security frameworks that recognize DANE, and being prepared for a future where DNS-based security is the norm rather than the exception.

Start with email-DANE provides immediate, measurable security improvements there. Then expand to web services as tooling matures. Your DNS infrastructure becomes your trust anchor, and that is infrastructure you control.
