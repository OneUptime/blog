# How to Set Up Postfix Rate Limiting Per IPv4 Client Address

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Postfix, Rate Limiting, IPv4, Anti-Spam, SMTP, Security

Description: Implement per-IPv4 SMTP rate limiting in Postfix using anvil service, smtpd restrictions, and policyd to prevent abuse and reduce spam delivery attempts.

## Introduction

Rate limiting prevents a single IPv4 address from flooding your mail server with connections or messages. Postfix provides built-in rate limiting via the `anvil` service and per-client connection limits.

## Built-in Anvil Rate Limiting

```bash
# /etc/postfix/main.cf

# Connection rate limits (anvil service)
anvil_rate_time_unit = 60s                 # Time window for anvil rate limits

smtpd_client_connection_rate_limit = 30    # Max 30 connections per 60s per IP
smtpd_client_connection_count_limit = 10   # Max 10 concurrent connections per IP
smtpd_client_message_rate_limit = 30       # Max 30 messages per 60s per IP
smtpd_client_recipient_rate_limit = 100    # Max 100 recipients per 60s per IP

# Exempt trusted networks from rate limiting
smtpd_client_event_limit_exceptions = $mynetworks
```

## Connection Count Limiting

```bash
# /etc/postfix/main.cf

# Limit concurrent SMTP connections per IP
smtpd_client_connection_count_limit = 5
```

## Using Postscreen or a Policy Daemon

Postscreen adds connection-level screening before `smtpd`; use a policy daemon when you need custom per-client rate rules:

```bash
# /etc/postfix/master.cf

smtp      inet  n       -       n       -       1       postscreen
smtpd     pass  -       -       n       -       -       smtpd
dnsblog   unix  -       -       n       -       0       dnsblog
tlsproxy  unix  -       -       n       -       0       tlsproxy

# /etc/postfix/main.cf
postscreen_access_list = permit_mynetworks, cidr:/etc/postfix/postscreen_access.cidr
postscreen_denylist_action = drop
postscreen_greet_action = enforce
postscreen_dnsbl_action = enforce
postscreen_dnsbl_sites = zen.spamhaus.org*3

# Enable postscreen protocol tests
postscreen_non_smtp_command_enable = yes
postscreen_non_smtp_command_action = drop
postscreen_pipelining_enable = yes
postscreen_pipelining_action = enforce
```

## External Policy Daemon with postfwd

For advanced per-IP rate limiting:

```bash
# Install postfwd (example policy daemon with rate-limit support)
sudo apt install postfwd

# /etc/postfix/postfwd.cf
id=RATE001 ; action=rate(client_address/30/60/450 4.7.1 rate limit exceeded)

# /etc/postfix/main.cf
smtpd_end_of_data_restrictions =
    check_policy_service inet:127.0.0.1:10040  # postfwd default port

# Start postfwd in daemon mode
sudo postfwd --daemon -f /etc/postfix/postfwd.cf
```

## Monitoring Rate Limit Events

```bash
# Watch for rate limit rejections in mail log
sudo tail -f /var/log/mail.log | grep -E "rate limit|too many|NOQUEUE"

# Rejections typically include "NOQUEUE" plus text such as
# "too many connections" or "too many messages"

# Count rejections per IP
grep "too many" /var/log/mail.log | \
  grep -oE '\[([0-9.]+)\]' | sort | uniq -c | sort -rn | head 10

# View anvil statistics
sudo tail -f /var/log/mail.log | grep anvil
```

## Whitelisting High-Volume Trusted Clients

```bash
# /etc/postfix/client_event_exceptions
# Trusted client networks: exempt from smtpd_client_*_count/rate_limit settings
10.0.0.0/8
192.168.0.0/16
```

```bash
# /etc/postfix/main.cf
smtpd_client_event_limit_exceptions =
    $mynetworks, /etc/postfix/client_event_exceptions
# These clients are exempt from all smtpd_client_*_count/rate_limit settings
```

## Conclusion

Postfix anvil rate limiting (`smtpd_client_connection_rate_limit`, `smtpd_client_message_rate_limit`, etc.) provides built-in per-IPv4 throttling without external dependencies. Set reasonable limits based on your expected legitimate traffic volume, use `smtpd_client_event_limit_exceptions` to whitelist internal networks, and monitor mail logs for rate limit events to tune thresholds. For advanced screening, use postscreen; for custom rate policies, use an external policy daemon.
