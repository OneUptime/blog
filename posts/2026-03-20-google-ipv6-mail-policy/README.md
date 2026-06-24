# How to Meet Google IPv6 Mail Policy Requirements

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Email, IPv6, Gmail, Google, SPF, DKIM, DMARC, Mail Deliverability

Description: Meet Google's specific IPv6 mail policy requirements including PTR records, SPF, DKIM, and DMARC to ensure email from IPv6 servers reaches Gmail inboxes.

## Introduction

Google enforces DNS and authentication requirements for email delivered from IPv6 addresses to Gmail. Missing reverse or forward DNS, or missing sender authentication, can result in rejections with specific error codes. This guide focuses on the IPv6 DNS checks and authentication controls most commonly involved.

## Google's IPv6 Mail Requirements

For direct mail from IPv6 hosts to Gmail, verify the following:

1. **PTR record**: The sending IPv6 address must have a valid PTR record
2. **Forward-confirmed reverse DNS (FCrDNS)**: The PTR hostname must have an AAAA record pointing back to the sending IP
3. **SPF**: All senders must authenticate with SPF or DKIM. If you use SPF for a direct IPv6 sender, authorize it in SPF, for example with `ip6:`
4. **DKIM**: Bulk senders must use DKIM, and other senders can use DKIM instead of SPF
5. **DMARC**: Bulk senders that send more than 5,000 messages per day to Gmail must publish DMARC. For other senders, Google recommends DMARC
6. **TLS**: Google's sender guidelines require TLS for transmitting email
7. **Sending history**: New IPv6 addresses should warm up gradually to build reputation

## Checking Your Configuration

Run this checklist against your mail server's IPv6 address and domain:

```bash
MAIL_IP="2001:db8::10"
MAIL_DOMAIN="example.com"
MAIL_HOST="mail.example.com"

# 1. Check PTR record

echo "=== PTR Record ==="
dig -x $MAIL_IP +short

# 2. Check FCrDNS (AAAA for PTR result)
echo "=== FCrDNS AAAA ==="
dig AAAA $MAIL_HOST +short

# 3. Check SPF record
echo "=== SPF Record ==="
dig TXT $MAIL_DOMAIN +short | grep "v=spf1"

# 4. Check DMARC record
echo "=== DMARC Record ==="
dig TXT _dmarc.$MAIL_DOMAIN +short

# 5. Check DKIM selector (replace 'mail' with your selector)
echo "=== DKIM Record ==="
dig TXT mail._domainkey.$MAIL_DOMAIN +short
```

## Configuring PTR and FCrDNS

Your hosting provider must configure the reverse DNS for your IPv6 block:

```bash
# Verify PTR resolves to your mail hostname
dig -x 2001:db8::10 +short
# Must return: mail.example.com.

# Verify AAAA record resolves back
dig AAAA mail.example.com +short
# Must return: 2001:db8::10
```

## SPF Record with IPv6

If you use SPF to authorize a direct IPv6 sender, ensure the SPF record authorizes that host. One common way is the `ip6:` mechanism:

```dns
; SPF TXT record
example.com.  300  IN  TXT  "v=spf1 ip4:203.0.113.10 ip6:2001:db8::10 ~all"
```

Verify SPF logic for your IPv6 address using an online checker or the `pyspf` library:

```bash
# Install pyspf and its required DNS/authentication dependencies
python3 -m pip install pyspf dnspython authres

python3 -c "
import spf
result, msg = spf.check2(
    i='2001:db8::10',
    s='test@example.com',
    h='mail.example.com'
)
print(f'SPF result: {result}')
print(f'Message: {msg}')
"
```

## DKIM Configuration for IPv6 Servers

DKIM signing is independent of IP version. A common way to add DKIM signing to a self-hosted Postfix server is with OpenDKIM:

```bash
# Install OpenDKIM
sudo apt install -y opendkim opendkim-tools

# Generate DKIM key pair
sudo mkdir -p /etc/opendkim/keys/example.com
sudo opendkim-genkey -b 2048 -s mail -d example.com -D /etc/opendkim/keys/example.com/

# Publish the public key in DNS as a TXT record
sudo cat /etc/opendkim/keys/example.com/mail.txt
# Add the TXT record to your DNS zone
```

## DMARC Policy

Publish a DMARC policy to tell receivers how to handle SPF/DKIM failures. For Gmail bulk sender compliance, `p=none` is acceptable:

```dns
; Start with monitoring mode (p=none)
_dmarc.example.com.  300  IN  TXT  "v=DMARC1; p=none; rua=mailto:dmarc-reports@example.com"

; Progress to quarantine after monitoring
_dmarc.example.com.  300  IN  TXT  "v=DMARC1; p=quarantine; pct=100; rua=mailto:dmarc-reports@example.com"

; Enforce rejection for full protection
_dmarc.example.com.  300  IN  TXT  "v=DMARC1; p=reject; rua=mailto:dmarc-reports@example.com"
```

## Testing Delivery to Gmail

Send a test email and check Google's feedback:

```bash
# Send a test email to a Gmail account you control
swaks --from sender@example.com \
      --to yourtest@gmail.com \
      --server [2001:db8::10]:25 \
      --tls

# Check the received headers in Gmail:
# Received-SPF: pass
# DKIM-Signature: present
# Authentication-Results: ... dkim=pass; spf=pass; dmarc=pass
```

## Handling the Google Error: 550-5.7.1

If you receive `550-5.7.1: Message does not meet IPv6 sending guidelines regarding PTR records and authentication`:

```bash
# The error usually means IPv6 PTR/forward DNS is missing or authentication is failing
# Verify reverse and forward DNS with:
dig -x <your-IPv6> +short       # Should return your hostname
dig AAAA <your-hostname> +short # Should include your IPv6
# Then confirm the message passes SPF or DKIM
```

## Conclusion

Sending directly from IPv6 to Gmail requires correct PTR and forward DNS, plus at least SPF or DKIM authentication. Bulk senders also need DMARC, and Google's broader sender guidelines still require TLS and good reputation. With those pieces in place, mail from IPv6 servers is more likely to be delivered as expected.
