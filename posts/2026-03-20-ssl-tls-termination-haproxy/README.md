# How to Set Up SSL/TLS Termination on HAProxy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: HAProxy, TLS, SSL Termination, Load Balancer, HTTPS, Security

Description: Learn how to configure HAProxy as a TLS termination proxy that decrypts HTTPS traffic and forwards plain HTTP to backend servers, with strong cipher and protocol settings.

## What Is TLS Termination?

TLS termination means the load balancer (HAProxy) handles the TLS encryption/decryption, forwarding unencrypted HTTP to backend servers. This offloads TLS processing from application servers, centralizes certificate management, and enables L7 routing decisions on the decrypted request.

## Step 1: Install HAProxy

```bash
# Install HAProxy (Ubuntu/Debian)

sudo apt-get install -y haproxy

# Verify version and OpenSSL build details
haproxy -vv
```

## Step 2: Prepare the Certificate

For this simple `crt` configuration, HAProxy can use a single PEM file containing the certificate, chain, and private key:

```bash
# Create the certificate directory
sudo mkdir -p /etc/haproxy/certs

# Combine certificate chain and private key into one file
sudo sh -c 'cat fullchain.pem privkey.pem > /etc/haproxy/certs/example.com.pem'

# Set secure permissions
sudo chmod 600 /etc/haproxy/certs/example.com.pem
sudo chown haproxy:haproxy /etc/haproxy/certs/example.com.pem
```

## Step 3: Configure HAProxy for TLS Termination

```text
# /etc/haproxy/haproxy.cfg

global
    log /dev/log local0
    chroot /var/lib/haproxy
    stats socket /run/haproxy/admin.sock mode 660 level admin expose-fd listeners
    stats timeout 30s
    user haproxy
    group haproxy
    daemon

    # SSL tuning
    ssl-default-bind-ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305
    ssl-default-bind-ciphersuites TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256
    ssl-default-bind-options ssl-min-ver TLSv1.2 no-tls-tickets

defaults
    log     global
    mode    http
    option  httplog
    timeout connect 5000ms
    timeout client  50000ms
    timeout server  50000ms

#------------------------------------------------------
# HTTPS Frontend - TLS Termination
#------------------------------------------------------
frontend https_frontend
    # Use TLS 1.2 minimum and load multiple certs for SNI
    bind *:443 ssl crt /etc/haproxy/certs/example.com.pem crt /etc/haproxy/certs/other-site.pem ssl-min-ver TLSv1.2 alpn h2,http/1.1

    # Set HSTS header on all HTTPS responses
    http-response set-header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"

    # X-Forwarded-Proto so backends know the original scheme
    http-request set-header X-Forwarded-Proto https

    # Route to backend
    default_backend web_servers

#------------------------------------------------------
# HTTP Frontend - Redirect to HTTPS
#------------------------------------------------------
frontend http_frontend
    bind *:80
    http-request redirect scheme https code 301

#------------------------------------------------------
# Backend Web Servers
#------------------------------------------------------
backend web_servers
    balance roundrobin
    option forwardfor       # Add X-Forwarded-For header
    option http-server-close
    option httpchk GET /health

    server web1 192.168.1.10:80 check inter 5s rise 2 fall 3
    server web2 192.168.1.11:80 check inter 5s rise 2 fall 3
    server web3 192.168.1.12:80 check inter 5s rise 2 fall 3 backup
```

## Step 4: Enable HAProxy Stats (Optional)

```text
#------------------------------------------------------
# Stats Page
#------------------------------------------------------
frontend stats
    bind *:8404
    stats enable
    stats uri /stats
    stats refresh 10s
    stats show-legends
    stats auth admin:StatsP@ss!
```

## Step 5: Test and Reload HAProxy

```bash
# Validate configuration syntax
sudo haproxy -c -f /etc/haproxy/haproxy.cfg

# Reload without dropping connections (graceful reload)
sudo systemctl reload haproxy

# Or use the HAProxy master CLI, if you configured a master socket
echo "reload" | sudo socat -t300 /run/haproxy-master.sock stdin
```

## Step 6: Add Multiple Certificates (SNI)

HAProxy supports multiple certificates via SNI by specifying a directory:

```bash
# Store all PEM files in a directory
ls /etc/haproxy/certs/
# example.com.pem
# api.example.com.pem
# other-site.com.pem
```

Reference the directory in the bind directive:

```text
frontend https_frontend
    bind *:443 ssl crt /etc/haproxy/certs/ alpn h2,http/1.1
```

HAProxy automatically selects the correct certificate when the SNI hostname matches a certificate's CN or SAN.

## Step 7: Verify TLS Configuration

```bash
# Test TLS handshake
echo | openssl s_client -connect example.com:443 -servername example.com 2>&1 | \
  grep -E "Protocol|Cipher|Verify"

# Run testssl.sh for comprehensive check
./testssl.sh example.com

# Check HAProxy stats
curl -u 'admin:StatsP@ss!' http://server:8404/stats
```

## Conclusion

HAProxy TLS termination centralizes certificate management and offloads TLS processing from backend servers. Combine certificate and key into a single PEM file, configure strong cipher suites in the global section, set `ssl-min-ver TLSv1.2`, and use SNI with a certificate directory for multiple domains. Always forward `X-Forwarded-Proto: https` so backends know the original connection was secure.
