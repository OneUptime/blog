# How to Configure mTLS Between Services on RHEL

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, MTLS, TLS, Security, Certificates, Linux

Description: Learn how to configure mutual TLS (mTLS) between services on RHEL, covering certificate authority setup, certificate generation, server and client configuration, and certificate rotation strategies.

---

Mutual TLS (mTLS) requires both the client and server to present certificates during the TLS handshake. Unlike standard TLS where only the server proves its identity, mTLS ensures both sides are authenticated. This is essential in zero-trust architectures and microservice environments where you need to verify that every service communicating on the network is who it claims to be.

## How mTLS Works

In a standard TLS connection, the client verifies the server's certificate. In mTLS, the flow adds an extra step:

1. Client connects to server
2. Server presents its certificate
3. Client verifies the server certificate against a trusted CA
4. Server requests the client's certificate
5. Client presents its certificate
6. Server verifies the client certificate against a trusted CA
7. Both sides derive session keys and communication begins

## Prerequisites

- Two or more RHEL systems (or services on the same host)
- OpenSSL installed (included by default)
- Root or sudo access

## Creating a Certificate Authority

Start by creating a private CA that will sign both server and client certificates:

```bash
# Create a directory structure for the CA
mkdir -p /etc/pki/mtls/{ca,server,client}
cd /etc/pki/mtls/ca
```

```bash
# Generate the CA private key
openssl genrsa -out ca.key 4096
```

```bash
# Create the CA certificate
openssl req -new -x509 -days 3650 -key ca.key -out ca.crt \
  -subj "/C=US/ST=California/O=MyOrg/CN=MyOrg Internal CA"
```

## Generating Server Certificates

Create a certificate for the server:

```bash
# Generate server private key
cd /etc/pki/mtls/server
openssl genrsa -out server.key 2048
```

```bash
# Create a server certificate signing request
openssl req -new -key server.key -out server.csr \
  -subj "/C=US/ST=California/O=MyOrg/CN=server.internal"
```

Create an extensions file for the server certificate:

```bash
# Create extensions file with SANs
cat > server-ext.cnf << 'EOF'
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage=digitalSignature,keyEncipherment
extendedKeyUsage=serverAuth
subjectAltName=@alt_names

[alt_names]
DNS.1=server.internal
DNS.2=localhost
IP.1=127.0.0.1
IP.2=10.0.0.10
EOF
```

```bash
# Sign the server certificate with the CA
openssl x509 -req -days 365 -in server.csr -CA ../ca/ca.crt -CAkey ../ca/ca.key \
  -CAcreateserial -out server.crt -extfile server-ext.cnf
```

## Generating Client Certificates

Create a certificate for the client:

```bash
# Generate client private key
cd /etc/pki/mtls/client
openssl genrsa -out client.key 2048
```

```bash
# Create a client certificate signing request
openssl req -new -key client.key -out client.csr \
  -subj "/C=US/ST=California/O=MyOrg/CN=client-service-a"
```

```bash
# Create client extensions file
cat > client-ext.cnf << 'EOF'
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage=digitalSignature
extendedKeyUsage=clientAuth
EOF
```

```bash
# Sign the client certificate with the CA
openssl x509 -req -days 365 -in client.csr -CA ../ca/ca.crt -CAkey ../ca/ca.key \
  -CAcreateserial -out client.crt -extfile client-ext.cnf
```

## Verifying Certificates

Check that the certificates are valid:

```bash
# Verify server certificate against CA
openssl verify -CAfile /etc/pki/mtls/ca/ca.crt /etc/pki/mtls/server/server.crt
```

```bash
# Verify client certificate against CA
openssl verify -CAfile /etc/pki/mtls/ca/ca.crt /etc/pki/mtls/client/client.crt
```

## Configuring an Nginx Server with mTLS

Install and configure Nginx to require client certificates:

```bash
# Install Nginx
sudo dnf install -y nginx
```

