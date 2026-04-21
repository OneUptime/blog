# How to Handle SSL Certificates for IPv6-Only Servers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SSL, TLS, IPv6, Certificate, Let's Encrypt, SAN, Security

Description: Learn how to obtain and configure SSL/TLS certificates for servers with only IPv6 addresses, covering certificate authorities, SAN configuration, and DNS-01 validation strategies.

---

IPv6-only servers present unique certificate challenges. Certificate Authorities issue certificates for domain names that resolve to IPv6 addresses, and some public CAs now issue certificates for bare IP addresses with additional constraints. DNS-based validation becomes useful when inbound HTTP/TLS challenge ports are not reachable or when you need wildcard certificates.

## Certificate Options for IPv6-Only Servers

There are three approaches to TLS on IPv6-only servers:

1. **Domain name certificate** - Point a DNS AAAA record at your IPv6 address and issue a standard certificate for the domain name.
2. **IP SAN certificate** - Include the IPv6 address directly in the certificate's Subject Alternative Names (SAN) field.
3. **Internal CA certificate** - Issue certificates from your own CA for internal IPv6-only services.

## Approach 1: Domain-Based Certificate (Recommended)

This is the standard approach. Map a domain to your IPv6 address:

```bash
# Add AAAA record in DNS (example for bind zone file)

ipv6server  IN  AAAA  2001:db8::10

# Verify AAAA record resolves
dig AAAA ipv6server.example.com +short

# Obtain Let's Encrypt certificate using DNS-01 (no inbound HTTP needed)
certbot certonly \
  --dns-cloudflare \
  --dns-cloudflare-credentials /etc/letsencrypt/cloudflare.ini \
  --domain ipv6server.example.com \
  --agree-tos \
  --email admin@example.com
```

## Approach 2: IP SAN Certificate (IPv6 Address in Certificate)

You can include an IPv6 address directly in a certificate's SAN. Public CAs can support this, but Let's Encrypt requires IP address certificates to use its short-lived profile with HTTP-01 or TLS-ALPN-01 validation, not DNS-01. For internal IPv6-only services, you can use an internal CA:

```bash
# Create a private CA
openssl genrsa -out ca.key 4096
openssl req -new -x509 -key ca.key -out ca.crt -days 3650 \
  -addext "basicConstraints = critical,CA:TRUE" \
  -addext "keyUsage = critical,keyCertSign,cRLSign" \
  -subj "/CN=Internal CA/O=MyOrg"

# Create server private key
openssl genrsa -out server.key 2048

# Create CSR config with IPv6 SAN
cat > server.cnf << 'EOF'
[req]
default_bits = 2048
prompt = no
distinguished_name = dn
req_extensions = v3_req

[dn]
CN = 2001:db8::10

[v3_req]
basicConstraints = CA:FALSE
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = IP:2001:db8::10, DNS:ipv6server.example.com
EOF

# Generate CSR
openssl req -new -key server.key -out server.csr -config server.cnf

# Sign with internal CA, including SAN extensions
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key \
  -CAcreateserial -out server.crt -days 365 \
  -extensions v3_req -extfile server.cnf
```

## Configuring Nginx with the IPv6-SAN Certificate

```nginx
server {
    # IPv6-only listen
    listen [::]:443 ssl ipv6only=on;
    http2 on;

    server_name ipv6server.example.com;

    ssl_certificate     /etc/ssl/ipv6server/server.crt;
    ssl_certificate_key /etc/ssl/ipv6server/server.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers 'ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
}
```

## Verifying the Certificate Contains IPv6 SAN

```bash
# Check the certificate's SAN field
openssl x509 -in server.crt -noout -ext subjectAltName

# Expected output includes:
# X509v3 Subject Alternative Name:
#   IP Address:2001:DB8:0:0:0:0:0:10, DNS:ipv6server.example.com
```

## Connecting to the Server Using the IPv6 Address

Test TLS connectivity directly to the IPv6 address:

```bash
# Connect using the IPv6 address (brackets required in openssl)
openssl s_client -connect '[2001:db8::10]:443' \
  -servername ipv6server.example.com

# Or using curl
curl -6 --cacert /path/to/ca.crt \
  https://ipv6server.example.com

# For self-signed certificates (testing only)
curl -6 -k https://[2001:db8::10]/
```

## Certificate Renewal Considerations

For IPv6-only servers using Let's Encrypt with DNS-01:

```bash
# Set up automatic renewal (no inbound port needed)
# /etc/cron.d/certbot-ipv6
0 3 * * * root certbot renew \
  --dns-cloudflare \
  --dns-cloudflare-credentials /etc/letsencrypt/cloudflare.ini \
  --quiet \
  --deploy-hook "systemctl reload nginx"
```

## Monitoring Certificate Expiry on IPv6 Servers

```bash
#!/bin/bash
# Check certificate expiry on an IPv6-only server
HOST="ipv6server.example.com"
PORT=443

# Get expiry date
EXPIRY=$(echo | openssl s_client \
  -6 \
  -connect "$HOST:$PORT" \
  -servername "$HOST" 2>/dev/null \
  | openssl x509 -noout -enddate 2>/dev/null \
  | cut -d= -f2)

echo "Certificate expires: $EXPIRY"
```

IPv6-only servers can be fully secured with TLS using domain-based certificates and DNS-01 validation, which requires no inbound HTTP connectivity and supports wildcard certificates.
