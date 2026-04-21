# How to Configure SSL/TLS on a Load Balancer for Backend Health Checks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TLS, SSL, Load Balancer, Health Check, HAProxy, Nginx, Backend, HTTPS

Description: Learn how to configure SSL/TLS termination on a load balancer and enable HTTPS health checks for backend servers to ensure encrypted end-to-end connectivity validation.

---

When backends serve HTTPS, load balancer health checks should use HTTPS when you need to validate the backend TLS listener as well as application availability. Certificate validation only happens when the load balancer supports it and is configured to verify the backend certificate.

## HAProxy: HTTPS Health Checks

```haproxy
global
    ssl-default-bind-options ssl-min-ver TLSv1.2

defaults
    mode http
    timeout connect 5s
    timeout client  30s
    timeout server  30s

frontend https_frontend
    bind *:443 ssl crt /etc/ssl/certs/lb.pem
    default_backend web_servers

backend web_servers
    balance roundrobin

    # SSL health check: connect via HTTPS and check HTTP 200
    option httpchk GET /health
    http-check expect status 200

    # Enable SSL to backends
    server web1 10.0.0.11:443 ssl sni str(web1.example.internal) check-sni web1.example.internal verify required ca-file /etc/ssl/certs/ca-bundle.crt verifyhost web1.example.internal check
    server web2 10.0.0.12:443 ssl sni str(web2.example.internal) check-sni web2.example.internal verify required ca-file /etc/ssl/certs/ca-bundle.crt verifyhost web2.example.internal check
    server web3 10.0.0.13:443 ssl sni str(web3.example.internal) check-sni web3.example.internal verify none check   # Skip cert verification (lab only)
```

## HAProxy: TCP Mode Health Check for Non-HTTP Backends

```haproxy
backend tcp_ssl_backend
    mode tcp
    balance roundrobin

    # Layer 4 TLS health check (connects and completes a TLS handshake)
    server app1 10.0.0.21:443 check check-ssl check-sni app1.example.internal verify required ca-file /etc/ssl/certs/ca-bundle.crt verifyhost app1.example.internal
    server app2 10.0.0.22:443 check check-ssl check-sni app2.example.internal verify required ca-file /etc/ssl/certs/ca-bundle.crt verifyhost app2.example.internal

```

## Nginx: Upstream HTTPS with Health Checks

```nginx
upstream backend_https {
    # Required for Nginx Plus active health checks
    zone backend_https 64k;

    server 10.0.0.11:443;
    server 10.0.0.12:443;
}

server {
    listen 443 ssl;
    ssl_certificate     /etc/ssl/certs/lb.crt;
    ssl_certificate_key /etc/ssl/certs/lb.key;

    location / {
        proxy_pass https://backend_https;

        # Verify backend certificate
        proxy_ssl_verify        on;
        proxy_ssl_trusted_certificate /etc/ssl/certs/ca-bundle.crt;
        proxy_ssl_name          backend.example.internal;  # Match the backend certificate's DNS name or IP SAN
        proxy_ssl_server_name   on;
        proxy_ssl_protocols     TLSv1.2 TLSv1.3;

        # Nginx Plus: active health check (OSS uses passive only)
        # health_check uri=/health interval=5s;
    }
}
```

## AWS ALB: HTTPS Health Check

```text
Target group settings:
  Protocol: HTTPS
  Port: 443
  Health check path: /health
  Success codes: 200
  Healthy threshold: 2
  Unhealthy threshold: 3
  Timeout: 5
  Interval: 30
```

AWS ALB HTTPS health checks validate the HTTPS response, but ALB does not validate target certificates; self-signed or expired target certificates can still pass if the request succeeds.

## Debugging Health Check Failures

```bash
# Test backend HTTPS health endpoint directly

curl -v --cacert /etc/ssl/certs/ca-bundle.crt \
  --resolve web1.example.internal:443:10.0.0.11 \
  https://web1.example.internal/health

# Check certificate validity on backend
openssl s_client -connect 10.0.0.11:443 \
  -servername web1.example.internal \
  -verify_hostname web1.example.internal \
  -CAfile /etc/ssl/certs/ca-bundle.crt \
  -verify_return_error </dev/null

# HAProxy stats page: check backend status
# http://lb-ip:8404/stats
```

## Common Health Check Failures

| Symptom | Cause | Fix |
|---------|-------|-----|
| `DOWN` with SSL error | Certificate not trusted or hostname mismatch | Add CA cert to `ca-file` and set `verifyhost`/SNI correctly |
| `DOWN` with handshake timeout | TLS version or SNI mismatch | Align backend TLS versions and SNI; set backend `ssl-min-ver`/`ssl-max-ver` if needed |
| `DOWN` even when backend is up | Health path returns non-200 | Check path and expected status code |
| `DOWN` intermittently | Certificate expiry | Renew backend certificate |

## Key Takeaways

- Use `ssl verify required` with a CA certificate, SNI, and hostname verification in HAProxy to validate backend TLS certificates.
- For non-HTTP TLS backends, use `check-ssl` on server lines to verify the TLS handshake without HTTP parsing.
- In Nginx, set `proxy_ssl_verify on` with a `proxy_ssl_trusted_certificate` and a matching `proxy_ssl_name` to verify backend certs.
- Always test health check endpoints directly with curl before debugging load balancer configuration.
