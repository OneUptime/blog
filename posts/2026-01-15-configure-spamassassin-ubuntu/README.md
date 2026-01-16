# How to Configure SpamAssassin on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, SpamAssassin, Spam Filter, Email, Security, Tutorial

Description: Complete guide to installing and configuring SpamAssassin for email spam filtering on Ubuntu.

---

Email spam remains one of the most persistent challenges for system administrators and organizations. SpamAssassin is a powerful, open-source spam filtering platform that uses a variety of techniques to identify and block unwanted email. This comprehensive guide will walk you through installing, configuring, and optimizing SpamAssassin on Ubuntu to protect your email infrastructure from spam.

## Understanding SpamAssassin

SpamAssassin is a mature, widely-deployed spam filter that uses multiple detection methods to identify spam:

- **Header Analysis**: Examines email headers for suspicious patterns
- **Body Analysis**: Scans message content for spam indicators
- **Bayesian Filtering**: Uses statistical analysis to learn spam patterns
- **DNS Blocklists (DNSBLs)**: Checks sender IPs against known spam sources
- **Collaborative Filtering**: Integrates with Razor, Pyzor, and DCC for distributed spam detection
- **Custom Rules**: Allows administrators to create site-specific rules

SpamAssassin assigns a score to each email based on the tests it passes or fails. Messages exceeding a configurable threshold are marked as spam, allowing your mail server to filter or quarantine them appropriately.

## Prerequisites

Before starting, ensure you have:

- Ubuntu 22.04 LTS or later (this guide also works on Ubuntu 24.04)
- Root or sudo access
- A working mail server (Postfix recommended)
- Basic understanding of email protocols

## Installing SpamAssassin

### Step 1: Update Your System

```bash
# Update package lists and upgrade existing packages
sudo apt update && sudo apt upgrade -y
```

### Step 2: Install SpamAssassin and Required Packages

```bash
# Install SpamAssassin and the spamd daemon
sudo apt install spamassassin spamc -y

# Install additional tools for enhanced functionality
sudo apt install razor pyzor -y

# Install Perl modules for extra features
sudo apt install libmail-dkim-perl libnet-ident-perl libio-socket-inet6-perl -y
```

### Step 3: Create a Dedicated User

```bash
# Create a system user for SpamAssassin
# This enhances security by running spamd as a non-privileged user
sudo adduser --system --group --home /var/lib/spamassassin --shell /bin/false spamd
```

### Step 4: Enable and Start SpamAssassin

```bash
# Enable SpamAssassin to start on boot
sudo systemctl enable spamassassin

# Start the SpamAssassin service
sudo systemctl start spamassassin

# Verify the service is running
sudo systemctl status spamassassin
```

## Basic Configuration

SpamAssassin's main configuration files are located in `/etc/spamassassin/`. The primary configuration file is `local.cf`.

### Configuring local.cf

```bash
# Open the main configuration file
sudo nano /etc/spamassassin/local.cf
```

Add or modify the following settings:

```perl
# /etc/spamassassin/local.cf
# SpamAssassin Local Configuration File

# =============================================================================
# SCORE THRESHOLDS
# =============================================================================

# Set the spam threshold score
# Emails scoring at or above this value are marked as spam
# Lower values are more aggressive (more false positives)
# Higher values are more lenient (more spam gets through)
# Default is 5.0, recommended range is 4.0-6.0
required_score 5.0

# Rewrite subject line of spam messages
# This adds a prefix to help users identify spam
rewrite_header Subject [SPAM]

# Add headers to all messages for debugging and filtering
add_header all Report _REPORT_
add_header spam Flag _YESNOCAPS_
add_header all Status _YESNO_, score=_SCORE_ required=_REQD_ tests=_TESTS_

# =============================================================================
# BAYES SETTINGS
# =============================================================================

# Enable Bayesian classifier
# This is one of the most effective spam detection methods
use_bayes 1

# Enable automatic learning from message headers
bayes_auto_learn 1

# Set thresholds for automatic learning
# Messages below this score are learned as ham (legitimate)
bayes_auto_learn_threshold_nonspam 0.1

# Messages above this score are learned as spam
bayes_auto_learn_threshold_spam 12.0

# Store Bayes data in a specific location
bayes_path /var/lib/spamassassin/.spamassassin/bayes

# Use Berkeley DB for Bayes storage (recommended for performance)
bayes_store_module Mail::SpamAssassin::BayesStore::DBM

# =============================================================================
# NETWORK TESTS
# =============================================================================

# Enable DNS-based tests
# These check sender IPs against known spam blocklists
dns_available yes

# Skip network tests if DNS is not available
# Prevents delays when network is down
skip_rbl_checks 0

# Enable URIBL checks (checks URLs in message body)
# Highly effective at catching spam with malicious links
urirhssub URIBL_BLACK multi.uribl.com. A 2
body URIBL_BLACK eval:check_uribl('multi.uribl.com.')
describe URIBL_BLACK Contains an URL listed in the URIBL blacklist
tflags URIBL_BLACK net
score URIBL_BLACK 3.0

# =============================================================================
# TRUSTED NETWORKS
# =============================================================================

# Define your trusted internal networks
# These IPs are not checked against blocklists
# Replace with your actual network ranges
trusted_networks 127.0.0.1
trusted_networks 192.168.1.0/24
trusted_networks 10.0.0.0/8

# Internal networks (mail relays you control)
internal_networks 127.0.0.1
internal_networks 192.168.1.0/24

# =============================================================================
# LANGUAGE AND LOCALE
# =============================================================================

# Accept messages in these languages
# Uncomment and modify based on your needs
# ok_languages en es fr de

# Accept messages with these character sets
# ok_locales en

# =============================================================================
# REPORT TEMPLATE
# =============================================================================

# Clear the default report template
clear_report_template

# Custom report template for spam messages
report SpamAssassin has identified this incoming email as possible spam.
report
report Content preview:  _PREVIEW_
report
report Content analysis details:   (_SCORE_ points, _REQD_ required)
report
report _SUMMARY_
```

