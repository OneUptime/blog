# How to Configure OCSP Stapling for IPv6 Servers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OCSP, TLS, IPv6, Nginx, Apache, Certificate Revocation, SSL

Description: Configure OCSP stapling on IPv6 web servers to improve TLS handshake performance and reduce certificate revocation check latency without requiring clients to contact the CA.

---

OCSP stapling allows your web server to pre-fetch and cache certificate revocation status from the Certificate Authority, then include it in the TLS handshake. This eliminates the need for clients to perform a separate OCSP lookup, improving performance and privacy.

## What is OCSP Stapling?

In a standard TLS handshake without stapling, the client must contact the CA's OCSP responder to check if the certificate has been revoked. With stapling:

1. The web server periodically fetches the OCSP response from the CA.
2. The server includes (staples) this response in the TLS handshake.
3. Clients verify the stapled response without a separate network request.

For IPv6 servers, this also means the server must have IPv6 access to reach the CA's OCSP responder.

## Configuring OCSP Stapling in Nginx

```nginx
# /etc/nginx/nginx.conf (http block)

http {
    # Enable OCSP stapling globally
    ssl_stapling on;
    ssl_stapling_verify on;

    # Resolver for OCSP responder lookups (use IPv6-capable DNS)
    # [::1] = localhost IPv6, can also use public resolvers
    resolver [2001:4860:4860::8888] [2001:4860:4860::8844] valid=300s;
    resolver_timeout 5s;
}

# /etc/nginx/sites-available/default (server block)
server {
    listen [::]:443 ssl;
    listen 443 ssl;
    http2 on;

    server_name yourdomain.example.com;

    ssl_certificate     /etc/letsencrypt/live/yourdomain.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.example.com/privkey.pem;

    # The trusted CA certificate chain (for OCSP verification)
    # fullchain.pem already includes the chain for Let's Encrypt
    ssl_trusted_certificate /etc/letsencrypt/live/yourdomain.example.com/chain.pem;
}
```

Reload Nginx and verify:

```bash
sudo nginx -t && sudo systemctl reload nginx

# Test OCSP stapling is working (look for "OCSP Response Status: successful")
openssl s_client -connect '[2001:db8::1]:443' \
  -servername yourdomain.example.com \
  -status < /dev/null 2>&1 | grep -A 10 "OCSP"
```

## Configuring OCSP Stapling in Apache

```apache
# /etc/apache2/sites-available/yourdomain.conf
<VirtualHost [::]:443>
    ServerName yourdomain.example.com

    SSLEngine on
    SSLCertificateFile     /etc/letsencrypt/live/yourdomain.example.com/cert.pem
    SSLCertificateKeyFile  /etc/letsencrypt/live/yourdomain.example.com/privkey.pem
    SSLCertificateChainFile /etc/letsencrypt/live/yourdomain.example.com/chain.pem

    # Enable OCSP stapling
    SSLUseStapling on
</VirtualHost>

# In the global config (outside VirtualHost)
# /etc/apache2/conf-available/ssl-params.conf
SSLStaplingCache "shmcb:/var/run/apache2/stapling_cache(128000)"
SSLStaplingResponseMaxAge 900
```

```bash
sudo a2enmod ssl
sudo a2enconf ssl-params
sudo apache2ctl configtest && sudo systemctl reload apache2
```

## Testing OCSP Stapling on IPv6

```bash
# Test from a remote host using the IPv6 address
openssl s_client \
  -connect '[2001:db8::1]:443' \
  -servername yourdomain.example.com \
  -status \
  -quiet < /dev/null

# Look for in the output:
# OCSP Response Status: successful (0x0)
# This indicates the server is stapling the OCSP response

# Use SSL Labs to test publicly
curl -s "https://api.ssllabs.com/api/v3/analyze?host=yourdomain.example.com" \
  | jq '.endpoints[].details.ocspStapling'
```

## Ensuring the Server Can Reach OCSP Responders over IPv6

```bash
# Check the OCSP URL from your certificate
openssl x509 -in /etc/letsencrypt/live/yourdomain.example.com/cert.pem \
  -noout -text | grep "OCSP"

# Expected output like:
# OCSP - URI:http://r3.o.lencr.org

# Test reachability of the OCSP responder over IPv6
curl -6 http://r3.o.lencr.org
# (May return an error as it's an OCSP endpoint, but connection itself should work)

# Direct OCSP query
openssl ocsp \
  -issuer /etc/letsencrypt/live/yourdomain.example.com/chain.pem \
  -cert   /etc/letsencrypt/live/yourdomain.example.com/cert.pem \
  -url    http://r3.o.lencr.org \
  -text
```

## Common OCSP Stapling Issues on IPv6 Servers

| Issue | Cause | Fix |
|-------|-------|-----|
| No OCSP response in handshake | Server can't reach OCSP URL | Check IPv6 outbound routing and DNS |
| OCSP response expired | Server can't refresh OCSP | Ensure outbound reachability to the responder, or pre-fetch and load with `ssl_stapling_file` |
| Resolver errors in Nginx | IPv6 resolver not configured | Add IPv6 resolver addresses |
| Chain verification failed | Missing `ssl_trusted_certificate` | Set the CA chain file |

OCSP stapling significantly improves TLS performance by eliminating client-side OCSP checks, and properly configuring IPv6-capable resolvers ensures reliable staple fetching on IPv6 servers.
