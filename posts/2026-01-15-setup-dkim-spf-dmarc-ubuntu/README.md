# How to Set Up DKIM, SPF, and DMARC Records on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, DKIM, SPF, DMARC, Email Security, DNS, Tutorial

Description: Complete guide to configuring email authentication with DKIM, SPF, and DMARC on Ubuntu.

---

Email authentication is crucial for protecting your domain from spoofing, phishing attacks, and ensuring your legitimate emails reach their destination. This comprehensive guide walks you through setting up SPF, DKIM, and DMARC on Ubuntu to secure your email infrastructure.

## Understanding Email Authentication

Before diving into configuration, let's understand what each protocol does:

### SPF (Sender Policy Framework)

SPF allows domain owners to specify which mail servers are authorized to send emails on behalf of their domain. When a receiving server gets an email, it checks the SPF record to verify if the sending server is authorized.

### DKIM (DomainKeys Identified Mail)

DKIM adds a digital signature to outgoing emails. The receiving server can verify this signature against the public key published in your DNS records, confirming the email wasn't altered in transit and truly originated from your domain.

### DMARC (Domain-based Message Authentication, Reporting, and Conformance)

DMARC builds on SPF and DKIM by providing instructions to receiving servers on how to handle emails that fail authentication. It also enables reporting so you can monitor authentication results.

## Prerequisites

Before starting, ensure you have:

- Ubuntu 20.04, 22.04, or 24.04 server
- Root or sudo access
- A registered domain name
- Access to your domain's DNS management
- Postfix mail server installed (or another MTA)

```bash
# Update your system first
sudo apt update && sudo apt upgrade -y

# Install Postfix if not already installed
sudo apt install postfix -y
```

## SPF Record Configuration

### Understanding SPF Syntax

SPF records are published as TXT records in your DNS. Here's the syntax breakdown:

```
v=spf1 [mechanisms] [modifiers]
```

Common mechanisms include:
- `ip4:` - Authorize an IPv4 address or range
- `ip6:` - Authorize an IPv6 address or range
- `a` - Authorize the domain's A record
- `mx` - Authorize the domain's MX servers
- `include:` - Include another domain's SPF record
- `all` - Match all (used with qualifiers)

Qualifiers:
- `+` (Pass) - Default, can be omitted
- `-` (Fail) - Hard fail
- `~` (SoftFail) - Soft fail
- `?` (Neutral) - Neutral result

### Creating Your SPF Record

First, identify all servers that send email for your domain:

```bash
# Find your server's public IP address
curl -4 ifconfig.me

# Check your current MX records
dig +short MX yourdomain.com
```

Create an SPF record based on your infrastructure:

```dns
; Basic SPF record - only your server sends email
; Replace 203.0.113.10 with your actual server IP
yourdomain.com.  IN  TXT  "v=spf1 ip4:203.0.113.10 -all"

; SPF record with MX servers authorized
yourdomain.com.  IN  TXT  "v=spf1 mx -all"

; SPF record with multiple sources (common setup)
; This authorizes: your IP, MX servers, and Google Workspace
yourdomain.com.  IN  TXT  "v=spf1 ip4:203.0.113.10 mx include:_spf.google.com -all"

; Comprehensive SPF for enterprise environments
yourdomain.com.  IN  TXT  "v=spf1 ip4:203.0.113.0/24 ip6:2001:db8::/32 mx include:_spf.google.com include:sendgrid.net include:amazonses.com -all"
```

### SPF Best Practices

```dns
; RECOMMENDED: Start with softfail (~all) during testing
yourdomain.com.  IN  TXT  "v=spf1 ip4:203.0.113.10 mx ~all"

; Once verified, switch to hardfail (-all) for production
yourdomain.com.  IN  TXT  "v=spf1 ip4:203.0.113.10 mx -all"

; AVOID: Using +all (allows anyone to send as your domain)
; NEVER DO THIS: "v=spf1 +all"
```

### Verify Your SPF Record

```bash
# Check the SPF record from command line
dig +short TXT yourdomain.com | grep spf

# Alternative using host command
host -t TXT yourdomain.com
```

## Installing OpenDKIM

OpenDKIM is the most widely used DKIM implementation for Linux mail servers.

### Installation

