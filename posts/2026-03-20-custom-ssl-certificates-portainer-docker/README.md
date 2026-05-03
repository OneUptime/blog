# How to Set Up Custom SSL Certificates in Portainer on Docker

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, SSL, TLS, Docker, Security

Description: Learn how to configure Portainer on Docker standalone to use your own custom SSL/TLS certificates instead of the self-signed default.

---

Portainer ships with a self-signed certificate that causes browser warnings. Replacing it with a trusted certificate from your CA or Let's Encrypt eliminates these warnings and improves security posture.

## Prerequisites

- A valid SSL certificate (`.crt` or `.pem`) and private key (`.key`)
- The certificate must be in PEM format
- If using a certificate chain, concatenate the cert and intermediates

## Prepare Your Certificate Files

```bash
# Create a directory to store certificate files

mkdir -p /opt/portainer/certs

# Copy your certificate and key
cp /path/to/your/cert.pem /opt/portainer/certs/portainer.crt
cp /path/to/your/private.key /opt/portainer/certs/portainer.key

# Set secure permissions
chmod 644 /opt/portainer/certs/portainer.crt
chmod 600 /opt/portainer/certs/portainer.key
```

## Start Portainer with Custom SSL Certificate

Mount the certs directory and pass the `--sslcert` and `--sslkey` flags:

```bash
# Run Portainer with custom SSL certificate
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  -v /opt/portainer/certs:/certs:ro \
  portainer/portainer-ce:latest \
  --sslcert /certs/portainer.crt \
  --sslkey /certs/portainer.key
```

## Docker Compose Configuration

```yaml
# docker-compose.yml
version: "3.8"

services:
  portainer:
    image: portainer/portainer-ce:latest
    container_name: portainer
    restart: always
    ports:
      - "8000:8000"
      - "9443:9443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
      - /opt/portainer/certs:/certs:ro    # Mount certs read-only
    command:
      - --sslcert
      - /certs/portainer.crt
      - --sslkey
      - /certs/portainer.key

volumes:
  portainer_data:
```

## Using a Full Certificate Chain

If your certificate requires intermediate CA certificates, concatenate them:

```bash
# Concatenate your cert with intermediate chain
cat /path/to/your.crt /path/to/intermediate.crt > /opt/portainer/certs/portainer.crt

# The key file remains unchanged
cp /path/to/your.key /opt/portainer/certs/portainer.key
```

## Verify the Certificate

```bash
# Confirm Portainer is using your custom certificate
openssl s_client -connect localhost:9443 -showcerts </dev/null 2>/dev/null | \
  openssl x509 -noout -subject -issuer -dates

# Check certificate details
curl -vk https://localhost:9443 2>&1 | grep -A5 "Server certificate"
```

## Renewing Certificates

When your certificate expires, replace the files and restart Portainer:

```bash
# Replace the certificate files
cp /path/to/renewed.crt /opt/portainer/certs/portainer.crt
cp /path/to/renewed.key /opt/portainer/certs/portainer.key

# Restart Portainer to pick up the new certificate
docker restart portainer
```

---

*Monitor SSL certificate expiry and Portainer availability with [OneUptime](https://oneuptime.com).*
