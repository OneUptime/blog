# How to Configure Postfix with Milter Protocol on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Email, Postfix, Security, Mail Server

Description: Learn how to configure Postfix with the Milter (Mail Filter) protocol on Ubuntu to integrate DKIM signing, spam filtering, and custom email processing filters.

---

Milter (Mail Filter) is a protocol developed by Sendmail that allows external programs to process email messages passing through an MTA. Postfix supports the Milter protocol, which means you can attach filter programs that inspect, modify, or reject messages based on headers, body content, sender information, and more. Common milters include OpenDKIM (DKIM signing/verification), OpenDMARC (DMARC policy enforcement), and rspamd.

## How Milters Work with Postfix

Postfix communicates with milters over a socket (Unix domain or TCP). For each incoming message, Postfix calls the milter at defined checkpoints (connection, EHLO, MAIL FROM, RCPT TO, headers, body, end of message). The milter can:

- **Accept** - let the message through unchanged
- **Reject** - reject with a SMTP error code
- **Discard** - silently drop the message
- **Add/modify/delete headers** - change the message metadata
- **Add recipients** - forward the message elsewhere
- **Quarantine** - hold the message for review

## Postfix Milter Configuration Parameters

```bash
# View current milter configuration
sudo postconf | grep milter

# Key parameters:
# smtpd_milters        - milters for SMTP (incoming connections)
# non_smtpd_milters    - milters for locally submitted mail
# milter_default_action - what to do if milter is unavailable
# milter_protocol      - milter protocol version (6 is current)
# milter_connect_timeout
# milter_content_timeout
```

## Installing OpenDKIM as a Milter

DKIM signing is the most common reason to use milters. OpenDKIM acts as a milter that signs outgoing mail and verifies signatures on incoming mail.

```bash
# Install OpenDKIM
sudo apt install opendkim opendkim-tools

# Create directories
sudo mkdir -p /etc/opendkim/keys
sudo chown -R opendkim:opendkim /etc/opendkim
```

### Generating DKIM Keys

```bash
# Generate keys for your domain
sudo opendkim-genkey -t -s mail -d example.com

# Move to the keys directory
sudo mv mail.private /etc/opendkim/keys/example.com.private
sudo mv mail.txt /etc/opendkim/keys/example.com.txt

# Set proper permissions
sudo chown opendkim:opendkim /etc/opendkim/keys/example.com.private
sudo chmod 600 /etc/opendkim/keys/example.com.private

# View the DNS TXT record you need to add
cat /etc/opendkim/keys/example.com.txt
```

### Configuring OpenDKIM

```bash
sudo nano /etc/opendkim.conf
```

```ini
# /etc/opendkim.conf

# Run as daemon listening on a socket
Mode                    sv       # s=sign, v=verify
Socket                  local:/run/opendkim/opendkim.sock
PidFile                 /run/opendkim/opendkim.pid
UserID                  opendkim
UMask                   002

# Logging
Syslog                  yes
SyslogSuccess           yes
LogWhy                  yes

# Signing configuration
Domain                  example.com
KeyFile                 /etc/opendkim/keys/example.com.private
Selector                mail

# Key table (for multiple domains)
KeyTable                refile:/etc/opendkim/key.table
SigningTable            refile:/etc/opendkim/signing.table
ExternalIgnoreList      refile:/etc/opendkim/trusted.hosts
InternalHosts           refile:/etc/opendkim/trusted.hosts

# What to sign
OversignHeaders         From
```

```bash
# Create the key table
sudo nano /etc/opendkim/key.table
```

```text
# Format: identifier  domain:selector:/path/to/private/key
mail._domainkey.example.com  example.com:mail:/etc/opendkim/keys/example.com.private
```

```bash
# Create the signing table
sudo nano /etc/opendkim/signing.table
```

```text
# Format: email/domain  key_identifier
*@example.com  mail._domainkey.example.com
```

```bash
# Create trusted hosts file
sudo nano /etc/opendkim/trusted.hosts
```

```text
127.0.0.1
::1
localhost
mail.example.com
example.com
```

```bash
# Start and enable OpenDKIM
sudo systemctl enable --now opendkim

# Verify the socket exists
ls -la /run/opendkim/opendkim.sock
```

### Connecting Postfix to OpenDKIM

```bash
# Add postfix user to opendkim group (socket permissions)
sudo usermod -aG opendkim postfix

sudo nano /etc/postfix/main.cf
```

```ini
# Milter configuration
milter_default_action = accept
milter_protocol = 6

# Connect to OpenDKIM
smtpd_milters = local:/run/opendkim/opendkim.sock
non_smtpd_milters = local:/run/opendkim/opendkim.sock

# Milter timeouts
milter_connect_timeout = 30s
milter_content_timeout = 300s
milter_command_timeout = 30s
```

