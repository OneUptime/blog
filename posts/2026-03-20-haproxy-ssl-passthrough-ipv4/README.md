# How to Configure HAProxy SSL Passthrough for IPv4 Backend Servers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: HAProxy, SSL Passthrough, TLS, IPv4, TCP, End-to-End Encryption

Description: Configure HAProxy to pass TLS connections directly to IPv4 backend servers without decrypting them, preserving end-to-end encryption for compliance and security requirements.

## Introduction

SSL passthrough (also called SSL offloading bypass) forwards TLS connections intact to backend servers, which handle decryption themselves. This is required when end-to-end encryption must be maintained and the backend manages its own certificates.

## SSL Passthrough with TCP Mode

Since HAProxy doesn't decrypt the traffic, it operates at Layer 4 (TCP mode):

```haproxy
# /etc/haproxy/haproxy.cfg

global
    log /dev/log local0
    maxconn 50000
    user haproxy
    group haproxy
    daemon

defaults
    log     global
    mode    tcp            # TCP mode: no TLS decryption
    option  tcplog
    timeout connect 5s
    timeout client  300s   # Long timeout for SSL connections
    timeout server  300s

# Frontend: accept TLS connections without decrypting

frontend https_passthrough
    bind 203.0.113.10:443

    # Pass all traffic directly to backend (backend handles TLS)
    default_backend https_backends

backend https_backends
    balance roundrobin

    # Basic TCP connect health checks to port 443
    server web1 192.168.1.10:443 check
    server web2 192.168.1.11:443 check
    server web3 192.168.1.12:443 check
```

## SNI-Based Routing with SSL Passthrough

HAProxy can inspect the TLS SNI field (without decrypting) to route to different backends:

```haproxy
frontend https_passthrough
    bind 203.0.113.10:443
    mode tcp

    # Capture SNI hostname from TLS ClientHello (no decryption needed)
    tcp-request inspect-delay 5s
    tcp-request content accept if { req.ssl_hello_type 1 }

    # Route based on SNI hostname
    use_backend api_tls   if { req.ssl_sni -i api.example.com }
    use_backend app_tls   if { req.ssl_sni -i app.example.com }
    default_backend web_tls

backend api_tls
    mode tcp
    balance roundrobin
    server api1 192.168.2.10:443 check
    server api2 192.168.2.11:443 check

backend app_tls
    mode tcp
    balance roundrobin
    server app1 192.168.3.10:443 check
    server app2 192.168.3.11:443 check

backend web_tls
    mode tcp
    balance roundrobin
    server web1 192.168.1.10:443 check
    server web2 192.168.1.11:443 check
```

## Mixing Passthrough and Termination

Route some domains through SSL termination and others through passthrough by handing terminated traffic to a local TLS frontend:

```haproxy
frontend https_mixed
    bind 203.0.113.10:443
    mode tcp

    tcp-request inspect-delay 5s
    tcp-request content accept if { req.ssl_hello_type 1 }

    # Sensitive compliance service: passthrough (end-to-end TLS)
    use_backend compliance_passthrough if { req.ssl_sni -i pci.example.com }

    # Standard services: hand off to a local TLS-terminating frontend
    default_backend tls_termination_handoff

backend compliance_passthrough
    mode tcp
    server pci1 192.168.5.10:443 check
    server pci2 192.168.5.11:443 check

backend tls_termination_handoff
    mode tcp
    server local_terminator 127.0.0.1:8443 send-proxy-v2

frontend https_terminated
    bind 127.0.0.1:8443 accept-proxy ssl crt /etc/haproxy/certs/site.pem
    mode http
    default_backend https_terminated_backends

backend https_terminated_backends
    mode http
    balance roundrobin
    server app1 192.168.10.10:80 check
    server app2 192.168.10.11:80 check
```

## Limitations of SSL Passthrough

| Feature | SSL Termination | SSL Passthrough |
|---|---|---|
| HTTP header insertion | Yes | No |
| Layer 7 ACLs | Yes | No HTTP ACLs (TLS metadata only) |
| Cookie-based persistence | Yes | No |
| HTTP health checks | Yes | Limited (requires separate TLS-aware checks) |
| Session logging details | Full | TCP only |
| End-to-end encryption | No | Yes |
| Backend certificate management | Centralized | Per-backend |

## Verifying SSL Passthrough

```bash
# Verify TLS connection goes end-to-end to the backend
openssl s_client -connect 203.0.113.10:443 -servername api.example.com

# The certificate in the output should be from the BACKEND server,
# not from HAProxy (no HAProxy cert should be shown)

# Test SNI routing
openssl s_client -connect 203.0.113.10:443 -servername api.example.com 2>/dev/null | \
  openssl x509 -noout -subject
openssl s_client -connect 203.0.113.10:443 -servername app.example.com 2>/dev/null | \
  openssl x509 -noout -subject
```

## Conclusion

SSL passthrough in HAProxy uses `mode tcp` and forwards encrypted connections without decryption. For SNI-based routing, use `tcp-request inspect-delay` with `req.ssl_sni` ACLs to route different domains to different backends without ever seeing the plaintext. Choose passthrough when compliance requirements mandate end-to-end encryption between client and server, accepting the trade-off of losing Layer 7 features.
