# How to Troubleshoot Mail Relay Configuration on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Email, Postfix, Troubleshooting, SMTP

Description: A systematic approach to diagnosing and fixing common mail relay problems on Ubuntu, covering Postfix queue issues, authentication failures, TLS errors, and delivery problems.

---

Email troubleshooting has a reputation for being difficult, but most relay configuration problems fall into a handful of categories: authentication failures, TLS issues, DNS problems, and misconfigured sender addresses. A systematic approach with the right diagnostic commands resolves most issues quickly.

## The Diagnostic Toolkit

Before diving into specific problems, know the tools:

```bash
# The mail log - your primary diagnostic source
sudo tail -f /var/log/mail.log

# View the mail queue
mailq
sudo postqueue -p

# Check Postfix configuration
postconf -n           # show non-default settings
postconf smtp_sasl_auth_enable   # check a specific setting

# Test sending a message
echo "test" | mail -s "test subject" recipient@example.com

# Test SMTP connection manually
swaks --to recipient@example.com --server localhost
sudo apt install -y swaks  # if not installed

# Test a specific relay server
swaks --to test@example.com \
  --server smtp.provider.com:587 \
  --tls \
  --auth-user username \
  --auth-password password
```

## Reading Postfix Log Entries

The mail log (`/var/log/mail.log`) records every step of message processing. A typical successful delivery looks like:

```
Mar  2 10:00:00 server postfix/pickup[1234]: ABCDEF123456: uid=1000 from=<sender@example.com>
Mar  2 10:00:00 server postfix/cleanup[1235]: ABCDEF123456: message-id=<...@example.com>
Mar  2 10:00:00 server postfix/qmgr[1236]: ABCDEF123456: from=<sender@example.com>, size=500, nrcpt=1 (queue active)
Mar  2 10:00:01 server postfix/smtp[1237]: ABCDEF123456: to=<recipient@example.com>, relay=smtp.provider.com[x.x.x.x]:587, delay=1, status=sent (250 OK)
Mar  2 10:00:01 server postfix/qmgr[1236]: ABCDEF123456: removed
```

A deferred delivery shows why it was deferred:

```
Mar  2 10:00:01 server postfix/smtp[1237]: ABCDEF123456: to=<recipient@example.com>, relay=smtp.provider.com[x.x.x.x]:587, delay=5, status=deferred (SASL authentication failed; server smtp.provider.com[x.x.x.x] said: 535 5.7.3 Authentication unsuccessful)
```

The important parts: `status=`, the relay host, and the error message in parentheses.

## Authentication Failures

The most common relay problem. Symptoms:

```
status=deferred (SASL authentication failed)
status=deferred (Authentication unsuccessful)
status=deferred (535 5.7.8 Error: authentication failed)
```

Diagnosis:

```bash
# Check if SASL auth is enabled
postconf smtp_sasl_auth_enable
# Should return: smtp_sasl_auth_enable = yes

# Check the password file exists and has content
sudo ls -la /etc/postfix/sasl_passwd*
# sasl_passwd AND sasl_passwd.db should both exist
# sasl_passwd.db should have a more recent timestamp than sasl_passwd

# View the password file (check format is correct)
sudo cat /etc/postfix/sasl_passwd

# Common format: [relay.host.com]:587    username:password
# Make sure there are no extra spaces or line breaks

# If you edited sasl_passwd, regenerate the db
sudo postmap /etc/postfix/sasl_passwd
sudo systemctl reload postfix
```

Test authentication manually:

```bash
# Test auth to the relay server directly
swaks \
  --server smtp.sendgrid.net:587 \
  --tls \
  --auth-user apikey \
  --auth-password "SG.your-api-key" \
  --to yourtest@example.com \
  --from verified@yourdomain.com
```

## TLS Errors

TLS problems show up as:

```
status=deferred (Cannot start TLS: handshake failure)
status=deferred (certificate verification failed)
status=deferred (no matching cipher found)
```

Diagnosis:

```bash
# Check TLS settings
postconf smtp_tls_security_level
postconf smtp_tls_CAfile

# Test the TLS connection directly
openssl s_client -starttls smtp \
  -connect smtp.sendgrid.net:587 \
  -crlf

# Check if CA certificates are current
ls -la /etc/ssl/certs/ca-certificates.crt
sudo update-ca-certificates

# More permissive TLS (for testing only - identifies if TLS is the issue)
# In main.cf: smtp_tls_security_level = may (instead of encrypt)
# Apply, test, then set back to encrypt if it works
```

If TLS version negotiation fails:

```bash
# Check what TLS versions are being excluded
postconf smtp_tls_protocols
# If you see !TLSv1.2 or !TLSv1.3, you might be excluding needed versions

# A safe modern setting:
# smtp_tls_protocols = !SSLv2, !SSLv3, !TLSv1, !TLSv1.1
```

## DNS Resolution Problems

Postfix needs to look up relay host names. DNS failures cause:

```
status=deferred (Host or domain name not found. Name service error ...)
status=deferred (Network is unreachable)
```

Diagnosis:

