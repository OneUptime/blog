# How to Set Up Postfix with Amazon SES on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Email, Postfix, Amazon SES, AWS

Description: Configure Postfix on Ubuntu to relay email through Amazon Simple Email Service (SES), including SMTP credentials, domain verification, and production access setup.

---

Amazon Simple Email Service (SES) is AWS's email sending service with competitive pricing at scale. If you are already running infrastructure on AWS, it is a natural choice for transactional email. Postfix can relay through SES using SMTP credentials, keeping the integration straightforward.

## SES Prerequisites

Before configuring Postfix, set up SES in your AWS account:

### Verify Your Sending Domain

In the AWS Console, navigate to SES:

1. Go to Amazon SES > Configuration > Verified Identities
2. Click "Create identity"
3. Choose "Domain" and enter your domain
4. AWS provides CNAME and TXT records to add to your DNS
5. Add those records, then wait for verification (usually a few minutes to an hour)

### Request Production Access

New SES accounts start in sandbox mode, which only allows sending to verified email addresses. For real use, request production access:

1. In SES, go to Account Dashboard
2. Click "Request production access"
3. Fill out the use case form explaining your email sending practices
4. AWS reviews and typically approves within 24-48 hours

### Create SMTP Credentials

SES SMTP credentials are separate from your IAM credentials:

1. In SES, go to Account Dashboard > SMTP settings
2. Note the SMTP endpoint for your region (e.g., `email-smtp.us-east-1.amazonaws.com`)
3. Click "Create SMTP credentials"
4. Name the IAM user (e.g., `postfix-ses-relay`)
5. Download the credentials CSV - you cannot retrieve them later

The credentials look like:
- SMTP Username: `AKIAIOSFODNN7EXAMPLE`
- SMTP Password: `BgDa8nCpJcZbcKEXAMPLEKEYabc123`

## Installing Postfix

```bash
# Install Postfix and SASL support
sudo apt update
sudo apt install -y postfix libsasl2-modules mailutils

# During install, choose "Internet Site"
# Set system mail name to your domain

# Check postfix is running
sudo systemctl status postfix
```

## Configuring Postfix for SES

Get your region-specific SES SMTP endpoint from the AWS console. Replace `us-east-1` with your region:

```bash
sudo nano /etc/postfix/main.cf
```

```ini
# /etc/postfix/main.cf - Amazon SES relay configuration

# Server identity
myhostname = mail.yourdomain.com
mydomain = yourdomain.com
myorigin = $mydomain

# Accept local submissions only
inet_interfaces = loopback-only
mydestination = localhost

# Route outbound mail through SES
# Replace region if not using us-east-1
relayhost = [email-smtp.us-east-1.amazonaws.com]:587

# SASL authentication
smtp_sasl_auth_enable = yes
smtp_sasl_password_maps = hash:/etc/postfix/sasl_passwd
smtp_sasl_security_options = noanonymous

# TLS - SES requires encrypted connections
smtp_tls_security_level = encrypt
smtp_tls_CAfile = /etc/ssl/certs/ca-certificates.crt
smtp_tls_session_cache_database = btree:${data_directory}/smtp_scache
smtp_tls_loglevel = 1

# Modern TLS settings
smtp_tls_protocols = !SSLv2, !SSLv3, !TLSv1, !TLSv1.1
smtp_tls_ciphers = high
```

## SASL Password File

```bash
sudo nano /etc/postfix/sasl_passwd
```

```text
# Amazon SES SMTP credentials
# Replace with your actual region and credentials
[email-smtp.us-east-1.amazonaws.com]:587    AKIAIOSFODNN7EXAMPLE:BgDa8nCpJcZbcKEXAMPLEKEY
```

Secure and hash:

```bash
sudo chmod 600 /etc/postfix/sasl_passwd
sudo postmap /etc/postfix/sasl_passwd

# Verify
ls -la /etc/postfix/sasl_passwd*
```

## Testing the Configuration

```bash
# Validate config
sudo postfix check

# Reload
sudo systemctl reload postfix

# Send test email (must be to verified address in sandbox mode)
echo "Test from $(hostname) via SES" | \
  mail -s "SES relay test" verified-address@yourdomain.com

# Watch logs
sudo tail -f /var/log/mail.log
```

Successful delivery looks like:

```text
postfix/smtp[1234]: to=<recipient@example.com>,
  relay=email-smtp.us-east-1.amazonaws.com[x.x.x.x]:587,
  status=sent (250 Ok 0000000000000000-XXXXXXXX-...)
```

## Configuring the From Address

