# How to Set Postfix inet_interfaces to Listen on Specific IPv4 Addresses

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Postfix, IPv4, Inet_interfaces, SMTP, Mail Server, Configuration

Description: Configure the Postfix inet_interfaces parameter to control which IPv4 addresses the SMTP server listens on for incoming mail connections.

## Introduction

`inet_interfaces` in Postfix controls which network interfaces the SMTP server listens on. By default it's set to `all`, which binds to every interface. Limiting it to specific IPv4 addresses improves security on multi-homed servers.

## Configuring inet_interfaces

```bash
# /etc/postfix/main.cf

# Listen only on specific IPv4 address

inet_interfaces = 203.0.113.10

# Listen on multiple specific IPs
inet_interfaces = 203.0.113.10, 10.0.0.1

# Listen on loopback only
inet_interfaces = loopback-only

# Listen on all interfaces (default)
inet_interfaces = all
```

Restart Postfix after changes:

```bash
sudo postfix check
sudo postfix stop
sudo postfix start
```

## Understanding inet_interfaces Values

| Value | Behavior |
|---|---|
| `all` | All network interfaces |
| `loopback-only` | Loopback interfaces only |
| `203.0.113.10` | Specific IPv4 address |
| `203.0.113.10, 10.0.0.1` | Two specific IPv4 addresses |

## Combining with mynetworks and inet_protocols

```bash
# /etc/postfix/main.cf

# Listen on specific IPv4 only
inet_interfaces = 203.0.113.10

# IPv4 only
inet_protocols = ipv4

# Trusted SMTP clients
mynetworks = 127.0.0.1/8, 10.0.0.0/8, 203.0.113.0/24

# Outbound IP
smtp_bind_address = 203.0.113.10
```

## Separate Internal and External SMTP Listeners

For multi-homed servers with separate internal submission and external MX:

```bash
# /etc/postfix/main.cf

# Leave empty when all listeners have explicit IP bindings in master.cf
inet_interfaces =
```

```bash
# /etc/postfix/master.cf

# Port 25 on public IP
203.0.113.10:smtp  inet  n       -       y       -       -       smtpd

# Port 587 submission on internal IP
10.0.0.1:587       inet  n       -       n       -       -       smtpd
    -o syslog_name=postfix/submission
    -o smtpd_tls_security_level=encrypt
    -o smtpd_sasl_auth_enable=yes
```

## Verifying Listen Addresses

```bash
# Check Postfix is listening on correct IPs
sudo ss -tlnp | grep -E ':(25|587)\b'

# Expected:
# LISTEN 0 100 203.0.113.10:25 0.0.0.0:*  users:(("master",...))
# LISTEN 0 100 10.0.0.1:587   0.0.0.0:*  users:(("master",...))

# Check Postfix effective configuration
postconf inet_interfaces
postconf inet_protocols

# Test SMTP connection to specific IP
telnet 203.0.113.10 25
# Should get Postfix banner
```

## Conclusion

`inet_interfaces` controls which IPv4 addresses Postfix's SMTP server listens on. Set it to specific IPs rather than `all` on multi-homed servers to prevent unintended exposure on internal interfaces. If you want to disable IPv6 support entirely, set `inet_protocols = ipv4`, and run `postfix check` before stopping and starting Postfix to apply `inet_interfaces` or `inet_protocols` changes.