### Configuring the SpamAssassin Daemon

Edit the SpamAssassin default configuration:

```bash
# Open the spamd configuration file
sudo nano /etc/default/spamassassin
```

Configure the daemon options:

```bash
# /etc/default/spamassassin
# SpamAssassin Daemon Configuration

# Enable the SpamAssassin daemon
ENABLED=1

# Spamd options
# -d: Run as daemon
# -c: Create user preferences files
# -m: Maximum number of child processes
# -H: Specify home directory for spamd user
# --max-conn-per-child: Connections before child respawns (prevents memory leaks)
# --round-robin: Distribute load across child processes
OPTIONS="--create-prefs --max-children 5 --username spamd --helper-home-dir /var/lib/spamassassin -s /var/log/spamassassin/spamd.log"

# Set nice level for spamd (lower priority to not impact other services)
NICE="--nicelevel 15"

# Automatically update SpamAssassin rules daily
CRON=1
```

Create the log directory:

```bash
# Create log directory for SpamAssassin
sudo mkdir -p /var/log/spamassassin

# Set proper ownership
sudo chown spamd:spamd /var/log/spamassassin
```

## Integration with Postfix

Integrating SpamAssassin with Postfix allows automatic scanning of all incoming email.

### Method 1: Content Filter Integration

Edit the Postfix master configuration:

```bash
# Open Postfix master.cf
sudo nano /etc/postfix/master.cf
```

Add the following lines at the end of the file:

```conf
# /etc/postfix/master.cf
# SpamAssassin Content Filter Integration

# SpamAssassin filter service
# This receives mail from Postfix and passes it through SpamAssassin
spamassassin unix -     n       n       -       -       pipe
    user=spamd argv=/usr/bin/spamc -f -e /usr/sbin/sendmail -oi -f ${sender} ${recipient}
```

Configure Postfix to use the content filter:

```bash
# Open Postfix main.cf
sudo nano /etc/postfix/main.cf
```

Add the content filter directive:

```conf
# /etc/postfix/main.cf
# Enable SpamAssassin content filtering

# Route all incoming mail through SpamAssassin
content_filter = spamassassin
```

### Method 2: Using Amavisd-new (Recommended for Production)

For production environments, consider using Amavisd-new as an intermediary:

```bash
# Install Amavisd-new
sudo apt install amavisd-new -y

# Configure Amavisd to use SpamAssassin
sudo nano /etc/amavis/conf.d/15-content_filter_mode
```

Enable spam checking:

```perl
# /etc/amavis/conf.d/15-content_filter_mode
# Enable SpamAssassin virus and spam checking

# Uncomment these lines to enable spam checking
@bypass_spam_checks_maps = (
   \%bypass_spam_checks, \@bypass_spam_checks_acl, \$bypass_spam_checks_re);
```

### Restart Services

```bash
# Restart SpamAssassin and Postfix to apply changes
sudo systemctl restart spamassassin
sudo systemctl restart postfix

# Verify both services are running
sudo systemctl status spamassassin postfix
```

## Custom Rules

SpamAssassin allows you to create custom rules tailored to your specific needs.

### Creating Custom Rules

Create a custom rules file:

```bash
# Create a custom rules file
sudo nano /etc/spamassassin/custom_rules.cf
```

Add your custom rules:

