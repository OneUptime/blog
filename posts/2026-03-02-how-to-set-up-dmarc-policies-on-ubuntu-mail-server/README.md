# How to Set Up DMARC Policies on Ubuntu Mail Server

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, DMARC, Email, Postfix, Email Security

Description: Configure DMARC policies for your domain and set up DMARC reporting on Ubuntu to protect against email spoofing and gain visibility into email authentication failures.

---

DMARC (Domain-based Message Authentication, Reporting, and Conformance) ties together SPF and DKIM into a policy framework. It tells receiving mail servers what to do when a message fails authentication, and critically, it provides a reporting mechanism so you can see who is sending mail that claims to be from your domain.

Before configuring DMARC, you need SPF and DKIM working correctly. DMARC checks whether at least one of them aligns with the From header domain.

## Prerequisites

- Working SPF record for your domain
- Working DKIM signing with OpenDKIM
- Access to your domain's DNS

```bash
# Verify SPF is published
dig TXT example.com +short | grep spf

# Verify DKIM is published and valid
dig TXT mail._domainkey.example.com +short
sudo opendkim-testkey -d example.com -s mail -v
```

## Understanding DMARC Record Syntax

A DMARC record is a DNS TXT record published at `_dmarc.yourdomain.com`:

```text
v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@example.com; ruf=mailto:forensic@example.com; pct=100; adkim=s; aspf=r
```

**Key tags:**

- `v=DMARC1` - version, always this value
- `p=` - policy for the domain (none/quarantine/reject)
- `sp=` - policy for subdomains (defaults to same as p)
- `rua=` - aggregate report URI (where daily summary reports go)
- `ruf=` - forensic report URI (per-failure reports, less common)
- `pct=` - percentage of mail to apply the policy to (1-100)
- `adkim=` - DKIM alignment mode (r=relaxed, s=strict)
- `aspf=` - SPF alignment mode (r=relaxed, s=strict)

**Alignment modes:**
- **Relaxed** (`r`): The signing domain can be a subdomain of the From domain. `mail.example.com` aligns with `example.com`.
- **Strict** (`s`): The signing domain must exactly match the From domain.

## Implementing DMARC in Stages

The standard approach is to start with a monitoring-only policy and progressively tighten it once you have confidence in your email stream.

### Stage 1: Monitor Only (p=none)

```bash
# Publish a TXT record at _dmarc.example.com with:
# p=none means "don't block anything, just send reports"
# rua= is where aggregate reports go - use an email address you check

# The DNS record value:
# v=DMARC1; p=none; rua=mailto:dmarc-reports@example.com; fo=1

# In your DNS panel:
# Name: _dmarc.example.com (or _dmarc depending on the interface)
# Type: TXT
# Value: v=DMARC1; p=none; rua=mailto:dmarc-reports@example.com; fo=1
```

```bash
# Verify the record is published
dig TXT _dmarc.example.com +short

# Expected output:
# "v=DMARC1; p=none; rua=mailto:dmarc-reports@example.com; fo=1"
```

Run in this mode for at least 2-4 weeks. You will receive XML aggregate reports from Gmail, Yahoo, Outlook, and other providers showing which servers are sending mail as your domain and whether they pass authentication.

### Stage 2: Quarantine (p=quarantine)

After reviewing reports and confirming all legitimate mail passes:

```text
v=DMARC1; p=quarantine; pct=20; rua=mailto:dmarc-reports@example.com; fo=1
```

Start with `pct=20` (apply to 20% of failing mail) and increase gradually. Mail that fails DMARC gets delivered to the spam folder rather than the inbox.

### Stage 3: Reject (p=reject)

Full enforcement - mail that fails DMARC is rejected outright:

```text
v=DMARC1; p=reject; rua=mailto:dmarc-reports@example.com; fo=1
```

## Installing a DMARC Report Parser

The aggregate reports are compressed XML files. A report parser makes them readable.

```bash
# Install the Perl-based DMARC report analyzer
sudo apt install -y libxml-libxml-perl cpanminus
sudo cpanm Mail::DMARC::PurePerl

# Or use the Python dmarc-report-analyzer
sudo pip3 install dmarc-report-analyzer

# For a simple XML viewer
sudo apt install -y libxml2-utils
```

### Setting Up a Dedicated Report Email Address

```bash
# Create a mailbox specifically for DMARC reports
# If using Postfix with local delivery:
sudo useradd -m -s /sbin/nologin dmarc-reports

# Or add an alias in /etc/aliases
echo "dmarc-reports: /var/mail/dmarc-reports" | sudo tee -a /etc/aliases
sudo newaliases
```

### Automated Report Processing