```bash
# Install OpenDKIM and tools
sudo apt install opendkim opendkim-tools -y

# Verify installation
opendkim -V
```

### Create Required Directories

```bash
# Create directory structure for DKIM keys
# Each domain gets its own subdirectory
sudo mkdir -p /etc/opendkim/keys/yourdomain.com

# Set proper ownership
# OpenDKIM runs as opendkim user
sudo chown -R opendkim:opendkim /etc/opendkim

# Set restrictive permissions for security
# Only opendkim user should access keys
sudo chmod 750 /etc/opendkim
sudo chmod 750 /etc/opendkim/keys
```

## Generating DKIM Keys

### Create the Key Pair

```bash
# Navigate to your domain's key directory
cd /etc/opendkim/keys/yourdomain.com

# Generate a 2048-bit RSA key pair
# -s: selector name (use date-based for easy rotation)
# -d: domain name
# -b: key size (2048 is recommended minimum)
sudo opendkim-genkey -s mail -d yourdomain.com -b 2048

# This creates two files:
# mail.private - Your private key (keep secret!)
# mail.txt - DNS record containing public key

# Set proper ownership and permissions
sudo chown opendkim:opendkim mail.private mail.txt
sudo chmod 600 mail.private
```

### View Your Public Key

```bash
# Display the DNS record you need to add
cat /etc/opendkim/keys/yourdomain.com/mail.txt
```

The output will look something like:

```dns
mail._domainkey IN TXT ( "v=DKIM1; h=sha256; k=rsa; "
    "p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu5oIUrFDW..."
    "...more base64 encoded key data..." )
```

### Using a Date-Based Selector

For easier key rotation, use date-based selectors:

```bash
# Generate key with date-based selector
# Format: YYYYMM for monthly rotation capability
sudo opendkim-genkey -s 202601 -d yourdomain.com -b 2048

# This creates 202601.private and 202601.txt
```

## OpenDKIM Configuration

### Main Configuration File

```bash
# Backup the original configuration
sudo cp /etc/opendkim.conf /etc/opendkim.conf.backup

# Edit the main configuration file
sudo nano /etc/opendkim.conf
```

Replace the contents with this comprehensive configuration:

```conf
# /etc/opendkim.conf
# OpenDKIM Configuration File

# Logging
# Log to syslog for centralized logging
Syslog                  yes
# Log successful operations (useful for debugging)
LogWhy                  yes
# Set log level (higher = more verbose)
SyslogSuccess           yes

# Signing and Verification
# Sign outgoing messages and verify incoming
Mode                    sv
# Canonicalization algorithm (relaxed is more forgiving)
# Format: header/body
Canonicalization        relaxed/simple

# Key and Domain Settings
# Domain to sign for (can be overridden by SigningTable)
Domain                  yourdomain.com
# Selector (must match your DNS record)
Selector                mail
# Path to private key file
KeyFile                 /etc/opendkim/keys/yourdomain.com/mail.private

# For multiple domains, use these instead of Domain/Selector/KeyFile:
# KeyTable                /etc/opendkim/KeyTable
# SigningTable            refile:/etc/opendkim/SigningTable
# ExternalIgnoreList      refile:/etc/opendkim/TrustedHosts
# InternalHosts           refile:/etc/opendkim/TrustedHosts

# Socket Configuration
# Unix socket for local connection (recommended for same-server setup)
Socket                  local:/var/spool/postfix/opendkim/opendkim.sock
# Alternative: TCP socket for remote connections
# Socket                inet:8891@localhost

# User and Permissions
UserID                  opendkim:opendkim
UMask                   002

# Operational Settings
# Auto-restart on failure
AutoRestart             yes
AutoRestartRate         10/1h
# Don't modify headers (prevent information leakage)
RemoveOldSignatures     yes
# PID file location
PidFile                 /run/opendkim/opendkim.pid

# Signature Settings
# Which headers to sign (include important headers)
SignHeaders             from,to,subject,date,message-id,content-type,mime-version
# Oversign From header to prevent tampering
OversignHeaders         From
```

### Multi-Domain Configuration

For servers handling multiple domains, create these additional files:

```bash
# Create KeyTable - maps key names to key files
sudo nano /etc/opendkim/KeyTable
```