```perl
# /etc/spamassassin/custom_rules.cf
# Custom SpamAssassin Rules

# =============================================================================
# HEADER-BASED RULES
# =============================================================================

# Block emails with suspicious subject patterns
# Rule: Matches subjects containing "You've won" followed by any amount
header LOCAL_LOTTERY_SUBJECT Subject =~ /You['']ve won \$?\d+/i
describe LOCAL_LOTTERY_SUBJECT Subject contains lottery/prize winning claim
score LOCAL_LOTTERY_SUBJECT 5.0

# Block emails claiming to be from Nigerian princes or similar
header LOCAL_NIGERIAN_PRINCE Subject =~ /\b(prince|princess|barrister|minister).*(nigeria|inheritance|beneficiary)/i
describe LOCAL_NIGERIAN_PRINCE Subject contains Nigerian prince scam indicators
score LOCAL_NIGERIAN_PRINCE 5.0

# Detect spoofed From headers
header LOCAL_SPOOFED_FROM From:addr =~ /.*@(paypa1|app1e|micr0soft|amaz0n)\..*/i
describe LOCAL_SPOOFED_FROM From address contains typosquatting domain
score LOCAL_SPOOFED_FROM 4.0

# Check for missing or suspicious Message-ID
header LOCAL_MISSING_MSGID Message-Id =~ /^$/
describe LOCAL_MISSING_MSGID Message has no Message-ID header
score LOCAL_MISSING_MSGID 1.5

# Detect bulk mail headers
header LOCAL_BULK_MAIL Precedence =~ /bulk/i
describe LOCAL_BULK_MAIL Message has bulk mail precedence
score LOCAL_BULK_MAIL 0.5

# =============================================================================
# BODY-BASED RULES
# =============================================================================

# Block messages with cryptocurrency scam patterns
body LOCAL_CRYPTO_SCAM /\b(bitcoin|ethereum|crypto).*(investment|opportunity|guaranteed|double|triple)/i
describe LOCAL_CRYPTO_SCAM Body contains cryptocurrency scam language
score LOCAL_CRYPTO_SCAM 4.0

# Detect phishing attempts
body LOCAL_PHISHING_VERIFY /\b(verify|confirm|update).*(account|password|credentials|information).*(click|link|button)/i
describe LOCAL_PHISHING_VERIFY Body contains phishing verification request
score LOCAL_PHISHING_VERIFY 3.5

# Block common spam phrases
body LOCAL_SPAM_PHRASES /\b(act now|limited time|order now|click here|unsubscribe|opt.out)\b/i
describe LOCAL_SPAM_PHRASES Body contains common spam phrases
score LOCAL_SPAM_PHRASES 0.5

# Detect excessive use of ALL CAPS
body LOCAL_EXCESSIVE_CAPS /[A-Z]{20,}/
describe LOCAL_EXCESSIVE_CAPS Body contains long strings of capital letters
score LOCAL_EXCESSIVE_CAPS 1.0

# Block messages with suspicious attachment names
body LOCAL_DANGEROUS_ATTACHMENT /\b(invoice|receipt|document|scan).*\.(exe|scr|bat|cmd|pif)/i
describe LOCAL_DANGEROUS_ATTACHMENT References dangerous attachment types
score LOCAL_DANGEROUS_ATTACHMENT 5.0

# =============================================================================
# URI-BASED RULES
# =============================================================================

# Block shortened URLs commonly used in spam
uri LOCAL_URL_SHORTENER /\b(bit\.ly|tinyurl|goo\.gl|t\.co|ow\.ly|is\.gd)\//i
describe LOCAL_URL_SHORTENER Contains URL shortener link
score LOCAL_URL_SHORTENER 1.0

# Detect suspicious file hosting links
uri LOCAL_FILE_HOSTING /\b(mega\.nz|mediafire|zippyshare|rapidgator)\//i
describe LOCAL_FILE_HOSTING Contains file hosting service link
score LOCAL_FILE_HOSTING 1.5

# =============================================================================
# META RULES
# =============================================================================

# Combine multiple weak signals into stronger detection
# This triggers when multiple minor indicators are present
meta LOCAL_LIKELY_SPAM (LOCAL_SPAM_PHRASES + LOCAL_URL_SHORTENER + LOCAL_EXCESSIVE_CAPS >= 2)
describe LOCAL_LIKELY_SPAM Multiple spam indicators present
score LOCAL_LIKELY_SPAM 2.5

# High confidence spam (multiple strong signals)
meta LOCAL_DEFINITE_SPAM (LOCAL_PHISHING_VERIFY + LOCAL_CRYPTO_SCAM >= 2)
describe LOCAL_DEFINITE_SPAM High confidence spam detection
score LOCAL_DEFINITE_SPAM 5.0
```

### Testing Custom Rules

```bash
# Test your rules syntax
sudo spamassassin --lint

# Test with a sample spam message
echo "Subject: You've won $1000000!
From: prince@nigeria.ng
To: you@example.com

Click here to claim your bitcoin investment opportunity!
Act now for limited time offer. bit.ly/spam123" | spamassassin -t

# Check which rules matched
sudo sa-learn --dump magic
```

## Bayes Filtering

Bayesian filtering is one of SpamAssassin's most powerful features. It learns from examples of spam and legitimate email.

### Setting Up Bayes Database

```bash
# Create the Bayes database directory
sudo mkdir -p /var/lib/spamassassin/.spamassassin
sudo chown -R spamd:spamd /var/lib/spamassassin

# Initialize the Bayes database
sudo -u spamd sa-learn --sync
```

### Configuring Bayes Options

Add these settings to `/etc/spamassassin/local.cf`:

```perl
# /etc/spamassassin/local.cf
# Bayesian Filter Configuration

# Enable Bayes filtering
use_bayes 1

# Enable auto-learning
# SpamAssassin automatically learns from messages it's confident about
bayes_auto_learn 1

# Auto-learn threshold for ham (legitimate mail)
# Messages scoring below this are learned as ham
bayes_auto_learn_threshold_nonspam -0.1

# Auto-learn threshold for spam
# Messages scoring above this are learned as spam
bayes_auto_learn_threshold_spam 12.0

# Minimum number of ham messages before Bayes kicks in
bayes_min_ham_num 200

# Minimum number of spam messages before Bayes kicks in
bayes_min_spam_num 200

# Path to Bayes database
bayes_path /var/lib/spamassassin/.spamassassin/bayes

# Expire old tokens to keep database size manageable
bayes_auto_expire 1

# Maximum database size (tokens)
bayes_expiry_max_db_size 500000

# Don't use Bayes scores unless we have enough data
bayes_ignore_header X-Spam-Status
bayes_ignore_header X-Spam-Score
```

## Whitelist and Blacklist