```bash
# Configure Nginx with mTLS
sudo tee /etc/nginx/conf.d/mtls.conf > /dev/null << 'EOF'
server {
    listen 8443 ssl;
    server_name server.internal;

    ssl_certificate /etc/pki/mtls/server/server.crt;
    ssl_certificate_key /etc/pki/mtls/server/server.key;

    # Require client certificate
    ssl_client_certificate /etc/pki/mtls/ca/ca.crt;
    ssl_verify_client on;
    ssl_verify_depth 2;

    # TLS settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        return 200 "mTLS verified. Client: $ssl_client_s_dn\n";
        add_header Content-Type text/plain;
    }
}
EOF
```

```bash
# Restart Nginx
sudo systemctl restart nginx
```

## Testing mTLS with curl

Test the connection with client certificates:

```bash
# This should succeed - client certificate provided
curl --cacert /etc/pki/mtls/ca/ca.crt \
     --cert /etc/pki/mtls/client/client.crt \
     --key /etc/pki/mtls/client/client.key \
     https://server.internal:8443/
```

```bash
# This should fail - no client certificate
curl --cacert /etc/pki/mtls/ca/ca.crt \
     https://server.internal:8443/
```

## Configuring mTLS Between Python Services

For a Python server using mTLS:

```python
# server.py
import ssl
from http.server import HTTPServer, BaseHTTPRequestHandler

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-Type", "text/plain")
        self.end_headers()
        peer_cert = self.connection.getpeercert()
        cn = dict(x[0] for x in peer_cert["subject"])["commonName"]
        self.wfile.write(f"Hello {cn}, mTLS verified\n".encode())

context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
context.load_cert_chain("/etc/pki/mtls/server/server.crt", "/etc/pki/mtls/server/server.key")
context.load_verify_locations("/etc/pki/mtls/ca/ca.crt")
context.verify_mode = ssl.CERT_REQUIRED

server = HTTPServer(("0.0.0.0", 8443), Handler)
server.socket = context.wrap_socket(server.socket, server_side=True)
server.serve_forever()
```

For a Python client:

```python
# client.py
import ssl
import urllib.request

context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
context.load_cert_chain("/etc/pki/mtls/client/client.crt", "/etc/pki/mtls/client/client.key")
context.load_verify_locations("/etc/pki/mtls/ca/ca.crt")

response = urllib.request.urlopen("https://server.internal:8443/", context=context)
print(response.read().decode())
```

## Setting File Permissions

Lock down the certificate files:

```bash
# Set restrictive permissions on private keys
sudo chmod 600 /etc/pki/mtls/ca/ca.key
sudo chmod 600 /etc/pki/mtls/server/server.key
sudo chmod 600 /etc/pki/mtls/client/client.key

# Certificates can be world-readable
sudo chmod 644 /etc/pki/mtls/ca/ca.crt
sudo chmod 644 /etc/pki/mtls/server/server.crt
sudo chmod 644 /etc/pki/mtls/client/client.crt
```

## Certificate Rotation Strategy

Certificates expire and need to be rotated. A practical approach:

1. Generate new certificates before the old ones expire (at least 30 days in advance)
2. Configure services to accept both old and new CA certificates during the transition
3. Roll out new certificates to all services
4. Remove the old CA certificate once all services have updated

You can automate this with a cron job:

```bash
# Check certificate expiration
openssl x509 -enddate -noout -in /etc/pki/mtls/server/server.crt
```

```bash
# Script to check and alert on expiring certificates
cat > /usr/local/bin/check-cert-expiry.sh << 'SCRIPT'
#!/bin/bash
CERT_FILE="$1"
DAYS_WARN=30
expiry=$(openssl x509 -enddate -noout -in "$CERT_FILE" | cut -d= -f2)
expiry_epoch=$(date -d "$expiry" +%s)
now_epoch=$(date +%s)
days_left=$(( (expiry_epoch - now_epoch) / 86400 ))
if [ "$days_left" -lt "$DAYS_WARN" ]; then
    echo "WARNING: $CERT_FILE expires in $days_left days"
fi
SCRIPT
chmod +x /usr/local/bin/check-cert-expiry.sh
```

## Conclusion

Configuring mTLS between services on RHEL ensures that both sides of every connection are authenticated, which is a fundamental building block for zero-trust networking. By setting up your own CA, generating properly scoped certificates, and enforcing client certificate verification, you create a secure communication channel that prevents unauthorized services from accessing your internal APIs.
