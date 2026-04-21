# How to Test Email Delivery over IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Email, IPv6, SMTP, Testing, Postfix, Swaks, Deliverability

Description: Test end-to-end email delivery from IPv6 mail servers using swaks, telnet, and online verification tools to validate SPF, DKIM, and DMARC authentication.

## Introduction

Testing email delivery over IPv6 requires verifying both the transport layer (IPv6 connectivity to destination servers) and the authentication layer (SPF, DKIM, DMARC). This guide covers practical testing methods from basic connectivity checks to full end-to-end delivery validation.

## Prerequisites

```bash
# Install testing tools

sudo apt install -y swaks telnet dnsutils netcat-openbsd mailutils

# Install swaks (SMTP Swiss Army Knife) if not available
sudo apt install -y swaks
```

## Step 1: Verify IPv6 Connectivity to Destination MX

```bash
# Look up MX records for the target domain
dig MX gmail.com +short
# 5 gmail-smtp-in.l.google.com.
# 10 alt1.gmail-smtp-in.l.google.com.
# 20 alt2.gmail-smtp-in.l.google.com.
# 30 alt3.gmail-smtp-in.l.google.com.
# 40 alt4.gmail-smtp-in.l.google.com.

# Check if the MX server has an AAAA record
dig AAAA alt1.gmail-smtp-in.l.google.com +short

# Test raw IPv6 TCP connection to port 25
nc -6 -z -v alt1.gmail-smtp-in.l.google.com 25
# or
telnet -6 alt1.gmail-smtp-in.l.google.com 25
```

## Step 2: Test SMTP Banner over IPv6

```bash
# Connect and check SMTP greeting
openssl s_client -6 -connect alt1.gmail-smtp-in.l.google.com:25 -starttls smtp 2>/dev/null | head -10

# Manual SMTP session (no TLS)
(sleep 1; printf 'EHLO mail.example.com\r\nQUIT\r\n') | nc -6 alt1.gmail-smtp-in.l.google.com 25
```

## Step 3: Send Test Email with swaks

`swaks` is the most powerful SMTP testing tool:

```bash
# Basic test sending through an IPv6 SMTP server
swaks --from sender@example.com \
      --to recipient@example.com \
      --server "[2001:db8::10]:25" \
      --body "IPv6 delivery test" \
      --header "Subject: IPv6 Test $(date)"

# Test with TLS/STARTTLS
swaks --from sender@example.com \
      --to recipient@example.com \
      --server "[2001:db8::10]:587" \
      --tls \
      --auth LOGIN \
      --auth-user sender@example.com \
      --auth-password 'password'

# Force IPv6 protocol
swaks --from sender@example.com \
      --to check-auth@verifier.port25.com \
      --server mail.example.com \
      --protocol SMTP \
      --6
```

## Step 4: Send to Authentication Verification Services

Several free services reply with authentication results:

```bash
# Port25 verifier - replies with detailed SPF/DKIM auth report
swaks --from sender@example.com \
      --to check-auth@verifier.port25.com \
      --server "[2001:db8::10]:25"

# Mail-tester.com - web-based score (need to send to their unique address)
# Visit https://www.mail-tester.com to get a test address, then:
swaks --from sender@example.com \
      --to test-xxxxx@srv1.mail-tester.com \
      --server "[2001:db8::10]:25"
```

## Step 5: Test with Gmail and Check Headers

Send to a Gmail account you control and view headers:

```bash
swaks --from sender@example.com \
      --to yourtest@gmail.com \
      --server "[2001:db8::10]:25" \
      --header "Subject: IPv6 Header Test"
```

In Gmail, click the three-dot menu → **Show original** and look for:

```text
Received: from mail.example.com ([IPv6:2001:db8::10])
Authentication-Results: mx.google.com;
   dkim=pass header.i=@example.com;
   spf=pass (google.com: domain of sender@example.com designates 2001:db8::10 as permitted sender);
   dmarc=pass (p=REJECT sp=REJECT dis=NONE) header.from=example.com
```

## Step 6: Check Mail Server Logs

Monitor mail logs during testing to confirm IPv6 is used:

```bash
# Postfix log
sudo tail -f /var/log/mail.log | grep --line-buffered -Ei "ipv6:|\[[0-9a-f:]+\]"

# Exim4 log
sudo tail -f /var/log/exim4/mainlog | grep --line-buffered -Ei "ipv6|::"
```

## Step 7: Automated SMTP Test Script

```bash
#!/bin/bash
# ipv6-smtp-test.sh - Test IPv6 mail delivery

SENDER="sender@example.com"
RECIPIENT="check-auth@verifier.port25.com"
SERVER="2001:db8::10"

echo "=== Testing IPv6 SMTP Connectivity ==="
echo "Server: $SERVER"

# Optional ICMP reachability check
if ping6 -c 1 -W 2 "$SERVER" &>/dev/null; then
    echo "[PASS] IPv6 ping to $SERVER successful"
else
    echo "[WARN] IPv6 ping to $SERVER failed or ICMP echo is filtered"
fi

# Check SMTP port
if nc -6 -z -w 3 "$SERVER" 25 2>/dev/null; then
    echo "[PASS] Port 25 open on $SERVER"
else
    echo "[FAIL] Port 25 not reachable on $SERVER"
fi

# Send test email
echo "[INFO] Sending test email via swaks..."
swaks --from "$SENDER" --to "$RECIPIENT" \
      --server "[$SERVER]:25" \
      --header "Subject: IPv6 SMTP Test $(date)" \
      --body "IPv6 SMTP Test" 2>&1 | tail -5
```

## Conclusion

Testing IPv6 email delivery involves verifying connectivity with `nc` and `telnet`, sending authenticated test messages with `swaks`, and reviewing header authentication results in the delivered email. Using dedicated verification services like Port25 plus mailbox headers from Gmail provides a complete picture of SPF, DKIM, and DMARC status for IPv6 senders.