SpamAssassin provides flexible whitelist and blacklist options.

### Configuring Whitelists and Blacklists

Add to `/etc/spamassassin/local.cf`:

```perl
# /etc/spamassassin/local.cf
# Whitelist and Blacklist Configuration

# =============================================================================
# WHITELIST SETTINGS
# =============================================================================

# Whitelist specific email addresses
# These senders will always be trusted
whitelist_from admin@yourcompany.com
whitelist_from support@trustedpartner.com
whitelist_from *@trustedomain.com

# Whitelist by sender and recipient combination
# More secure than simple whitelist
whitelist_from_rcvd newsletter@company.com example.com
whitelist_from_rcvd *@bank.com bank.com

# Whitelist specific domains with authentication
# Requires SPF/DKIM pass
whitelist_auth *@google.com
whitelist_auth *@microsoft.com

# =============================================================================
# BLACKLIST SETTINGS
# =============================================================================

# Blacklist specific email addresses
# These senders will always be marked as spam
blacklist_from spammer@example.com
blacklist_from *@known-spam-domain.com

# Blacklist specific sending hosts
blacklist_to badactor@suspiciousdomain.com

# =============================================================================
# SCORING ADJUSTMENTS
# =============================================================================

# Reduce score for whitelisted senders
score USER_IN_WHITELIST -100
score USER_IN_WHITELIST_TO -6

# Increase score for blacklisted senders
score USER_IN_BLACKLIST 100
score USER_IN_BLACKLIST_TO 10
```

### Creating a Separate Whitelist File

For easier management, create a dedicated whitelist file:

```bash
# Create whitelist configuration file
sudo nano /etc/spamassassin/whitelist.cf
```

```perl
# /etc/spamassassin/whitelist.cf
# Centralized Whitelist Management

# Trusted business partners
whitelist_from *@partner1.com
whitelist_from *@partner2.com
whitelist_from billing@vendor.com

# Mailing lists
whitelist_from *@lists.ubuntu.com
whitelist_from *@lists.debian.org
whitelist_from noreply@github.com

# Payment processors (whitelist with authentication)
whitelist_auth *@paypal.com
whitelist_auth *@stripe.com
whitelist_auth *@square.com

# Social media notifications
whitelist_from *@facebookmail.com
whitelist_from *@linkedin.com
whitelist_from *@twitter.com
```

## Using sa-learn for Training

The `sa-learn` command is essential for training SpamAssassin's Bayesian filter.

### Training Commands

```bash
# Train SpamAssassin with spam messages
# Point to a maildir or mbox containing spam
sudo -u spamd sa-learn --spam /path/to/spam/folder/

# Train with ham (legitimate) messages
sudo -u spamd sa-learn --ham /path/to/ham/folder/

# Train from a single message file
sudo -u spamd sa-learn --spam /path/to/spam/message.eml
sudo -u spamd sa-learn --ham /path/to/legitimate/message.eml

# Train from stdin (useful for piping)
cat spam_message.eml | sudo -u spamd sa-learn --spam

# Forget a message (remove from training)
sudo -u spamd sa-learn --forget /path/to/message.eml
```

### Automated Training Script

Create a script for automated training:

```bash
# Create training script
sudo nano /usr/local/bin/spamassassin-train.sh
```

```bash
#!/bin/bash
# /usr/local/bin/spamassassin-train.sh
# Automated SpamAssassin Training Script

# Configuration
SPAM_DIR="/var/mail/spam-training"
HAM_DIR="/var/mail/ham-training"
LOG_FILE="/var/log/spamassassin/training.log"
SA_USER="spamd"

# Timestamp function
timestamp() {
    date "+%Y-%m-%d %H:%M:%S"
}

# Log function
log() {
    echo "[$(timestamp)] $1" | tee -a "$LOG_FILE"
}

# Start training
log "Starting SpamAssassin training..."

# Train spam if directory has files
if [ -d "$SPAM_DIR" ] && [ "$(ls -A $SPAM_DIR 2>/dev/null)" ]; then
    SPAM_COUNT=$(find "$SPAM_DIR" -type f | wc -l)
    log "Training $SPAM_COUNT spam messages..."
    sudo -u "$SA_USER" sa-learn --spam "$SPAM_DIR" >> "$LOG_FILE" 2>&1

    # Move processed files to archive
    if [ $? -eq 0 ]; then
        mv "$SPAM_DIR"/* /var/mail/spam-archive/ 2>/dev/null
        log "Spam training completed successfully"
    else
        log "ERROR: Spam training failed"
    fi
else
    log "No spam messages to train"
fi

# Train ham if directory has files
if [ -d "$HAM_DIR" ] && [ "$(ls -A $HAM_DIR 2>/dev/null)" ]; then
    HAM_COUNT=$(find "$HAM_DIR" -type f | wc -l)
    log "Training $HAM_COUNT ham messages..."
    sudo -u "$SA_USER" sa-learn --ham "$HAM_DIR" >> "$LOG_FILE" 2>&1

    # Move processed files to archive
    if [ $? -eq 0 ]; then
        mv "$HAM_DIR"/* /var/mail/ham-archive/ 2>/dev/null
        log "Ham training completed successfully"
    else
        log "ERROR: Ham training failed"
    fi
else
    log "No ham messages to train"
fi

# Sync the database
log "Syncing Bayes database..."
sudo -u "$SA_USER" sa-learn --sync >> "$LOG_FILE" 2>&1

# Display statistics
log "Current Bayes statistics:"
sudo -u "$SA_USER" sa-learn --dump magic >> "$LOG_FILE" 2>&1

log "Training session completed"
```

