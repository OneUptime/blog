# How to Configure Mutual TLS (mTLS) Authentication for Client Verification

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: mTLS, TLS, Client Certificate, Nginx, Security, Authentication

Description: Learn how to configure mutual TLS authentication where both the server and client present certificates, enabling strong cryptographic identity verification for APIs and services.

## What Is Mutual TLS?

In standard TLS, only the server presents a certificate (one-way TLS). In mutual TLS (mTLS), both the server and client present certificates. The server verifies the client's certificate against a trusted CA, and the client verifies the server's certificate. This provides strong, cryptographic client identity verification-no passwords or API keys needed.

## mTLS Use Cases

- Internal microservice-to-microservice authentication
- API security for B2B integrations
- VPN/Zero-trust network access
- Kubernetes service mesh (Istio, Linkerd)

## Step 1: Create a Certificate Authority

For mTLS, you need your own CA to sign client certificates:

```bash
# Create CA private key

openssl genrsa -out ca.key 4096

# Create CA certificate (self-signed, valid 10 years)
openssl req -new -x509 -days 3650 -key ca.key \
  -out ca.crt \
  -subj "/C=US/O=My Company/CN=Internal CA"

# Verify CA certificate
openssl x509 -in ca.crt -text -noout | head -20
```

## Step 2: Create a Client Certificate

Generate a key and CSR for the client, then sign it with your CA:

```bash
# Client private key
openssl genrsa -out client.key 2048

# Client Certificate Signing Request (CSR)
openssl req -new -key client.key \
  -out client.csr \
  -subj "/C=US/O=My Company/CN=api-client-01"

# Sign the CSR with your CA
openssl x509 -req -days 365 \
  -in client.csr \
  -CA ca.crt \
  -CAkey ca.key \
  -CAcreateserial \
  -out client.crt

# Bundle client cert and key into PKCS12 (for browser/application import)
openssl pkcs12 -export -out client.p12 \
  -inkey client.key \
  -in client.crt \
  -certfile ca.crt \
  -passout pass:ClientCert@2026!
```

## Step 3: Configure Nginx for mTLS

```nginx
server {
    listen 443 ssl;
    server_name api.example.com;

    # Server certificate
    ssl_certificate     /etc/ssl/certs/api.example.com.crt;
    ssl_certificate_key /etc/ssl/private/api.example.com.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Require client certificate verification
    ssl_client_certificate /etc/ssl/certs/ca.crt;   # Your internal CA
    ssl_verify_client on;                             # Require client cert
    ssl_verify_depth 2;                               # Allow intermediate CAs

    # Pass client certificate info to the backend application
    proxy_set_header X-SSL-Client-Cert $ssl_client_escaped_cert;
    proxy_set_header X-SSL-Client-DN $ssl_client_s_dn;
    proxy_set_header X-SSL-Client-Verify $ssl_client_verify;

    location / {
        # Return 403 if client cert validation fails
        if ($ssl_client_verify != SUCCESS) {
            return 403;
        }

        proxy_pass http://backend:8080;
    }
}
```

## Step 4: Configure Apache for mTLS

```apache
<VirtualHost *:443>
    ServerName api.example.com

    SSLEngine on
    SSLCertificateFile      /etc/ssl/certs/api.example.com.crt
    SSLCertificateKeyFile   /etc/ssl/private/api.example.com.key

    # Require client certificate
    SSLCACertificateFile /etc/ssl/certs/ca.crt
    SSLVerifyClient require
    SSLVerifyDepth 2

    # Pass client cert info to backend
    SSLOptions +StdEnvVars +ExportCertData
    RequestHeader set X-SSL-Client-DN "%{SSL_CLIENT_S_DN}e"
    RequestHeader set X-SSL-Client-Verify "%{SSL_CLIENT_VERIFY}e"
</VirtualHost>
```

## Step 5: Test mTLS with curl

```bash
# Test without client certificate - should fail
curl -v https://api.example.com/

# Test with client certificate
curl -v \
  --cert client.crt \
  --key client.key \
  --cacert ca.crt \
  https://api.example.com/

# Using PKCS12 bundle
curl -v \
  --cert-type P12 \
  --cert client.p12:ClientCert@2026! \
  --cacert ca.crt \
  https://api.example.com/

# Expected: HTTP 200 with client cert
# Without cert or wrong cert: SSL handshake failure or HTTP 400
```

## Step 6: Extract Client Identity in Application Code

```python
# In your Python Flask/FastAPI app, read the client DN from the header
from flask import Flask, request

app = Flask(__name__)

@app.route('/api/resource')
def api_resource():
    # Nginx passes the client DN via header
    client_dn = request.headers.get('X-SSL-Client-DN', '')
    client_verify = request.headers.get('X-SSL-Client-Verify', '')

    if client_verify != 'SUCCESS':
        return {'error': 'Client certificate required'}, 403

    # Modern Nginx (1.11.6+) returns DN in RFC 2253 format:
    # "CN=api-client-01,O=My Company,C=US"
    cn = dict(item.split('=', 1) for item in client_dn.split(','))
    client_name = cn.get('CN', 'unknown')

    return {'authenticated_as': client_name, 'data': 'secure response'}
```

## Conclusion

Mutual TLS provides the strongest form of client authentication by requiring both sides to present cryptographic certificates. Set up your own CA to sign client certificates, configure Nginx with `ssl_verify_client on` pointing to your CA certificate, and test with curl using `--cert` and `--key`. Pass client identity information to your application via HTTP headers for authorization decisions.
