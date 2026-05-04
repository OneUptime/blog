# How to Configure mTLS Between Services with Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, mTLS, Security, Service Mesh, Docker, Kubernetes

Description: Configure mutual TLS (mTLS) between containerized services using Portainer to enforce encrypted, authenticated service-to-service communication.

## Introduction

Mutual TLS (mTLS) is a security protocol where both the client and server authenticate each other using TLS certificates. Unlike standard TLS where only the server presents a certificate, mTLS ensures both parties are verified. This is essential for zero-trust network architectures and compliance requirements. Portainer makes it easier to manage the certificates, environment variables, and configurations needed for mTLS.

## Prerequisites

- Portainer installed with Docker or Kubernetes environment connected
- OpenSSL installed on your management machine
- Understanding of TLS certificate concepts
- Docker or Kubernetes cluster accessible via Portainer

## Step 1: Generate the Certificate Authority

Create a Certificate Authority (CA) for your service mesh:

```bash
# Create CA directory structure

mkdir -p certs/{ca,server,client}
cd certs

# Generate CA private key (4096-bit RSA)
openssl genrsa -out ca/ca.key 4096

# Generate CA certificate (10-year validity for internal CA)
openssl req -new -x509 -days 3650 -key ca/ca.key -out ca/ca.crt \
  -subj "/C=US/ST=CA/L=SF/O=MyOrg/OU=Platform/CN=Internal-CA"

echo "CA certificate generated"
```

## Step 2: Generate Service Certificates

Create certificates for each service that will use mTLS:

```bash
# Generate certificate for service A (server role)
openssl genrsa -out server/server.key 2048

openssl req -new -key server/server.key -out server/server.csr \
  -subj "/C=US/ST=CA/L=SF/O=MyOrg/OU=Services/CN=service-a"

# Sign with CA - include SAN for Docker service names
openssl x509 -req -days 365 -in server/server.csr \
  -CA ca/ca.crt -CAkey ca/ca.key -CAcreateserial \
  -out server/server.crt \
  -extfile <(printf "subjectAltName=DNS:service-a,DNS:localhost,IP:127.0.0.1")

# Generate certificate for service B (client role)
openssl genrsa -out client/client.key 2048

openssl req -new -key client/client.key -out client/client.csr \
  -subj "/C=US/ST=CA/L=SF/O=MyOrg/OU=Services/CN=service-b"

openssl x509 -req -days 365 -in client/client.csr \
  -CA ca/ca.crt -CAkey ca/ca.key -CAcreateserial \
  -out client/client.crt \
  -extfile <(printf "subjectAltName=DNS:service-b,DNS:localhost")
```

## Step 3: Store Certificates as Docker Secrets via Portainer

In Portainer, navigate to **Secrets** > **Add secret** (this menu is only available on Docker Swarm environments):

1. Create secret `ca-cert` with `ca/ca.crt` content
2. Create secret `server-cert` with `server/server.crt` content
3. Create secret `server-key` with `server/server.key` content
4. Create secret `client-cert` with `client/client.crt` content
5. Create secret `client-key` with `client/client.key` content

Also create a Docker config for the NGINX server block. From **Configs** > **Add config**, create `nginx-mtls-config` with the following content:

```nginx
server {
    listen 443 ssl;
    server_name service-a;

    # Server certificate and key
    ssl_certificate /etc/nginx/certs/server.crt;
    ssl_certificate_key /etc/nginx/certs/server.key;

    # CA certificate for client verification
    ssl_client_certificate /etc/nginx/certs/ca.crt;

    # Require client certificate (mTLS)
    ssl_verify_client on;

    # TLS 1.2 and 1.3 only
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        return 200 "Hello from service-a - client authenticated\n";
    }

    location /health {
        return 200 "healthy\n";
    }
}
```

Or create the secrets and config via the Docker CLI:

```bash
# Create Docker secrets for certificate management
docker secret create ca-cert ca/ca.crt
docker secret create server-cert server/server.crt
docker secret create server-key server/server.key
docker secret create client-cert client/client.crt
docker secret create client-key client/client.key

# Create the NGINX config (assumes you saved the server block above to nginx.conf)
docker config create nginx-mtls-config nginx.conf
```

## Step 4: Deploy Services with mTLS via Portainer Stack

Create a Portainer stack that configures mTLS between services:

