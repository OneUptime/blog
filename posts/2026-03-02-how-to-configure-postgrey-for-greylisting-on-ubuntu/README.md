# How to Configure Postgrey for Greylisting on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Email, Postgrey, Anti-Spam, Postfix

Description: Set up Postgrey greylisting on Ubuntu with Postfix to reduce spam with minimal false positives, including whitelist configuration and tuning for busy mail servers.

---

Greylisting is one of the most effective spam-reduction techniques with one of the lowest false positive rates. The idea is simple: when an unknown sender delivers a message for the first time, the server temporarily rejects it with a "try again later" response. Legitimate mail servers retry (as the SMTP spec requires), and the second attempt is accepted. Most spam-sending bots do not retry, so the spam never arrives.

Postgrey implements greylisting as a Postfix policy service. It is easy to set up, has sensible defaults, and includes a whitelist of major legitimate senders that are bypassed automatically.

## How Greylisting Works

When Postgrey receives a query from Postfix, it looks up the triplet: (sender IP, sender address, recipient address). If this triplet has not been seen before, it returns a 451 temporary rejection. When the sending server retries after the greylist delay (default 5 minutes), the triplet is now in the database and the message is accepted. Future mail from the same triplet is accepted immediately for the duration of the whitelist TTL.

This creates a delay for first-time senders, but most users do not notice because email is not expected to be instantaneous.

## Installing Postgrey

```bash
# Install Postgrey
sudo apt update
sudo apt install -y postgrey

# Verify the service started
sudo systemctl status postgrey

# Check the listening socket
ss -xlnp | grep postgrey
```

By default, Postgrey listens on a Unix socket at `/var/run/postgrey/postgrey.sock` or TCP port 10023.

## Configuring Postgrey

The main configuration is in `/etc/default/postgrey`:

```bash
sudo nano /etc/default/postgrey
```

```bash
# /etc/default/postgrey

# Listen on a Unix socket (preferred for local Postfix integration)
POSTGREY_OPTS="--unix=/var/run/postgrey/postgrey.sock"

# Or listen on TCP (if Postfix is on a different machine)
# POSTGREY_OPTS="--inet=127.0.0.1:10023"

# Greylist delay in seconds (default: 300 = 5 minutes)
# Reduce to 60 for less user-noticeable delays
POSTGREY_OPTS="$POSTGREY_OPTS --delay=300"

# How long to remember accepted triplets (days)
# If no new mail from this triplet in 35 days, it's greylisted again
POSTGREY_OPTS="$POSTGREY_OPTS --max-age=35"

# Retry window: if the retry comes in less than this many seconds, reject
# (Prevents spam bots that retry immediately)
POSTGREY_OPTS="$POSTGREY_OPTS --retry-window=2d"

# Text sent to clients during greylisting
POSTGREY_TEXT="Greylisted, please try again shortly"
```

```bash
# Restart Postgrey to apply the changes
sudo systemctl restart postgrey
sudo systemctl enable postgrey

# Verify the socket exists
ls -la /var/run/postgrey/postgrey.sock
```

## Integrating Postgrey with Postfix

```bash
# Add the Postgrey policy check to Postfix's recipient restrictions
# Place it AFTER the main access controls but BEFORE rejecting unknown users

sudo postconf -e "smtpd_recipient_restrictions =
    permit_mynetworks,
    permit_sasl_authenticated,
    reject_unauth_destination,
    check_policy_service unix:/var/run/postgrey/postgrey.sock"

# Verify the configuration
postconf smtpd_recipient_restrictions

# Reload Postfix
sudo systemctl reload postfix
```

## Testing Greylisting

```bash
# Send a test email from an external address
# The first attempt should be deferred

# Watch the Postgrey log
sudo journalctl -u postgrey -f

# Watch the Postfix log at the same time
sudo tail -f /var/log/mail.log

# You should see entries like:
# postgrey: action=greylist, reason=new, client_name=mail.sender.com, ...
# Then on retry:
# postgrey: action=pass, reason=triplet found, client_name=mail.sender.com, ...

# Check the Postgrey database
sudo postgrey-stat --status | head -30
```

## Configuring the Whitelist

Postgrey ships with a whitelist of known legitimate senders (Google, Amazon SES, Microsoft, etc.) that are automatically bypassed. You can add your own entries.

### Whitelisting by Client IP or Network

