# How to Configure Dovecot IMAP/POP3 with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dovecot, IPv6, IMAP, POP3, Email, Mail Server, TLS

Description: Configure Dovecot to listen on IPv6 for IMAP and POP3 services, enabling email clients to connect to your mail server over IPv6 addresses.

## Introduction

Dovecot is the most popular IMAP/POP3 server for Linux. It supports IPv6 through the `listen` directive in its configuration. Properly configuring Dovecot for IPv6 allows modern email clients to connect over both IPv4 and IPv6 automatically.

## Installing Dovecot

```bash
# Ubuntu/Debian

sudo apt update && sudo apt install -y dovecot-imapd dovecot-pop3d

# RHEL/CentOS
sudo yum install -y dovecot
```

## Checking Current Listen Configuration

```bash
# Show current listen setting
doveconf listen

# Check all listening sockets
ss -tlnp | grep dove

# Default is typically:
# listen = *, ::
```

## Configuring IPv6 Listeners

Edit the main Dovecot configuration:

```bash
sudo nano /etc/dovecot/dovecot.conf
```

The `listen` directive controls which addresses and protocols Dovecot binds to:

```ini
# Listen on all IPv4 and IPv6 interfaces (default and recommended)
listen = *, ::

# Listen only on IPv6
# listen = ::

# Listen on specific IPv4 and IPv6 addresses
# listen = 203.0.113.10, 2001:db8::10, ::1
```

## Configuring SSL/TLS with IPv6

Dovecot handles TLS the same way regardless of IP version. Ensure SSL is configured:

```bash
sudo nano /etc/dovecot/conf.d/10-ssl.conf
```

```ini
# Require SSL/TLS for authentication
ssl = required

# Certificate and key paths
ssl_server_cert_file = /etc/letsencrypt/live/mail.example.com/fullchain.pem
ssl_server_key_file = /etc/letsencrypt/live/mail.example.com/privkey.pem

# Modern cipher settings
ssl_min_protocol = TLSv1.2
ssl_cipher_list = ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256
```

## Configuring Ports for IMAP and POP3

Verify that services are configured on the standard ports:

```bash
sudo nano /etc/dovecot/conf.d/10-master.conf
```

```ini
service imap-login {
  inet_listener imap {
    port = 143
  }
  inet_listener imaps {
    port = 993
    ssl = yes
  }
}

service pop3-login {
  inet_listener pop3 {
    port = 110
  }
  inet_listener pop3s {
    port = 995
    ssl = yes
  }
}
```

## Opening the Firewall

Allow IMAP and POP3 ports for IPv6:

```bash
# Using UFW
sudo ufw allow 143/tcp comment "IMAP"
sudo ufw allow 993/tcp comment "IMAPS"
sudo ufw allow 110/tcp comment "POP3"
sudo ufw allow 995/tcp comment "POP3S"

# Using ip6tables
for port in 143 993 110 995; do
    sudo ip6tables -A INPUT -p tcp --dport $port -j ACCEPT
done
sudo ip6tables-save | sudo tee /etc/ip6tables.rules
```

## Restarting and Verifying

```bash
# Restart Dovecot
sudo systemctl restart dovecot

# Check listening ports include IPv6
ss -tlnp | grep -E ':143|:993|:110|:995'
# Should show IPv6 listeners for these ports, such as [::]:143 or :::143

# Test IPv6 IMAP connection
openssl s_client -connect [2001:db8::10]:993

# Test IMAP STARTTLS on IPv6
openssl s_client -connect [2001:db8::10]:143 -starttls imap
```

## Testing with an Email Client

Configure your email client (Thunderbird, Apple Mail, etc.) with:

- **Server**: `2001:db8::10` or `mail.example.com` (if AAAA record exists)
- **IMAP port**: 993 (SSL) or 143 (STARTTLS)
- **POP3 port**: 995 (SSL) or 110 (STARTTLS)

## Checking Dovecot Logs for IPv6 Connections

```bash
# Watch for IPv6 connections in Dovecot logs
sudo journalctl -u dovecot -f | grep -E "IPv6|::|rip="

# On older systems
sudo tail -f /var/log/mail.log | grep dovecot

# Example successful IPv6 login:
# dovecot: imap-login: Login: user=<user@example.com>, rip=2001:db8::20, lip=2001:db8::10
```

## Conclusion

Dovecot's `listen = *, ::` configuration enables IPv6 IMAP and POP3 support with no additional complexity. The TLS configuration is protocol-agnostic, and email clients that support IPv6 will automatically connect over IPv6 when a matching AAAA record exists for the mail server hostname.
