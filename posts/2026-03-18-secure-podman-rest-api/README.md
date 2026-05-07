# How to Secure the Podman REST API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, REST API, Security, TLS, DevOps

Description: A comprehensive guide to securing the Podman REST API in production, covering socket permissions, TLS encryption, network policies, rate limiting, audit logging, and defense-in-depth strategies.

---

> The Podman REST API provides full control over your container infrastructure. Anyone with access to the API can create, modify, and destroy containers, pull images, and access sensitive data. Securing the API is not optional; it is a fundamental requirement for any production deployment.

The Podman REST API gives clients control equivalent to shell access as the user running the API service. For a rootful service, an unsecured API endpoint is effectively root-level control available over the network. This guide covers the essential security measures you should implement to protect your Podman API from unauthorized access, data interception, and abuse.

---

## Understanding the Threat Model

Before implementing security controls, understand what an attacker with API access can do:

- **Create privileged containers** that mount the host filesystem.
- **Execute arbitrary commands** in running containers.
- **Access secrets and environment variables** stored in containers.
- **Pull and run malicious images** on your infrastructure.
- **Exfiltrate data** through container networking.
- **Deny service** by consuming all system resources.

Every security measure in this guide addresses one or more of these threats.

## Securing the Unix Socket

The first layer of defense is controlling access to the Podman socket file.

### Restrict Socket Permissions

```bash
# Set strict permissions

sudo chmod 600 /run/podman/podman.sock
sudo chown root:root /run/podman/podman.sock

# Or allow a specific group
sudo groupadd podman-api
sudo chown root:podman-api /run/podman/podman.sock
sudo chmod 660 /run/podman/podman.sock

# Add only authorized users
sudo usermod -aG podman-api deploy-user
```

### Systemd Socket Security

Configure systemd to apply strict permissions automatically:

```ini
# /etc/systemd/system/podman.socket
[Unit]
Description=Podman API Socket

[Socket]
ListenStream=/run/podman/podman.sock
SocketMode=0660
SocketUser=root
SocketGroup=podman-api

# Security hardening
RemoveOnStop=yes

[Install]
WantedBy=sockets.target
```

### Use Rootless Podman

Rootless Podman is the single most effective security measure. It limits the blast radius of any compromise:

```bash
# Enable lingering for the service account
sudo loginctl enable-linger podman-user

# Start rootless service
systemctl --user enable --now podman.socket

# The socket is isolated to the user's namespace
ls -la $XDG_RUNTIME_DIR/podman/podman.sock
```

With rootless Podman, even if an attacker gains API access, they operate within the unprivileged user's namespace and cannot access root-only host files or other users' containers.

## TLS Encryption

When exposing the API over the network, TLS is mandatory.

### Generate a Certificate Authority and Certificates

```bash
#!/bin/bash

CERT_DIR="/etc/podman/tls"
mkdir -p "$CERT_DIR"
cd "$CERT_DIR"

# Certificate Authority
openssl genrsa -out ca-key.pem 4096
openssl req -new -x509 -days 365 -key ca-key.pem -sha256 -out ca.pem \
  -subj "/C=US/O=MyOrg/CN=Podman CA"

# Server certificate
openssl genrsa -out server-key.pem 4096
openssl req -new -key server-key.pem -out server.csr \
  -subj "/CN=podman-server"

cat > server-ext.cnf <<EOF
subjectAltName = DNS:podman-server,DNS:podman.example.com,IP:10.0.0.5
extendedKeyUsage = serverAuth
EOF

openssl x509 -req -days 365 -in server.csr \
  -CA ca.pem -CAkey ca-key.pem -CAcreateserial \
  -out server-cert.pem -extfile server-ext.cnf

# Client certificate
openssl genrsa -out client-key.pem 4096
openssl req -new -key client-key.pem -out client.csr \
  -subj "/CN=podman-client/O=deploy-team"

cat > client-ext.cnf <<EOF
extendedKeyUsage = clientAuth
EOF

openssl x509 -req -days 365 -in client.csr \
  -CA ca.pem -CAkey ca-key.pem -CAcreateserial \
  -out client-cert.pem -extfile client-ext.cnf

# Set permissions
chmod 644 ca.pem server-cert.pem client-cert.pem
chmod 600 *-key.pem

# Clean up CSRs
rm -f *.csr *.cnf *.srl
```

### Configure Podman with TLS

```bash
podman system service --time=0 \
  tcp://0.0.0.0:8443 \
  --tls-cert=/etc/podman/tls/server-cert.pem \
  --tls-key=/etc/podman/tls/server-key.pem \
  --tls-client-ca=/etc/podman/tls/ca.pem
```