```bash
# Make the script executable
sudo chmod +x /usr/local/bin/spamassassin-train.sh

# Create training directories
sudo mkdir -p /var/mail/{spam-training,ham-training,spam-archive,ham-archive}
sudo chown -R spamd:spamd /var/mail/{spam-training,ham-training,spam-archive,ham-archive}

# Add to crontab for daily training
echo "0 2 * * * /usr/local/bin/spamassassin-train.sh" | sudo tee -a /etc/cron.d/spamassassin-train
```

### Checking Bayes Statistics

```bash
# View Bayes database statistics
sudo -u spamd sa-learn --dump magic

# Example output:
# 0.000          0          3          0  non-token data: bayes db version
# 0.000          0      56789          0  non-token data: nspam
# 0.000          0      12345          0  non-token data: nham
# 0.000          0     987654          0  non-token data: ntokens
# 0.000          0 1609459200          0  non-token data: oldest atime
# 0.000          0 1609545600          0  non-token data: newest atime
```

## Score Thresholds

Properly configuring score thresholds is crucial for balancing spam detection with false positives.

### Understanding Scores

```perl
# /etc/spamassassin/local.cf
# Score Threshold Configuration

# =============================================================================
# MAIN THRESHOLD
# =============================================================================

# Primary spam threshold
# Messages scoring at or above this value are marked as spam
#
# Recommended values:
# - 3.0-4.0: Aggressive (catches more spam, more false positives)
# - 5.0: Default (good balance)
# - 6.0-7.0: Conservative (fewer false positives, more spam gets through)
required_score 5.0

# =============================================================================
# ACTION THRESHOLDS
# =============================================================================

# You can configure multiple thresholds for different actions
# These are typically used with mail delivery agents like procmail or sieve

# Tag level - add spam headers but deliver normally
# (handled by MDA, not SpamAssassin directly)
# Messages scoring 2.0-4.9 get tagged but delivered

# Quarantine level - move to spam folder
# Messages scoring 5.0-9.9 go to spam folder

# Reject level - bounce the message
# Messages scoring 10.0+ are rejected
# (implemented at MTA level)

# =============================================================================
# ADJUSTING DEFAULT SCORES
# =============================================================================

# Lower the score for specific tests you find too aggressive
score RDNS_NONE 0.5          # Default is 0.793
score TO_NO_BRKTS_HTML_ONLY 0.1  # Default is 0.428

# Increase score for tests that catch spam effectively in your environment
score URIBL_BLACK 4.0        # Default is 1.725
score RCVD_IN_XBL 3.0        # Default is 2.2

# Disable tests that cause false positives
score MISSING_DATE 0.0       # Disable this test completely

# =============================================================================
# TEST SCORE ADJUSTMENTS BY CATEGORY
# =============================================================================

# Header tests - moderate scores
score FROM_EXCESS_BASE64 2.0
score HEADER_FROM_DIFFERENT_DOMAINS 2.5

# URL/URI tests - higher scores (very reliable)
score URIBL_ABUSE_SURBL 3.5
score URIBL_DBL_SPAM 3.5

# Bayes tests - scores scale with probability
# These are usually set automatically but can be adjusted
score BAYES_00 -2.0          # Very likely ham
score BAYES_05 -1.5          # Likely ham
score BAYES_20 -0.5          # Probably ham
score BAYES_40 0.0           # Uncertain
score BAYES_50 1.0           # Slightly spammy
score BAYES_60 2.0           # Likely spam
score BAYES_80 3.0           # Very likely spam
score BAYES_95 4.0           # Almost certainly spam
score BAYES_99 5.0           # Definitely spam
```

### Testing Score Configuration

```bash
# Test a message and see detailed scoring
spamassassin -t -D < /path/to/test/message.eml 2>&1 | grep -E "^(rules:|score:)"

# Check which tests contributed to the score
echo "From: test@example.com
Subject: Test message
To: user@domain.com

This is a test message." | spamassassin -t

# View all available tests and their default scores
spamassassin --lint -D 2>&1 | grep "score"
```

## Razor and Pyzor Plugins

Razor and Pyzor are collaborative spam filtering networks that share spam signatures across users worldwide.

### Installing and Configuring Razor

```bash
# Install Razor
sudo apt install razor -y

# Create Razor configuration directory
sudo -u spamd mkdir -p /var/lib/spamassassin/.razor

# Register with Razor network
sudo -u spamd razor-admin -home=/var/lib/spamassassin/.razor -register
sudo -u spamd razor-admin -home=/var/lib/spamassassin/.razor -create
sudo -u spamd razor-admin -home=/var/lib/spamassassin/.razor -discover
```

Configure Razor in SpamAssassin:

```perl
# /etc/spamassassin/local.cf
# Razor Configuration

# Enable Razor plugin
loadplugin Mail::SpamAssassin::Plugin::Razor2

# Set Razor home directory
razor_config /var/lib/spamassassin/.razor/razor-agent.conf

# Timeout for Razor queries (seconds)
razor_timeout 10

# Score for Razor hits
score RAZOR2_CHECK 2.5
score RAZOR2_CF_RANGE_51_100 3.0
score RAZOR2_CF_RANGE_E8_51_100 3.5
```

