# How to Configure SSL/TLS Termination with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, SSL, TLS, Security, Container, HTTPS

Description: Learn how to configure SSL/TLS termination for Podman containers using Nginx and self-signed or CA-signed certificates to secure traffic between clients and your services.

---

> SSL/TLS termination decrypts incoming HTTPS traffic at the proxy layer, so backend containers can serve plain HTTP while clients benefit from encrypted connections. This simplifies certificate management and reduces the computational load on individual services.

Securing web traffic with TLS is a baseline requirement for any production deployment. Rather than configuring each container with its own certificate, a common pattern is to terminate TLS at a reverse proxy that sits in front of your services. The proxy handles all encryption and decryption, forwarding plain HTTP requests to backend containers over an internal network.

This guide walks through configuring TLS termination for Podman containers, covering both self-signed certificates for development and CA-signed certificates for production use.

---

## Prerequisites

- Podman 4.0 or later
- OpenSSL for certificate generation
- A Linux system with systemd

Verify your tools:

```bash
podman --version
openssl version
```

## Understanding TLS Termination

In a TLS termination setup, the architecture looks like this:

```text
Client (HTTPS) --> Reverse Proxy (terminates TLS) --> Backend Container (HTTP)
```

The reverse proxy holds the TLS certificate and private key. It decrypts incoming requests, forwards them as plain HTTP to the backend, and then encrypts the response before sending it back to the client. The internal network between the proxy and backends remains unencrypted but is isolated within the Podman network.

## Creating a Self-Signed Certificate

For development and testing, a self-signed certificate works well. Generate one with OpenSSL:

```bash
mkdir -p ~/certs

openssl req -x509 \
  -noenc \
  -days 365 \
  -newkey rsa:2048 \
  -keyout ~/certs/server.key \
  -out ~/certs/server.crt \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=example.com" \
  -addext "subjectAltName=DNS:example.com,DNS:*.example.com,DNS:localhost,IP:127.0.0.1"
```

The `-addext` flag adds Subject Alternative Names (SANs), which modern browsers require. The wildcard entry `*.example.com` covers first-level subdomains such as `api.example.com`.

Verify the certificate:

```bash
openssl x509 -in ~/certs/server.crt -text -noout
```

## Setting Up the Podman Network

Create an isolated network for your services:

```bash
podman network create tls-net
```

## Launching a Backend Service

Start a simple backend container:

```bash
podman run -d \
  --name backend \
  --network tls-net \
  docker.io/library/nginx:alpine
```

This container serves HTTP on port 80 and is only reachable through the Podman network.

## Configuring Nginx for TLS Termination

Create the Nginx configuration directory:

```bash
mkdir -p ~/nginx-tls/conf.d
```

Write the TLS configuration:

```bash
cat > ~/nginx-tls/conf.d/default.conf << 'EOF'
server {
    listen 80;
    server_name _;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name example.com;

    ssl_certificate /etc/nginx/certs/server.crt;
    ssl_certificate_key /etc/nginx/certs/server.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;
    ssl_session_tickets off;

    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;

    location / {
        proxy_pass http://backend:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
```

Key points in this configuration:

- The first server block redirects all HTTP traffic to HTTPS
- `ssl_protocols` restricts connections to TLS 1.2 and 1.3, disabling older insecure versions
- The `ssl_ciphers` directive specifies strong cipher suites
- `Strict-Transport-Security` (HSTS) tells browsers to always use HTTPS
- `X-Forwarded-Proto` informs the backend that the original request was HTTPS

## Running the TLS Proxy

Launch the Nginx container with certificates and configuration mounted:

```bash
podman run -d \
  --name tls-proxy \
  --network tls-net \
  -p 80:80 \
  -p 443:443 \
  -v ~/nginx-tls/conf.d:/etc/nginx/conf.d:ro,Z \
  -v ~/certs:/etc/nginx/certs:ro,Z \
  docker.io/library/nginx:alpine
```

## Testing TLS Termination

Test the HTTPS endpoint:

```bash
curl -k https://localhost
```

The `-k` flag tells curl to accept the self-signed certificate. To test without this flag, add the certificate to your system's trust store.

