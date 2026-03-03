# How to Set Up Mail Archiving on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Email, Postfix, Archiving, Compliance

Description: Learn how to set up email archiving on Ubuntu using Postfix BCC routing, MailArchiva, and local archiving solutions to meet compliance and audit requirements.

---

Email archiving serves several purposes: regulatory compliance (HIPAA, SOX, GDPR), legal discovery, internal auditing, and recovering accidentally deleted messages. This post covers multiple approaches to email archiving on Ubuntu, from simple Postfix BCC routing to running a dedicated archive server.

## Approach 1: Postfix BCC Routing

The simplest archiving approach uses Postfix's built-in BCC (blind carbon copy) functionality. Postfix can silently copy every message to an archive address.

### Archiving All Mail

```bash
sudo nano /etc/postfix/main.cf
```

```ini
# Always BCC every message to this address
# (for both inbound and outbound)
always_bcc = archive@yourdomain.com
```

### Selective BCC with Transport Maps

For more granular control, use sender/recipient BCC maps:

```bash
# Sender BCC - archive based on who sent the message
sudo nano /etc/postfix/sender_bcc_maps
```

```text
# Archive all mail from the sales team
sales@example.com    archive-sales@archive.example.com
finance@example.com  archive-finance@archive.example.com

# Archive all outbound from any @example.com sender
@example.com         outbound-archive@archive.example.com
```

```bash
# Recipient BCC - archive based on who receives the message
sudo nano /etc/postfix/recipient_bcc_maps
```

```text
# Archive all mail sent to executives
ceo@example.com    archive-exec@archive.example.com
cfo@example.com    archive-exec@archive.example.com

# Archive all inbound mail for the company
@example.com       inbound-archive@archive.example.com
```

```bash
# Add to main.cf
sudo nano /etc/postfix/main.cf
```

```ini
# Enable sender BCC
sender_bcc_maps = hash:/etc/postfix/sender_bcc_maps

# Enable recipient BCC
recipient_bcc_maps = hash:/etc/postfix/recipient_bcc_maps
```

```bash
# Create the hash databases
sudo postmap /etc/postfix/sender_bcc_maps
sudo postmap /etc/postfix/recipient_bcc_maps

# Reload Postfix
sudo systemctl reload postfix
```

## Approach 2: Archiving to Local Maildir

Archive messages directly to a local Maildir folder using a Postfix transport.

```bash
# Create archive user and directory
sudo useradd -r -s /usr/sbin/nologin -m -d /var/mail/archive mailarchive
sudo mkdir -p /var/mail/archive/Maildir/{cur,new,tmp}
sudo chown -R mailarchive:mailarchive /var/mail/archive

# Create a Postfix transport for the archive address
sudo nano /etc/postfix/main.cf
```

```ini
# Add archive transport
transport_maps = hash:/etc/postfix/transport
virtual_alias_maps = hash:/etc/postfix/virtual
```

```bash
sudo nano /etc/postfix/virtual
```

```text
# Map archive@ to the local archive user
archive@example.com   mailarchive
```

```bash
sudo nano /etc/postfix/transport
```

```text
# Deliver archive@ to local Maildir
mailarchive  local:
```

```bash
sudo postmap /etc/postfix/virtual
sudo postmap /etc/postfix/transport
sudo systemctl reload postfix

# Configure local delivery to Maildir
sudo nano /etc/postfix/main.cf
```

```ini
# Use Maildir delivery for local mail
home_mailbox = Maildir/
```

## Approach 3: Archiving to Elasticsearch (Searchable Archive)

For a searchable, scalable archive, forward mail to Elasticsearch via a milter or pipe.

### Using a Postfix Pipe for Archiving

```bash
# Create an archiving script
sudo nano /usr/local/bin/mail_archive.sh
```

```bash
#!/bin/bash
# mail_archive.sh - Archive a mail message to a file

ARCHIVE_DIR="/var/mail/archive/$(date +%Y/%m/%d)"
mkdir -p "$ARCHIVE_DIR"

# Generate unique filename
FILENAME="${ARCHIVE_DIR}/$(date +%s)-$$.eml"

# Write stdin (the message) to the archive file
cat > "$FILENAME"

# Set restrictive permissions
chmod 600 "$FILENAME"

exit 0
```

```bash
sudo chmod +x /usr/local/bin/mail_archive.sh
sudo chown root:root /usr/local/bin/mail_archive.sh

# Create a dedicated archive user for the pipe
sudo useradd -r -s /usr/sbin/nologin archivist

# Add to Postfix master.cf as a pipe service
sudo nano /etc/postfix/master.cf
```

```text
# Archive pipe service
mailarchive  unix  -       n       n       -       -       pipe
  flags=Fq user=archivist argv=/usr/local/bin/mail_archive.sh
```

```bash
# Configure archive address to use this pipe
sudo nano /etc/postfix/transport
```

```text
archive@example.com   mailarchive:
```

```bash
sudo postmap /etc/postfix/transport
sudo systemctl reload postfix
```

## Approach 4: MailArchiva Open Source Edition

MailArchiva is a dedicated mail archiving application with a web interface for search and retrieval.