```bash
# Test DNS resolution
dig smtp.sendgrid.net

# Test from Postfix's perspective
postfix -e internal_mail_filter_classes= smtp_dns_lookup smtp.sendgrid.net

# Check /etc/resolv.conf
cat /etc/resolv.conf

# Verify network connectivity
ping -c 3 smtp.sendgrid.net
nc -z -v smtp.sendgrid.net 587

# If using brackets in relayhost, DNS should NOT do MX lookup
# [smtp.sendgrid.net]:587  - correct, direct connection to this host
# smtp.sendgrid.net:587    - wrong, tries MX lookup
postconf relayhost
```

## Port Blocked by Firewall or ISP

Many residential ISPs and some cloud providers (notably Google Cloud) block outbound port 25. Ports 587 and 465 are generally not blocked.

```bash
# Test specific ports
nc -z -v smtp.sendgrid.net 25   # likely blocked
nc -z -v smtp.sendgrid.net 587  # should work
nc -z -v smtp.sendgrid.net 465  # alternative

# Check if a firewall is blocking outbound connections
sudo iptables -L OUTPUT -n -v | grep -E "25|587|465"
sudo ufw status

# On GCP - check VPC firewall rules
# On AWS - check Security Groups
```

If port 587 is blocked, try 465:

```ini
# In main.cf
relayhost = [smtp.sendgrid.net]:465
smtp_tls_wrappermode = yes    # SSL from the start, not STARTTLS
```

## Messages Stuck in Queue

```bash
# View the queue with details
sudo postqueue -p

# See why messages are deferred
sudo postcat -q MESSAGEID 2>/dev/null | head -50

# Force retry of all deferred messages
sudo postqueue -f

# Check queue age - messages stuck more than an hour warrant investigation
sudo postqueue -p | grep "hrs\|days"

# Clear old stuck messages if they are not important
sudo postsuper -d ALL deferred

# Check queue configuration
postconf maximal_queue_lifetime    # default 5 days
postconf bounce_queue_lifetime     # default 5 days
postconf minimal_backoff_time      # default 300s
```

## Messages Delivered But Going to Spam

This is a sender reputation and authentication issue, not a Postfix relay problem per se. Check:

```bash
# Verify SPF record
dig TXT yourdomain.com | grep spf

# Verify DKIM (if configured)
dig TXT mail._domainkey.yourdomain.com

# Verify DMARC
dig TXT _dmarc.yourdomain.com

# Check IP reputation
# Visit https://mxtoolbox.com/blacklists.aspx and enter your sending IP
```

If relaying through SendGrid/Mailgun/SES, sender authentication usually comes with the service. If mail still lands in spam, check that your `From` address matches a verified sending domain.

## Bounced Messages (Permanent Failures)

```
status=bounced (550 User unknown)
status=bounced (550 5.1.1 The email account does not exist)
```

These are permanent failures - the recipient's server rejected the message. Check:

```bash
# Look at bounce notifications in mail log
sudo grep "status=bounced" /var/log/mail.log | tail -20

# Check if bounces are going to the envelope sender
postconf bounce_service_name
postconf notify_classes    # should include 'bounce'

# See if there is a bounce email in root's mailbox
sudo mail
```

## Sender Address Rejected

```
status=deferred (550 5.7.1 Invalid sender address)
status=deferred (550 not allowed to send as domain)
```

The relay is rejecting the sender address:

```bash
# Check what Postfix is using as the From address
sudo grep "from=" /var/log/mail.log | tail -10

# Verify sender_canonical_maps is configured to rewrite to a valid sender
postconf sender_canonical_maps

# Check the canonical maps file
sudo cat /etc/postfix/sender_canonical

# Test what a message from root would look like
echo "test" | mail -s "test" root
sudo tail -5 /var/log/mail.log
```

## Complete Configuration Audit

When starting fresh with troubleshooting:

```bash
# Dump all non-default Postfix settings
sudo postconf -n

# Check for obvious misconfigurations
postfix check 2>&1

# Verify SASL is working
sudo postconf smtp_sasl_auth_enable
sudo postconf smtp_sasl_password_maps

# Confirm relay host is set
sudo postconf relayhost

# Check TLS settings
sudo postconf smtp_tls_security_level
sudo postconf smtp_tls_CAfile

# Check inet_interfaces (who can submit mail)
sudo postconf inet_interfaces
sudo postconf mynetworks
```

## Sending a Test Message with Verbose Logging

For difficult problems, increase Postfix verbosity temporarily:

```bash
# Edit master.cf to add verbose flag to smtp
sudo nano /etc/postfix/master.cf

# Find the smtp line and add -v flag:
# smtp      unix  -       -       y       -       -       smtp -v

sudo systemctl reload postfix

# Send a test and watch the verbose output
echo "test" | mail -s "verbose test" recipient@example.com
sudo tail -50 /var/log/mail.log

# Remove the -v flag when done
sudo nano /etc/postfix/master.cf
sudo systemctl reload postfix
```

The verbose output shows the exact SMTP conversation between Postfix and the relay server, which makes authentication and TLS issues immediately obvious.

Mail relay troubleshooting is methodical. Start with the mail log, identify the error in the `status=deferred` or `status=bounced` message, and work backward from that specific error to find the cause.
