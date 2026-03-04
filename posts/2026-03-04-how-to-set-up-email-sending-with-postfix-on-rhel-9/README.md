# How to Set Up Email Sending with Postfix on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Email, Troubleshooting

Description: Step-by-step guide on set up email sending with postfix on rhel 9 with practical examples and commands.

---

Postfix is a reliable mail transfer agent for sending email from RHEL 9 servers. This guide covers installation and configuration for outbound email.

## Install Postfix

```bash
sudo dnf install -y postfix mailx
```

## Configure Postfix for Outbound Email

Edit the main configuration:

```bash
sudo vi /etc/postfix/main.cf
```

Set the following parameters:

```bash
# Basic settings
myhostname = mail.example.com
mydomain = example.com
myorigin = $mydomain
inet_interfaces = loopback-only
mydestination = $myhostname, localhost.$mydomain, localhost

# Relay configuration
relayhost = [smtp.example.com]:587

# TLS settings
smtp_use_tls = yes
smtp_tls_CAfile = /etc/pki/tls/certs/ca-bundle.crt
smtp_tls_security_level = encrypt
```

## Configure SMTP Authentication

If your relay requires authentication:

```bash
sudo vi /etc/postfix/sasl_passwd
```

Add:

```bash
[smtp.example.com]:587 username:password
```

Create the hash database:

```bash
sudo postmap /etc/postfix/sasl_passwd
sudo chmod 600 /etc/postfix/sasl_passwd /etc/postfix/sasl_passwd.db
```

Add to main.cf:

```bash
smtp_sasl_auth_enable = yes
smtp_sasl_password_maps = hash:/etc/postfix/sasl_passwd
smtp_sasl_security_options = noanonymous
```

## Start and Enable Postfix

```bash
sudo systemctl enable --now postfix
```

## Configure Firewall

For a mail server accepting mail:

```bash
sudo firewall-cmd --permanent --add-service=smtp
sudo firewall-cmd --reload
```

## Send a Test Email

```bash
echo "Test message body" | mail -s "Test Subject" user@example.com
```

## Check the Mail Queue

```bash
mailq
sudo postqueue -f
```

## View Mail Logs

```bash
sudo tail -f /var/log/maillog
```

## Configure Email Aliases

```bash
sudo vi /etc/aliases
# Add: root: admin@example.com
sudo newaliases
```

## Conclusion

Postfix on RHEL 9 provides reliable outbound email for system notifications, cron job output, and application alerts. Use a relay host for production environments and always enable TLS encryption.

