# How to Fix Self-Signed Certificate Warnings in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, SSL, TLS, Self-Signed, Certificate, Browser-warning

Description: A guide to eliminating browser self-signed certificate warnings when accessing Portainer, with options ranging from proper CA-signed certs to trusting an internal CA.

## Overview

Portainer ships with a self-signed certificate that causes "Your connection is not private" warnings in browsers. While you can click through these warnings, they're unprofessional and can confuse users. This guide covers all approaches to fix these warnings: using Let's Encrypt, creating an internal CA, and distributing that CA to client machines.

## Prerequisites

- Portainer running with default or custom SSL
- Administrative access to client machines (for CA distribution)

## Option 1: Use Let's Encrypt (Best for Public-Facing Portainer)

The simplest fix for internet-accessible Portainer:

```bash
# Obtain Let's Encrypt certificate
# Port 80 on portainer.example.com must be reachable for the HTTP-01 challenge

sudo certbot certonly --standalone \
  -d portainer.example.com \
  --agree-tos -m admin@example.com --non-interactive

# Recreate Portainer with the Let's Encrypt cert mounted
docker stop portainer
docker rm portainer

docker run -d -p 9443:9443 -p 8000:8000 \
  --name portainer --restart always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  -v /etc/letsencrypt/live/portainer.example.com:/certs/live/portainer.example.com:ro \
  -v /etc/letsencrypt/archive/portainer.example.com:/certs/archive/portainer.example.com:ro \
  portainer/portainer-ce:sts \
  --sslcert /certs/live/portainer.example.com/fullchain.pem \
  --sslkey /certs/live/portainer.example.com/privkey.pem
```

## Option 2: Internal CA + Trust Distribution (Best for Private Networks)

### Step 1: Create Internal CA

```bash
# Generate CA key and certificate
openssl genrsa -out /opt/internal-ca/ca.key 4096
openssl req -new -x509 -days 3650 \
  -key /opt/internal-ca/ca.key \
  -out /opt/internal-ca/ca.crt \
  -subj "/C=US/O=MyOrg/CN=MyOrg Internal CA" \
  -addext "basicConstraints=critical,CA:TRUE" \
  -addext "keyUsage=critical,keyCertSign,cRLSign"
```

### Step 2: Generate Server Certificate Signed by Internal CA

```bash
# If clients connect by IP, set this to the exact IP they use
PORTAINER_IP="$(hostname -I | awk '{print $1}')"

openssl req -newkey rsa:2048 -nodes \
  -keyout /opt/internal-ca/portainer.key \
  -out /opt/internal-ca/portainer.csr \
  -subj "/CN=portainer.internal.example.com"

# Sign with SANs and serverAuth EKU
openssl x509 -req -days 825 \
  -in /opt/internal-ca/portainer.csr \
  -CA /opt/internal-ca/ca.crt \
  -CAkey /opt/internal-ca/ca.key \
  -CAcreateserial \
  -out /opt/internal-ca/portainer.crt \
  -extfile <(printf "%s\n" \
    "[v3_server]" \
    "basicConstraints=CA:FALSE" \
    "keyUsage=digitalSignature,keyEncipherment" \
    "extendedKeyUsage=serverAuth" \
    "subjectAltName=DNS:portainer.internal.example.com,IP:${PORTAINER_IP}") \
  -extensions v3_server

# Recreate Portainer with the internal CA-signed cert mounted
docker stop portainer
docker rm portainer

docker run -d -p 9443:9443 -p 8000:8000 \
  --name portainer --restart always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  -v /opt/internal-ca:/certs:ro \
  portainer/portainer-ce:sts \
  --sslcert /certs/portainer.crt \
  --sslkey /certs/portainer.key
```

### Step 3: Distribute CA Certificate to Client Machines

#### Ubuntu/Debian

```bash
sudo cp /opt/internal-ca/ca.crt /usr/local/share/ca-certificates/myorg-ca.crt
sudo update-ca-certificates
```

#### RHEL/Rocky/Oracle/CentOS

```bash
sudo cp /opt/internal-ca/ca.crt /etc/pki/ca-trust/source/anchors/myorg-ca.crt
sudo update-ca-trust extract
```

#### macOS

```bash
# Add to System keychain (requires admin)
sudo security add-trusted-cert -d -r trustRoot \
  -k /Library/Keychains/System.keychain /opt/internal-ca/ca.crt
```

#### Windows (Group Policy or Manual)

```powershell
# Import CA cert to Trusted Root Certification Authorities
Import-Certificate -FilePath "C:\myorg-ca.crt" \
  -CertStoreLocation Cert:\LocalMachine\Root
```

## Option 3: Use Nginx with Trusted Certificate

Configure Nginx as a reverse proxy with a trusted cert while Portainer listens on HTTP internally:

```bash
# Nginx handles trusted HTTPS externally
# Portainer listens on HTTP port 9000 internally
# Proxy to port 9000 instead of disabling upstream certificate verification on 9443
```

## Verifying the Fix

```bash
# After applying certificate changes:

# Test from command line (no -k needed)
curl https://portainer.internal.example.com:9443/api/system/status

# Check certificate is trusted
openssl verify -CAfile /opt/internal-ca/ca.crt /opt/internal-ca/portainer.crt
# Expected: /opt/internal-ca/portainer.crt: OK

# Check the presented certificate with SNI and your CA
echo | openssl s_client \
  -connect portainer.internal.example.com:9443 \
  -servername portainer.internal.example.com \
  -CAfile /opt/internal-ca/ca.crt 2>/dev/null \
  | grep -E "Verify return code"
# Expected: Verify return code: 0 (ok)
```

## Chrome/Firefox-Specific Fixes

Most browsers will trust the CA once the OS trust store is updated:

```bash
# Chrome: custom roots installed in the OS are imported automatically
# Review them under Settings → Privacy and security → Security → Manage certificates

# Firefox: on Windows and macOS, Firefox can automatically trust third-party
# roots installed in the OS. On Linux, or if that setting is disabled,
# import the CA under Settings → Privacy & Security → Certificates → View Certificates → Authorities
```

## Conclusion

Self-signed certificate warnings can be fixed permanently by using Let's Encrypt (for public Portainer) or deploying an internal CA and distributing it to all client machines (for private Portainer). The internal CA approach is the enterprise standard for private services. Once the CA is trusted by client machines and the certificate matches the hostname clients use, users should no longer see warnings, and scripts using `curl` will work without `--insecure` flags.
