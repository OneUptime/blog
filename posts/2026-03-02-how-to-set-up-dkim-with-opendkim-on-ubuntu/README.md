# How to Set Up DKIM with OpenDKIM on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, DKIM, Email, OpenDKIM, Postfix

Description: Configure DKIM email signing on Ubuntu with OpenDKIM and Postfix to improve email deliverability and authenticate outbound mail from your domain.

---

DKIM (DomainKeys Identified Mail) adds a cryptographic signature to outgoing email messages. Receiving mail servers verify the signature against a public key published in your DNS, confirming the message was sent by an authorized server for your domain and was not modified in transit. Without DKIM, your legitimate mail is more likely to land in spam folders.

This guide integrates OpenDKIM with Postfix, the most common mail server setup on Ubuntu.

## Prerequisites

- Ubuntu 20.04 or later
- Postfix installed and running
- A domain name with the ability to edit DNS records
- Root or sudo access

```bash
# Verify Postfix is installed and running
postfix status
systemctl status postfix
```

## Installing OpenDKIM

```bash
# Install OpenDKIM and its Postfix integration package
sudo apt update
sudo apt install -y opendkim opendkim-tools

# Verify installation
opendkim -V
```

## Generating DKIM Keys

DKIM keys are generated per domain and per "selector". The selector is an arbitrary label that lets you rotate keys without disrupting mail flow - publish the new key under a new selector name, update OpenDKIM, then remove the old DNS record.

```bash
# Create the directory structure for keys
sudo mkdir -p /etc/opendkim/keys/example.com

# Generate a 2048-bit RSA key pair
# -b 2048: key size (2048 is the minimum recommended; some suggest 4096)
# -d: domain name
# -s: selector name (convention: use year-month or a descriptive name)
sudo opendkim-genkey \
    -b 2048 \
    -d example.com \
    -D /etc/opendkim/keys/example.com \
    -s mail \
    -v

# This creates two files:
# mail.private - the private key for signing
# mail.txt - the DNS TXT record to publish

# Set proper ownership and permissions
sudo chown -R opendkim:opendkim /etc/opendkim/keys/
sudo chmod 700 /etc/opendkim/keys/example.com
sudo chmod 600 /etc/opendkim/keys/example.com/mail.private

# View the DNS record you need to publish
cat /etc/opendkim/keys/example.com/mail.txt
```

The `mail.txt` file contains something like:
```text
mail._domainkey	IN	TXT	( "v=DKIM1; h=sha256; k=rsa; "
	  "p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA..." )
```

## Publishing the DNS Record

In your DNS provider's control panel, create a TXT record:

- **Name**: `mail._domainkey.example.com` (or just `mail._domainkey` depending on the interface)
- **Type**: TXT
- **Value**: The entire value from `mail.txt` (the part in quotes, concatenated)

The selector name `mail` and domain `example.com` form the DNS query: `mail._domainkey.example.com`.

## Configuring OpenDKIM

### Main Configuration File

```bash
sudo tee /etc/opendkim.conf > /dev/null <<'EOF'
# Log to syslog
Syslog                  yes
SyslogSuccess           yes
LogWhy                  yes

# Required to use Postfix with OpenDKIM via socket
UMask                   002

# Which domains to sign for
Domain                  example.com

# The selector name used when generating keys
Selector                mail

# Path to the private key
KeyFile                 /etc/opendkim/keys/example.com/mail.private

# Sign outgoing mail only (Mode s), verify incoming (Mode sv)
Mode                    sv

# Canonicalization: how headers/body are normalized before signing
# relaxed/relaxed handles minor whitespace changes that may occur in transit
Canonicalization        relaxed/relaxed

# Which address families to use
Socket                  local:/run/opendkim/opendkim.sock

# PID file location
PidFile                 /run/opendkim/opendkim.pid

# Trust the user running Postfix
TrustedHosts            /etc/opendkim/TrustedHosts

# Key table: maps selector/domain pairs to key files
KeyTable                /etc/opendkim/KeyTable

# Signing table: defines which senders use which keys
SigningTable            refile:/etc/opendkim/SigningTable

# Sign using SHA-256
SignatureAlgorithm      rsa-sha256

# Add DKIM signature to the original headers list being signed
OversignHeaders         From
EOF
```

### Key Table and Signing Table

```bash
# KeyTable: selector._domainkey.domain  domain:selector:/path/to/key
sudo tee /etc/opendkim/KeyTable > /dev/null <<'EOF'
mail._domainkey.example.com  example.com:mail:/etc/opendkim/keys/example.com/mail.private
EOF

# SigningTable: which sending addresses use which key
# The '*@example.com' pattern matches all addresses at the domain
sudo tee /etc/opendkim/SigningTable > /dev/null <<'EOF'
*@example.com  mail._domainkey.example.com
EOF

# TrustedHosts: IPs/hosts that are allowed to use OpenDKIM for signing
sudo tee /etc/opendkim/TrustedHosts > /dev/null <<'EOF'
127.0.0.1
localhost
# Add your server's IPs and any additional mail servers
::1
10.0.0.0/8
192.168.0.0/16
EOF
```

