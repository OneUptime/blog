# How to Set Up Traefik with Automatic Let's Encrypt TLS on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Traefik, Proxy, Security, Let's Encrypt, Linux

Description: Learn how to set Up Traefik with Automatic Let's Encrypt TLS on RHEL 9 with step-by-step instructions, configuration examples, and best practices.

---

Traefik includes built-in support for automatic TLS certificate management through Let's Encrypt. It handles certificate issuance, renewal, and storage without external tools like certbot.

## Prerequisites

- RHEL 9 with Traefik installed
- A domain name pointing to your server
- Ports 80 and 443 accessible from the internet

## Step 1: Configure Certificate Resolver

```bash
sudo vi /etc/traefik/traefik.yaml
```

```yaml
entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https
  websecure:
    address: ":443"

certificatesResolvers:
  letsencrypt:
    acme:
      email: admin@example.com
      storage: /etc/traefik/acme.json
      httpChallenge:
        entryPoint: web

providers:
  file:
    directory: /etc/traefik/dynamic
    watch: true
```

## Step 2: Create ACME Storage File

```bash
sudo touch /etc/traefik/acme.json
sudo chmod 600 /etc/traefik/acme.json
sudo chown traefik:traefik /etc/traefik/acme.json
```

## Step 3: Configure Routes with TLS

```bash
sudo vi /etc/traefik/dynamic/services.yaml
```

```yaml
http:
  routers:
    myapp-secure:
      rule: "Host(`myapp.example.com`)"
      service: myapp-service
      entryPoints:
        - websecure
      tls:
        certResolver: letsencrypt

  services:
    myapp-service:
      loadBalancer:
        servers:
          - url: "http://127.0.0.1:3000"
```

## Step 4: Restart Traefik

```bash
sudo systemctl restart traefik
```

## Step 5: Verify Certificate

```bash
curl -v https://myapp.example.com 2>&1 | grep "SSL certificate"
openssl s_client -connect myapp.example.com:443 -servername myapp.example.com < /dev/null
```

Traefik will automatically request a certificate from Let's Encrypt on the first request and renew it before expiration.

## Step 6: Use DNS Challenge (for Wildcard Certificates)

For wildcard certificates, use the DNS challenge:

```yaml
certificatesResolvers:
  letsencrypt:
    acme:
      email: admin@example.com
      storage: /etc/traefik/acme.json
      dnsChallenge:
        provider: cloudflare
```

Set environment variables for the DNS provider:

```bash
export CF_DNS_API_TOKEN=your-api-token
```

## Conclusion

Traefik's built-in Let's Encrypt integration on RHEL 9 eliminates the need for external certificate management tools. Certificates are issued and renewed automatically, with HTTP-to-HTTPS redirection configured in just a few lines.