### Installing and Configuring Pyzor

```bash
# Install Pyzor
sudo apt install pyzor -y

# Create Pyzor configuration directory
sudo -u spamd mkdir -p /var/lib/spamassassin/.pyzor

# Discover Pyzor servers
sudo -u spamd pyzor --homedir /var/lib/spamassassin/.pyzor discover
```

Configure Pyzor in SpamAssassin:

```perl
# /etc/spamassassin/local.cf
# Pyzor Configuration

# Enable Pyzor plugin
loadplugin Mail::SpamAssassin::Plugin::Pyzor

# Set Pyzor home directory
pyzor_options --homedir /var/lib/spamassassin/.pyzor

# Timeout for Pyzor queries (seconds)
pyzor_timeout 10

# Score for Pyzor hits
score PYZOR_CHECK 2.5
```

### Testing Razor and Pyzor

```bash
# Test Razor connectivity
sudo -u spamd razor-check < /path/to/spam/message.eml
echo $?  # 0 = found in Razor, 1 = not found

# Test Pyzor connectivity
sudo -u spamd pyzor --homedir /var/lib/spamassassin/.pyzor check < /path/to/spam/message.eml

# Report spam to collaborative networks
sudo -u spamd razor-report < /path/to/spam/message.eml
sudo -u spamd pyzor --homedir /var/lib/spamassassin/.pyzor report < /path/to/spam/message.eml
```

## Performance Tuning

Optimizing SpamAssassin for performance is essential, especially on busy mail servers.

### Daemon Configuration

```bash
# /etc/default/spamassassin
# Performance-Optimized Configuration

ENABLED=1

# Performance options:
# --max-children: Number of worker processes
#   - Set to number of CPU cores for optimal performance
#   - Too many = memory exhaustion, too few = processing delays
# --max-conn-per-child: Connections before child respawns
#   - Prevents memory leaks, lower values use more CPU
# --round-robin: Distribute load evenly
# --nouser-config: Skip per-user configs (faster)
# --max-spare: Maximum idle children
# --min-spare: Minimum idle children
# --timeout-child: Kill slow children

OPTIONS="--create-prefs \
         --max-children 5 \
         --min-spare 1 \
         --max-spare 3 \
         --max-conn-per-child 200 \
         --round-robin \
         --username spamd \
         --helper-home-dir /var/lib/spamassassin \
         --timeout-child 60 \
         -s /var/log/spamassassin/spamd.log"

# Lower CPU priority to prevent mail server impact
NICE="--nicelevel 10"

# Enable automatic rule updates
CRON=1
```

### SpamAssassin Configuration Optimizations

```perl
# /etc/spamassassin/local.cf
# Performance Optimizations

# =============================================================================
# DISABLE EXPENSIVE TESTS
# =============================================================================

# Skip slow or unnecessary tests
# Disable if you have limited resources

# Skip DCC (requires separate daemon)
score DCC_CHECK 0
skip_dcc_check 1

# Reduce DNS timeout
dns_timeout 5

# Limit body size analysis (bytes)
# Large messages are rarely spam
body_part_scan_size 50000
rawbody_part_scan_size 50000

# =============================================================================
# OPTIMIZE NETWORK TESTS
# =============================================================================

# Enable parallel DNS queries
dns_query_restriction allow

# Use specific DNS servers (faster than system default)
dns_server 8.8.8.8
dns_server 8.8.4.4
dns_server 1.1.1.1

# Timeout settings for network tests
rbl_timeout 15
razor_timeout 10
pyzor_timeout 10

# =============================================================================
# OPTIMIZE BAYES
# =============================================================================

# Use faster storage backend
bayes_store_module Mail::SpamAssassin::BayesStore::DBM

# Limit token expiration overhead
bayes_auto_expire 1
bayes_expiry_max_db_size 300000
bayes_expiry_pct 75

# Learn only from confident classifications
bayes_auto_learn_threshold_nonspam -0.5
bayes_auto_learn_threshold_spam 15.0

# =============================================================================
# DISABLE RESOURCE-HEAVY PLUGINS
# =============================================================================

# Disable plugins you don't need
# Uncomment to disable

# loadplugin Mail::SpamAssassin::Plugin::DCC
# loadplugin Mail::SpamAssassin::Plugin::TextCat
# loadplugin Mail::SpamAssassin::Plugin::AntiVirus
# loadplugin Mail::SpamAssassin::Plugin::AWL
```

### Memory and Resource Limits

```bash
# Create systemd override for SpamAssassin
sudo mkdir -p /etc/systemd/system/spamassassin.service.d

# Create limits configuration
sudo nano /etc/systemd/system/spamassassin.service.d/limits.conf
```

```ini
# /etc/systemd/system/spamassassin.service.d/limits.conf
# Resource Limits for SpamAssassin

[Service]
# Memory limits
MemoryLimit=2G
MemoryHigh=1.5G

# CPU limits (percentage)
CPUQuota=200%

# File descriptor limits
LimitNOFILE=65535

# Process limits
LimitNPROC=100

# Restart on failure
Restart=on-failure
RestartSec=10
```

```bash
# Reload systemd and restart SpamAssassin
sudo systemctl daemon-reload
sudo systemctl restart spamassassin
```

## Monitoring Spam Detection