```bash
# Simple script to parse and display DMARC reports
sudo tee /usr/local/bin/parse-dmarc-reports.sh > /dev/null <<'EOF'
#!/bin/bash
# Process DMARC aggregate reports from a maildir or local directory

REPORT_DIR="/var/mail/dmarc-reports"

for report in "$REPORT_DIR"/*.xml.gz 2>/dev/null; do
    [ -f "$report" ] || continue
    echo "=== Report: $report ==="
    zcat "$report" | xmllint --format - | grep -E "source_ip|count|disposition|dkim|spf"
    echo ""
done

for report in "$REPORT_DIR"/*.xml.zip 2>/dev/null; do
    [ -f "$report" ] || continue
    echo "=== Report: $report ==="
    unzip -p "$report" | xmllint --format - | grep -E "source_ip|count|disposition|dkim|spf"
    echo ""
done
EOF

sudo chmod +x /usr/local/bin/parse-dmarc-reports.sh
```

## Receiving DMARC Reports on Ubuntu

If your Ubuntu server also runs the mail server for your domain, you can process reports locally:

```bash
# Install a report processor
sudo apt install -y opendmarc opendmarc-tools

# Configure OpenDMARC as a Postfix milter to check incoming mail
sudo tee /etc/opendmarc.conf > /dev/null <<'EOF'
# Syslog logging
Syslog yes

# Socket for Postfix milter
Socket local:/run/opendmarc/opendmarc.sock

# Ignore authentication results from trusted hosts
TrustedAuthservIDs mail.example.com

# Store failed messages for reporting
FailureReports false

# Ignore mail from authenticated senders
IgnoreAuthenticatedClients true

# History database for report generation
HistoryFile /var/log/opendmarc.log
EOF

sudo systemctl start opendmarc
sudo systemctl enable opendmarc
```

```bash
# Add OpenDMARC to Postfix milters
# If you already have OpenDKIM configured, add to the list:
sudo postconf -e "smtpd_milters = local:/run/opendkim/opendkim.sock,local:/run/opendmarc/opendmarc.sock"
sudo postconf -e "non_smtpd_milters = local:/run/opendkim/opendkim.sock,local:/run/opendmarc/opendmarc.sock"

sudo systemctl restart postfix
```

## DMARC for Subdomains

By default, the `p=` policy also applies to subdomains. You can set different policies:

```text
# Allow marketing subdomain emails more leniency
v=DMARC1; p=reject; sp=quarantine; rua=mailto:dmarc-reports@example.com

# Or publish a separate DMARC record for a specific subdomain
# at _dmarc.marketing.example.com:
# v=DMARC1; p=none; rua=mailto:dmarc-reports@example.com
```

## Handling Forwarded Email

DMARC failures on forwarded email are a known problem. When someone forwards your email, the forwarding server re-sends it, and the original DKIM signature may break (due to header modification), and SPF fails (because the forwarder's IP is not in your SPF record).

The DMARC community has developed ARC (Authenticated Received Chain) to address this. OpenDKIM and Google support ARC.

```bash
# Install ARC support for OpenDKIM
sudo apt install -y libarc-perl

# Add ARC signing to /etc/opendkim.conf:
# ArcSign yes
```

## Testing DMARC

```bash
# Send a test email to a Gmail address
# View the email source - look for Authentication-Results header
# It shows: dmarc=pass/fail action=none/quarantine/reject

# Use Google's Postmaster Tools for aggregate DMARC data

# Use an online checker
# mxtoolbox.com/dmarc.aspx
# dmarcian.com/dmarc-inspector/

# Manual check: verify alignment
# DKIM alignment: the d= tag in the DKIM signature must match the From domain
sudo grep "DKIM-Signature" /var/log/mail.log | tail -5

# SPF alignment: the MAIL FROM (envelope sender) domain must match the From domain
```

## Common DMARC Failure Causes

```bash
# 1. Third-party services sending as your domain without SPF/DKIM
# Check reports for unexpected source IPs and add them to SPF or arrange DKIM signing

# 2. Newsletter/marketing platforms
# Most (Mailchimp, Constant Contact) support DKIM signing with a CNAME
# They provide a CNAME record that delegates signing to them

# 3. CRM and support tools (Salesforce, Zendesk)
# Configure to use your domain with DKIM, or use a subdomain with its own DMARC policy

# 4. Automated emails from web applications
# Ensure they use a MAIL FROM address in your domain, and your outbound mail server signs with DKIM
```

Once DMARC is enforced with `p=reject`, anyone trying to spoof email from your domain will have their messages rejected by major providers. This is the most important step in preventing phishing attacks that use your domain name.