```conf
# /etc/opendkim/KeyTable
# Format: key-name domain:selector:path-to-private-key

# Each line defines a key that can be used for signing
mail._domainkey.yourdomain.com yourdomain.com:mail:/etc/opendkim/keys/yourdomain.com/mail.private
mail._domainkey.anotherdomain.com anotherdomain.com:mail:/etc/opendkim/keys/anotherdomain.com/mail.private
```

```bash
# Create SigningTable - maps sender addresses to keys
sudo nano /etc/opendkim/SigningTable
```

```conf
# /etc/opendkim/SigningTable
# Format: pattern key-name
# Uses regex patterns to match sender addresses

# Sign all mail from yourdomain.com with its key
*@yourdomain.com mail._domainkey.yourdomain.com
*@*.yourdomain.com mail._domainkey.yourdomain.com

# Sign all mail from anotherdomain.com with its key
*@anotherdomain.com mail._domainkey.anotherdomain.com
```

```bash
# Create TrustedHosts - hosts that can send mail to be signed
sudo nano /etc/opendkim/TrustedHosts
```

```conf
# /etc/opendkim/TrustedHosts
# List of hosts/networks that are allowed to send mail through this server
# One entry per line

# Localhost (always include)
127.0.0.1
::1
localhost

# Your server's hostname
mail.yourdomain.com

# Internal network range (adjust to your network)
10.0.0.0/8
192.168.0.0/16

# Your domains (sign mail from these domains)
yourdomain.com
anotherdomain.com
```

### Create Socket Directory

```bash
# Create directory for Unix socket inside Postfix chroot
sudo mkdir -p /var/spool/postfix/opendkim

# Set ownership to opendkim
sudo chown opendkim:postfix /var/spool/postfix/opendkim

# Set permissions
sudo chmod 750 /var/spool/postfix/opendkim
```

### Configure Default Settings

```bash
# Edit OpenDKIM defaults
sudo nano /etc/default/opendkim
```

```conf
# /etc/default/opendkim
# Configuration options for OpenDKIM daemon

# Socket configuration (should match opendkim.conf)
SOCKET="local:/var/spool/postfix/opendkim/opendkim.sock"

# Uncomment for TCP socket:
# SOCKET="inet:8891@localhost"

# Additional daemon options (if needed)
# DAEMON_OPTS=""
```

## Postfix Integration

### Configure Postfix for OpenDKIM

```bash
# Edit Postfix main configuration
sudo nano /etc/postfix/main.cf
```

Add these lines at the end of the file:

```conf
# /etc/postfix/main.cf (append these lines)

# ===========================================
# OpenDKIM Integration (Milter Configuration)
# ===========================================

# Milter protocol version
milter_protocol = 6

# Default action if milter is unavailable
# accept = deliver mail anyway (use during testing)
# tempfail = temporary failure, retry later (recommended for production)
milter_default_action = accept

# SMTP milters (for incoming mail)
smtpd_milters = unix:/opendkim/opendkim.sock

# Non-SMTP milters (for locally-generated mail)
non_smtpd_milters = unix:/opendkim/opendkim.sock
```

### Alternative TCP Socket Configuration

If using TCP sockets instead of Unix sockets:

```conf
# For TCP socket configuration
smtpd_milters = inet:localhost:8891
non_smtpd_milters = inet:localhost:8891
```

### Add Postfix User to OpenDKIM Group

```bash
# Add postfix to opendkim group for socket access
sudo usermod -a -G opendkim postfix
```

### Restart Services

```bash
# Restart OpenDKIM first
sudo systemctl restart opendkim

# Check OpenDKIM status
sudo systemctl status opendkim

# Restart Postfix
sudo systemctl restart postfix

# Check Postfix status
sudo systemctl status postfix

# Enable services to start on boot
sudo systemctl enable opendkim
sudo systemctl enable postfix
```

## DNS Record Examples

### Adding Records to Your DNS

Now add the following records to your DNS provider:

#### SPF Record (TXT)

```dns
; SPF Record
; Host: @ (or yourdomain.com)
; Type: TXT
; Value: (adjust IPs and includes for your setup)

yourdomain.com.    IN    TXT    "v=spf1 ip4:203.0.113.10 mx ~all"
```

#### DKIM Record (TXT)