## Creating the Socket Directory

```bash
# Create the directory for OpenDKIM's Unix socket
sudo mkdir -p /run/opendkim
sudo chown opendkim:opendkim /run/opendkim

# The socket directory may need to be in /var/spool/postfix for Postfix to access it
# Alternatively, add opendkim to the postfix group
sudo usermod -aG opendkim postfix

# Create a systemd tmpfiles rule for the runtime directory
sudo tee /etc/tmpfiles.d/opendkim.conf > /dev/null <<'EOF'
d /run/opendkim 0750 opendkim opendkim -
EOF
```

## Starting OpenDKIM

```bash
sudo systemctl start opendkim
sudo systemctl enable opendkim
sudo systemctl status opendkim

# Verify the socket was created
ls -la /run/opendkim/opendkim.sock
```

## Configuring Postfix Integration

```bash
# Add OpenDKIM as a milter in Postfix
# Edit /etc/postfix/main.cf
sudo postconf -e "milter_default_action = accept"
sudo postconf -e "milter_protocol = 6"
sudo postconf -e "smtpd_milters = local:/run/opendkim/opendkim.sock"
sudo postconf -e "non_smtpd_milters = local:/run/opendkim/opendkim.sock"

# Restart Postfix to apply the milter configuration
sudo systemctl restart postfix
```

## Testing DKIM

```bash
# Verify the DNS record is published and correct
# Check TXT record publication (may take up to 24 hours to propagate)
dig TXT mail._domainkey.example.com +short

# Test the key against the DNS record using opendkim-testkey
sudo opendkim-testkey -d example.com -s mail -v

# Expected output includes:
# opendkim-testkey: using default configfile /etc/opendkim.conf
# opendkim-testkey: key OK

# Send a test email and check the headers
# Mail will contain an Authentication-Results header showing DKIM pass/fail
echo "Test DKIM email" | mail -s "DKIM Test" test@gmail.com

# Check the sent mail logs
sudo tail -f /var/log/mail.log

# Or use an online verification service like mail-tester.com or mxtoolbox.com
```

## Multiple Domains

If your mail server handles multiple domains:

```bash
# Generate keys for each domain
sudo mkdir -p /etc/opendkim/keys/anotherdomain.com
sudo opendkim-genkey -b 2048 -d anotherdomain.com \
    -D /etc/opendkim/keys/anotherdomain.com -s mail -v

sudo chown -R opendkim:opendkim /etc/opendkim/keys/
sudo chmod 600 /etc/opendkim/keys/anotherdomain.com/mail.private

# Add to KeyTable
echo "mail._domainkey.anotherdomain.com  anotherdomain.com:mail:/etc/opendkim/keys/anotherdomain.com/mail.private" | \
    sudo tee -a /etc/opendkim/KeyTable

# Add to SigningTable
echo "*@anotherdomain.com  mail._domainkey.anotherdomain.com" | \
    sudo tee -a /etc/opendkim/SigningTable

sudo systemctl restart opendkim
```

## Key Rotation

Rotating DKIM keys every 6-12 months is good practice:

```bash
# Generate a new key with a new selector (use date-based naming)
sudo opendkim-genkey -b 2048 -d example.com \
    -D /etc/opendkim/keys/example.com \
    -s "$(date +%Y%m)" -v

# Publish the new DNS record (selector: YYYYMM._domainkey.example.com)
cat /etc/opendkim/keys/example.com/$(date +%Y%m).txt

# Update KeyTable and SigningTable with the new selector
# Then restart OpenDKIM
# Wait 48 hours for DNS propagation before removing the old key
```

## Troubleshooting

```bash
# Check OpenDKIM logs
sudo journalctl -u opendkim -f
sudo grep opendkim /var/log/syslog | tail -50

# If Postfix reports "connect to milter socket" errors:
# Verify socket permissions
ls -la /run/opendkim/opendkim.sock

# The postfix user needs to be able to read the socket
# postfix group needs execute permission on the directory
ls -la /run/opendkim/

# Common error: "can't open key file"
# Verify path and permissions
ls -la /etc/opendkim/keys/example.com/mail.private

# Test signing without Postfix (debug mode)
sudo opendkim -n -v -f
```

With DKIM correctly configured, email headers will include `dkim=pass` in the Authentication-Results field when received by major mail providers. This, combined with SPF and DMARC, dramatically improves deliverability for legitimate mail.
