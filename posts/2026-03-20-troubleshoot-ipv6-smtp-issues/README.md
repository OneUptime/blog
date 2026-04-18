# How to Troubleshoot IPv6 SMTP Connection Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SMTP, IPv6, Email, Troubleshooting, Postfix, Networking

Description: Diagnose and resolve common IPv6 SMTP connection issues including connection refusals, authentication failures, and delivery deferrals on dual-stack mail servers.

## Introduction

IPv6 SMTP issues often present differently from IPv4 problems because of unique IPv6 behaviors like link-local scope, privacy extensions changing source addresses, and newer IP reputation systems. This guide provides a systematic approach to diagnosing IPv6 SMTP connection failures.

## Common Symptoms and Their Causes

| Symptom | Likely Cause |
|---------|-------------|
| `Connection refused` on port 25 | Firewall blocking IPv6 or Postfix not listening on IPv6 |
| `550 5.7.1` from Gmail | Missing PTR record or SPF ip6: entry |
| Mail queued but not delivered | No IPv6 default route |
| Intermittent delivery failures | Privacy extensions changing source IP |
| `No route to host` | Missing IPv6 gateway or firewall drop |

## Step 1: Verify IPv6 is Active on the Server

```bash
# Check IPv6 addresses on the server

ip -6 addr show scope global

# Check for a default IPv6 route
ip -6 route show default
# If empty, there is no IPv6 default gateway - fix this first

# Test basic internet connectivity over IPv6
ping6 -c 3 2001:4860:4860::8888
curl -6 https://ipv6.google.com
```

## Step 2: Check Postfix is Listening on IPv6

```bash
# Verify Postfix listens on IPv6
ss -tlnp | grep ':25'

# If only 0.0.0.0:25 appears, Postfix is IPv4-only
# Fix: Set inet_protocols = all in /etc/postfix/main.cf
sudo postconf inet_protocols
sudo postconf -e 'inet_protocols = all'
sudo systemctl reload postfix
```

## Step 3: Test Inbound Connectivity

```bash
# Test from an external IPv6 host or use an online SMTP tester
# From the server itself (loopback)
telnet -6 ::1 25

# From an external IPv6 host
nc -6 -v mail.example.com 25

# Check firewall rules
sudo ip6tables -L INPUT -n | grep 25
# If port 25 is not permitted, add the rule:
sudo ip6tables -A INPUT -p tcp --dport 25 -j ACCEPT
```

## Step 4: Diagnose Outbound Delivery Failures

```bash
# Check the mail queue for deferred messages
sudo postqueue -p | head -30

# Flush deferred messages and watch the log
sudo postqueue -f
sudo tail -f /var/log/mail.log

# Test outbound connection to a remote mail server over IPv6
nc -6 -v -w 5 gmail-smtp-in.l.google.com 25

# Check if the correct source IP is used
sudo ip -6 route get 2607:f8b0:4003:c08::1a
```

## Step 5: Check PTR Records

```bash
# Get your server's outbound IPv6 address
curl -6 https://ifconfig.me

# Check its PTR record
dig -x <your-ipv6> +short
# If empty, request PTR from your hosting provider

# Verify FCrDNS
hostname=$(dig -x <your-ipv6> +short | sed 's/\.$//')
dig AAAA $hostname +short
# Should return your IPv6 address
```

## Step 6: Privacy Extensions Causing SPF Failures

IPv6 privacy extensions (RFC 8981, which obsoletes RFC 4941) can cause the source address to change, breaking SPF:

```bash
# Check if privacy extensions are active
sysctl net.ipv6.conf.eth0.use_tempaddr
# If value is 2, temporary addresses are preferred

# Disable privacy extensions for the mail server interface
sudo sysctl -w net.ipv6.conf.eth0.use_tempaddr=0

# Make permanent
echo "net.ipv6.conf.eth0.use_tempaddr = 0" | sudo tee -a /etc/sysctl.d/99-ipv6.conf
sudo sysctl -p /etc/sysctl.d/99-ipv6.conf

# Pin Postfix to a specific stable IPv6 address
sudo postconf -e 'smtp_bind_address6 = 2001:db8::10'
```

## Step 7: Decode Bounce Messages

```bash
# Read bounce NDR messages
sudo mail -f /var/mail/root

# Common error patterns and meaning:
# "550-5.7.1 ... Our system has detected that this message does not meet IPv6 sending guidelines"
# → PTR record missing or FCrDNS broken

# "550 5.7.26 This message fails to pass SPF checks"
# → ip6: mechanism missing in SPF record

# "421 Too many connections from your IP"
# → IPv6 source IP changed due to privacy extensions, new IP has no reputation
```

## Step 8: Test with Verbose Postfix Debug

```bash
# Enable verbose debugging for a specific domain
sudo postconf -e 'debug_peer_list = gmail.com'
sudo postconf -e 'debug_peer_level = 2'
sudo systemctl reload postfix

# Send a test message and watch the verbose log
echo "debug test" | mail -s "debug" test@gmail.com
sudo grep "smtp\[" /var/log/mail.log | tail -50

# Disable debug after testing
sudo postconf -e 'debug_peer_list ='
sudo systemctl reload postfix
```

## Conclusion

IPv6 SMTP troubleshooting follows a logical sequence: verify connectivity, check listening ports, validate PTR/FCrDNS, ensure SPF includes ip6: mechanisms, and disable privacy extensions on server interfaces. Most issues resolve after fixing PTR records and pinning the outbound address with `smtp_bind_address6`.
