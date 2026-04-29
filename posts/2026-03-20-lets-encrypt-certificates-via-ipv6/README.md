# How to Obtain Let's Encrypt Certificates via IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Let's Encrypt, IPv6, TLS, SSL, ACME, Certificate Authority, Security

Description: Learn how to obtain free TLS certificates from Let's Encrypt on IPv6-only or dual-stack servers using certbot and the ACME protocol validation methods.

---

Let's Encrypt fully supports IPv6 for certificate issuance. Their ACME servers can reach your host over IPv6, enabling certificate acquisition for IPv6-only servers that have no IPv4 connectivity.

## Prerequisites

Before starting, verify your server has a public IPv6 address and that DNS is configured to send the ACME challenge to the right host:

```bash
# Check your public IPv6 address

curl -6 https://ifconfig.me/ip

# Verify the AAAA record exists for your domain and points to this server
dig AAAA yourdomain.example.com

# Optional: confirm outbound IPv6 connectivity to the ACME API
curl -6 https://acme-v02.api.letsencrypt.org/directory
```

## Install certbot

```bash
# Ubuntu/Debian
sudo apt update && sudo apt install certbot python3-certbot-nginx -y

# RHEL/CentOS/AlmaLinux
sudo dnf install epel-release -y && sudo dnf install certbot -y

# Verify installation
certbot --version
```

## Method 1: HTTP-01 Challenge (Webroot)

The HTTP-01 challenge works over IPv6 when your server is reachable on port 80:

```bash
# Ensure your web server listens on IPv6 port 80
# For Nginx, check: listen [::]:80;
# Then run certbot with webroot mode
sudo certbot certonly \
  --webroot \
  --webroot-path /var/www/html \
  --domain yourdomain.example.com \
  --email admin@example.com \
  --agree-tos \
  --non-interactive \
  --preferred-challenges http
```

## Method 2: Standalone Mode

For servers without a web server, certbot can handle the challenge itself:

```bash
# Stop any process on port 80, then run standalone
sudo systemctl stop nginx  # or apache2

sudo certbot certonly \
  --standalone \
  --domain yourdomain.example.com \
  --email admin@example.com \
  --agree-tos \
  --non-interactive

# The standalone server must be reachable on port 80 over IPv6
```

## Method 3: DNS-01 Challenge (IPv6-Only Servers)

For IPv6-only servers where inbound connections on port 80 aren't possible, DNS-01 is ideal - it requires no inbound connectivity at all:

```bash
# DNS-01 challenge via certbot with manual DNS
sudo certbot certonly \
  --manual \
  --preferred-challenges dns \
  --domain yourdomain.example.com \
  --email admin@example.com \
  --agree-tos

# certbot will prompt you to add a TXT record:
# _acme-challenge.yourdomain.example.com  TXT  "verification-token-here"
```

## Automating DNS-01 with a DNS Plugin

Most DNS providers have a Certbot plugin for automation. The exact install command depends on how you installed Certbot; here is a current snap-based example for Cloudflare:

```bash
# Example: Cloudflare DNS plugin for snap-installed certbot
sudo snap install certbot-dns-cloudflare
sudo snap set certbot trust-plugin-with-root=ok

# Create credentials file
cat > /etc/letsencrypt/cloudflare.ini << 'EOF'
dns_cloudflare_api_token = YOUR_CLOUDFLARE_API_TOKEN
EOF
chmod 600 /etc/letsencrypt/cloudflare.ini

# Obtain certificate automatically
sudo certbot certonly \
  --dns-cloudflare \
  --dns-cloudflare-credentials /etc/letsencrypt/cloudflare.ini \
  --domain yourdomain.example.com \
  --email admin@example.com \
  --agree-tos
```

## Configuring Nginx to Use the Certificate over IPv6

Once the certificate is obtained, configure Nginx to serve HTTPS on IPv6:

```nginx
server {
    # Listen on both IPv4 and IPv6 for HTTPS
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;

    server_name yourdomain.example.com;

    ssl_certificate     /etc/letsencrypt/live/yourdomain.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.example.com/privkey.pem;

    # Modern SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
}
```

## Setting Up Auto-Renewal

Let's Encrypt certificates expire every 90 days. Most Certbot installations already configure automatic renewal, but certificates obtained with `--manual` do not renew automatically unless you add hook scripts:

```bash
# Test renewal in dry-run mode
sudo certbot renew --dry-run

# Check how your installation schedules renewals
systemctl list-timers | grep certbot
grep -R "certbot renew" /etc/crontab /etc/cron.* 2>/dev/null

# If your installation did not create one, add a cron job for renewal twice daily
echo "0 0,12 * * * root certbot renew --quiet --deploy-hook 'systemctl reload nginx'" \
  | sudo tee /etc/cron.d/certbot-renew > /dev/null
```

## Verifying the Certificate

After installation, verify the certificate is valid and covers your domain:

```bash
# Test HTTPS over IPv6 using your domain name
curl -6 -I https://yourdomain.example.com

# Check certificate details
openssl s_client -connect [2001:db8::1]:443 -servername yourdomain.example.com < /dev/null 2>/dev/null \
  | openssl x509 -noout -subject -issuer -dates
```

Let's Encrypt's support for IPv6 validation makes it straightforward to secure both dual-stack and IPv6-only servers with trusted, free TLS certificates.
