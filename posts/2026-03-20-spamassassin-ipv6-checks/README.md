# How to Configure SpamAssassin for IPv6 Checks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SpamAssassin, IPv6, Email, Spam Filtering, Mail Server, DNSBL

Description: Configure SpamAssassin to correctly handle IPv6 sender addresses in trusted networks, DNSBL checks, and whitelist rules for accurate spam scoring.

## Introduction

SpamAssassin performs many checks based on the sender's IP address, including DNSBL lookups, trusted network detection, and welcomelist matching. When mail arrives from or through IPv6 addresses, SpamAssassin needs proper configuration to avoid false positives and ensure accurate spam detection.

## Installing SpamAssassin

```bash
# Ubuntu/Debian

sudo apt update && sudo apt install -y spamassassin spamc spamd

# Enable and start the daemon
sudo systemctl enable --now spamd
```

## Configuring Trusted Networks with IPv6

SpamAssassin's `trusted_networks` and `internal_networks` affect how relays are evaluated. IPv6 addresses use standard CIDR notation:

```bash
sudo tee /etc/spamassassin/local.cf << 'EOF'
# Trust IPv4 and IPv6 internal networks
trusted_networks 127.0.0.0/8 ::1/128
trusted_networks 10.0.0.0/8 172.16.0.0/12 192.168.0.0/16
trusted_networks 2001:db8::/32 fd00::/8

# Define internal networks (relays you control)
internal_networks 127.0.0.0/8 ::1/128
internal_networks 10.0.0.0/8
internal_networks 2001:db8::/32
EOF
```

## Configuring IPv6 Welcomelist Entries

Welcomelist sender addresses only when they arrive from expected IPv6 relays. In SpamAssassin 4.x the current directive is `welcomelist_from_rcvd`; `whitelist_from_rcvd` remains as a compatibility alias until SpamAssassin 4.1. IPv6 relay IPs must be enclosed in square brackets, and ranges can use CIDR prefixes:

```bash
sudo tee -a /etc/spamassassin/local.cf << 'EOF'
# Welcomelist senders only when received from these IPv6 relays
welcomelist_from_rcvd *@trusted.example.com [2001:db8::10]
welcomelist_from_rcvd *@trusted.example.com [2001:db8:1234::/48]
EOF
```

## Configuring DNSBL for IPv6

SpamAssassin's DNSEval plugin handles DNSBL lookups for IPv4 and IPv6 addresses. Use DNSBL zones that support IPv6; SpamAssassin handles the address-to-query conversion:

```bash
# Check that the DNSBL-related plugins are loaded
grep -RhE "^[[:space:]]*loadplugin .*DNSEval|^[[:space:]]*loadplugin .*URIDNSBL" /etc/spamassassin/*.pre

# SpamAssassin already ships Spamhaus ZEN rules such as RCVD_IN_XBL.
# Adjust the built-in score instead of redefining the rule name.
sudo tee -a /etc/spamassassin/local.cf << 'EOF'
score    RCVD_IN_XBL     2.0
EOF
```

## Updating SpamAssassin Rules

```bash
# Update rule sets (including current DNSBL/network rule definitions)
sudo sa-update
sudo systemctl restart spamd

# Run sa-update in verbose mode to see what's updated
sudo sa-update -v 2>&1 | grep -i "update"
```

## Testing SpamAssassin with an IPv6 Message

Create a test email with an IPv6 Received header:

```bash
# Create a test email simulating IPv6 relay
cat > /tmp/test-ipv6.eml << 'EOF'
Received: from mail.example.com ([2001:db8::10])
  by mx.test.com with ESMTP id abc123;
  Thu, 19 Mar 2026 12:00:00 +0000
From: sender@example.com
To: recipient@test.com
Subject: IPv6 SpamAssassin Test
Message-ID: <test-ipv6@mail.example.com>
Date: Thu, 19 Mar 2026 12:00:00 +0000

Test message from IPv6 sender.
EOF

# Process with SpamAssassin
spamassassin -t < /tmp/test-ipv6.eml

# Check specific scores
spamassassin -t -D all < /tmp/test-ipv6.eml 2>&1 | grep -Ei "IPv6|trusted|welcomelist|whitelist"
```

## Checking How SpamAssassin Sees IPv6 Addresses

```bash
# Use spamassassin debug mode to see IP address handling
spamassassin -t -D received-header,dns,dnseval < /tmp/test-ipv6.eml 2>&1 | grep -Ei "ip|relay|rdns|rbl|dns"

# Check trusted_networks evaluation
spamassassin -t -D received-header,config < /tmp/test-ipv6.eml 2>&1 | grep -Ei "trusted|internal|relay"
```

## Handling spamd for IPv6 Connections

If using spamd as a daemon, ensure it accepts connections from IPv6 clients:

```bash
# Edit the spamd options in /etc/default/spamd
sudo nano /etc/default/spamd

# Set OPTIONS to bind on IPv6 and allow your spamc client subnet
OPTIONS="--create-prefs --max-children 5 --helper-home-dir --listen=[::]:783 --listen=0.0.0.0:783 --allowed-ips=[2001:db8::]/32,::1,127.0.0.1"

sudo systemctl restart spamd

# Verify spamd is listening on IPv6
ss -tlnp | grep 783
```

## Conclusion

SpamAssassin IPv6 configuration centers on three areas: defining `trusted_networks` and `internal_networks` with IPv6 CIDR blocks, configuring IPv6-aware DNSBL checks, and ensuring spamd listens on IPv6 and allows the expected IPv6 spamc clients if used as a daemon. With these changes, SpamAssassin accurately evaluates IPv6 mail without incorrectly penalizing legitimate internal senders.