Effective monitoring helps you understand spam patterns and tune your configuration.

### Setting Up Logging

```bash
# Create comprehensive logging configuration
sudo nano /etc/spamassassin/logging.cf
```

```perl
# /etc/spamassassin/logging.cf
# SpamAssassin Logging Configuration

# Add detailed headers to all messages
add_header all Status _YESNO_, score=_SCORE_ required=_REQD_ tests=_TESTS_
add_header all Score _SCORE_
add_header all Tests _TESTS_
add_header all Checker-Version SpamAssassin _VERSION_ on _HOSTNAME_

# Add processing time header (useful for performance monitoring)
add_header all Processing-Time _PROCESSING_TIME_ seconds
```

### Monitoring Script

Create a monitoring script:

```bash
# Create monitoring script
sudo nano /usr/local/bin/spamassassin-stats.sh
```

```bash
#!/bin/bash
# /usr/local/bin/spamassassin-stats.sh
# SpamAssassin Statistics and Monitoring Script

# Configuration
LOG_FILE="/var/log/mail.log"
SA_LOG="/var/log/spamassassin/spamd.log"
REPORT_DIR="/var/log/spamassassin/reports"
DATE=$(date +%Y-%m-%d)

# Create report directory
mkdir -p "$REPORT_DIR"

echo "=============================================="
echo "SpamAssassin Statistics Report - $DATE"
echo "=============================================="
echo ""

# Service Status
echo "=== Service Status ==="
systemctl is-active spamassassin
echo ""

# Process Information
echo "=== Process Information ==="
ps aux | grep -E "spamd|spamassassin" | grep -v grep
echo ""

# Bayes Database Statistics
echo "=== Bayes Database Statistics ==="
sudo -u spamd sa-learn --dump magic 2>/dev/null | head -10
echo ""

# Recent Activity (last 24 hours)
echo "=== Recent Activity (Last 24 Hours) ==="
if [ -f "$SA_LOG" ]; then
    TOTAL=$(grep -c "result:" "$SA_LOG" 2>/dev/null || echo "0")
    SPAM=$(grep -c "result: Y" "$SA_LOG" 2>/dev/null || echo "0")
    HAM=$(grep -c "result: \." "$SA_LOG" 2>/dev/null || echo "0")

    echo "Total messages processed: $TOTAL"
    echo "Spam detected: $SPAM"
    echo "Legitimate (ham): $HAM"

    if [ "$TOTAL" -gt 0 ]; then
        SPAM_RATE=$(echo "scale=2; $SPAM * 100 / $TOTAL" | bc)
        echo "Spam rate: ${SPAM_RATE}%"
    fi
fi
echo ""

# Top Triggered Rules
echo "=== Top 10 Triggered Rules ==="
if [ -f "$SA_LOG" ]; then
    grep -oP 'tests=\K[^,]+' "$SA_LOG" 2>/dev/null | \
    tr ',' '\n' | \
    sed 's/^ *//' | \
    sort | \
    uniq -c | \
    sort -rn | \
    head -10
fi
echo ""

# High-Scoring Messages
echo "=== High-Scoring Messages (Score > 10) ==="
if [ -f "$SA_LOG" ]; then
    grep "result:" "$SA_LOG" 2>/dev/null | \
    awk -F'[/ ]' '$4 > 10 {print}' | \
    tail -10
fi
echo ""

# Performance Metrics
echo "=== Performance Metrics ==="
if [ -f "$SA_LOG" ]; then
    grep "processing" "$SA_LOG" 2>/dev/null | \
    tail -100 | \
    awk '{sum+=$NF; count++} END {if(count>0) print "Average processing time: " sum/count " seconds"}'
fi
echo ""

# Disk Usage
echo "=== Disk Usage ==="
du -sh /var/lib/spamassassin 2>/dev/null
du -sh /var/log/spamassassin 2>/dev/null
echo ""

# Rule Update Status
echo "=== Rule Update Status ==="
ls -la /var/lib/spamassassin/ 2>/dev/null | grep -E "updates_.*"
echo ""

# Save report
REPORT_FILE="$REPORT_DIR/report-$DATE.txt"
exec > >(tee "$REPORT_FILE")

echo "Report saved to: $REPORT_FILE"
```

```bash
# Make executable
sudo chmod +x /usr/local/bin/spamassassin-stats.sh

# Add to crontab for daily reports
echo "0 8 * * * /usr/local/bin/spamassassin-stats.sh | mail -s 'SpamAssassin Daily Report' admin@yourdomain.com" | sudo tee -a /etc/cron.d/spamassassin-stats
```

### Log Rotation

Configure log rotation for SpamAssassin logs:

```bash
# Create logrotate configuration
sudo nano /etc/logrotate.d/spamassassin
```

```conf
# /etc/logrotate.d/spamassassin
# Log Rotation Configuration for SpamAssassin

/var/log/spamassassin/*.log {
    # Rotate weekly
    weekly

    # Keep 4 weeks of logs
    rotate 4

    # Compress old logs
    compress

    # Delay compression by one rotation
    delaycompress

    # Don't error if log is missing
    missingok

    # Don't rotate empty logs
    notifempty

    # Create new log with proper permissions
    create 640 spamd spamd

    # Run scripts once per rotation
    sharedscripts

    # Reload spamd after rotation
    postrotate
        systemctl reload spamassassin > /dev/null 2>&1 || true
    endscript
}
```