```dns
; DKIM Record
; Host: mail._domainkey (or mail._domainkey.yourdomain.com)
; Type: TXT
; Value: (contents from mail.txt file)

mail._domainkey.yourdomain.com.    IN    TXT    "v=DKIM1; h=sha256; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu5oIUrFDWZM..."
```

Note: If your DKIM key is too long for a single TXT record (255 characters), split it across multiple strings:

```dns
mail._domainkey.yourdomain.com.    IN    TXT    ( "v=DKIM1; h=sha256; k=rsa; "
    "p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA..."
    "...continued key data..." )
```

## DMARC Policy Setup

### Understanding DMARC Policies

DMARC policies tell receiving servers what to do with emails that fail authentication:

- `p=none` - Monitor only, don't take action (start here)
- `p=quarantine` - Send failing emails to spam
- `p=reject` - Reject failing emails entirely

### DMARC Record Structure

```dns
; DMARC Record Format
_dmarc.yourdomain.com.    IN    TXT    "v=DMARC1; p=policy; [optional tags]"
```

### DMARC Tags Explained

```dns
; Complete DMARC record with all common tags
_dmarc.yourdomain.com.    IN    TXT    "v=DMARC1; p=none; sp=none; rua=mailto:dmarc-reports@yourdomain.com; ruf=mailto:dmarc-forensic@yourdomain.com; fo=1; adkim=r; aspf=r; pct=100; ri=86400"

; Tag explanations:
; v=DMARC1          - Version (required, must be first)
; p=none            - Policy for domain (none/quarantine/reject)
; sp=none           - Policy for subdomains
; rua=mailto:...    - Address for aggregate reports (daily summaries)
; ruf=mailto:...    - Address for forensic reports (individual failures)
; fo=1              - Forensic report options (0=both fail, 1=either fails)
; adkim=r           - DKIM alignment (r=relaxed, s=strict)
; aspf=r            - SPF alignment (r=relaxed, s=strict)
; pct=100           - Percentage of messages to apply policy (1-100)
; ri=86400          - Reporting interval in seconds (86400=daily)
```

### Recommended DMARC Rollout

Start with monitoring, then gradually increase enforcement:

```dns
; Phase 1: Monitor (run for 2-4 weeks)
; Collect reports without affecting mail delivery
_dmarc.yourdomain.com.    IN    TXT    "v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com"

; Phase 2: Quarantine a percentage (run for 2-4 weeks)
; Start with 10% of failing messages going to spam
_dmarc.yourdomain.com.    IN    TXT    "v=DMARC1; p=quarantine; pct=10; rua=mailto:dmarc@yourdomain.com"

; Phase 3: Increase quarantine percentage
_dmarc.yourdomain.com.    IN    TXT    "v=DMARC1; p=quarantine; pct=50; rua=mailto:dmarc@yourdomain.com"

; Phase 4: Full quarantine
_dmarc.yourdomain.com.    IN    TXT    "v=DMARC1; p=quarantine; pct=100; rua=mailto:dmarc@yourdomain.com"

; Phase 5: Reject policy (final, most secure)
_dmarc.yourdomain.com.    IN    TXT    "v=DMARC1; p=reject; rua=mailto:dmarc@yourdomain.com; ruf=mailto:dmarc-forensic@yourdomain.com"
```

## Testing Configuration

### Test SPF Record

```bash
# Query SPF record
dig +short TXT yourdomain.com | grep spf

# Use online SPF checker (alternative)
# Visit: https://mxtoolbox.com/spf.aspx

# Test SPF from command line with detailed output
dig TXT yourdomain.com +noall +answer
```

### Test DKIM Record

```bash
# Query DKIM record (replace 'mail' with your selector)
dig +short TXT mail._domainkey.yourdomain.com

# Verify DKIM key format
sudo opendkim-testkey -d yourdomain.com -s mail -vvv

# Expected output for success:
# opendkim-testkey: key OK
```

### Test DMARC Record

```bash
# Query DMARC record
dig +short TXT _dmarc.yourdomain.com

# Verify record format
host -t TXT _dmarc.yourdomain.com
```

### Send a Test Email

```bash
# Send test email and check headers
echo "This is a test email to verify DKIM signing." | mail -s "DKIM Test" test@gmail.com

# Alternative using sendmail
cat <<EOF | sendmail -t
To: test@gmail.com
Subject: DKIM Signature Test
From: admin@yourdomain.com

This is a test message to verify DKIM is working.
EOF
```

