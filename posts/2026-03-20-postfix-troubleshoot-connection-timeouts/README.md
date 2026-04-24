# How to Troubleshoot Postfix Connection Timeouts on IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Postfix, IPv4, Troubleshooting, Connection Timeout, SMTP, Email Delivery

Description: Diagnose and resolve Postfix SMTP connection timeouts on IPv4 caused by firewall blocks, DNS issues, IPv6 fallback failures, and incorrect timeout settings.

## Introduction

Postfix connection timeouts manifest as deferred mail with errors like "Connection timed out" or "No route to host." These usually point to connectivity or reachability issues between your server and the destination's SMTP server, though some timeouts happen later in the SMTP conversation when the remote side is slow or unresponsive.

## Reading Timeout Errors

```bash
# Check mail queue for timeout errors

sudo postqueue -p

# Inspect one queued message
sudo postcat -q <QUEUE_ID>

# Common timeout messages in /var/log/mail.log:
# connect to smtp.example.com[203.0.113.50]:25: Connection timed out

sudo grep "timeout\|timed out" /var/log/mail.log | tail -20
```

## Step 1: Test Basic Connectivity

```bash
# Resolve the recipient domain to its MX host(s)
dig MX <RECIPIENT_DOMAIN> +short
# If there are no MX records, SMTP falls back to the domain's A/AAAA records

# Can you reach the destination MX on port 25?
telnet <MX_HOSTNAME> 25
# If "Connection timed out" → routing, firewall, or outbound port 25 filtering issue

# If you use a relayhost instead of direct MX delivery, test that host/port instead
telnet smtp-relay.example.com 587
openssl s_client -connect smtp-relay.example.com:465 -crlf </dev/null
```

## Step 2: Check Outbound Port 25 Blocking

Many cloud providers and ISPs block outbound port 25 to prevent spam:

```bash
# Test if port 25 is reachable on the destination MX
nc -zv -w 5 <MX_HOSTNAME> 25
# If timeout → outbound port 25 may be blocked, or the route/firewall path is failing

# AWS: outbound port 25 to public IPv4/IPv6 is blocked by default on EC2
# Fix: use a relay via SES or request port 25 restriction removal

# Check iptables for outbound port 25 blocks
sudo iptables -L OUTPUT -n | grep 25
```

## Step 3: Verify IPv4 Routing

```bash
# Check routing to the destination MX
traceroute <MX_HOSTNAME>

# Verify the route and source IP chosen for the destination
ip route get <MX_IP>

# Test connectivity from Postfix's bound IPv4 address
curl --interface 203.0.113.10 --connect-timeout 5 telnet://<MX_HOSTNAME>:25 </dev/null
```

## Step 4: IPv6 Fallback Causing Delays

```bash
# Check if broken IPv6 connectivity is causing delays
sudo tail -f /var/log/mail.log | grep "connect to"
# If you see IPv6 connection attempts and IPv6 is broken → fix with:

# /etc/postfix/main.cf
inet_protocols = ipv4   # Use IPv4 only for Postfix networking

sudo postfix stop
sudo postfix start
sudo postqueue -f   # Request immediate delivery attempts for queued mail
```

## Step 5: Adjust Postfix Timeout Settings

```bash
# /etc/postfix/main.cf

# Review connection timeout (default: 30s is often fine)
smtp_connect_timeout = 30s

# Review delay between delivery attempts for deferred mail
maximal_queue_lifetime = 5d    # Total time to try before bouncing
minimal_backoff_time = 300s    # Min wait between retries (default 300s)
maximal_backoff_time = 4000s   # Max wait between retries

# For testing: reduce queue scan and backoff so retries happen sooner
queue_run_delay = 60s
minimal_backoff_time = 60s
maximal_backoff_time = 300s
```

## Step 6: Check Firewall on Both Ends

```bash
# Local firewall check
sudo iptables -L OUTPUT -n | grep -E "DROP|REJECT"
sudo iptables -L FORWARD -n | grep -E "DROP|REJECT"

# Test TCP connection with explicit source IP
nc -4 -s 203.0.113.10 -zv -w 5 <MX_HOSTNAME> 25
# Or
curl -v --interface 203.0.113.10 --connect-timeout 5 telnet://<MX_HOSTNAME>:25 </dev/null
```

## Forcing Queue Flush After Fix

```bash
# After resolving the connectivity issue:
sudo postqueue -f    # Request immediate delivery attempts for queued mail

# Watch for successful delivery
sudo tail -f /var/log/mail.log | grep "status=sent"
```

## Conclusion

Postfix IPv4 connection timeouts usually come down to reachability problems: blocked port 25, routing failures, firewall rules, DNS resolution issues, or broken IPv6 connectivity delaying delivery. Start by testing the actual destination MX on port 25, check whether IPv6 needs to be disabled for Postfix with `inet_protocols = ipv4`, verify no outbound firewall blocks exist, and trigger an immediate queue run after resolving the issue.
