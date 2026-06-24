# How to Configure Sendmail for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Sendmail, IPv6, Email, SMTP, Mail Server, Linux

Description: Configure Sendmail to listen on and send mail over IPv6 by modifying sendmail.mc, enabling DAEMON_OPTIONS for IPv6, and updating address class settings.

## Introduction

Sendmail is one of the oldest MTAs and has supported IPv6 for many years. Configuration is done through M4 macro files (`.mc` files) which are compiled into `sendmail.cf`. This guide covers enabling IPv6 support and configuring both incoming and outgoing connections.

## Prerequisites

```bash
# Install Sendmail and tools on RHEL/CentOS

sudo yum install -y sendmail sendmail-cf m4

# Install on Ubuntu/Debian
sudo apt install -y sendmail sendmail-cf
```

## Checking Current IPv6 Status

```bash
# Check what ports Sendmail is listening on
ss -tlnp | grep sendmail

# Check the compiled configuration for IPv6
grep -i "inet6\|ipv6" /etc/mail/sendmail.cf | head -10
```

## Editing sendmail.mc for IPv6

The primary configuration file is `/etc/mail/sendmail.mc`:

```bash
sudo nano /etc/mail/sendmail.mc
```

Add IPv6 DAEMON_OPTIONS alongside existing IPv4 options:

```m4
FEATURE(`no_default_msa')dnl

dnl # IPv4 listener on port 25
DAEMON_OPTIONS(`Port=smtp,Addr=0.0.0.0,Name=MTA')dnl
dnl # IPv6 listener on port 25
DAEMON_OPTIONS(`Port=smtp,Addr=::,Name=MTA6,Family=inet6')dnl

dnl # IPv4 submission port 587
DAEMON_OPTIONS(`Port=submission,Addr=0.0.0.0,Name=MSA,M=Ea')dnl
dnl # IPv6 submission port 587
DAEMON_OPTIONS(`Port=submission,Addr=::,Name=MSA6,Family=inet6,M=Ea')dnl
```

## Compiling the Configuration

After editing sendmail.mc, compile it to sendmail.cf:

```bash
# Compile sendmail.mc to sendmail.cf
sudo sh -c 'm4 /etc/mail/sendmail.mc > /etc/mail/sendmail.cf'

# On some systems, use this approach
sudo make -C /etc/mail

# Restart Sendmail
sudo systemctl restart sendmail

# Verify IPv6 listener
ss -tlnp | grep ':25'
# Should show both 0.0.0.0:25 and [::]:25 or :::25
```

## Configuring Trusted IPv6 Networks (access.db)

With ``FEATURE(`access_db')`` enabled in `sendmail.mc`, update `/etc/mail/access` to trust IPv6 clients for relay:

```bash
sudo tee -a /etc/mail/access << 'EOF'
# Trust IPv6 loopback
IPv6:::1                        RELAY
# Trust specific IPv6 prefix
IPv6:2001:db8                   RELAY
# Trust specific IPv6 host
IPv6:2001:db8::10               RELAY
EOF

# Rebuild the access database
sudo makemap hash /etc/mail/access < /etc/mail/access
sudo systemctl reload sendmail
```

## Configuring Outbound IPv6

For Sendmail to use a specific IPv6 source address on outbound delivery, edit the CLIENT_OPTIONS in sendmail.mc:

```m4
dnl # Use this IPv6 source address for outbound IPv6 connections
CLIENT_OPTIONS(`Family=inet6,Addr=2001:db8::10')dnl
```

After this change, recompile and restart:

```bash
sudo sh -c 'm4 /etc/mail/sendmail.mc > /etc/mail/sendmail.cf'
sudo systemctl restart sendmail
```

## Testing IPv6 Mail Delivery

```bash
# Send a test message
echo "IPv6 Sendmail test" | sendmail -v testuser@gmail.com

# Monitor the mail queue
mailq

# Check Sendmail logs
sudo tail -f /var/log/maillog | grep -E "IPv6|ipv6|:::"
# On Debian/Ubuntu, use /var/log/mail.log instead
sudo tail -f /var/log/mail.log | grep -E "IPv6|ipv6|:::"

# Test SMTP connection on IPv6 directly
telnet -6 ::1 25
```

## Checking the Sendmail IPv6 Feature

```bash
# Verify the IPv6 daemon/client options in the compiled cf
grep -Ei "DaemonPortOptions=.*Family=inet6|ClientPortOptions=.*Family=inet6" /etc/mail/sendmail.cf

# Check resolver options generated from confBIND_OPTS, if configured
grep "ResolverOptions" /etc/mail/sendmail.cf
```

## Troubleshooting

**DAEMON_OPTIONS for IPv6 not working**: Ensure `Family=inet6` is explicitly set in the option string.

**Access map not recognizing IPv6**: Use `IPv6:` prefix (capital IPv6) in the access file, not `ipv6:`.

**Sendmail refuses to start after changes**: Generate a test `.cf` file with `m4 /etc/mail/sendmail.mc > /tmp/sendmail.cf.test` and check the command output before applying.

## Conclusion

Sendmail IPv6 configuration requires adding `DAEMON_OPTIONS` with `Family=inet6` in sendmail.mc, updating the access map with IPv6 RELAY entries, and recompiling the configuration. While Sendmail is older, its IPv6 support is mature and reliable when properly configured.