### Check Email Headers

When you receive the test email, view the original message headers. Look for:

```
Authentication-Results: mx.google.com;
       dkim=pass header.i=@yourdomain.com header.s=mail;
       spf=pass (google.com: domain of admin@yourdomain.com designates 203.0.113.10 as permitted sender);
       dmarc=pass (p=NONE sp=NONE dis=NONE) header.from=yourdomain.com
```

### Comprehensive Testing Script

```bash
#!/bin/bash
# save as /usr/local/bin/test-email-auth.sh

DOMAIN="yourdomain.com"
SELECTOR="mail"

echo "=== Email Authentication Test Script ==="
echo ""

echo "1. Testing SPF Record..."
SPF=$(dig +short TXT $DOMAIN | grep -i spf)
if [ -n "$SPF" ]; then
    echo "   SPF Record Found: $SPF"
else
    echo "   WARNING: No SPF record found!"
fi
echo ""

echo "2. Testing DKIM Record..."
DKIM=$(dig +short TXT ${SELECTOR}._domainkey.${DOMAIN})
if [ -n "$DKIM" ]; then
    echo "   DKIM Record Found: ${DKIM:0:50}..."
    echo "   Running opendkim-testkey..."
    sudo opendkim-testkey -d $DOMAIN -s $SELECTOR -vvv 2>&1 | tail -1
else
    echo "   WARNING: No DKIM record found!"
fi
echo ""

echo "3. Testing DMARC Record..."
DMARC=$(dig +short TXT _dmarc.${DOMAIN})
if [ -n "$DMARC" ]; then
    echo "   DMARC Record Found: $DMARC"
else
    echo "   WARNING: No DMARC record found!"
fi
echo ""

echo "4. Checking OpenDKIM Status..."
systemctl is-active opendkim
echo ""

echo "5. Checking Postfix Status..."
systemctl is-active postfix
echo ""

echo "=== Test Complete ==="
```

Make it executable and run:

```bash
sudo chmod +x /usr/local/bin/test-email-auth.sh
sudo /usr/local/bin/test-email-auth.sh
```

## Monitoring Reports

### Understanding DMARC Reports

DMARC aggregate reports are XML files sent daily by receiving mail servers. They contain:

- Report metadata (organization, date range)
- Your published policy
- Authentication results for each source IP
- Number of messages from each source

### Setting Up Report Processing

```bash
# Install XML processing tools
sudo apt install xmlstarlet -y

# Create directory for DMARC reports
sudo mkdir -p /var/dmarc-reports
sudo chmod 755 /var/dmarc-reports
```

### Simple Report Parser Script

```bash
#!/bin/bash
# save as /usr/local/bin/parse-dmarc-report.sh
# Usage: ./parse-dmarc-report.sh report.xml

if [ -z "$1" ]; then
    echo "Usage: $0 <dmarc-report.xml>"
    exit 1
fi

REPORT=$1

echo "=== DMARC Report Analysis ==="
echo ""

# Extract report metadata
echo "Report Organization: $(xmlstarlet sel -t -v '//report_metadata/org_name' $REPORT)"
echo "Report ID: $(xmlstarlet sel -t -v '//report_metadata/report_id' $REPORT)"
echo "Date Range: $(xmlstarlet sel -t -v '//report_metadata/date_range/begin' $REPORT) - $(xmlstarlet sel -t -v '//report_metadata/date_range/end' $REPORT)"
echo ""

echo "Policy Published:"
echo "  Domain: $(xmlstarlet sel -t -v '//policy_published/domain' $REPORT)"
echo "  Policy: $(xmlstarlet sel -t -v '//policy_published/p' $REPORT)"
echo ""

echo "Records:"
xmlstarlet sel -t -m '//record' \
    -o "  Source IP: " -v 'row/source_ip' \
    -o " | Count: " -v 'row/count' \
    -o " | SPF: " -v 'row/policy_evaluated/spf' \
    -o " | DKIM: " -v 'row/policy_evaluated/dkim' \
    -o " | Disposition: " -v 'row/policy_evaluated/disposition' \
    -n $REPORT
```

### Free DMARC Report Services

Consider using free services to parse and visualize reports:

- **DMARC Analyzer** - Free tier available
- **Postmark DMARC** - Free DMARC monitoring
- **DMARCian** - Free weekly digest

