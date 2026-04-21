# How to Set Up SSL Certificates for Portainer via Nginx Proxy Manager (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Nginx Proxy Manager, SSL, Let's Encrypt, TLS

Description: Learn how to issue, manage, and renew Let's Encrypt and custom SSL certificates for Portainer using Nginx Proxy Manager's built-in certificate management.

## Certificate Options in NPM

NPM supports multiple certificate sources:

| Type | Use Case |
|------|----------|
| Let's Encrypt (HTTP) | Public domains, port 80 accessible |
| Let's Encrypt (DNS) | Wildcard certs, private servers |
| Custom Certificate | Upload your own cert/key pair |

## Method 1: Let's Encrypt via HTTP Challenge

The simplest option for public-facing servers:

1. Go to **SSL Certificates → Add SSL Certificate → Let's Encrypt**
2. Fill in:
   - **Domain Names**: `portainer.yourdomain.com`
   - **Email**: your ACME account contact email
   - Check **I Agree to...**
3. Click **Save** - NPM requests and stores the certificate

Or issue from the Proxy Host SSL tab directly.

## Method 2: Let's Encrypt via DNS Challenge (Wildcard)

For wildcard certificates (`*.yourdomain.com`) or servers behind NAT:

1. Go to **SSL Certificates → Add SSL Certificate → Let's Encrypt**
2. Enable **Use a DNS Challenge**
3. Select your DNS provider (Cloudflare, Route53, etc.)
4. Enter your DNS API credentials:

```text
For Cloudflare:
  Credentials File Content:
    dns_cloudflare_api_token = YOUR_CLOUDFLARE_API_TOKEN
```

5. Domain: `*.yourdomain.com` (or `yourdomain.com,*.yourdomain.com`)
6. Save - NPM creates a DNS TXT record to verify domain ownership

## Method 3: Custom/Self-Signed Certificate

For internal use or corporate CA certificates:

1. Generate a certificate:

```bash
# Self-signed for internal use

openssl req -x509 -noenc -days 365 -newkey rsa:2048 \
  -keyout portainer.key \
  -out portainer.crt \
  -subj "/CN=portainer.internal.lan" \
  -addext "subjectAltName=DNS:portainer.internal.lan"
```

2. In NPM: **SSL Certificates → Add SSL Certificate → Custom**
3. Upload the `.crt` and `.key` files
4. Assign to the Portainer proxy host

## Assigning a Certificate to Portainer

1. Open the Portainer proxy host in NPM
2. Click **Edit**
3. Go to the **SSL** tab
4. Select the certificate from the dropdown
5. Enable **Force SSL**
6. Save

## Certificate Renewal

NPM automatically renews Let's Encrypt certificates before expiry. To verify:

```bash
# Check NPM renewal logs
docker logs nginx-proxy-manager 2>&1 | grep -i "renew\|certbot"

# View certificate expiration in NPM
# Dashboard → SSL Certificates → shows expiry date for each cert

# Manual renewal test (via NPM container)
docker exec nginx-proxy-manager certbot renew --dry-run \
  --config /etc/letsencrypt.ini \
  --work-dir /tmp/letsencrypt-lib \
  --logs-dir /data/logs
```

## Verifying the Certificate

```bash
# Check certificate details
echo | openssl s_client -servername portainer.yourdomain.com \
  -connect portainer.yourdomain.com:443 2>/dev/null | \
  openssl x509 -noout -dates -subject -issuer

# Check certificate chain is valid
curl -vI https://portainer.yourdomain.com 2>&1 | grep -A 10 "Server certificate"
```

## Backup Your Certificates

NPM stores Let's Encrypt certificates in the volume mounted at `/etc/letsencrypt`; its database and custom certificates are stored in `/data`. Back up the equivalent bind paths or named volumes regularly:

```bash
# Backup NPM data and Let's Encrypt certificate volumes
docker run --rm \
  -v npm_data:/source/data:ro \
  -v npm_letsencrypt:/source/letsencrypt:ro \
  -v /backup:/backup \
  alpine tar czf /backup/npm-backup-$(date +%Y%m%d).tar.gz -C /source .
```

## Troubleshooting Certificate Issues

```bash
# Check port 80 is accessible (HTTP challenge)
curl -I http://portainer.yourdomain.com

# Check NPM error logs
docker logs nginx-proxy-manager 2>&1 | tail -50

# Check Let's Encrypt rate limits (5 authorization failures per identifier per account per hour)
# Switch to staging for testing by setting LE_STAGING=true on the NPM container
```

## Conclusion

NPM simplifies SSL certificate management for Portainer to a few clicks. For production servers accessible on port 80, the HTTP challenge is the fastest path to HTTPS. For internal servers or wildcard certificates, the DNS challenge provides equal automation with DNS provider API access.