```yaml
# docker-compose.yml for mTLS between services
version: "3.8"

services:
  # NGINX service configured as mTLS server
  service-a:
    image: nginx:alpine
    # Mount TLS certificates from Docker secrets
    secrets:
      - source: ca-cert
        target: /etc/nginx/certs/ca.crt
      - source: server-cert
        target: /etc/nginx/certs/server.crt
      - source: server-key
        target: /etc/nginx/certs/server.key
    configs:
      - source: nginx-mtls-config
        target: /etc/nginx/conf.d/default.conf
    networks:
      - secure-mesh
    ports:
      - "443:443"

  # Client service configured to present client certificate
  service-b:
    image: curlimages/curl:latest
    # Mount client certificates
    secrets:
      - source: ca-cert
        target: /certs/ca.crt
      - source: client-cert
        target: /certs/client.crt
      - source: client-key
        target: /certs/client.key
    # Test mTLS connection on startup
    command: >
      sh -c "while true; do
        curl --cacert /certs/ca.crt \
             --cert /certs/client.crt \
             --key /certs/client.key \
             https://service-a/health;
        sleep 30;
      done"
    networks:
      - secure-mesh
    depends_on:
      - service-a

secrets:
  ca-cert:
    external: true
  server-cert:
    external: true
  server-key:
    external: true
  client-cert:
    external: true
  client-key:
    external: true

configs:
  nginx-mtls-config:
    external: true

networks:
  secure-mesh:
    driver: overlay
    encrypted: true  # Also encrypt the overlay network
```

## Step 5: Configure mTLS for Kubernetes Services via Portainer

For Kubernetes, use cert-manager to automate certificate management:

```yaml
# cert-manager-issuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: internal-ca-issuer
spec:
  ca:
    # Reference to the CA secret we'll create
    secretName: internal-ca-secret
---
# Certificate for service-a
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: service-a-tls
  namespace: production
spec:
  secretName: service-a-tls-secret
  issuerRef:
    name: internal-ca-issuer
    kind: ClusterIssuer
  dnsNames:
    - service-a
    - service-a.production.svc.cluster.local
  usages:
    - server auth
    - client auth  # Enable both for mTLS
```

## Step 6: Verify mTLS is Working

Test the mTLS connection from Portainer's container console:

1. Go to **Containers** > `service-b`
2. Click **Console**
3. Run the test command:

```bash
# Test mTLS - should succeed with both certificates
curl -v \
  --cacert /certs/ca.crt \
  --cert /certs/client.crt \
  --key /certs/client.key \
  https://service-a/health

# Test without client cert - should fail with NGINX status 496
curl -v --cacert /certs/ca.crt https://service-a/health
# Expected: 400 Bad Request, with NGINX returning the non-standard 496
# status code internally (No required SSL certificate was sent)
```

## Step 7: Certificate Rotation

Automate certificate rotation to maintain security:

```bash
#!/bin/bash
# cert-rotation.sh - Run as a cron job or Portainer scheduled task

# Regenerate certificates before expiry
openssl x509 -in /certs/server.crt -noout -checkend 2592000
if [ $? -ne 0 ]; then
  echo "Certificate expiring within 30 days, rotating..."
  # Generate new certificate
  # Update Docker secret
  docker secret rm server-cert
  docker secret create server-cert new-server.crt
  # Rolling restart the service
  docker service update --force service-a
fi
```

## Monitoring Certificate Expiry

Track certificate expiry by exposing Prometheus metrics with a maintained exporter such as `enix/x509-certificate-exporter`. Add it to your monitoring stack and scrape the exposed metrics with Prometheus, then alert via Alertmanager (Slack, PagerDuty, etc.):

```yaml
# Add to your monitoring stack
  cert-monitor:
    image: enix/x509-certificate-exporter:latest
    command:
      - --watch-file=/certs/server.crt
    ports:
      - "9793:9793"
    volumes:
      - ./certs:/certs:ro
```

The exporter publishes metrics like `x509_cert_not_after` (Unix timestamp of expiry) on port 9793 at `/metrics`, which Prometheus can scrape and Alertmanager can use to fire warnings well before a certificate expires.

## Conclusion

Configuring mTLS between services with Portainer provides a pragmatic approach to zero-trust network security. By combining Docker secrets for certificate storage, encrypted overlay networks, and service-level TLS configuration, you can ensure that every service-to-service communication is authenticated and encrypted. For production environments, consider integrating cert-manager (Kubernetes) or Vault PKI (both platforms) to automate the certificate lifecycle and eliminate manual rotation processes.