### Log Monitoring

```bash
# Monitor OpenDKIM logs in real-time
sudo tail -f /var/log/mail.log | grep -i dkim

# Check for DKIM signing activity
sudo grep "DKIM-Signature" /var/log/mail.log

# Monitor authentication failures
sudo grep -E "(dkim=fail|spf=fail|dmarc=fail)" /var/log/mail.log
```

## Troubleshooting

### Common Issues and Solutions

#### OpenDKIM Not Starting

```bash
# Check for configuration errors
sudo opendkim -n

# View detailed error messages
sudo journalctl -u opendkim -n 50

# Verify socket directory exists and has correct permissions
ls -la /var/spool/postfix/opendkim/

# Fix common permission issues
sudo chown opendkim:postfix /var/spool/postfix/opendkim
sudo chmod 750 /var/spool/postfix/opendkim
```

#### DKIM Signature Not Being Added

```bash
# Check if Postfix is connecting to OpenDKIM
sudo grep -i milter /var/log/mail.log

# Verify OpenDKIM is running and listening
sudo netstat -tlnp | grep opendkim
# or for Unix socket:
ls -la /var/spool/postfix/opendkim/

# Test key validity
sudo opendkim-testkey -d yourdomain.com -s mail -vvv

# Check TrustedHosts includes your sending IP
cat /etc/opendkim/TrustedHosts
```

#### DNS Record Not Found

```bash
# Verify DNS propagation (may take up to 48 hours)
dig +trace TXT mail._domainkey.yourdomain.com

# Check record at specific nameserver
dig @8.8.8.8 TXT mail._domainkey.yourdomain.com

# Verify no typos in selector
# The selector in DNS must match your opendkim.conf
grep -i selector /etc/opendkim.conf
```

#### SPF Authentication Failing

```bash
# Verify your sending IP is in SPF record
dig +short TXT yourdomain.com

# Check your server's outgoing IP
curl -4 ifconfig.me

# Ensure IP matches what's in SPF record
# If using NAT, check the public IP, not private
```

#### Key Size Issues

```bash
# Some older systems have issues with 2048-bit keys
# If having problems, try regenerating with 1024-bit (less secure)
sudo opendkim-genkey -s mail -d yourdomain.com -b 1024

# However, 2048-bit is strongly recommended
# Instead, check if DNS provider supports long TXT records
```

#### Permission Denied Errors

```bash
# Fix key file permissions
sudo chown opendkim:opendkim /etc/opendkim/keys/yourdomain.com/mail.private
sudo chmod 600 /etc/opendkim/keys/yourdomain.com/mail.private

# Fix socket directory permissions
sudo chown opendkim:postfix /var/spool/postfix/opendkim
sudo chmod 750 /var/spool/postfix/opendkim

# Ensure postfix is in opendkim group
sudo usermod -a -G opendkim postfix
sudo systemctl restart postfix
```

### Debug Mode

```bash
# Run OpenDKIM in debug mode
sudo systemctl stop opendkim
sudo opendkim -f -x /etc/opendkim.conf

# In another terminal, send a test email
echo "Debug test" | mail -s "Debug Test" test@example.com

# Watch the debug output for errors
```

## Best Practices

### Security Best Practices

```bash
# 1. Use strong key sizes (2048-bit minimum, 4096-bit ideal)
sudo opendkim-genkey -s mail -d yourdomain.com -b 2048

# 2. Rotate DKIM keys regularly (every 6-12 months)
# Generate new key with new selector
sudo opendkim-genkey -s $(date +%Y%m) -d yourdomain.com -b 2048

# 3. Keep private keys secure
sudo chmod 600 /etc/opendkim/keys/*/
sudo chown -R opendkim:opendkim /etc/opendkim/keys/

# 4. Monitor authentication results
# Set up regular log reviews
sudo grep -c "dkim=pass" /var/log/mail.log
sudo grep -c "dkim=fail" /var/log/mail.log
```

### Deployment Best Practices

1. **Start with monitoring mode**
   - Use `p=none` in DMARC initially
   - Review reports for 2-4 weeks before enforcing

2. **Gradual rollout**
   - Increase DMARC policy strength gradually
   - Use `pct` tag to limit enforcement percentage

