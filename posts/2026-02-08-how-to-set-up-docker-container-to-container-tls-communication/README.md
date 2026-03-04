# How to Set Up Docker Container-to-Container TLS Communication

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, TLS, SSL, Security, Networking, Encryption, Containers, Certificates

Description: Secure communication between Docker containers using TLS with certificate generation, configuration, and verification steps.

---

Containers on the same Docker network communicate in plaintext by default. The bridge network does not encrypt traffic between containers. For many development setups this is fine, but production workloads handling sensitive data need encryption. Mutual TLS (mTLS) between containers ensures that traffic is encrypted and both parties verify each other's identity.

This guide walks through setting up TLS between Docker containers, from creating a certificate authority to configuring services and verifying the encrypted connection.

## Why Encrypt Container-to-Container Traffic?

Even on a private Docker bridge network, there are reasons to encrypt:

- Compliance requirements (PCI DSS, HIPAA, SOC 2) mandate encryption in transit
- Multi-tenant environments where containers from different teams share a host
- Defense in depth, if an attacker gains access to the host, they cannot read container traffic
- Service identity verification prevents man-in-the-middle attacks between containers

## Setting Up a Private Certificate Authority

Start by creating a CA (Certificate Authority) that signs certificates for your containers:

```bash
# Create a directory structure for the CA
mkdir -p docker-tls/{ca,server,client}
cd docker-tls

# Generate the CA private key
openssl genrsa -out ca/ca-key.pem 4096

# Create the CA certificate (valid for 10 years)
openssl req -new -x509 -days 3650 -key ca/ca-key.pem -sha256 \
  -out ca/ca-cert.pem \
  -subj "/C=US/ST=California/L=SanFrancisco/O=MyOrg/CN=Docker Internal CA"
```

Verify the CA certificate:

```bash
# Inspect the CA certificate details
openssl x509 -in ca/ca-cert.pem -noout -text | head -20
```

## Generating Server Certificates

Each service that accepts TLS connections needs a server certificate. Create one for a web service:

```bash
# Generate the server private key
openssl genrsa -out server/server-key.pem 4096

# Create a certificate signing request (CSR) with SANs for Docker DNS names
openssl req -new -key server/server-key.pem \
  -out server/server.csr \
  -subj "/C=US/ST=California/L=SanFrancisco/O=MyOrg/CN=web-service"
```

Create a SAN (Subject Alternative Name) configuration to support Docker DNS names:

```bash
# server/san.cnf - Subject Alternative Names for Docker service discovery
cat > server/san.cnf << 'EOF'
[req]
distinguished_name = req_distinguished_name

[req_distinguished_name]

[v3_ext]
subjectAltName = @alt_names
basicConstraints = CA:FALSE
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth

[alt_names]
DNS.1 = web-service
DNS.2 = web-service.my-network
DNS.3 = localhost
IP.1 = 127.0.0.1
EOF
```

Sign the server certificate with the CA:

```bash
# Sign the server certificate using the CA key
openssl x509 -req -days 365 \
  -in server/server.csr \
  -CA ca/ca-cert.pem \
  -CAkey ca/ca-key.pem \
  -CAcreateserial \
  -out server/server-cert.pem \
  -extfile server/san.cnf \
  -extensions v3_ext
```

## Generating Client Certificates

For mutual TLS, clients also need certificates:

```bash
# Generate the client private key
openssl genrsa -out client/client-key.pem 4096

# Create the client CSR
openssl req -new -key client/client-key.pem \
  -out client/client.csr \
  -subj "/C=US/ST=California/L=SanFrancisco/O=MyOrg/CN=api-client"

# Create client extensions configuration
cat > client/client-ext.cnf << 'EOF'
basicConstraints = CA:FALSE
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = clientAuth
EOF

# Sign the client certificate
openssl x509 -req -days 365 \
  -in client/client.csr \
  -CA ca/ca-cert.pem \
  -CAkey ca/ca-key.pem \
  -CAcreateserial \
  -out client/client-cert.pem \
  -extfile client/client-ext.cnf
```

## Configuring an Nginx Container with TLS

Set up Nginx to accept TLS connections and verify client certificates:

```nginx
# nginx-tls.conf - Nginx configuration with mutual TLS
server {
    listen 443 ssl;
    server_name web-service;

    # Server certificate and key
    ssl_certificate /etc/nginx/certs/server-cert.pem;
    ssl_certificate_key /etc/nginx/certs/server-key.pem;

    # CA certificate for verifying client certificates
    ssl_client_certificate /etc/nginx/certs/ca-cert.pem;
    ssl_verify_client on;

    # TLS protocol and cipher settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location / {
        return 200 '{"status": "ok", "client_cn": "$ssl_client_s_dn_cn"}';
        add_header Content-Type application/json;
    }

    location /health {
        # Health check endpoint does not require client cert
        ssl_verify_client off;
        return 200 '{"healthy": true}';
        add_header Content-Type application/json;
    }
}
```

## Docker Compose with TLS

Bring everything together in Docker Compose:

```yaml
# docker-compose.yml - Container-to-container mTLS setup
services:
  web-service:
    image: nginx:alpine
    volumes:
      - ./nginx-tls.conf:/etc/nginx/conf.d/default.conf:ro
      - ./server/server-cert.pem:/etc/nginx/certs/server-cert.pem:ro
      - ./server/server-key.pem:/etc/nginx/certs/server-key.pem:ro
      - ./ca/ca-cert.pem:/etc/nginx/certs/ca-cert.pem:ro
    networks:
      - secure-network
    ports:
      - "443:443"

  api-client:
    image: curlimages/curl:latest
    volumes:
      - ./client/client-cert.pem:/certs/client-cert.pem:ro
      - ./client/client-key.pem:/certs/client-key.pem:ro
      - ./ca/ca-cert.pem:/certs/ca-cert.pem:ro
    networks:
      - secure-network
    entrypoint: ["sleep", "3600"]

  db-service:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: app
      POSTGRES_PASSWORD: secret
      POSTGRES_HOST_AUTH_METHOD: cert
    volumes:
      - ./server/server-cert.pem:/var/lib/postgresql/server-cert.pem:ro
      - ./server/server-key.pem:/var/lib/postgresql/server-key.pem:ro
      - ./ca/ca-cert.pem:/var/lib/postgresql/ca-cert.pem:ro
      - ./pg-hba.conf:/var/lib/postgresql/pg_hba.conf:ro
    networks:
      - secure-network

networks:
  secure-network:
    driver: bridge
```

## Testing the mTLS Connection

Start the services and test:

```bash
# Start all services
docker compose up -d

# Test mTLS connection from the client container
docker exec api-client curl -s \
  --cert /certs/client-cert.pem \
  --key /certs/client-key.pem \
  --cacert /certs/ca-cert.pem \
  https://web-service:443/

# Expected output: {"status": "ok", "client_cn": "api-client"}
```

Test that connections without valid client certificates are rejected:

```bash
# This should fail because no client cert is provided
docker exec api-client curl -s \
  --cacert /certs/ca-cert.pem \
  https://web-service:443/
# Expected: 400 No required SSL certificate was sent
```

## Certificate Rotation

Certificates expire. Automate rotation without downtime:

```bash
#!/bin/bash
# rotate-certs.sh - Generate new certificates and reload services

cd /path/to/docker-tls

# Generate new server certificate (reuse the same key)
openssl req -new -key server/server-key.pem \
  -out server/server-new.csr \
  -subj "/C=US/ST=California/L=SanFrancisco/O=MyOrg/CN=web-service"

openssl x509 -req -days 365 \
  -in server/server-new.csr \
  -CA ca/ca-cert.pem \
  -CAkey ca/ca-key.pem \
  -CAcreateserial \
  -out server/server-cert.pem \
  -extfile server/san.cnf \
  -extensions v3_ext

# Reload nginx without restarting the container
docker exec web-service nginx -s reload

echo "Certificate rotated and nginx reloaded"
```

Schedule this with cron:

```bash
# Run certificate rotation monthly
0 2 1 * * /path/to/rotate-certs.sh >> /var/log/cert-rotation.log 2>&1
```

## Using Docker Secrets for Certificate Distribution

For Docker Swarm deployments, use Docker secrets instead of bind mounts:

```bash
# Create secrets from certificate files
docker secret create ca-cert ca/ca-cert.pem
docker secret create server-cert server/server-cert.pem
docker secret create server-key server/server-key.pem
docker secret create client-cert client/client-cert.pem
docker secret create client-key client/client-key.pem
```

Reference secrets in your service definition:

```yaml
# docker-compose.swarm.yml - Using Docker secrets for TLS
services:
  web-service:
    image: nginx:alpine
    secrets:
      - ca-cert
      - server-cert
      - server-key
    configs:
      - source: nginx-tls-config
        target: /etc/nginx/conf.d/default.conf

secrets:
  ca-cert:
    external: true
  server-cert:
    external: true
  server-key:
    external: true

configs:
  nginx-tls-config:
    file: ./nginx-tls.conf
```

## Verifying TLS in Traffic Captures

Confirm that traffic is actually encrypted:

```bash
# Capture traffic on the Docker bridge network
sudo tcpdump -i br-$(docker network inspect secure-network --format '{{.Id}}' | cut -c1-12) \
  -w /tmp/docker-tls-capture.pcap -c 100

# In another terminal, make a request
docker exec api-client curl -s \
  --cert /certs/client-cert.pem \
  --key /certs/client-key.pem \
  --cacert /certs/ca-cert.pem \
  https://web-service:443/

# Analyze the capture - you should see TLS handshake, not plaintext
tcpdump -r /tmp/docker-tls-capture.pcap -A | head -50
```

The captured traffic will show the TLS handshake and encrypted application data. No plaintext HTTP content should be visible.

## Debugging TLS Issues

Common problems and their solutions:

```bash
# Check certificate validity
openssl x509 -in server/server-cert.pem -noout -dates

# Verify the certificate chain
openssl verify -CAfile ca/ca-cert.pem server/server-cert.pem

# Test TLS connection with verbose output
docker exec api-client curl -v \
  --cert /certs/client-cert.pem \
  --key /certs/client-key.pem \
  --cacert /certs/ca-cert.pem \
  https://web-service:443/ 2>&1

# Check if the SAN matches the hostname
openssl x509 -in server/server-cert.pem -noout -ext subjectAltName
```

## Conclusion

Container-to-container TLS adds a meaningful security layer to Docker deployments. The setup involves creating a CA, generating server and client certificates, mounting them into containers, and configuring services to use them. The overhead is minimal (TLS 1.3 adds roughly 1ms per connection), and the benefits include encrypted traffic, service identity verification, and compliance with security standards. Start with TLS for your most sensitive services, such as databases and authentication services, then expand to cover all inter-service communication.
