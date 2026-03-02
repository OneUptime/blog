# How to Configure SPF Records and Validation on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, SPF, Email, Postfix, DNS

Description: Set up SPF DNS records for your domain and configure Postfix on Ubuntu to validate incoming SPF records, reducing spam and email spoofing.

---

SPF (Sender Policy Framework) is a DNS-based mechanism that specifies which mail servers are authorized to send email on behalf of your domain. When a receiving mail server gets a message claiming to be from `user@example.com`, it queries the SPF record for `example.com` to verify that the sending server is listed. If it is not, the message is likely a forgery.

SPF alone does not prevent all spoofing (it only checks the envelope sender, not the From header), but it is a required baseline for modern email delivery and is checked by all major mail providers.

## Understanding SPF Record Syntax

An SPF record is a DNS TXT record at the root of your domain. The basic structure:

```
v=spf1 [mechanisms] [modifiers] [all]
```

**Common mechanisms:**
- `ip4:x.x.x.x` - authorize a specific IPv4 address
- `ip4:x.x.x.x/24` - authorize an IPv4 range
- `ip6:2001:db8::/32` - authorize an IPv6 range
- `mx` - authorize all IPs listed in the domain's MX records
- `a` - authorize the domain's A record IP(s)
- `include:otherdomain.com` - include another domain's SPF record
- `ptr` - match PTR records (slow, not recommended)

**The all mechanism (qualifier determines the policy):**
- `-all` - fail: reject mail from unlisted servers (strictest)
- `~all` - softfail: mark as suspicious but accept (recommended during testing)
- `?all` - neutral: no policy
- `+all` - pass: allow any sender (pointless from a security standpoint)

## Publishing SPF Records

### Basic SPF Record

For a domain where only one server sends mail:

```
# If your server's IP is 203.0.113.10:
v=spf1 ip4:203.0.113.10 -all
```

For a domain where the servers sending mail are also the MX records:

```
v=spf1 mx -all
```

### SPF Record Including Third-Party Services

If you send mail through your own server AND Google Workspace or SendGrid:

```
v=spf1 ip4:203.0.113.10 include:_spf.google.com include:sendgrid.net -all
```

### Adding the DNS Record

In your DNS provider's control panel, create a TXT record:
- **Name**: `@` or `example.com` (the root of the domain)
- **Type**: TXT
- **TTL**: 300-3600 (start low while testing)
- **Value**: `v=spf1 ip4:203.0.113.10 mx -all`

Only one SPF record per domain is valid. Multiple SPF records result in a "permerror" that can cause delivery failures.

## Verifying Your SPF Record

```bash
# Query the SPF record for your domain
dig TXT example.com +short

# Or use host
host -t TXT example.com

# Use the spf-tools to validate the record
sudo apt install -y libmail-spf-perl

# Check the SPF record syntax
# (Use online tools like mxtoolbox.com/spf for a quick check)

# Test SPF evaluation with a specific sending IP
python3 - <<'EOF'
import subprocess
result = subprocess.run(
    ['spfquery', '-ip=203.0.113.10', '-sender=test@example.com', '-helo=mail.example.com'],
    capture_output=True, text=True
)
print(result.stdout)
print(result.stderr)
EOF
```

## Installing SPF Validation in Postfix

Postfix does not check SPF natively. You need a milter or policy service. Two common options are `postfix-policyd-spf-python` and `pypolicyd-spf`.

### Option 1: pypolicyd-spf (Recommended)

```bash
# Install the SPF policy daemon
sudo apt install -y postfix-policyd-spf-python

# The package installs a policy service that Postfix queries
# Verify the service binary is available
which policyd-spf
```

```bash
# Configure the policy service
sudo tee /etc/postfix-policyd-spf-python/policyd-spf.conf > /dev/null <<'EOF'
# Debug level (0-5, default 1)
debugLevel = 1

# HELO check behavior (Pass/Fail/SoftFail/None)
HELO_reject = Fail

# Mail From check behavior
Mail_From_reject = Fail

# Skip SPF checks for authenticated senders
skip_addresses = 127.0.0.0/8,::ffff:127.0.0.0/104,::1

# Header text added to messages
Header_Type = SPF

# Limit on DNS lookups (SPF allows max 10)
Lookup_Time = 20
EOF
```

### Integrating with Postfix

