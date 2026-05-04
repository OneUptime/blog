# How to Configure HAProxy SSL Termination with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, HAProxy, SSL, TLS, HTTPS, Load Balancer

Description: Learn how to configure HAProxy to terminate SSL/TLS for IPv6 clients and forward decrypted traffic to IPv6 backend servers, including certificate management and TLS security settings.

## Basic IPv6 SSL Termination

```haproxy
global
    log /dev/log local0
    maxconn 4096

    # SSL tuning
    ssl-default-bind-options ssl-min-ver TLSv1.2 no-sslv3
    ssl-default-bind-ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384

defaults
    mode http
    timeout connect 5s
    timeout client  30s
    timeout server  30s

frontend https_ipv6
    # IPv6 HTTPS with SSL termination
    bind [::]:443 ssl crt /etc/ssl/haproxy/example.com.pem

    # Optional: also listen on IPv4
    bind *:443 ssl crt /etc/ssl/haproxy/example.com.pem

    default_backend app_servers

backend app_servers
    # Forward to IPv6 backends over HTTP (unencrypted)
    server app1 [2001:db8::10]:8080 check
    server app2 [2001:db8::11]:8080 check
```

## SSL Certificate Format for HAProxy

```bash
# HAProxy uses a combined PEM file (cert + key + optionally chain)

cat /etc/ssl/certs/example.com.crt \
    /etc/ssl/private/example.com.key \
    /etc/ssl/certs/ca-chain.crt > /etc/ssl/haproxy/example.com.pem

chmod 600 /etc/ssl/haproxy/example.com.pem

# Or use a directory of PEM files
# HAProxy loads all .pem files from the directory
ls /etc/ssl/haproxy/
# example.com.pem
# api.example.com.pem
```

## SNI-Based SSL with Multiple Certificates

```haproxy
frontend https_ipv6_sni
    bind [::]:443 ssl crt /etc/ssl/haproxy/
    bind *:443 ssl crt /etc/ssl/haproxy/

    # Route based on SNI (Server Name Indication)
    acl host_api  ssl_fc_sni -i api.example.com
    acl host_www  ssl_fc_sni -i www.example.com

    use_backend api_servers if host_api
    use_backend web_servers if host_www
    default_backend web_servers

backend api_servers
    server api1 [2001:db8::a1]:3000 check
    server api2 [2001:db8::a2]:3000 check

backend web_servers
    server web1 [2001:db8::b1]:8080 check
    server web2 [2001:db8::b2]:8080 check
```

## HTTP to HTTPS Redirect for IPv6

```haproxy
frontend http_redirect
    bind *:80
    bind [::]:80

    # Redirect all to HTTPS
    redirect scheme https code 301

frontend https_main
    bind *:443 ssl crt /etc/ssl/haproxy/example.com.pem
    bind [::]:443 ssl crt /etc/ssl/haproxy/example.com.pem

    # HSTS header
    http-response set-header Strict-Transport-Security "max-age=31536000; includeSubDomains"

    default_backend app_servers
```

## SSL Passthrough to IPv6 Backend

```haproxy
# If backend handles SSL directly (no termination at HAProxy)
frontend ssl_passthrough
    bind *:443
    bind [::]:443

    mode tcp
    option ssl-hello-chk

    default_backend ssl_backend

backend ssl_backend
    mode tcp
    server app1 [2001:db8::10]:443 check
    server app2 [2001:db8::11]:443 check
```

## Verify SSL Termination

```bash
# Test HTTPS over IPv6
curl -6 -v https://example.com 2>&1 | grep -E 'Connected|TLS|SSL|Cipher'

# Test with OpenSSL
openssl s_client -6 -connect example.com:443 -servername example.com

# Check HAProxy stats for SSL metrics
echo "show info" | socat stdio /var/run/haproxy/admin.sock | grep -i ssl

# Check configuration
haproxy -c -f /etc/haproxy/haproxy.cfg
```

## Summary

Configure HAProxy SSL termination for IPv6 with `bind [::]:443 ssl crt /etc/ssl/haproxy/cert.pem`. Combine certificate, key, and chain into a single PEM file for HAProxy. Use SNI-based routing with `ssl_fc_sni` ACLs and multiple certificates in a directory. For end-to-end encryption, use SSL passthrough with `mode tcp`. Set TLS options globally with `ssl-default-bind-options ssl-min-ver TLSv1.2`. For HSTS, use `http-response set-header Strict-Transport-Security`.