```bash
sudo systemctl restart postfix
sudo systemctl restart opendkim
```

## Installing OpenDMARC as a Milter

OpenDMARC enforces DMARC policies on incoming email and generates aggregate reports.

```bash
# Install OpenDMARC
sudo apt install opendmarc

sudo nano /etc/opendmarc.conf
```

```ini
# /etc/opendmarc.conf

Socket                  local:/run/opendmarc/opendmarc.sock
PidFile                 /run/opendmarc/opendmarc.pid
UserID                  opendmarc

Syslog                  true
TrustedAuthservIDs      mail.example.com

# History file for report generation
HistoryFile             /var/run/opendmarc/opendmarc.dat

# Reject messages that fail DMARC with p=reject policy
RejectFailures          false   # Set true to enforce rejection
```

```bash
sudo systemctl enable --now opendmarc
```

### Adding OpenDMARC to Postfix

```bash
sudo nano /etc/postfix/main.cf
```

```ini
# Add OpenDMARC to the milter list (chain multiple milters)
smtpd_milters = local:/run/opendkim/opendkim.sock,local:/run/opendmarc/opendmarc.sock
non_smtpd_milters = local:/run/opendkim/opendkim.sock,local:/run/opendmarc/opendmarc.sock
```

```bash
sudo systemctl restart postfix
```

## Using rspamd as a Milter

rspamd is a comprehensive spam filtering system that can also act as a milter. It handles DKIM, DMARC, SPF, greylisting, and machine-learning based spam detection in one daemon.

```bash
# Install rspamd
sudo apt install rspamd

# Configure the milter socket
sudo nano /etc/rspamd/local.d/worker-proxy.inc
```

```lua
# Worker proxy settings (milter mode)
bind_socket = "/run/rspamd/milter.sock mode=0666";
upstream "local" {
    default = yes;
    self_scan = yes;
}
milter = yes;
timeout = 120s;
upstream "local" {
    default = yes;
    self_scan = yes;
}
```

```bash
sudo systemctl enable --now rspamd

# Connect to Postfix
sudo nano /etc/postfix/main.cf
```

```ini
# Use rspamd as milter
smtpd_milters = unix:/run/rspamd/milter.sock
non_smtpd_milters = unix:/run/rspamd/milter.sock
milter_default_action = accept
milter_protocol = 6
```

```bash
sudo systemctl restart postfix
```

## Multiple Milters and Their Order

You can chain multiple milters. Postfix calls them in the order listed:

```ini
# Chain OpenDKIM and rspamd
smtpd_milters = local:/run/opendkim/opendkim.sock, unix:/run/rspamd/milter.sock
non_smtpd_milters = local:/run/opendkim/opendkim.sock
```

Order matters:
- DKIM verification (OpenDKIM) should run before spam scoring (rspamd) so rspamd knows if DKIM passed
- DKIM signing (for outgoing mail via non_smtpd_milters) should run after spam checking

## Testing the Milter Configuration

```bash
# Check Postfix can reach the milter socket
sudo ls -la /run/opendkim/opendkim.sock

# Send a test email and check the headers
echo "Test message" | mail -s "DKIM Test" your@gmail.com

# View the message log
sudo grep "opendkim\|milter" /var/log/mail.log | tail -20

# Check if DKIM signature was added
# Sent messages should have an X-DKIM header or DKIM-Signature header
```

```bash
# Test DKIM verification with the opendkim-testkey tool
sudo opendkim-testkey -d example.com -s mail -vvv

# Output should confirm key found and verified
```

## Milter Actions in the Audit Log

When a milter modifies or rejects a message, it appears in the Postfix log:

```bash
# Watch milter-related log entries
sudo tail -f /var/log/mail.log | grep -i milter

# Common log messages:
# milter-reject: ... for connecting host
# milter-discard: ... for connecting host
# milter-add-header: ... for message
```

## Handling Milter Downtime

The `milter_default_action` determines what happens if a milter is unreachable:

```ini
# In /etc/postfix/main.cf

# accept = pass mail through if milter is down (may lose DKIM signing)
milter_default_action = accept

# reject = reject all mail if milter is down (safe but disruptive)
# milter_default_action = reject 451 4.7.1 Service unavailable

# tempfail = tell sender to try again later
# milter_default_action = tempfail
```

For DKIM signing, `accept` is usually the right choice - mail still flows even without signing, which is better than bouncing all mail during a milter outage. For strict security milters that must run for compliance, use `reject` or `tempfail`.

Milters make Postfix's mail processing pipeline extensible without modifying Postfix itself. Whether you need DKIM, DMARC, custom spam filtering, header rewriting, or virus scanning, a milter provides a clean integration point that works with the existing Postfix configuration.