SES will reject mail from unverified sender addresses. Map local senders to verified addresses:

```bash
sudo nano /etc/postfix/main.cf
```

Add:

```ini
sender_canonical_maps = hash:/etc/postfix/sender_canonical
```

```bash
sudo nano /etc/postfix/sender_canonical
```

```text
# Map local users to verified SES sender addresses
root            noreply@yourdomain.com
www-data        app@yourdomain.com
ubuntu          admin@yourdomain.com
```

```bash
sudo postmap /etc/postfix/sender_canonical
sudo systemctl reload postfix
```

## Using IAM Roles Instead of SMTP Credentials

If your server runs on EC2, you can avoid storing SMTP credentials entirely by using the AWS CLI with an IAM role to send via the SES API:

```bash
# Install AWS CLI
sudo apt install -y awscli

# The EC2 instance needs an IAM role with ses:SendEmail permission
# Attach role in EC2 console under Instance > Modify IAM Role

# Test sending via CLI
aws ses send-email \
  --from "sender@yourdomain.com" \
  --to "recipient@example.com" \
  --subject "Test via SES API" \
  --text "Hello from SES API" \
  --region us-east-1
```

For Postfix integration specifically though, SMTP credentials are the standard approach.

## SES Configuration Set for Tracking

SES Configuration Sets let you track email events (deliveries, bounces, complaints) through CloudWatch, SNS, or Kinesis:

```ini
# In main.cf, add a custom header for the configuration set
smtp_header_checks = regexp:/etc/postfix/header_checks
```

```bash
sudo nano /etc/postfix/header_checks
```

```text
# Add SES configuration set header to all outbound mail
/^From:/  PREPEND X-SES-CONFIGURATION-SET: your-config-set-name
```

```bash
sudo systemctl reload postfix
```

## Monitoring Bounces and Complaints

SES automatically handles bounce and complaint notifications. Set up SNS notifications:

1. In SES, go to your verified domain > Notifications
2. Click "Edit" next to "Bounce notifications"
3. Create or select an SNS topic
4. Repeat for "Complaint notifications"

Then subscribe to the SNS topic (email, Lambda, SQS) to receive bounce notifications.

Process bounces automatically to maintain list hygiene:

```bash
# SES also provides bounce/complaint data via CloudWatch
aws cloudwatch get-metric-statistics \
  --namespace AWS/SES \
  --metric-name BounceRate \
  --start-time $(date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period 86400 \
  --statistics Average \
  --region us-east-1
```

SES requires you to keep bounce rates below 5% and complaint rates below 0.1% to avoid sending restrictions.

## SES Sending Limits and Quotas

Check your current sending quota:

```bash
# Get account sending quota
aws ses get-send-quota --region us-east-1

# Get statistics for the past 24 hours
aws ses get-send-statistics --region us-east-1 | \
  python3 -c "
import sys, json
data = json.load(sys.stdin)['SendDataPoints']
sent = sum(d['DeliveryAttempts'] for d in data)
bounced = sum(d['Bounces'] for d in data)
print(f'Sent: {sent}, Bounced: {bounced}')"
```

Default sending limits for new accounts in production: typically 50,000 messages per day, 14 per second. Request increases through the AWS console if you need more.

## Cost Calculation

SES pricing (as of early 2026):
- First 62,000 messages per month: free (when sending from EC2)
- Beyond free tier: $0.10 per 1,000 messages

For comparison, sending 100,000 messages costs $3.80 beyond the free tier - significantly cheaper than most alternatives at scale.

```bash
# Count messages sent this month for cost estimation
sudo grep "relay=email-smtp" /var/log/mail.log | \
  grep "status=sent" | \
  grep "$(date +%b)" | wc -l
```

## Troubleshooting

**"Email address not verified" error (sandbox mode):**

In sandbox mode, both sender and recipient must be verified. Either verify the recipient address or request production access.

**"454 Throttling failure: Maximum sending rate exceeded":**

```bash
# Add a rate limit to prevent overwhelming SES
# In main.cf:
default_destination_rate_delay = 1s    # 1 second between deliveries
smtp_destination_concurrency_limit = 2  # max 2 concurrent connections
```

**TLS certificate verification failures:**

```bash
# Test TLS connection manually
openssl s_client -starttls smtp \
  -connect email-smtp.us-east-1.amazonaws.com:587

# Check if ca-certificates is up to date
sudo apt install -y ca-certificates
sudo update-ca-certificates
```

Amazon SES combined with Postfix gives you enterprise-grade email infrastructure at minimal cost, especially for workloads already running on AWS.