```bash
# Add the policy service to Postfix's master.cf
sudo tee -a /etc/postfix/master.cf > /dev/null <<'EOF'
# SPF policy service
policyd-spf  unix  -       n       n       -       0       spawn
    user=policyd-spf argv=/usr/bin/policyd-spf
EOF

# Add the policy check to main.cf
# The 3600s timeout matches SPF's 10-lookup limit giving time to resolve
sudo postconf -e "policyd-spf_time_limit = 3600"

# Add the policy service to smtpd_recipient_restrictions
# It should run AFTER permit_mynetworks and permit_sasl_authenticated
# to avoid checking mail from authenticated senders
sudo postconf -e "smtpd_recipient_restrictions =
    permit_mynetworks,
    permit_sasl_authenticated,
    reject_unauth_destination,
    check_policy_service unix:private/policyd-spf"

# Restart Postfix
sudo systemctl restart postfix
```

### Option 2: SPF Checking via OpenSPF Milter

```bash
# For setups already using milters (e.g., with OpenDKIM)
sudo apt install -y spf-milter-python

# Configure in /etc/spf-milter-python.conf if needed
# Then add to smtpd_milters in main.cf alongside other milters
```

## Testing SPF Validation

```bash
# Send a test email from an unauthorized server and check the logs
# The Authentication-Results header should show spf=fail

# Monitor Postfix logs for SPF results
sudo tail -f /var/log/mail.log | grep -i spf

# Or send email through a service like mail-tester.com
# which reports SPF, DKIM, and DMARC status

# Check if a specific IP passes SPF for your domain
python3 - <<'EOF'
import dns.resolver

# Query the SPF record
answers = dns.resolver.resolve('example.com', 'TXT')
for rdata in answers:
    for txt_string in rdata.strings:
        decoded = txt_string.decode()
        if decoded.startswith('v=spf1'):
            print(f"SPF Record: {decoded}")
EOF
```

## Common SPF Issues and Solutions

### SPF Record Too Many Lookups

SPF allows a maximum of 10 DNS lookups. Each `include:`, `mx`, `a`, and `ptr` mechanism consumes one lookup. If you exceed 10, you get a `permerror`.

```bash
# Count DNS lookups in your SPF record manually
# Or use an online SPF checker that counts for you

# To reduce lookups, replace include: directives with actual IP ranges
# Instead of: include:sendgrid.net
# Use: ip4:149.72.0.0/16 ip4:167.89.0.0/16

# SPF record flattening tools exist to automate this
sudo apt install -y spf-tools
# spf-flatten example.com  # not available in all distros; use online tools
```

### Multiple SPF Records

```bash
# Only one TXT record starting with v=spf1 is allowed per name
# Find and fix multiple SPF records
dig TXT example.com +short | grep "v=spf1"

# If you see two lines starting with v=spf1, combine them into one record
```

### IPv6 Addresses Not Included

```bash
# If your server has an IPv6 address, include it
# Without it, mail sent via IPv6 fails SPF

# Find your server's IPv6 addresses
ip -6 addr show | grep -v fe80 | grep inet6

# Add to SPF: v=spf1 ip4:203.0.113.10 ip6:2001:db8::1 -all
```

## SPF Record Examples for Common Scenarios

```bash
# Only this server sends mail
v=spf1 ip4:203.0.113.10 -all

# This server + Google Workspace
v=spf1 ip4:203.0.113.10 include:_spf.google.com -all

# This server + multiple providers + IPv6
v=spf1 ip4:203.0.113.10 ip6:2001:db8::1 include:_spf.google.com include:sendgrid.net ~all

# Transactional email-only domain (no mail server)
# This prevents any mail from appearing to come from this domain
v=spf1 -all

# Domain that uses only MX hosts for sending
v=spf1 mx -all
```

## Monitoring SPF in Mail Headers

After proper configuration, received email should contain headers like:

```
Received-SPF: pass (example.com: 203.0.113.10 is authorized to use
    'sender@example.com' in 'mfrom' identity (mechanism 'ip4:203.0.113.10'
    matched)) receiver=mail.recipient.com; identity=mailfrom;
    envelope-from="sender@example.com"; helo=mail.example.com;
    client-ip=203.0.113.10
Authentication-Results: mx.recipient.com;
    spf=pass smtp.mailfrom=sender@example.com
```

SPF is the foundation of email authentication. Once it is in place and working, adding DKIM signing and a DMARC policy completes the email authentication stack and significantly improves deliverability for legitimate mail from your domain.
