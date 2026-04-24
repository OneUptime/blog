# How to Set Up SSL Certificates for Portainer via Nginx Proxy Manager

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Nginx Proxy Manager, SSL, Let's Encrypt, TLS

Description: Learn how to configure SSL certificates for Portainer using Nginx Proxy Manager, covering Let's Encrypt HTTP and DNS challenge methods, custom certificates, and certificate renewal monitoring.

## Introduction

Nginx Proxy Manager handles SSL certificate provisioning and renewal through its web interface, integrating with Let's Encrypt for free trusted certificates or accepting custom/enterprise certificates. This guide covers all certificate options for securing Portainer through NPM, including wildcard certificates via DNS challenge.

## Prerequisites

- Nginx Proxy Manager deployed and running
- Portainer running behind NPM
- Domain DNS pointing to your server

## Step 1: Let's Encrypt HTTP Challenge Certificate

The simplest certificate type - requires port 80 accessible from the internet:

1. In NPM, go to **SSL Certificates** → **Add Certificate** → **Let's Encrypt via HTTP**
2. Configure:

```text
Domain Names:     portainer.example.com
```

3. Ensure the email address on your NPM user account is set - NPM uses that for Let's Encrypt requests.
4. Click **Save** - NPM provisions the certificate automatically.

## Step 2: Wildcard Certificate via DNS Challenge

For `*.example.com` wildcard covering all subdomains:

1. In NPM, go to **SSL Certificates** → **Add Certificate** → **Let's Encrypt via DNS**
2. Configure:

```text
Domain Names:
  *.example.com
  example.com        (include apex domain separately)

DNS Provider: Cloudflare
  Credentials File Content:
    dns_cloudflare_email = your-email@cloudflare.com
    dns_cloudflare_api_key = YOUR_GLOBAL_API_KEY
    # OR use API Token (recommended):
    dns_cloudflare_api_token = YOUR_API_TOKEN

  Propagation Seconds: 120    (wait for DNS to propagate before verification)
```

NPM uses the email address on your user account for Let's Encrypt requests.

**Other DNS providers configuration:**

```text
# AWS Route53
[default]
aws_access_key_id = YOUR_ACCESS_KEY_ID
aws_secret_access_key = YOUR_SECRET_ACCESS_KEY
# Or use other AWS credential methods supported by boto3,
# such as environment variables or an instance role.

# DigitalOcean
dns_digitalocean_token = YOUR_DO_TOKEN

# Namecheap
dns_namecheap_username = your-username
dns_namecheap_api_key = YOUR_API_KEY
```

## Step 3: Custom/Enterprise Certificate

For self-signed or enterprise CA certificates:

1. Generate the certificate (or obtain from your CA)
2. In NPM, go to **SSL Certificates** → **Add Certificate** → **Custom**
3. Upload:

```text
Certificate Key:     Your private key (.key file)
Certificate:         Your certificate (.crt file)
Intermediate Certificate: Your CA chain/bundle (if applicable)
```

4. Click **Save**

```bash
# Generate self-signed certificate for testing
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout portainer-selfsigned.key \
  -out portainer-selfsigned.crt \
  -subj "/C=US/ST=State/L=City/O=Org/CN=portainer.example.com"

# Generate certificate with SANs (multiple domains)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout multi-domain.key \
  -out multi-domain.crt \
  -subj "/CN=portainer.example.com" \
  -addext "subjectAltName=DNS:portainer.example.com,DNS:traefik.example.com,IP:192.168.1.100"
```

## Step 4: Apply Certificate to Portainer Proxy Host

1. Go to **Hosts** → **Proxy Hosts**
2. Edit the Portainer proxy host
3. **SSL Tab**:

```text
SSL Certificate:  Select your certificate from the dropdown
Force SSL:        ON
HTTP/2 Support:   ON
HSTS Enabled:     ON
```

## Step 5: Monitor Certificate Expiry

Let's Encrypt certificates expire after 90 days. NPM auto-renews at 30 days remaining, but monitor to catch failures:

```bash
# Check certificate expiry from command line
echo | openssl s_client -servername portainer.example.com \
  -connect portainer.example.com:443 2>/dev/null | \
  openssl x509 -noout -dates

# If you're using the default SQLite setup, query NPM's certificate database
docker exec nginx-proxy-manager sh -lc 'cd /app && node --input-type=module -e "import Database from \"better-sqlite3\"; const db = new Database(\"/data/database.sqlite\", { readonly: true }); const rows = db.prepare(\"SELECT domain_names, expires_on FROM certificate WHERE provider = ?\").all(\"letsencrypt\"); console.log(JSON.stringify(rows, null, 2));"'

# Check NPM logs for renewal activity
docker logs nginx-proxy-manager 2>&1 | grep -i "renew\|certbot\|expire"
```

## Step 6: Force Certificate Renewal

```bash
# Force renewal via NPM API
NPM_URL="http://YOUR_SERVER:81"

# Login to get NPM token
TOKEN=$(curl -s -X POST "${NPM_URL}/api/tokens" \
  -H "Content-Type: application/json" \
  -d '{"identity":"admin@example.com","secret":"yourpassword"}' | \
  jq -r '.token')

# Get certificate ID
CERT_ID=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "${NPM_URL}/api/nginx/certificates" | \
  jq -r '.[] | select(.domain_names[] | contains("portainer.example.com")) | .id')

# Renew the certificate
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  "${NPM_URL}/api/nginx/certificates/${CERT_ID}/renew"
```

## Step 7: Backup Certificates

```bash
# Backup NPM data (includes certificates and Let's Encrypt account)
docker cp nginx-proxy-manager:/data /backup/npm-data-$(date +%Y%m%d)
docker cp nginx-proxy-manager:/etc/letsencrypt /backup/npm-letsencrypt-$(date +%Y%m%d)

# Or via named volumes (replace the volume names if yours differ)
docker run --rm \
  -v npm_data:/data \
  -v npm_letsencrypt:/etc/letsencrypt \
  -v /backup:/backup \
  alpine tar czf /backup/npm-backup-$(date +%Y%m%d).tar.gz /data /etc/letsencrypt
```

## Conclusion

Nginx Proxy Manager makes SSL certificate management for Portainer straightforward through its web interface. Let's Encrypt HTTP challenge works for publicly accessible servers with just a domain and email. For wildcard certificates or private servers, the DNS challenge requires DNS provider API credentials but eliminates the need for port 80 access. Always monitor certificate expiry even with auto-renewal enabled - network or DNS issues can cause renewal failures that NPM will log but may not alert on immediately.