Verify the HTTP to HTTPS redirect:

```bash
curl -I http://localhost
```

You should see a `301 Moved Permanently` response with a `Location` header pointing to `https://`.

Check the TLS configuration:

```bash
openssl s_client -connect localhost:443 -servername example.com < /dev/null 2>/dev/null | openssl x509 -noout -subject -dates
```

## Generating a Certificate Signing Request for Production

For production use, you need a certificate from a trusted Certificate Authority. Generate a CSR:

```bash
openssl req -new \
  -newkey rsa:2048 \
  -noenc \
  -keyout ~/certs/production.key \
  -out ~/certs/production.csr \
  -subj "/C=US/ST=State/L=City/O=YourCompany/CN=yourdomain.com" \
  -addext "subjectAltName=DNS:yourdomain.com,DNS:www.yourdomain.com"
```

Submit the CSR file to your CA and replace the certificate files once you receive the signed certificate.

## Mutual TLS (mTLS)

For service-to-service authentication, you can configure mutual TLS where both the client and server present certificates:

```nginx
server {
    listen 443 ssl;
    server_name api.example.com;

    ssl_certificate /etc/nginx/certs/server.crt;
    ssl_certificate_key /etc/nginx/certs/server.key;

    ssl_client_certificate /etc/nginx/certs/ca.crt;
    ssl_verify_client on;

    ssl_protocols TLSv1.2 TLSv1.3;

    location / {
        proxy_pass http://backend:80;
        proxy_set_header X-Client-Cert-DN $ssl_client_s_dn;
        proxy_set_header X-Client-Cert-Verify $ssl_client_verify;
    }
}
```

The `ssl_verify_client on` directive requires clients to present a valid certificate signed by the CA specified in `ssl_client_certificate`.

## Optimizing TLS Performance

### OCSP Stapling

OCSP stapling improves TLS handshake performance by caching the certificate's revocation status:

```nginx
ssl_stapling on;
ssl_stapling_verify on;
resolver 8.8.8.8 8.8.4.4 valid=300s;
resolver_timeout 5s;
```

### Session Resumption

TLS session tickets allow clients to resume sessions without a full handshake:

```nginx
ssl_session_timeout 1d;
ssl_session_cache shared:SSL:50m;
ssl_session_tickets on;
```

### HTTP/2 Support

Enable HTTP/2 for better performance with multiplexed connections:

```nginx
server {
    listen 443 ssl;
    http2 on;
    # ... rest of configuration
}
```

Note: The `http2` parameter on the `listen` directive (e.g., `listen 443 ssl http2`) was deprecated in Nginx 1.25.1. Use the separate `http2 on;` directive instead, which is supported in Nginx 1.25.1 and later.

## Certificate Renewal Script

Create a script to handle certificate replacement:

```bash
cat > ~/certs/renew.sh << 'SCRIPT'
#!/bin/bash
CERT_DIR="$HOME/certs"
CONTAINER_NAME="tls-proxy"

# Copy new certificates into place

cp /path/to/new/cert.crt "$CERT_DIR/server.crt"
cp /path/to/new/cert.key "$CERT_DIR/server.key"

# Reload Nginx configuration
podman exec "$CONTAINER_NAME" nginx -s reload

echo "Certificate renewed and Nginx reloaded"
SCRIPT
chmod +x ~/certs/renew.sh
```

## Verifying the Configuration

Run a comprehensive check with the `testssl.sh` tool:

```bash
podman run --rm --network tls-net \
  docker.io/drwetter/testssl.sh \
  https://tls-proxy:443
```

This tool reports on protocol support, cipher suites, vulnerabilities, and certificate details.

## Conclusion

SSL/TLS termination at the proxy layer is a clean and effective pattern for securing containerized services running in Podman. By centralizing certificate management at the reverse proxy, you simplify your backend containers and maintain a single point for security configuration. Whether you use self-signed certificates for development or CA-signed certificates for production, the setup remains the same. Combined with modern TLS settings like TLS 1.3, HSTS headers, and OCSP stapling, this approach provides strong security with minimal operational complexity.
