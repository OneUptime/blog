# How to Implement HAProxy SSL Termination on an IPv4 Frontend

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: HAProxy, SSL, TLS, IPv4, HTTPS, Certificate, Security

Description: Configure HAProxy to terminate SSL/TLS connections on a specific IPv4 frontend, decrypting HTTPS traffic and forwarding plain HTTP to backend servers.

## Introduction

HAProxy SSL termination decrypts incoming HTTPS connections at the load balancer, forwarding plain HTTP to backend servers on a trusted internal network. This centralizes certificate management and offloads cryptographic work from application servers.

## Preparing SSL Certificates

HAProxy requires PEM bundles containing the certificate, chain, and private key:

```bash
# Create a directory for certificate bundles
mkdir -p /etc/haproxy/certs/

# Combine certificate, chain, and key into a single PEM bundle
# (HAProxy requires this single-file format)
cat /etc/letsencrypt/live/example.com/fullchain.pem \
    /etc/letsencrypt/live/example.com/privkey.pem \
    > /etc/haproxy/certs/example.com.pem

# Set correct permissions
chmod 600 /etc/haproxy/certs/example.com.pem

# For multiple certificates, place them all in this directory
# HAProxy loads all .pem files from the directory automatically
```

## Basic SSL Termination Configuration

```haproxy
# /etc/haproxy/haproxy.cfg

global
    log /dev/log local0
    maxconn 50000
    ssl-default-bind-ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384
    ssl-default-bind-options ssl-min-ver TLSv1.2 no-tls-tickets
    tune.ssl.default-dh-param 2048

defaults
    mode    http
    timeout connect 5s
    timeout client  60s
    timeout server  60s

# HTTP frontend: redirect to HTTPS
frontend http_in
    bind 203.0.113.10:80
    redirect scheme https code 301 if !{ ssl_fc }

# HTTPS frontend: SSL termination
frontend https_in
    bind 203.0.113.10:443 ssl crt /etc/haproxy/certs/example.com.pem

    # Forward client IP to backends
    option forwardfor

    # Pass TLS info to backends via headers
    http-request set-header X-Forwarded-Proto https
    http-request set-header X-Forwarded-Port 443

    # HSTS header
    http-response set-header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"

    default_backend app_servers

backend app_servers
    balance roundrobin
    option httpchk GET /health

    server app1 192.168.1.10:8080 check
    server app2 192.168.1.11:8080 check
```

## Multiple Certificates with SNI

Load multiple certificates from a directory-HAProxy uses SNI to select the correct one:

```haproxy
frontend https_in
    # Load all certificates from directory (SNI-based selection)
    bind 203.0.113.10:443 ssl crt /etc/haproxy/certs/

    # Route to backend based on the HTTP Host header
    acl is_api  hdr(host) -i api.example.com
    acl is_app  hdr(host) -i app.example.com

    use_backend api_backend if is_api
    use_backend app_backend if is_app
    default_backend web_backend
```

## OCSP Stapling

To preload a cached OCSP response for stapling, save a `.ocsp` file next to the certificate:

```bash
# Fetch OCSP response using the certificate's responder URL
openssl ocsp -issuer /etc/letsencrypt/live/example.com/chain.pem \
  -cert /etc/letsencrypt/live/example.com/cert.pem \
  -url "$(openssl x509 -in /etc/letsencrypt/live/example.com/cert.pem -noout -ocsp_uri)" \
  -respout /etc/haproxy/certs/example.com.ocsp

# HAProxy loads example.com.ocsp automatically when it sits next to example.com.pem
```

## Testing SSL Configuration

```bash
# Check TLS negotiation and stapled OCSP status
openssl s_client -connect 203.0.113.10:443 -servername example.com -status

# Test cipher suites
nmap --script ssl-enum-ciphers -p 443 203.0.113.10

# Check HTTPS response headers on the configured frontend
curl -I --resolve example.com:443:203.0.113.10 https://example.com/

# Verify HAProxy is listening on HTTPS
sudo ss -tlnp | grep haproxy | grep 443
```

## Conclusion

HAProxy SSL termination combines certificate management, TLS offloading, and load balancing in a single configuration. Build PEM bundles from your certificate chain and private key, use `ssl-default-bind-ciphers` and `ssl-min-ver TLSv1.2` in `global` for security hardening, and always forward `X-Forwarded-Proto: https` so backends can construct correct redirect URLs. Use a certificate directory with SNI for hosting multiple HTTPS domains on one IP.