### Verify Client Certificate Authentication

```bash
# This should succeed
curl --cacert /etc/podman/tls/ca.pem \
  --cert /etc/podman/tls/client-cert.pem \
  --key /etc/podman/tls/client-key.pem \
  https://podman-server:8443/v4.0.0/libpod/_ping

# This should fail (no client cert)
curl --cacert /etc/podman/tls/ca.pem \
  https://podman-server:8443/v4.0.0/libpod/_ping
# Expected: SSL handshake failure
```

## Reverse Proxy with Authentication and Rate Limiting

Place a reverse proxy in front of the API for additional security controls.

### Nginx Configuration

```nginx
upstream podman_api {
    server unix:/run/podman/podman.sock;
}

# Rate limiting zones
limit_req_zone $binary_remote_addr zone=podman_api_limit:10m rate=30r/m;
limit_req_zone $binary_remote_addr zone=podman_write_limit:10m rate=10r/m;

server {
    listen 8443 ssl;
    server_name podman-api.example.com;

    # TLS configuration
    ssl_certificate /etc/nginx/ssl/server.crt;
    ssl_certificate_key /etc/nginx/ssl/server.key;
    ssl_client_certificate /etc/nginx/ssl/ca.crt;
    ssl_verify_client on;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;

    # Logging
    access_log /var/log/nginx/podman-api-access.log;
    error_log /var/log/nginx/podman-api-error.log;

    # Rate limit all requests
    limit_req zone=podman_api_limit burst=10 nodelay;

    # Apply stricter rate limits to sensitive endpoints
    location ~ ^/v[0-9.]+/(libpod/)?containers/.+/exec$ {
        # Stricter rate limit for exec
        limit_req zone=podman_write_limit burst=5 nodelay;
        proxy_pass http://podman_api;
        proxy_buffering off;
    }

    # Apply stricter controls to container creation requests
    location ~ ^/v[0-9.]+/(libpod/)?containers/create$ {
        limit_req zone=podman_write_limit burst=5 nodelay;

        # Nginx does not inspect JSON request bodies by itself.
        # Use lua or a custom auth module to inspect request bodies
        # and reject privileged container requests
        proxy_pass http://podman_api;
        proxy_buffering off;
    }

    # Default proxy
    location / {
        proxy_pass http://podman_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_buffering off;
        proxy_read_timeout 3600s;
    }
}
```

## API Request Filtering

Implement a request filtering proxy that inspects and validates API requests:

```python
#!/usr/bin/env python3
"""Podman API security proxy that filters dangerous requests."""

import json
import re
from http.server import HTTPServer, BaseHTTPRequestHandler
import requests_unixsocket
from urllib.parse import quote

SOCKET_PATH = "/run/podman/podman.sock"
LISTEN_PORT = 8080

# Blocked operations
BLOCKED_PATTERNS = [
    # Block privileged containers
    r'"Privileged"\s*:\s*true',
    # Block host PID namespace
    r'"PidMode"\s*:\s*"host"',
    # Block host network
    r'"NetworkMode"\s*:\s*"host"',
    # Block mounting the host root
    r'"Source"\s*:\s*"/"',
    r'"Source"\s*:\s*"/etc"',
    r'"Source"\s*:\s*"/var/run/docker.sock"',
]

# Read-only mode: only allow GET requests
READ_ONLY_MODE = False


class SecurityProxy(BaseHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        self.session = requests_unixsocket.Session()
        self.encoded = quote(SOCKET_PATH, safe="")
        super().__init__(*args, **kwargs)

    def check_request_body(self, body):
        """Check request body for dangerous patterns."""
        if not body:
            return True, ""

        body_str = body.decode("utf-8", errors="ignore")
        for pattern in BLOCKED_PATTERNS:
            if re.search(pattern, body_str, re.IGNORECASE):
                return False, f"Blocked: request matches security pattern: {pattern}"

        return True, ""

    def proxy_request(self, method):
        if READ_ONLY_MODE and method != "GET":
            self.send_response(403)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": "API is in read-only mode"}).encode())
            return

        # Read request body
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length) if content_length > 0 else None

        # Security check
        allowed, reason = self.check_request_body(body)
        if not allowed:
            self.send_response(403)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": reason}).encode())
            return

        # Forward to Podman
        url = f"http+unix://{self.encoded}{self.path}"
        resp = self.session.request(method, url, data=body,
                                     headers={"Content-Type": self.headers.get("Content-Type", "")})

        self.send_response(resp.status_code)
        for key, value in resp.headers.items():
            if key.lower() not in ("transfer-encoding", "connection"):
                self.send_header(key, value)
        self.end_headers()
        self.wfile.write(resp.content)

    def do_GET(self):
        self.proxy_request("GET")

    def do_POST(self):
        self.proxy_request("POST")

    def do_DELETE(self):
        self.proxy_request("DELETE")

    def do_PUT(self):
        self.proxy_request("PUT")


if __name__ == "__main__":
    server = HTTPServer(("127.0.0.1", LISTEN_PORT), SecurityProxy)
    print(f"Security proxy listening on port {LISTEN_PORT}")
    server.serve_forever()
```

