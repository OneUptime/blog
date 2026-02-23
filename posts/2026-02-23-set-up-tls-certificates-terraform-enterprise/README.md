# How to Set Up TLS Certificates for Terraform Enterprise

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terraform Enterprise, TLS, SSL, Certificates, Security

Description: Step-by-step guide to setting up TLS certificates for Terraform Enterprise, including using Let's Encrypt, private CAs, and troubleshooting common certificate issues.

---

TLS is not optional for Terraform Enterprise. Every TFE deployment needs valid TLS certificates because the application handles sensitive data - API tokens, state files containing infrastructure secrets, and VCS credentials. Browsers and CLI tools like the Terraform CLI will refuse to connect to a TFE instance that does not present a trusted certificate.

This guide covers generating certificates, configuring them in TFE, and resolving the most common certificate headaches.

## Understanding TFE's TLS Requirements

Terraform Enterprise needs a TLS certificate that covers the hostname you use to access it. For example, if your TFE instance is at `tfe.example.com`, the certificate must be valid for that exact hostname.

The certificate chain must include:

1. **The leaf certificate** for your TFE hostname
2. **Intermediate certificates** (if any) from your CA
3. **The private key** corresponding to the leaf certificate

TFE also needs to trust the CA certificates of any external services it connects to - your VCS provider, object storage endpoints, LDAP servers, and so on.

## Option 1: Let's Encrypt with Certbot

For publicly accessible TFE instances, Let's Encrypt is the simplest path to trusted certificates.

```bash
# Install certbot
sudo apt-get update && sudo apt-get install -y certbot

# Generate a certificate using the standalone method
# Stop any service on port 80 first
sudo certbot certonly \
  --standalone \
  --domain tfe.example.com \
  --email admin@example.com \
  --agree-tos \
  --non-interactive

# Certificates are stored in /etc/letsencrypt/live/tfe.example.com/
# fullchain.pem - certificate + intermediates
# privkey.pem   - private key
```

For DNS-based validation (works even when port 80 is not available):

```bash
# Using DNS challenge - works for internal-facing instances too
sudo certbot certonly \
  --manual \
  --preferred-challenges dns \
  --domain tfe.example.com \
  --email admin@example.com \
  --agree-tos

# Certbot will ask you to create a DNS TXT record
# Follow the instructions, then press Enter to continue
```

### Automating Renewal

```bash
# Create a renewal script
cat > /opt/tfe/renew-cert.sh << 'SCRIPT'
#!/bin/bash
# Renew the Let's Encrypt certificate and restart TFE

certbot renew --quiet

# Copy renewed certs to TFE location
cp /etc/letsencrypt/live/tfe.example.com/fullchain.pem /opt/tfe/certs/tls.crt
cp /etc/letsencrypt/live/tfe.example.com/privkey.pem /opt/tfe/certs/tls.key

# Restart TFE to pick up new certificates
docker compose -f /opt/tfe/docker-compose.yml restart tfe
SCRIPT

chmod +x /opt/tfe/renew-cert.sh

# Add to crontab - run twice daily as recommended by Let's Encrypt
echo "0 2,14 * * * /opt/tfe/renew-cert.sh" | crontab -
```

## Option 2: Private CA Certificates

Most enterprises use an internal Certificate Authority. Here is how to generate a certificate with OpenSSL using your private CA.

### Create a Certificate Signing Request

```bash
# Generate a private key
openssl genrsa -out tfe.key 4096

# Create a CSR configuration file
cat > tfe-csr.conf << 'EOF'
[req]
default_bits = 4096
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = v3_req

[dn]
C = US
ST = California
L = San Francisco
O = Example Corp
OU = Platform Engineering
CN = tfe.example.com

[v3_req]
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = tfe.example.com
DNS.2 = tfe-internal.example.com
IP.1 = 10.0.1.100
EOF

# Generate the CSR
openssl req -new \
  -key tfe.key \
  -out tfe.csr \
  -config tfe-csr.conf
```

### Sign with Your CA

```bash
# Sign the CSR with your CA (adjust paths to your CA cert and key)
openssl x509 -req \
  -in tfe.csr \
  -CA /path/to/ca.crt \
  -CAkey /path/to/ca.key \
  -CAcreateserial \
  -out tfe.crt \
  -days 365 \
  -sha256 \
  -extensions v3_req \
  -extfile tfe-csr.conf

# Create the full chain by concatenating the cert and CA cert
cat tfe.crt /path/to/ca.crt > tfe-fullchain.crt

# Verify the certificate chain
openssl verify -CAfile /path/to/ca.crt tfe-fullchain.crt
```

## Option 3: Purchased Certificates

If you buy certificates from a commercial CA (DigiCert, Sectigo, etc.), you will receive:

- Your server certificate
- One or more intermediate certificates
- The root CA certificate (usually already trusted by systems)

Combine them into a full chain:

```bash
# Build the full chain file
# Order matters: server cert first, then intermediates, then root
cat server.crt intermediate.crt root.crt > tfe-fullchain.crt

# Verify the chain
openssl verify -CAfile root.crt -untrusted intermediate.crt server.crt
```

## Configuring TFE with TLS Certificates

### Environment Variable Configuration

```bash
# Path to the TLS certificate (full chain)
TFE_TLS_CERT_FILE=/etc/tfe/tls/tfe-fullchain.crt

# Path to the TLS private key
TFE_TLS_KEY_FILE=/etc/tfe/tls/tfe.key

# Path to a CA bundle that TFE should trust
# Include your private CA here if you use one
TFE_TLS_CA_BUNDLE_FILE=/etc/tfe/tls/ca-bundle.crt

# Force TLS - redirect HTTP to HTTPS
TFE_TLS_ENFORCE=true
```

