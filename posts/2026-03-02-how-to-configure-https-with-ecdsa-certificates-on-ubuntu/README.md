# How to Configure HTTPS with ECDSA Certificates on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, HTTPS, TLS, Nginx, Security

Description: Configure HTTPS on Ubuntu using ECDSA certificates for faster TLS handshakes and smaller key sizes compared to RSA, with Nginx and Let's Encrypt examples.

---

RSA has been the default certificate algorithm for decades, but ECDSA (Elliptic Curve Digital Signature Algorithm) offers smaller key sizes with equivalent or better security. A 256-bit ECDSA key is considered comparable to a 3072-bit RSA key in security strength. Smaller keys mean faster TLS handshakes, less CPU usage, and smaller certificate chains.

## Why ECDSA Over RSA

The performance difference shows up most clearly under load. ECDSA key operations are significantly faster than RSA operations of equivalent strength. This matters for web servers handling thousands of TLS handshakes per second.

Key size comparison:
- RSA 2048 bits: minimum acceptable, increasingly obsolete
- RSA 4096 bits: strong but slow
- ECDSA P-256 (secp256r1): fast, strong, widely supported
- ECDSA P-384 (secp384r1): stronger, slightly slower, good for high-security contexts

All modern browsers and TLS clients support ECDSA P-256 and P-384. The only scenario where RSA might be necessary is legacy clients running on ancient operating systems.

## Generating an ECDSA Key and CSR

For a self-signed certificate or a CSR to submit to a CA:

```bash
# Generate an ECDSA P-256 private key
openssl ecparam -name prime256v1 -genkey -noout -out ecdsa-private.key

# Generate an ECDSA P-384 key (stronger, slower)
openssl ecparam -name secp384r1 -genkey -noout -out ecdsa-384-private.key

# View the key parameters
openssl ec -in ecdsa-private.key -text -noout

# Create a CSR (Certificate Signing Request) for the ECDSA key
openssl req -new \
  -key ecdsa-private.key \
  -out ecdsa-certificate.csr \
  -subj "/C=US/ST=California/L=San Francisco/O=MyCompany/CN=example.com"

# Add Subject Alternative Names (required for modern certificates)
cat > openssl-san.cnf << 'EOF'
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = US
ST = California
L = San Francisco
O = My Company
CN = example.com

[v3_req]
subjectAltName = @alt_names

[alt_names]
DNS.1 = example.com
DNS.2 = www.example.com
DNS.3 = api.example.com
EOF

# Generate CSR with SANs
openssl req -new \
  -key ecdsa-private.key \
  -out ecdsa-san.csr \
  -config openssl-san.cnf

# Generate a self-signed certificate for testing
openssl req -new -x509 \
  -key ecdsa-private.key \
  -out ecdsa-selfsigned.crt \
  -days 365 \
  -config openssl-san.cnf \
  -extensions v3_req
```

## Getting ECDSA Certificates with Let's Encrypt

Certbot supports ECDSA certificates with the `--key-type ecdsa` flag:

```bash
# Install Certbot and the Nginx plugin
sudo apt update
sudo apt install -y certbot python3-certbot-nginx

# Request an ECDSA certificate
sudo certbot certonly \
  --nginx \
  --key-type ecdsa \
  --elliptic-curve secp256r1 \
  -d example.com \
  -d www.example.com \
  --email admin@example.com \
  --agree-tos \
  --non-interactive

# Verify the certificate type
sudo openssl x509 -in /etc/letsencrypt/live/example.com/cert.pem \
  -text -noout | grep -E "Public Key Algorithm|ASN1 OID"
# Should show "EC" and "prime256v1"
```

For domains where you want both RSA and ECDSA certificates (dual-cert setup for maximum compatibility):