## Network-Level Security

### Firewall Rules

Restrict API access to specific IP addresses:

```bash
# Allow API access only from management network
sudo iptables -A INPUT -p tcp --dport 8443 -s 10.0.0.0/24 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 8443 -j DROP

# Or with nftables
sudo nft add rule inet filter input tcp dport 8443 ip saddr 10.0.0.0/24 accept
sudo nft add rule inet filter input tcp dport 8443 drop
```

### SSH-Only Access

For maximum security, do not expose the API over TCP at all. Use SSH tunneling:

```bash
# Client-side: create tunnel
ssh -nNT -L /tmp/podman.sock:/run/podman/podman.sock admin@container-host

# Use the tunnel
curl --unix-socket /tmp/podman.sock http://localhost/v4.0.0/libpod/_ping
```

This approach means the API is never directly reachable from the network and relies on SSH's authentication and encryption.

## Audit Logging

Track API socket connection activity for security auditing:

```bash
#!/bin/bash

# Wrapper script that logs Podman API socket connection activity
SOCKET="/run/podman/podman.sock"
AUDIT_LOG="/var/log/podman-audit.log"

# Use socat to proxy the socket and log connection diagnostics
socat -d -d \
  UNIX-LISTEN:/run/podman/podman-audited.sock,fork,mode=660 \
  UNIX-CONNECT:"$SOCKET" \
  2>> "$AUDIT_LOG"
```

For request-level audit logging, use the Nginx reverse proxy approach with structured access logs:

```nginx
log_format podman_audit '$remote_addr - $remote_user [$time_local] '
                        '"$request" $status $body_bytes_sent '
                        '"$http_x_forwarded_for" '
                        '$ssl_client_s_dn';

access_log /var/log/nginx/podman-audit.log podman_audit;
```

## Container Image Security

Restrict which images can be pulled and run:

```toml
# /etc/containers/registries.conf (v2 format)
unqualified-search-registries = ['registry.example.com']

[[registry]]
prefix = "docker.io"
blocked = true

[[registry]]
prefix = "registry.example.com"
insecure = false
```

/etc/containers/policy.json:

```json
{
    "default": [{"type": "reject"}],
    "transports": {
        "docker": {
            "registry.example.com": [
                {
                    "type": "signedBy",
                    "keyType": "GPGKeys",
                    "keyPath": "/etc/pki/containers/registry.example.com.gpg"
                }
            ]
        }
    }
}
```

## Security Checklist

Use this checklist to verify your Podman API security:

- [ ] Unix socket permissions are restricted to authorized users/groups.
- [ ] Rootless Podman is used wherever possible.
- [ ] TLS is enabled for any network-exposed endpoints.
- [ ] Client certificate authentication is configured.
- [ ] A reverse proxy filters and rate-limits requests.
- [ ] Privileged container creation is blocked.
- [ ] Dangerous host mounts are blocked.
- [ ] Firewall rules restrict network access to the API port.
- [ ] Audit logging is enabled for all API requests.
- [ ] Image pull policies restrict which registries are allowed.
- [ ] Certificate rotation is scheduled and automated.
- [ ] SSH tunneling is used when direct TCP exposure is not needed.

Resource Limits

Prevent denial-of-service through resource exhaustion:

```bash
# Limit Podman service resources with systemd
sudo systemctl edit podman.service
```

```ini
[Service]
MemoryMax=2G
CPUQuota=200%
TasksMax=256
LimitNOFILE=65536
```

## Conclusion

Securing the Podman REST API requires a defense-in-depth approach. No single measure is sufficient on its own. Start with the fundamentals: use rootless Podman, restrict socket permissions, and require TLS for network access. Layer on additional controls such as reverse proxy authentication, request filtering, rate limiting, and audit logging. Regularly review your security posture, rotate credentials, and monitor for unauthorized access attempts. Treating the Podman API with the same security rigor as SSH access to your servers will keep your container infrastructure safe.
