# How to Set Up Caddy with Automatic HTTPS on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Caddy, Web Server, Linux

Description: Learn how to set Up Caddy with Automatic HTTPS on RHEL 9 with step-by-step instructions, configuration examples, and best practices.

---

Caddy's defining feature is automatic HTTPS. It obtains TLS certificates from Let's Encrypt (or ZeroSSL), configures HTTPS, redirects HTTP to HTTPS, and renews certificates automatically with zero configuration.

## Prerequisites

- RHEL 9 with Caddy installed
- A domain name pointing to your server's IP
- Ports 80 and 443 open

## Step 1: Minimal HTTPS Configuration

The simplest Caddyfile for automatic HTTPS:

```bash
sudo vi /etc/caddy/Caddyfile
```

```bash
example.com {
    respond "Hello, TLS!"
}
```

That is it. Caddy will:
1. Obtain a TLS certificate from Let's Encrypt
2. Set up HTTPS on port 443
3. Redirect HTTP to HTTPS on port 80
4. Renew the certificate before it expires

## Step 2: Reverse Proxy with Auto-HTTPS

```bash
myapp.example.com {
    reverse_proxy localhost:3000
}
```

## Step 3: Custom Certificate Settings

```bash
example.com {
    tls admin@example.com {
        protocols tls1.2 tls1.3
        ciphers TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384
    }
    reverse_proxy localhost:3000
}
```

## Step 4: Use Wildcard Certificates

```bash
*.example.com {
    tls {
        dns cloudflare {env.CF_API_TOKEN}
    }
    reverse_proxy localhost:3000
}
```

Wildcard certificates require DNS validation. Install the DNS provider plugin:

```bash
caddy add-package github.com/caddy-dns/cloudflare
```

## Step 5: Internal HTTPS (Self-Signed)

For internal services that do not have public DNS:

```bash
https://internal.local {
    tls internal
    reverse_proxy localhost:3000
}
```

Caddy generates a self-signed certificate trusted by the local CA.

## Step 6: Verify Certificates

```bash
curl -vI https://example.com 2>&1 | grep -E "issuer|expire"
caddy trust   # Trust Caddy's root CA locally
```

## Step 7: Certificate Storage

Certificates are stored in Caddy's data directory:

```bash
ls /var/lib/caddy/.local/share/caddy/certificates/
```

## Conclusion

Caddy's automatic HTTPS on RHEL 9 removes the complexity of certificate management entirely. By simply specifying a domain name in the Caddyfile, you get a fully configured HTTPS server with automatic certificate provisioning and renewal.