```bash
# Get an ECDSA certificate
sudo certbot certonly \
  --nginx \
  --key-type ecdsa \
  --elliptic-curve secp256r1 \
  -d example.com \
  --cert-name example.com-ecdsa

# Get an RSA certificate with a different name
sudo certbot certonly \
  --nginx \
  --key-type rsa \
  --rsa-key-size 2048 \
  -d example.com \
  --cert-name example.com-rsa
```

## Configuring Nginx with ECDSA Certificates

Install Nginx and configure it to use your ECDSA certificate:

```bash
sudo apt install -y nginx
```

Write the Nginx configuration:

```nginx
# /etc/nginx/sites-available/example.com

# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name example.com www.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name example.com www.example.com;

    # ECDSA certificate and key from Let's Encrypt
    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    # Modern TLS configuration optimized for ECDSA
    ssl_protocols TLSv1.2 TLSv1.3;

    # Prefer ECDSA cipher suites
    # ECDSA ciphers work with ECDSA keys; RSA ciphers will fail silently
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305;

    # Let the client choose the cipher (modern recommendation)
    ssl_prefer_server_ciphers off;

    # Session configuration
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    # OCSP Stapling - reduces handshake time by bundling cert status
    ssl_stapling on;
    ssl_stapling_verify on;
    ssl_trusted_certificate /etc/letsencrypt/live/example.com/chain.pem;
    resolver 8.8.8.8 1.1.1.1 valid=300s;
    resolver_timeout 5s;

    # HSTS - tell browsers to always use HTTPS
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

    # Other security headers
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;

    # Document root
    root /var/www/example.com;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

Enable the site and test:

```bash
sudo ln -s /etc/nginx/sites-available/example.com /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

## Dual Certificate Configuration (ECDSA + RSA)

For maximum compatibility with older clients while giving modern clients the performance benefits of ECDSA, serve both certificates:

```nginx
server {
    listen 443 ssl http2;
    server_name example.com;

    # ECDSA certificate
    ssl_certificate /etc/letsencrypt/live/example.com-ecdsa/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com-ecdsa/privkey.pem;

    # RSA certificate as fallback for older clients
    ssl_certificate /etc/letsencrypt/live/example.com-rsa/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com-rsa/privkey.pem;

    # Cipher suites covering both key types
    # ECDSA ciphers (ECDHE-ECDSA) for modern clients
    # RSA ciphers (ECDHE-RSA) for older clients
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;

    ssl_protocols TLSv1.2 TLSv1.3;
}
```

## Verifying ECDSA Configuration

```bash
# Test locally with OpenSSL
openssl s_client -connect example.com:443 -servername example.com

# Look for these lines in the output:
# Certificate chain shows EC (not RSA)
# Cipher: ECDHE-ECDSA-AES128-GCM-SHA256 (or similar ECDSA cipher)
# Server public key is 256 bit

# Check the certificate details
echo | openssl s_client -connect example.com:443 2>/dev/null | \
  openssl x509 -text -noout | grep -E "Public Key|Signature Algorithm|Subject Alt"

# Test TLS handshake time (ECDSA should be faster than RSA)
time openssl s_client -connect example.com:443 -no_ticket < /dev/null

# Use testssl.sh for a comprehensive check
bash testssl.sh example.com
```

## Apache Configuration

For Apache on Ubuntu:

```apache
# /etc/apache2/sites-available/example.com-ssl.conf
<VirtualHost *:443>
    ServerName example.com
    DocumentRoot /var/www/example.com

    # ECDSA certificate
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/example.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/example.com/privkey.pem

    # Modern TLS settings
    SSLProtocol all -SSLv3 -TLSv1 -TLSv1.1
    SSLCipherSuite ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305
    SSLHonorCipherOrder off
    SSLSessionTickets off

    # HSTS
    Header always set Strict-Transport-Security "max-age=63072000"
</VirtualHost>
```

ECDSA certificates are worth the slightly more involved setup process. The smaller handshake overhead adds up noticeably on high-traffic servers, and the reduced CPU usage on the server side is a real operational benefit.
