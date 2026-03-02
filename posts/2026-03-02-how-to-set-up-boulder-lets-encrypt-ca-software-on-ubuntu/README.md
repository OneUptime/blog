# How to Set Up Boulder (Let's Encrypt CA Software) on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, PKI, ACME, Boulder, Certificate Authority

Description: Learn how to deploy Boulder, the certificate authority software that powers Let's Encrypt, on Ubuntu to run your own ACME-compatible CA for internal certificate automation.

---

Boulder is the open-source software that runs Let's Encrypt's certificate authority. Running Boulder yourself means you can have a fully ACME-compatible certificate authority under your control. Any tool that uses Let's Encrypt (Certbot, cert-manager, Caddy, Traefik) can also work with your private Boulder CA without modification, just by pointing it at a different ACME directory URL.

This is particularly useful for:
- Internal/corporate PKI with automated certificate renewal
- Testing ACME integrations without hitting Let's Encrypt's rate limits
- Air-gapped environments that need automated certificate management

Boulder is a complex piece of software - it is essentially a production-grade CA. The development setup uses Docker Compose and is the recommended starting point.

## Prerequisites

Boulder requires:
- Docker and Docker Compose
- At least 4GB RAM (8GB recommended)
- Ubuntu 20.04 or 22.04

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-v2 git make

sudo usermod -aG docker $USER
newgrp docker
```

## Cloning Boulder

```bash
# Clone the Boulder repository
git clone https://github.com/letsencrypt/boulder.git
cd boulder

# Check out a stable release
git checkout release-2024-01-09
```

## Understanding Boulder's Architecture

Boulder has multiple services that work together:

- **Web Front End (WFE)** - handles ACME HTTP requests
- **Registration Authority (RA)** - validates authorization requests
- **Certificate Authority (CA)** - signs certificates
- **Storage Authority (SA)** - database interface
- **OCSP Responder** - handles certificate status requests
- **VA (Validation Authority)** - validates domain control challenges
- **Publisher** - publishes to Certificate Transparency logs

In the development setup, these run as separate processes coordinated by Docker Compose.

## Setting Up the Development Environment

Boulder includes a ready-made Docker Compose development setup:

```bash
# Navigate to the Boulder directory
cd boulder

# Build the Docker images
docker compose build

# Start Boulder (this takes several minutes on first run)
docker compose up -d

# Watch the startup logs
docker compose logs -f
```

Wait for all services to be healthy. You can check status with:

```bash
docker compose ps
```

The ACME directory endpoint will be available at:
```
http://localhost:4001/directory
```

## Testing with Certbot

Boulder includes a fake DNS server and HTTP challenge responder for testing. Test the full ACME flow:

```bash
# Install Certbot
sudo apt install certbot

# Request a certificate from your local Boulder instance
# Use the fake domain that Boulder's test setup handles
certbot certonly \
    --standalone \
    --server http://localhost:4001/directory \
    --domain example.com \
    --email test@example.com \
    --agree-tos \
    --no-eff-email
```

Note: Boulder's development setup uses a fake DNS resolver that makes all domains appear to point to `127.0.0.1`, so domain validation works in a self-contained environment.

## Production-Like Configuration

For a real internal CA deployment, you need to configure Boulder to:
1. Use real DNS resolution for your internal domains
2. Store data in a real database (MariaDB)
3. Use real signing keys
4. Configure proper network access

```bash
# Copy the example configuration files
cp -r test/configs/ configs/

# Key configuration files to modify:
# configs/ca-a.json - Certificate Authority settings
# configs/ra.json   - Registration Authority settings
# configs/wfe2.json - Web Front End settings
# configs/va.json   - Validation Authority settings
```

### Configuring the CA for Internal Use

The CA configuration defines the root/intermediate key paths:

```json
{
    "ca": {
        "Issuers": [
            {
                "Active": true,
                "IssuerURL": "http://pki.internal.example.com/issuer/ca",
                "OCSPURL": "http://ocsp.internal.example.com",
                "CRLDistributionPoints": ["http://crl.internal.example.com/ca.crl"],
                "Location": {
                    "ConfigFile": "/path/to/pkcs11-config.json",
                    "CertFile": "/etc/boulder/issuer.pem",
                    "NumSessions": 2
                }
            }
        ],
        "Profiles": {
            "legacy": {
                "maxValidityPeriod": "8784h",
                "maxValidityBackdate": "1h1m"
            }
        }
    }
}
```

### Setting Up the Database

Boulder uses MariaDB for persistence:

```bash
# In the Docker Compose setup, MariaDB is included
# For production, set up an external MariaDB
sudo apt install mariadb-server

# Run Boulder's database migration scripts
docker compose run boulder-tools ./bin/create-empty-amorphic-db
```

## Configuring Internal DNS Override

For Boulder to validate domains on your internal network, configure the VA to use your internal DNS:

```json
{
    "va": {
        "dnsResolvers": ["192.168.1.53:53"],
        "dnsTries": 3,
        "dnsTimeout": "10s",
        "httpPort": 80,
        "httpsPort": 443
    }
}
```

## Issuing Certificates via ACME

With Boulder running, any ACME client can obtain certificates:

### Using cert-manager (Kubernetes)

```yaml
# ClusterIssuer for cert-manager
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: internal-boulder
spec:
  acme:
    server: https://boulder.internal.example.com:4001/directory
    email: admin@example.com
    privateKeySecretRef:
      name: internal-acme-key
    solvers:
    - http01:
        ingress:
          class: nginx
```

### Using Caddy

```
# Caddyfile
example.internal.com {
    tls admin@example.com {
        ca https://boulder.internal.example.com:4001/directory
    }

    reverse_proxy localhost:8080
}
```

### Using Certbot with DNS Challenge for Wildcard Certs

```bash
# For wildcard certificates, use DNS challenge
certbot certonly \
    --manual \
    --preferred-challenges dns \
    --server https://boulder.internal.example.com:4001/directory \
    --domain "*.example.internal.com" \
    --email admin@example.com \
    --agree-tos
```

## Monitoring Boulder

Boulder exposes Prometheus metrics. Monitor key metrics:

```
# Certificate issuance rate
boulder_ca_certificates_issued_total

# ACME request rate
boulder_wfe_request_duration_seconds

# Database query duration
boulder_sa_storage_request_duration_seconds

# Validation success/failure rate
boulder_va_validation_result_total
```

## Rate Limiting

Boulder includes configurable rate limits to prevent CA abuse:

```json
{
    "ratelimit": {
        "policies": {
            "certificatesPerDomain": 300,
            "registrationsPerIP": 10,
            "pendingAuthorizationsPerAccount": 300,
            "invalidAuthorizationsPerAccount": 5
        }
    }
}
```

Adjust these values based on your internal usage patterns - an internal CA for a development environment might need higher `certificatesPerDomain` limits than Let's Encrypt's public limits.

Running Boulder gives you the same battle-tested ACME implementation that powers Let's Encrypt, but pointed at your own PKI infrastructure. This enables fully automated certificate lifecycle management for internal services without requiring any internet access or external CA dependency.
