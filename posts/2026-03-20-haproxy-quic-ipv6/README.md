# How to Configure HAProxy with QUIC and IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: HAProxy, QUIC, HTTP/3, IPv6, Load Balancer

Description: Configure HAProxy 2.6+ to terminate QUIC/HTTP3 connections on IPv6 and load balance traffic to backend servers.

## Prerequisites

- HAProxy 2.7+ (HTTP/3 over QUIC was introduced experimentally in 2.6)
- A QUIC-compatible TLS library such as quictls or BoringSSL compiled into HAProxy
- SSL certificate for your domain

## Step 1: Verify HAProxy QUIC Support

```bash
# Check HAProxy version and QUIC support

haproxy -vv 2>&1 | grep -E "Feature|QUIC|quic|version"

# Look for: "+QUIC" in the feature list output
# If QUIC is not listed, you need to compile with QUIC support
```

## Step 2: Compile HAProxy with QUIC (if needed)

```bash
# Install dependencies
sudo apt-get install build-essential git perl libpcre2-dev zlib1g-dev

# Build against quictls (a QUIC-compatible OpenSSL fork)
git clone https://github.com/quictls/openssl
cd openssl
git checkout OpenSSL_1_1_1t+quic
sudo mkdir -p /opt/quictls
./Configure --libdir=lib --prefix=/opt/quictls
make && sudo make install

cd /tmp && git clone https://github.com/haproxy/haproxy
cd haproxy
make TARGET=linux-glibc \
  USE_OPENSSL=1 \
  USE_QUIC=1 \
  SSL_INC=/opt/quictls/include \
  SSL_LIB=/opt/quictls/lib \
  LDFLAGS="-Wl,-rpath,/opt/quictls/lib" \
  USE_PCRE2=1
sudo make install
```

## Step 3: Configure HAProxy for QUIC/HTTP3 over IPv6

```haproxy
# /etc/haproxy/haproxy.cfg

global
    log /dev/log local0
    maxconn 50000
    nbthread 4
    tune.ssl.default-dh-param 2048

defaults
    log     global
    mode    http
    timeout connect 5s
    timeout client  30s
    timeout server  30s

# QUIC/HTTP3 frontend on IPv6
frontend https_ipv6
    # Bind on all IPv6 addresses - both TCP (HTTP/2) and UDP (QUIC/HTTP3)
    bind [::]:443 ssl crt /etc/ssl/certs/example.com.pem alpn h2,http/1.1
    bind quic6@:443 ssl crt /etc/ssl/certs/example.com.pem alpn h3

    # Also bind on IPv4
    bind 0.0.0.0:443 ssl crt /etc/ssl/certs/example.com.pem alpn h2,http/1.1
    bind quic4@:443 ssl crt /etc/ssl/certs/example.com.pem alpn h3

    # Advertise HTTP/3 support
    http-response set-header alt-svc "h3=\":443\";ma=86400;"

    # 0-RTT is disabled by default; add allow-0rtt on the QUIC bind lines only for replay-safe requests

    default_backend webservers

# HTTP redirect
frontend http_ipv6
    bind [::]:80
    bind 0.0.0.0:80
    http-request redirect scheme https code 301

# Backend servers
backend webservers
    balance roundrobin
    server web1 [2001:db8::10]:8080 check
    server web2 [2001:db8::11]:8080 check
    server web3 192.168.1.10:8080 check  # IPv4 backend also supported
```

## Step 4: Configure TLS for QUIC

QUIC requires TLS 1.3. Ensure your certificate file contains the full chain:

```bash
# Combine key, certificate, and chain into a single PEM file (HAProxy format)
cat /etc/ssl/private/example.com.key \
    /etc/ssl/certs/example.com.crt \
    /etc/ssl/certs/chain.crt > /etc/ssl/certs/example.com.pem

# Verify TLS 1.3 is available
openssl s_client -connect [2001:db8::1]:443 -tls1_3
```

## Step 5: Firewall Rules

```bash
# Open TCP 80/443 and UDP 443
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 443/udp
sudo ip6tables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo ip6tables -A INPUT -p tcp --dport 443 -j ACCEPT
sudo ip6tables -A INPUT -p udp --dport 443 -j ACCEPT
```

## Step 6: Verify and Monitor

```bash
# Test HAProxy config
sudo haproxy -c -f /etc/haproxy/haproxy.cfg

# Reload HAProxy
sudo systemctl reload haproxy

# Test HTTP/3 over IPv6
curl -6 --http3-only https://example.com -v 2>&1 | grep -E "HTTP/3|using"

# View HAProxy stats (enable stats in config first)
curl http://[::1]:8404/stats
```

## Monitoring QUIC Metrics

```haproxy
# Add stats endpoint to haproxy.cfg
frontend stats
    bind [::1]:8404
    stats enable
    stats uri /stats
    stats refresh 10s
    # Detailed QUIC connection information is available via the Runtime API's "show quic" command in HAProxy 2.7+
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to monitor HAProxy's frontend availability over IPv6 via both TCP (HTTP/2) and UDP (HTTP/3) paths. Set up alerts for backend server failures and frontend binding issues.

## Conclusion

HAProxy QUIC/HTTP3 over IPv6 requires HAProxy 2.7+ in current community documentation, with experimental support starting in 2.6. Use separate TCP and QUIC `bind` lines, advertise HTTP/3 with an Alt-Svc header, ensure TCP 80/443 and UDP 443 are open, and verify the setup with curl's `--http3-only` flag.
