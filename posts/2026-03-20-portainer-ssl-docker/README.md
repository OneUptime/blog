# How to Configure SSL/TLS for Portainer on Docker

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, SSL, TLS, Docker, Security, Certificate

Description: A comprehensive guide to configuring SSL/TLS certificates for Portainer running on Docker standalone.

## Overview

Portainer generates a self-signed certificate by default, which causes browser warnings. This guide covers configuring Portainer with proper SSL/TLS certificates - both self-signed CA certificates and certificates from a public CA - for Docker standalone deployments.

## Prerequisites

- Portainer running on Docker
- OpenSSL installed
- A domain name (for public CA certificates) or a hostname/IP (for an internal CA-signed certificate)

## Option 1: Generate a Certificate Signed by Your Own CA

```bash
# Create directory for certificates

mkdir -p /opt/portainer/certs

# Generate CA key and certificate
openssl genrsa -out /opt/portainer/certs/ca.key 4096
openssl req -new -x509 -days 3650 -key /opt/portainer/certs/ca.key \
  -out /opt/portainer/certs/ca.crt \
  -subj "/C=US/ST=CA/L=SanFrancisco/O=MyOrg/CN=MyCA"

# Generate server key
openssl genrsa -out /opt/portainer/certs/portainer.key 2048

# Create CSR with SANs
cat > /opt/portainer/certs/portainer.cnf << 'EOF'
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = req_ext

[dn]
C = US
ST = California
L = San Francisco
O = MyOrg
CN = portainer.example.com

[req_ext]
subjectAltName = @alt_names

[alt_names]
DNS.1 = portainer.example.com
DNS.2 = portainer
IP.1 = 192.168.1.100
IP.2 = 127.0.0.1
EOF

openssl req -new \
  -key /opt/portainer/certs/portainer.key \
  -out /opt/portainer/certs/portainer.csr \
  -config /opt/portainer/certs/portainer.cnf

# Sign with CA
openssl x509 -req -days 825 \
  -in /opt/portainer/certs/portainer.csr \
  -CA /opt/portainer/certs/ca.crt \
  -CAkey /opt/portainer/certs/ca.key \
  -CAcreateserial \
  -out /opt/portainer/certs/portainer.crt \
  -extensions req_ext \
  -extfile /opt/portainer/certs/portainer.cnf

# Verify
openssl verify -CAfile /opt/portainer/certs/ca.crt \
  /opt/portainer/certs/portainer.crt
```

## Option 2: Use a Certificate from Let's Encrypt

```bash
# Install Certbot (Debian/Ubuntu example)
sudo apt-get install certbot

# Obtain certificate (requires the domain to resolve to this server and port 80 to be reachable)
sudo certbot certonly --standalone \
  -d portainer.example.com \
  --non-interactive \
  --agree-tos \
  -m admin@example.com

# Certificates are at:
# /etc/letsencrypt/live/portainer.example.com/fullchain.pem
# /etc/letsencrypt/live/portainer.example.com/privkey.pem
# When using these with Portainer, mount both the live and archive directories
# because Certbot stores these files as symlinks.
```

## Step: Install Self-Signed or Internal CA Certificates in Portainer Data Volume

```bash
# Copy self-signed/internal CA certificates into the portainer_data volume
docker run --rm \
  -v portainer_data:/data \
  -v /opt/portainer/certs:/certs \
  alpine \
  sh -c "mkdir -p /data/certs && cp /certs/portainer.crt /data/certs/cert.pem && cp /certs/portainer.key /data/certs/key.pem"
```

## Step: Deploy Portainer with Custom SSL Certs

```bash
# Stop existing container
docker stop portainer && docker rm portainer

# Deploy with custom certificates
docker run -d \
  -p 9443:9443 \
  -p 8000:8000 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest \
  --sslcert /data/certs/cert.pem \
  --sslkey /data/certs/key.pem \
  --http-disabled
```

## Alternative: Mount Let's Encrypt Certificates Directly

```bash
docker run -d \
  -p 9443:9443 \
  -p 8000:8000 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  -v /etc/letsencrypt/live/portainer.example.com:/certs/live/portainer.example.com:ro \
  -v /etc/letsencrypt/archive/portainer.example.com:/certs/archive/portainer.example.com:ro \
  portainer/portainer-ce:latest \
  --sslcert /certs/live/portainer.example.com/fullchain.pem \
  --sslkey /certs/live/portainer.example.com/privkey.pem \
  --http-disabled
```

## Verify SSL Configuration

```bash
# Test the certificate
echo | openssl s_client -connect localhost:9443 2>/dev/null \
  | openssl x509 -noout -text | grep -E "Subject:|DNS:|IP:"

# Check certificate expiry
echo | openssl s_client -connect localhost:9443 2>/dev/null \
  | openssl x509 -noout -dates

# Test HTTPS access
curl -k https://localhost:9443/api/status
# Public CA certificates should verify with the system trust store:
curl https://portainer.example.com:9443/api/status
# For certificates signed by your internal CA, use the CA cert to verify properly:
curl --cacert /opt/portainer/certs/ca.crt \
  https://portainer.example.com:9443/api/status
```

## Docker Compose with Custom SSL

```yaml
services:
  portainer:
    image: portainer/portainer-ce:latest
    container_name: portainer
    restart: always
    command:
      - --sslcert=/certs/portainer.crt
      - --sslkey=/certs/portainer.key
      - --http-disabled
    ports:
      - "9443:9443"
      - "8000:8000"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
      - /opt/portainer/certs:/certs:ro

volumes:
  portainer_data:
```

## Conclusion

Replacing Portainer's default self-signed certificate with a proper certificate eliminates browser warnings and enables proper TLS validation. Use Let's Encrypt for public-facing deployments or an internal CA for private/enterprise environments. Remember to set up certificate renewal (certbot renew via cron) to prevent certificate expiry.