3. **Document everything**
   - Keep records of all authorized sending sources
   - Document key rotation procedures

4. **Test before production**
   - Use testing tools before going live
   - Send test emails to multiple providers

5. **Set up monitoring**
   - Process DMARC reports regularly
   - Alert on authentication failures

### DKIM Key Rotation Procedure

```bash
#!/bin/bash
# save as /usr/local/bin/rotate-dkim-key.sh

DOMAIN="yourdomain.com"
NEW_SELECTOR=$(date +%Y%m)
OLD_SELECTOR="mail"  # or your current selector

echo "=== DKIM Key Rotation Script ==="

# Step 1: Generate new key
echo "Generating new key with selector: $NEW_SELECTOR"
cd /etc/opendkim/keys/$DOMAIN
sudo opendkim-genkey -s $NEW_SELECTOR -d $DOMAIN -b 2048
sudo chown opendkim:opendkim ${NEW_SELECTOR}.private ${NEW_SELECTOR}.txt
sudo chmod 600 ${NEW_SELECTOR}.private

# Step 2: Display new DNS record
echo ""
echo "Add this DNS record:"
cat ${NEW_SELECTOR}.txt
echo ""

# Step 3: Instructions
echo "After adding DNS record and waiting for propagation:"
echo "1. Update /etc/opendkim.conf with new selector"
echo "2. Update /etc/opendkim/KeyTable if using multi-domain"
echo "3. Restart OpenDKIM: sudo systemctl restart opendkim"
echo "4. Test: sudo opendkim-testkey -d $DOMAIN -s $NEW_SELECTOR -vvv"
echo "5. After verification, remove old DNS record"
```

### Recommended Final Configuration

Here's a summary of recommended production settings:

**SPF Record:**
```dns
yourdomain.com. IN TXT "v=spf1 ip4:YOUR_IP mx -all"
```

**DKIM Record:**
```dns
mail._domainkey.yourdomain.com. IN TXT "v=DKIM1; h=sha256; k=rsa; p=YOUR_PUBLIC_KEY"
```

**DMARC Record:**
```dns
_dmarc.yourdomain.com. IN TXT "v=DMARC1; p=reject; rua=mailto:dmarc@yourdomain.com; ruf=mailto:dmarc-forensic@yourdomain.com; fo=1"
```

## Summary Checklist

Use this checklist to verify your setup:

- [ ] SPF record published and verified with `dig TXT yourdomain.com`
- [ ] OpenDKIM installed and configured
- [ ] DKIM keys generated with adequate key size (2048-bit+)
- [ ] DKIM DNS record published and verified
- [ ] OpenDKIM testkey passes: `sudo opendkim-testkey -d yourdomain.com -s mail -vvv`
- [ ] Postfix configured with milter settings
- [ ] OpenDKIM service running: `sudo systemctl status opendkim`
- [ ] DMARC record published starting with `p=none`
- [ ] Test emails showing `dkim=pass`, `spf=pass`, `dmarc=pass`
- [ ] DMARC reporting email configured and receiving reports
- [ ] Monitoring and alerting set up

## Monitoring Your Email Infrastructure with OneUptime

Setting up DKIM, SPF, and DMARC is essential for email security, but ongoing monitoring is equally important. [OneUptime](https://oneuptime.com) provides comprehensive monitoring capabilities that can help ensure your email infrastructure remains healthy:

- **Server Monitoring**: Track the health of your mail server, including CPU, memory, and disk usage to prevent outages
- **Service Monitoring**: Monitor your Postfix and OpenDKIM services to ensure they're running properly
- **DNS Monitoring**: Verify your SPF, DKIM, and DMARC records are correctly published and accessible
- **Log Monitoring**: Aggregate and analyze mail logs to detect authentication failures and potential security issues
- **Alerting**: Get instant notifications when authentication failures spike or services go down
- **Status Pages**: Communicate email service status to your users with customizable status pages
- **Incident Management**: Track and resolve email-related incidents efficiently with built-in incident management

With OneUptime's monitoring in place, you can catch issues before they impact your email deliverability and maintain the trust you've built with proper email authentication.

---

By following this guide, you've implemented a robust email authentication system that protects your domain from spoofing and improves your email deliverability. Remember to monitor your DMARC reports regularly and adjust your policies as needed to maintain optimal email security.
