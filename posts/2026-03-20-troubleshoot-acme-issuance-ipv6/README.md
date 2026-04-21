# How to Troubleshoot ACME Certificate Issuance over IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ACME, IPv6, Let's Encrypt, TLS, Troubleshooting, Certbot, Debugging

Description: Diagnose and resolve ACME certificate issuance failures in IPv6 environments by systematically checking DNS records, firewall rules, ACME challenge reachability, and error logs.

---

ACME certificate issuance failures in IPv6 environments can stem from several sources. This guide provides a systematic troubleshooting methodology from the most common to least common causes.

## Understanding ACME IPv6 Failure Modes

```text
Common failure hierarchy:
1. DNS AAAA record missing or incorrect
2. Port 80/443 blocked for IPv6 on firewall
3. Web server not listening on [::]:80
4. ACME challenge file not served correctly
5. IPv6 routing issues between ACME server and your server
6. Rate limiting or CAA record blocking
```

## Step 1: Verify DNS Configuration

```bash
# Check both A and AAAA records

dig A yourdomain.example.com +short
dig AAAA yourdomain.example.com +short

# Verify the AAAA record matches your server's IPv6 address
ip -6 addr show | grep "scope global"

# Check for CAA records that might restrict issuance
dig CAA yourdomain.example.com +short
dig CAA example.com +short
# If CAA records exist on the name or parent domain, ensure letsencrypt.org is listed
```

## Step 2: Test Port 80 Reachability over IPv6

```bash
# Test from an external IPv6 host
curl -6 --max-time 10 http://yourdomain.example.com/

# Test the ACME challenge path specifically
curl -6 --max-time 10 \
  http://yourdomain.example.com/.well-known/acme-challenge/test

# Test from your server's perspective using nmap
nmap -6 -p 80 yourdomain.example.com
```

## Step 3: Check Web Server IPv6 Binding

```bash
# Verify the web server is listening on IPv6
sudo ss -tlnp 'sport = :80'
# Look for [::]:80 or your server's specific IPv6 address on port 80

# For Nginx - check configuration
sudo nginx -T | grep "listen.*\[::\]"

# If not listening on IPv6, add to Nginx config
# listen [::]:80;  # Must be in a server block
```

## Step 4: Simulate the ACME Challenge Manually

Before running certbot, manually test the challenge process:

```bash
# Create a test challenge token
TOKEN="test-$(date +%s)"
sudo mkdir -p /var/www/html/.well-known/acme-challenge
echo "testcontent" | sudo tee \
  /var/www/html/.well-known/acme-challenge/$TOKEN

# Test fetching from an external IPv6 host
curl -6 http://yourdomain.example.com/.well-known/acme-challenge/$TOKEN

# Check server logs for the request
sudo tail -20 /var/log/nginx/access.log | grep "well-known"

# Clean up
sudo rm /var/www/html/.well-known/acme-challenge/$TOKEN
```

## Step 5: Run certbot with Verbose Logging

```bash
# Run with high verbosity to capture more details
sudo certbot certonly \
  --webroot \
  --webroot-path /var/www/html \
  --domain yourdomain.example.com \
  --email admin@example.com \
  --agree-tos \
  --dry-run \
  -vvv 2>&1 | tee /tmp/certbot-debug.log

# Analyze the output
grep -Ei "ERROR|WARNING|ipv6|connection|timeout|refused" /tmp/certbot-debug.log
```

## Step 6: Check ACME Server Reachability

```bash
# Verify your server can reach the ACME servers (for certbot to work)
curl -6 https://acme-v02.api.letsencrypt.org/directory
curl -4 https://acme-v02.api.letsencrypt.org/directory

# Check DNS resolution of ACME servers from your host
dig AAAA acme-v02.api.letsencrypt.org +short
```

## Step 7: Inspect certbot Logs

```bash
# Read the detailed certbot log
sudo tail -200 /var/log/letsencrypt/letsencrypt.log

# Look for key error patterns
sudo grep -E "AuthorizationError|Connection|Timeout|IPv6|inet6" \
  /var/log/letsencrypt/letsencrypt.log

# Check if previous failed attempts are blocking new ones (rate limits)
sudo grep "too many" /var/log/letsencrypt/letsencrypt.log
```

## Common Error Messages and Fixes

```bash
# Error: "Connection refused" or "Network unreachable"
# Fix: Open IPv6 port 80 in firewall
sudo ip6tables -A INPUT -p tcp --dport 80 -j ACCEPT

# Error: "Incorrect TXT record"  (DNS-01)
# Fix: Wait for DNS propagation, then retry
# Add propagation delay:
certbot certonly --dns-cloudflare \
  --dns-cloudflare-credentials ~/.secrets/certbot/cloudflare.ini \
  --dns-cloudflare-propagation-seconds 120 \
  -d yourdomain.example.com

# Error: "CAA record does not allow"
# Fix: Add letsencrypt.org to CAA records
# yourdomain.example.com. CAA 0 issue "letsencrypt.org"

# Error: "too many certificates already issued"
# Fix: Use --dry-run for testing, wait for rate limit reset
certbot certonly --dry-run --webroot \
  --webroot-path /var/www/html \
  -d yourdomain.example.com
```

## Using Let's Encrypt Staging for Testing

Avoid hitting rate limits by using the staging environment:

```bash
# Use staging server for all tests
sudo certbot certonly \
  --webroot \
  --webroot-path /var/www/html \
  --domain yourdomain.example.com \
  --email admin@example.com \
  --agree-tos \
  --staging \
  --verbose

# Staging certificates are not trusted but confirm the process works
# Remove --staging for production
```

## Using Online Tools to Validate

```bash
# Use letsdebug.net to pre-check your setup
# It simulates Let's Encrypt validation:
TEST_ID=$(curl -s --data \
  '{"method":"http-01","domain":"yourdomain.example.com"}' \
  -H "Content-Type: application/json" https://letsdebug.net | jq -r '.ID')
sleep 10
curl -s -H "Accept: application/json" \
  "https://letsdebug.net/yourdomain.example.com/$TEST_ID" | jq .

# Check IPv6 connectivity to your server
# https://ipv6-test.com/validate.php?url=http://yourdomain.example.com/
```

Systematic troubleshooting - starting with DNS and working through firewall, web server binding, and ACME challenge simulation - resolves the vast majority of IPv6 ACME certificate issuance failures.
