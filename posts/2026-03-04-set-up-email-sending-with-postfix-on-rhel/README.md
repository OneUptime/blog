# How to Set Up Email Sending with Postfix on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Postfix, Email, SMTP, Linux

Description: Configure Postfix on RHEL as a send-only mail server for system notifications and application emails, using either direct delivery or an SMTP relay.

---

Postfix is the default MTA (Mail Transfer Agent) on RHEL. This guide covers configuring it to send outgoing emails, either directly or through an SMTP relay like Gmail or Amazon SES.

## Install and Start Postfix

```bash
# Postfix is typically installed by default, but verify
sudo dnf install -y postfix

# Enable and start Postfix
sudo systemctl enable --now postfix

# Check the status
sudo systemctl status postfix
```

## Configure as a Send-Only Server

Edit the main Postfix configuration:

```bash
# Back up the original config
sudo cp /etc/postfix/main.cf /etc/postfix/main.cf.bak

# Edit the configuration
sudo vi /etc/postfix/main.cf
```

Key settings for a send-only server:

```bash
# Set the hostname
sudo postconf -e "myhostname = mail.example.com"

# Only listen on localhost (send-only, no incoming mail)
sudo postconf -e "inet_interfaces = loopback-only"

# Set the domain for outgoing mail
sudo postconf -e "mydomain = example.com"
sudo postconf -e "myorigin = \$mydomain"

# Restrict relay to local only
sudo postconf -e "mydestination = \$myhostname, localhost.\$mydomain, localhost"

# Restart to apply changes
sudo systemctl restart postfix
```

## Send a Test Email

```bash
# Install mailx for testing
sudo dnf install -y mailx

# Send a test email
echo "This is a test from RHEL Postfix" | mail -s "Test Email" recipient@example.com

# Check the mail queue
mailq

# View the mail log
sudo tail -20 /var/log/maillog
```

## Configure an SMTP Relay (Gmail Example)

For reliable delivery, relay through an external SMTP server:

```bash
# Configure relay host
sudo postconf -e "relayhost = [smtp.gmail.com]:587"
sudo postconf -e "smtp_sasl_auth_enable = yes"
sudo postconf -e "smtp_sasl_password_maps = hash:/etc/postfix/sasl_passwd"
sudo postconf -e "smtp_sasl_security_options = noanonymous"
sudo postconf -e "smtp_tls_security_level = encrypt"
sudo postconf -e "smtp_tls_CAfile = /etc/pki/tls/certs/ca-bundle.crt"

# Create the password file
echo "[smtp.gmail.com]:587 user@gmail.com:app-password" | \
  sudo tee /etc/postfix/sasl_passwd

# Secure and hash the password file
sudo chmod 600 /etc/postfix/sasl_passwd
sudo postmap /etc/postfix/sasl_passwd

# Restart Postfix
sudo systemctl restart postfix
```

## Firewall Configuration

If you need to accept incoming mail (not send-only):

```bash
# Open SMTP port
sudo firewall-cmd --permanent --add-service=smtp
sudo firewall-cmd --reload
```

Check `/var/log/maillog` for delivery status and troubleshooting any send failures.