```bash
# Download MailArchiva Open Source Edition
# Check https://www.mailarchiva.com for the latest version
wget https://www.mailarchiva.com/files/mailarchiva_open_v7.4_unix_installer.sh

chmod +x mailarchiva_open_v7.4_unix_installer.sh
sudo ./mailarchiva_open_v7.4_unix_installer.sh

# Follow the installation wizard
# It installs to /opt/mailarchiva by default
```

### Configuring Postfix to Forward to MailArchiva

MailArchiva can receive mail via SMTP:

```bash
# MailArchiva listens on a configured SMTP port (default 8090)
# Configure Postfix to BCC to it
sudo nano /etc/postfix/main.cf
```

```ini
# BCC all mail to MailArchiva
always_bcc = archive@localhost

# Configure transport for archive address
transport_maps = hash:/etc/postfix/transport
```

```bash
sudo nano /etc/postfix/transport
```

```text
archive@localhost  smtp:[127.0.0.1]:8090
```

```bash
sudo postmap /etc/postfix/transport
sudo systemctl reload postfix
```

## Approach 5: Archiving with Dovecot's mail_log Plugin

If you're using Dovecot for IMAP, you can log every message accessed or delivered:

```bash
sudo nano /etc/dovecot/conf.d/10-logging.conf
```

```ini
# Enable the mail_log plugin
mail_plugins = $mail_plugins mail_log notify

plugin {
    # Log events
    mail_log_events = delete undelete expunge copy mailbox_delete mailbox_rename
    mail_log_fields = uid box msgid size

    # For copy events (when mail is moved to archive folder)
    mail_log_events = $mail_log_events save
}
```

## Retention Policies and Cleanup

Compliance archives often require keeping mail for a specific period, then deleting it:

```bash
sudo nano /usr/local/bin/archive_cleanup.sh
```

```bash
#!/bin/bash
# archive_cleanup.sh - Delete archive files older than retention period

ARCHIVE_DIR="/var/mail/archive"
RETENTION_DAYS=2557   # 7 years (common compliance requirement)

# Find and delete old archive files
find "$ARCHIVE_DIR" -name "*.eml" -mtime +$RETENTION_DAYS -delete

# Remove empty directories
find "$ARCHIVE_DIR" -type d -empty -delete

echo "Archive cleanup completed. Files older than $RETENTION_DAYS days removed."
```

```bash
sudo chmod +x /usr/local/bin/archive_cleanup.sh

# Run weekly via cron
echo "0 3 * * 0 root /usr/local/bin/archive_cleanup.sh >> /var/log/archive_cleanup.log 2>&1" | \
    sudo tee /etc/cron.d/archive-cleanup
```

## Indexing the Archive for Search

Even with flat-file archiving, you can make the archive searchable:

```bash
# Index .eml files using notmuch
sudo apt install notmuch

# Initialize notmuch for the archive
sudo -u mailarchive notmuch --config=/etc/notmuch-archive.cfg new

# Create notmuch configuration
sudo nano /etc/notmuch-archive.cfg
```

```ini
[database]
path=/var/mail/archive

[user]
name=Archive
primary_email=archive@example.com

[new]
tags=unread;inbox;
```

```bash
# Index new messages
sudo -u mailarchive notmuch --config=/etc/notmuch-archive.cfg new

# Search the archive
sudo -u mailarchive notmuch --config=/etc/notmuch-archive.cfg search from:boss@example.com

# Search by date range
sudo -u mailarchive notmuch --config=/etc/notmuch-archive.cfg search date:2026-01-01..2026-03-01 subject:invoice

# Add indexing to cron
echo "*/15 * * * * mailarchive notmuch --config=/etc/notmuch-archive.cfg new" | \
    sudo tee /etc/cron.d/notmuch-index
```

## Protecting the Archive

The archive is only useful if it hasn't been tampered with:

```bash
# Set archive directory permissions
sudo chmod 700 /var/mail/archive
sudo chown -R mailarchive:mailarchive /var/mail/archive

# Make archive files immutable (can't be deleted or modified even by root)
# Note: this prevents cleanup scripts from running too
# sudo chattr +i /var/mail/archive/2026/03/01/12345.eml

# Better: use a separate dedicated archive server that's write-only from the mail server

# Log all access to the archive
sudo auditctl -w /var/mail/archive -p rwxa -k mail_archive_access
sudo ausearch -k mail_archive_access

# Enable audit logging persistently
echo "-w /var/mail/archive -p rwxa -k mail_archive_access" | \
    sudo tee -a /etc/audit/rules.d/mail-archive.rules
sudo systemctl restart auditd
```

## Testing the Archive

```bash
# Send a test message that should be archived
swaks --to testuser@example.com \
      --from sender@example.com \
      --server localhost \
      --header "Subject: Archive Test $(date)"

# Wait a few seconds, then verify it was archived
ls -la /var/mail/archive/$(date +%Y/%m/%d)/

# View the archived message
cat /var/mail/archive/$(date +%Y/%m/%d)/*.eml | head -30
```

A mail archive is only useful if you can retrieve messages from it quickly and reliably. Whatever approach you choose, test retrieval regularly - both to verify the archive is working and to ensure you can actually find messages when needed during an audit or legal inquiry.