### Docker Compose Configuration

```yaml
# docker-compose.yml with TLS configuration
version: "3.9"
services:
  tfe:
    image: images.releases.hashicorp.com/hashicorp/terraform-enterprise:latest
    environment:
      TFE_HOSTNAME: tfe.example.com
      TFE_TLS_CERT_FILE: /etc/tfe/tls/tfe-fullchain.crt
      TFE_TLS_KEY_FILE: /etc/tfe/tls/tfe.key
      TFE_TLS_CA_BUNDLE_FILE: /etc/tfe/tls/ca-bundle.crt
      TFE_TLS_ENFORCE: "true"
      # Additional TFE configuration...
    volumes:
      # Mount the certificate directory
      - ./certs:/etc/tfe/tls:ro
    ports:
      - "443:443"
      - "80:80"
```

### Behind a Load Balancer

If TFE sits behind a load balancer that terminates TLS, the setup is different:

```bash
# When a load balancer handles TLS termination
# TFE still needs a certificate for internal communication
TFE_TLS_CERT_FILE=/etc/tfe/tls/tfe-fullchain.crt
TFE_TLS_KEY_FILE=/etc/tfe/tls/tfe.key

# The load balancer's health check endpoint
# Configure your LB to check: https://tfe.example.com/_health_check
```

Your load balancer configuration (example for AWS ALB via Terraform):

```hcl
# ALB listener for TFE with TLS termination
resource "aws_lb_listener" "tfe_https" {
  load_balancer_arn = aws_lb.tfe.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate.tfe.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.tfe.arn
  }
}

# Health check configuration
resource "aws_lb_target_group" "tfe" {
  name     = "tfe-target-group"
  port     = 443
  protocol = "HTTPS"
  vpc_id   = var.vpc_id

  health_check {
    path                = "/_health_check"
    port                = 443
    protocol            = "HTTPS"
    healthy_threshold   = 2
    unhealthy_threshold = 5
    interval            = 30
  }
}
```

## Verifying TLS Configuration

After deploying, verify everything is working:

```bash
# Check the certificate details
openssl s_client -connect tfe.example.com:443 -servername tfe.example.com < /dev/null 2>/dev/null | openssl x509 -noout -text | head -20

# Verify the full certificate chain
openssl s_client -connect tfe.example.com:443 -servername tfe.example.com -showcerts < /dev/null

# Check certificate expiration
openssl s_client -connect tfe.example.com:443 -servername tfe.example.com < /dev/null 2>/dev/null | openssl x509 -noout -dates

# Test with curl
curl -v https://tfe.example.com/_health_check

# Test with the Terraform CLI
terraform login tfe.example.com
```

## Troubleshooting Common Issues

### Certificate Chain Incomplete

```bash
# Symptom: "unable to get local issuer certificate"
# Fix: Make sure you include intermediate certificates in the chain file

# Check what certificates are in your chain
openssl crl2pkcs7 -nocrl -certfile tfe-fullchain.crt | \
  openssl pkcs7 -print_certs -noout
```

### Private Key Does Not Match Certificate

```bash
# Compare the modulus of the key and certificate
openssl x509 -noout -modulus -in tfe-fullchain.crt | md5sum
openssl rsa -noout -modulus -in tfe.key | md5sum

# These two MD5 hashes MUST match
```

### Terraform CLI Cannot Verify Certificate

If users see `x509: certificate signed by unknown authority` when running `terraform login`:

```bash
# Option 1: Add the CA cert to the system trust store (Linux)
sudo cp ca.crt /usr/local/share/ca-certificates/example-ca.crt
sudo update-ca-certificates

# Option 2: Set the SSL_CERT_FILE environment variable
export SSL_CERT_FILE=/path/to/ca-bundle.crt

# Option 3: Use TF_CLI_CONFIG_FILE with a custom config
cat > ~/.terraformrc << 'EOF'
host "tfe.example.com" {
  services = {
    "tfe.v2.1" = "https://tfe.example.com/api/v2/"
  }
}
EOF
```

## Certificate Expiration Monitoring

Do not let certificates expire unexpectedly. Set up monitoring:

```bash
# Simple script to check certificate expiration
#!/bin/bash
# check-cert-expiry.sh

HOSTNAME="tfe.example.com"
DAYS_WARNING=30

EXPIRY=$(openssl s_client -connect ${HOSTNAME}:443 -servername ${HOSTNAME} < /dev/null 2>/dev/null | \
  openssl x509 -noout -enddate | cut -d= -f2)

EXPIRY_EPOCH=$(date -d "${EXPIRY}" +%s)
NOW_EPOCH=$(date +%s)
DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))

if [ ${DAYS_LEFT} -lt ${DAYS_WARNING} ]; then
  echo "WARNING: TFE certificate expires in ${DAYS_LEFT} days"
  # Send alert via your monitoring system
fi
```

For continuous monitoring, [OneUptime](https://oneuptime.com) can track your TLS certificate expiration and alert your team well before it becomes a problem.

## Summary

Setting up TLS for Terraform Enterprise involves three main steps: getting a certificate, configuring TFE to use it, and making sure clients trust the certificate chain. Whether you use Let's Encrypt, a private CA, or a commercial certificate, the configuration on the TFE side is the same - point it at your certificate, key, and CA bundle files. The most common issues come from incomplete certificate chains and clients that do not trust your CA, both of which are straightforward to fix once you know what to look for.
