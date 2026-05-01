# How to Configure DKIM for IPv6 Mail Servers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DKIM, IPv6, Email, Mail Server, Postfix, OpenDKIM, Deliverability

Description: Configure DKIM signing with OpenDKIM for IPv6 mail servers to authenticate outbound email and improve deliverability when sending from IPv6 addresses.

## Introduction

DKIM (DomainKeys Identified Mail) adds a cryptographic signature to outbound email, allowing receiving servers to verify the message was signed by the sending domain and hasn't been tampered with. DKIM itself is protocol-agnostic - it works the same over IPv4 and IPv6 - but is especially important for IPv6 senders since IPv6 IP reputation is newer and less established.

## Installing OpenDKIM

```bash
# Ubuntu/Debian

sudo apt update && sudo apt install -y opendkim opendkim-tools

# RHEL/CentOS with EPEL enabled
sudo dnf install -y opendkim opendkim-tools
```

## Generating DKIM Key Pairs

Create a key pair for each domain you send mail from:

```bash
# Create key directory
sudo mkdir -p /etc/opendkim/keys/example.com

# Generate 2048-bit RSA key pair with selector "mail"
sudo opendkim-genkey -b 2048 -s mail -d example.com -D /etc/opendkim/keys/example.com/

# Set correct ownership
sudo chown -R opendkim:opendkim /etc/opendkim/keys/
sudo chmod 600 /etc/opendkim/keys/example.com/mail.private

# View the public key (to publish in DNS)
sudo cat /etc/opendkim/keys/example.com/mail.txt
```

## Configuring OpenDKIM

Edit `/etc/opendkim.conf`:

```ini
# OpenDKIM configuration
Mode                  sv
Syslog                yes
SyslogSuccess         yes
LogWhy                yes

# Canonical form
Canonicalization      relaxed/relaxed

# Signing domain and key configuration
Domain                example.com
Selector              mail
KeyFile               /etc/opendkim/keys/example.com/mail.private

# Internal hosts - include your IPv6 addresses
InternalHosts         /etc/opendkim/trusted.hosts

# Socket for Postfix integration
Socket                inet:8891@localhost
```

Configure internal hosts to include your IPv6 server or network:

```bash
sudo tee /etc/opendkim/trusted.hosts << 'EOF'
127.0.0.1
::1
localhost
2001:db8::10
2001:db8::/48
example.com
mail.example.com
EOF
```

## Integrating OpenDKIM with Postfix

Add the milter configuration to `/etc/postfix/main.cf`:

```bash
# Add OpenDKIM milter to Postfix
sudo postconf -e 'milter_default_action = accept'
sudo postconf -e 'milter_protocol = 6'
sudo postconf -e 'smtpd_milters = inet:localhost:8891'
sudo postconf -e 'non_smtpd_milters = inet:localhost:8891'

# Reload Postfix
sudo systemctl restart opendkim
sudo systemctl reload postfix
```

## Publishing the DKIM Public Key in DNS

The public key must be published as a DNS TXT record:

```bash
# Display the key in DNS format
sudo cat /etc/opendkim/keys/example.com/mail.txt
```

Add this as a TXT record to your DNS zone:

```dns
; DKIM public key record
mail._domainkey.example.com.  300  IN  TXT  "v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA..."
```

## Verifying DKIM Signing

After publishing the DNS record, send a test email and verify DKIM:

```bash
# Send test email to a verification service
echo "DKIM test" | mail -s "DKIM IPv6 Test" autoreply@dmarctest.org

# Or use swaks to send from the IPv6 address
swaks --from sender@example.com \
      --to autoreply@dmarctest.org \
      --server [2001:db8::10]:25

# Check the Authentication-Results header in the reply
```

## Testing DKIM Records Directly

```bash
# Verify DKIM DNS record exists
dig TXT mail._domainkey.example.com +short

# Use opendkim-testkey to verify key matches DNS
sudo opendkim-testkey -d example.com -s mail -k /etc/opendkim/keys/example.com/mail.private -v

# Example output:
# opendkim-testkey: key OK
```

## Multi-Domain DKIM Configuration

For servers sending on behalf of multiple domains, use the key table:

```bash
# /etc/opendkim/key.table
# selector._domainkey.domain  domain:selector:/path/to/key
mail._domainkey.example.com  example.com:mail:/etc/opendkim/keys/example.com/mail.private
mail._domainkey.example.org  example.org:mail:/etc/opendkim/keys/example.org/mail.private
```

```ini
# In /etc/opendkim.conf, replace Domain/KeyFile with:
KeyTable        /etc/opendkim/key.table
SigningTable    refile:/etc/opendkim/signing.table

# /etc/opendkim/signing.table
*@example.com   mail._domainkey.example.com
*@example.org   mail._domainkey.example.org
```

## Conclusion

DKIM configuration for IPv6 mail servers is identical to IPv4 - the signing process is at the application layer and protocol-agnostic. The key distinction is ensuring your `InternalHosts` includes any IPv6 clients or networks that should be treated as internal so the milter signs those messages correctly.