```bash
# /etc/postgrey/whitelist_clients
# This file is already created by the package with common entries

# Add entries for specific IPs or networks to bypass greylisting
sudo tee -a /etc/postgrey/whitelist_clients > /dev/null <<'EOF'
# Internal mail relay
192.168.1.0/24

# Business partner mail server
203.0.113.50

# A specific hostname pattern (regex or exact match)
# mail.trustedpartner.com
EOF
```

### Whitelisting by Recipient

```bash
# /etc/postgrey/whitelist_recipients
# Bypass greylisting for specific recipients (useful for automated accounts)

sudo tee -a /etc/postgrey/whitelist_recipients > /dev/null <<'EOF'
# Automated system that needs real-time email
alerts@example.com

# Password reset emails - users shouldn't wait
noreply@example.com
EOF
```

### Reloading the Whitelist

```bash
# Postgrey reloads whitelists on SIGHUP without dropping the database
sudo systemctl reload postgrey

# Verify the whitelist is applied
sudo journalctl -u postgrey | grep whitelist
```

## Tuning for Busy Mail Servers

### Reducing Greylist Delay

The 5-minute default delay is conservative. Modern spam bots rarely retry at all, so even a 60-second delay is effective:

```bash
sudo sed -i 's/--delay=300/--delay=60/' /etc/default/postgrey
sudo systemctl restart postgrey
```

### Using a Network Block Instead of Exact IP

Some large senders (ISPs, cloud providers) send from rotating IP pools. Whitelisting a single IP won't help. Postgrey handles this with the `--lookup-by-subnet` option, which groups IP addresses by /24 subnet:

```bash
# Add to POSTGREY_OPTS in /etc/default/postgrey:
POSTGREY_OPTS="$POSTGREY_OPTS --lookup-by-subnet"

sudo systemctl restart postgrey
```

### Database Cleanup

Postgrey's BerkeleyDB database can grow large over time. Configure auto-cleanup:

```bash
# The --max-age option already handles this for old entries
# For immediate cleanup:
sudo postgrey --unix=/var/run/postgrey/postgrey.sock --delay=300 --cleanup

# Or add a cron job for regular maintenance
echo "0 2 * * 0 root /usr/sbin/postgrey --cleanup 2>/dev/null" | \
    sudo tee /etc/cron.d/postgrey-cleanup
```

## Monitoring Postgrey Statistics

```bash
# View overall statistics
sudo postgrey-stat --status

# View recent greylist actions
sudo journalctl -u postgrey --since "1 hour ago" | grep -c "action=greylist"
sudo journalctl -u postgrey --since "1 hour ago" | grep -c "action=pass"

# Count messages being greylisted vs. passed
sudo grep "action=greylist" /var/log/postgrey.log 2>/dev/null | wc -l
sudo grep "action=pass" /var/log/postgrey.log 2>/dev/null | wc -l

# Find which senders are being greylisted most frequently
sudo journalctl -u postgrey --since "24 hours ago" | \
    grep "action=greylist" | \
    awk -F'client_name=' '{print $2}' | \
    cut -d',' -f1 | \
    sort | uniq -c | sort -rn | head -20
```

## Dealing with Greylisting Complaints

Some users will occasionally notice delayed email. The most common cause is that a sender's mail server does not properly implement SMTP retry logic. You can whitelist problematic senders on a case-by-case basis.

```bash
# Find the sender's IP from the mail log
sudo grep "sender@problem-domain.com" /var/log/mail.log | tail -10

# Add their IP or domain to the whitelist
echo "problem-domain.com" | sudo tee -a /etc/postgrey/whitelist_clients

sudo systemctl reload postgrey
```

For organizations that use ticket systems, appointment reminders, or time-sensitive automated email, whitelisting their sending infrastructure is the right answer rather than disabling greylisting.

## Viewing the Postgrey Database

```bash
# Postgrey uses a BerkeleyDB database
# Install the db utilities
sudo apt install -y db-util

# View entries in the grey database
sudo db_dump -p /var/lib/postgrey/db | head -100

# View entries in the pass (accepted) database
sudo db_dump -p /var/lib/postgrey/db_whitelisted | head -100
```

Greylisting with Postgrey is one of the best return-on-investment spam filters available. Once configured, it requires minimal maintenance and typically blocks 60-90% of spam without any content analysis, pattern matching, or Bayesian filtering complexity.