### Real-Time Monitoring Commands

```bash
# Watch SpamAssassin processing in real-time
sudo tail -f /var/log/spamassassin/spamd.log

# Monitor spam detection rate
watch -n 60 'grep "result:" /var/log/spamassassin/spamd.log | tail -100 | grep -c "result: Y"'

# Check spamd child processes
watch -n 5 'ps aux | grep spamd'

# Monitor system resources used by SpamAssassin
top -p $(pgrep -d, spamd)
```

## Updating SpamAssassin Rules

Keep SpamAssassin effective by regularly updating its rule sets.

### Automatic Updates

```bash
# Enable automatic updates in /etc/default/spamassassin
# CRON=1 enables the daily update cron job

# Manual update
sudo sa-update

# Update with verbose output
sudo sa-update -v

# Check for updates without applying
sudo sa-update --checkonly

# Update from specific channel
sudo sa-update --channel updates.spamassassin.org
```

### Creating Update Cron Job

```bash
# Create update script
sudo nano /etc/cron.daily/spamassassin-update
```

```bash
#!/bin/bash
# /etc/cron.daily/spamassassin-update
# Daily SpamAssassin Rule Update Script

# Log file
LOG="/var/log/spamassassin/update.log"

# Timestamp
echo "$(date): Starting rule update" >> "$LOG"

# Run update
/usr/bin/sa-update >> "$LOG" 2>&1
UPDATE_STATUS=$?

# Check result and reload if successful
if [ $UPDATE_STATUS -eq 0 ]; then
    echo "$(date): Rules updated successfully, reloading spamd" >> "$LOG"
    systemctl reload spamassassin >> "$LOG" 2>&1
elif [ $UPDATE_STATUS -eq 1 ]; then
    echo "$(date): No updates available" >> "$LOG"
else
    echo "$(date): Update failed with status $UPDATE_STATUS" >> "$LOG"
fi

# Compile rules for faster loading (optional)
/usr/bin/sa-compile >> "$LOG" 2>&1

echo "$(date): Update process completed" >> "$LOG"
```

```bash
# Make executable
sudo chmod +x /etc/cron.daily/spamassassin-update
```

## Troubleshooting Common Issues

### SpamAssassin Not Starting

```bash
# Check service status
sudo systemctl status spamassassin

# Check for configuration errors
sudo spamassassin --lint

# Check system logs
sudo journalctl -u spamassassin -n 50

# Verify permissions
ls -la /var/lib/spamassassin/
ls -la /var/log/spamassassin/
```

### High False Positive Rate

```bash
# Review recent false positives
grep "result: Y" /var/log/spamassassin/spamd.log | tail -20

# Check which rules are triggering most often
grep -oP 'tests=\K[^,]+' /var/log/spamassassin/spamd.log | \
tr ',' '\n' | sort | uniq -c | sort -rn | head -20

# Lower scores for problematic rules in local.cf
# score PROBLEMATIC_RULE 0.5
```

### Slow Processing

```bash
# Check processing times
grep "processing" /var/log/spamassassin/spamd.log | tail -20

# Identify slow tests
spamassassin -D --lint 2>&1 | grep -i "time"

# Disable slow network tests temporarily
# Add to local.cf:
# skip_rbl_checks 1
# score RAZOR2_CHECK 0
# score PYZOR_CHECK 0
```

### Bayes Not Learning

```bash
# Check Bayes status
sudo -u spamd sa-learn --dump magic

# Ensure minimum message requirements are met
# Need at least 200 spam and 200 ham messages

# Force Bayes sync
sudo -u spamd sa-learn --sync --force-expire

# Clear and retrain Bayes database
sudo -u spamd sa-learn --clear
```

## Conclusion

SpamAssassin is a powerful and flexible spam filtering solution that, when properly configured, can dramatically reduce the amount of unwanted email reaching your users. Key takeaways from this guide:

1. **Start with sensible defaults** - Use the recommended threshold of 5.0 and adjust based on your needs
2. **Train the Bayesian filter** - This is one of the most effective spam detection methods
3. **Enable collaborative filtering** - Razor and Pyzor provide real-time spam detection from the community
4. **Create custom rules** - Tailor SpamAssassin to catch spam specific to your organization
5. **Monitor and tune** - Regular monitoring helps identify false positives and adjust scores
6. **Keep rules updated** - Enable automatic updates to stay protected against new spam techniques

Remember that spam filtering is an ongoing process. Regularly review your spam detection rates, adjust scores based on false positives, and continue training the Bayesian filter for optimal results.

---

**Monitoring Your Email Infrastructure with OneUptime**

While SpamAssassin protects your users from spam, you need visibility into your email infrastructure's health to ensure reliable delivery. [OneUptime](https://oneuptime.com) provides comprehensive monitoring for your mail servers:

- **Service Monitoring**: Track the uptime of your SMTP, IMAP, and SpamAssassin services
- **Performance Metrics**: Monitor email processing times and queue lengths
- **Alert Management**: Get notified immediately when spam rates spike or services fail
- **Incident Response**: Coordinate team responses when email issues arise
- **Status Pages**: Keep users informed about email service status

With OneUptime, you can ensure your email infrastructure remains healthy while SpamAssassin keeps spam at bay. Visit [oneuptime.com](https://oneuptime.com) to start monitoring your mail servers today.
