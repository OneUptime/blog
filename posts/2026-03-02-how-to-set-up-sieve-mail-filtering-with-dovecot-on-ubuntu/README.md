# How to Set Up Sieve Mail Filtering with Dovecot on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Email, Dovecot, Sieve, Mail Filtering

Description: Configure Sieve mail filtering in Dovecot on Ubuntu to allow users to create server-side rules that automatically sort, forward, and manage incoming messages.

---

Sieve is a scripting language for server-side mail filtering. When Dovecot delivers a message, it can first run it through a Sieve script that decides where the message goes - a specific folder, forwarded to another address, automatically replied to, or discarded. Since filtering happens on the server, it works regardless of which email client a user uses.

## What Sieve Can Do

Sieve scripts can:

- Sort messages into folders based on sender, subject, or any header
- Forward copies of messages to external addresses
- Set up automatic vacation replies
- Reject messages that match specific criteria
- Flag or mark messages
- Silence notifications for certain message types

## Installing the Dovecot Sieve Plugin

Dovecot's Sieve support is provided by the `dovecot-sieve` package:

```bash
sudo apt update
sudo apt install -y dovecot-sieve dovecot-managesieved

# Verify installation
dovecot --build-options | grep sieve
```

The `dovecot-managesieved` package adds the ManageSieve protocol, which allows email clients to upload and manage Sieve scripts remotely.

## Configuring Dovecot for Sieve

### Enabling the Sieve Plugin in Dovecot

Edit the Dovecot LDA (Local Delivery Agent) configuration to enable the Sieve plugin:

```bash
sudo nano /etc/dovecot/conf.d/15-lda.conf
```

```text
protocol lda {
    # Space-separated list of plugins to load during LDA
    mail_plugins = $mail_plugins sieve
}
```

If you use LMTP for delivery (recommended for Postfix integration):

```bash
sudo nano /etc/dovecot/conf.d/20-lmtp.conf
```

```text
protocol lmtp {
    mail_plugins = $mail_plugins sieve
}
```

### Configuring the Sieve Plugin

Create the Sieve plugin configuration:

```bash
sudo nano /etc/dovecot/conf.d/90-sieve.conf
```

```text
plugin {
    # Path to the user's personal Sieve script
    # %d = domain, %n = username, ~ = home directory
    sieve = file:~/sieve;active=~/.dovecot.sieve

    # Directory where user Sieve scripts are stored
    sieve_dir = ~/sieve/

    # Global Sieve script run before user scripts (admin-controlled)
    sieve_before = /etc/dovecot/sieve/before.sieve

    # Global Sieve script run after user scripts
    sieve_after = /etc/dovecot/sieve/after.sieve

    # Maximum script size
    sieve_max_script_size = 1M

    # Maximum number of Sieve scripts per user
    sieve_max_actions = 32

    # Log actions to mail log
    sieve_execute_mail_log = yes
}
```

### Setting Up ManageSieve

ManageSieve allows users to manage their Sieve scripts through email clients that support the protocol (Thunderbird with the Sieve add-on, for example):

```bash
sudo nano /etc/dovecot/conf.d/20-managesieve.conf
```

```text
# Enable the ManageSieve protocol
protocols = $protocols sieve

service managesieve-login {
    inet_listener sieve {
        port = 4190
    }
}

service managesieve {
    process_limit = 1024
}

protocol sieve {
    # Sieve plugins for ManageSieve
    managesieve_sieve_capability = fileinto reject envelope encoded-character \
      vacation subaddress comparator-i;ascii-numeric relational regex imap4flags \
      copy include variables body enotify environment mailbox date index \
      ihave duplicate mime foreverypart extracttext
}
```

### Firewall Rule for ManageSieve

```bash
sudo ufw allow 4190/tcp
```

### Restart Dovecot

```bash
sudo systemctl restart dovecot
sudo systemctl status dovecot
```

## Writing Sieve Scripts

### Basic Sieve Syntax

A Sieve script begins with `require` statements declaring which extensions are used, followed by filtering rules:

```sieve
# Basic Sieve script structure
require ["fileinto", "envelope", "comparator-i;ascii-casemap"];

# Rule 1: File mailing list messages
if header :contains "List-Id" "ubuntu-announce" {
    fileinto "Lists/Ubuntu";
    stop;
}

# Rule 2: File messages from boss to priority folder
if address :is :comparator "i;ascii-casemap" "from" "boss@company.com" {
    fileinto "Priority";
    stop;
}

# Default: implicit keep (deliver to INBOX)
```

### Sorting Messages into Folders

```sieve
require ["fileinto", "mailbox"];

# Sort by sender domain
if address :domain "from" "github.com" {
    # Create folder if it does not exist (requires mailbox extension)
    fileinto :create "GitHub";
    stop;
}

# Sort by subject keywords
if header :contains "subject" ["invoice", "receipt", "order"] {
    fileinto :create "Finance";
    stop;
}

# Sort newsletters (common List-Unsubscribe header indicates bulk mail)
if exists "List-Unsubscribe" {
    fileinto :create "Newsletters";
    stop;
}
```

### Vacation Auto-Reply

```sieve
require ["vacation", "envelope"];

# Send vacation reply once per 7 days per sender
vacation
    :days 7
    :addresses ["user@example.com", "user@otherdomain.com"]
    :subject "Out of Office"
    "I am on vacation until March 15th. I will respond when I return.

For urgent matters, please contact support@example.com.";
```

### Forwarding Mail

```sieve
require ["copy"];

# Forward a copy to another address (keep original in INBOX)
redirect :copy "backup@example.com";

# Forward without keeping a local copy (use carefully)
# redirect "forward@example.com";
# stop;
```

### Rejecting Messages

```sieve
require ["reject"];

# Hard reject with a bounce message
if address "from" "noreply@spammer.com" {
    reject "Your message was rejected by recipient policy.";
    stop;
}
```

### Using Variables

```sieve
require ["variables", "fileinto"];

# Extract sender domain and use in folder name
if address :matches "from" "*@*" {
    set "domain" "${2}";
    fileinto "By-Sender/${domain}";
    stop;
}
```

## Deploying Sieve Scripts

### Manual Script Installation

Place scripts in the user's Sieve directory:

```bash
# Create the user's sieve directory
sudo mkdir -p /home/alice/sieve/
sudo chown -R alice:alice /home/alice/sieve/

# Create the active script
sudo -u alice nano /home/alice/sieve/default.sieve
```

Compile and activate the script:

```bash
# Compile the script as the user (checks for syntax errors)
sudo -u alice sievec /home/alice/sieve/default.sieve

# Activate the script by creating the symlink Dovecot looks for
sudo -u alice ln -sf /home/alice/sieve/default.sieve /home/alice/.dovecot.sieve

# Or use sieve-test to check what the script does with a test message
sudo -u alice sieve-test /home/alice/sieve/default.sieve /path/to/test.eml
```

### Using ManageSieve Clients

Thunderbird with the "Sieve" add-on can connect to your ManageSieve server:

1. Install the "Sieve" add-on in Thunderbird
2. In the add-on settings, configure the ManageSieve server:
   - Server: your mail server hostname
   - Port: 4190
   - Connection security: STARTTLS
3. Create and upload scripts through the GUI

## Global Admin Sieve Scripts

Admin-controlled scripts run before or after all user scripts:

```bash
sudo mkdir -p /etc/dovecot/sieve/

# Create a global before script (runs first)
sudo nano /etc/dovecot/sieve/before.sieve
```

```sieve
require ["fileinto", "mailbox"];

# Global spam sorting (runs before user scripts)
if header :contains "X-Spam-Flag" "YES" {
    fileinto :create "Junk";
    stop;
}

# Global virus rejection
if header :contains "X-Virus-Status" "Infected" {
    discard;
    stop;
}
```

```bash
# Compile the global script
sudo sievec /etc/dovecot/sieve/before.sieve

# Verify it compiled successfully
ls /etc/dovecot/sieve/
```

## Troubleshooting Sieve

### Testing Scripts

```bash
# Test a script against a sample email
sieve-test ~/.dovecot.sieve /path/to/sample.eml

# Show what actions would be taken
sieve-test -v ~/.dovecot.sieve /path/to/sample.eml
```

### Checking Dovecot Logs

```bash
# Check Dovecot delivery logs for Sieve execution
sudo journalctl -u dovecot | grep -i sieve

# More detailed logging - add to 90-sieve.conf
# sieve_execute_mail_log = yes
sudo tail -f /var/log/mail.log | grep sieve
```

### Common Issues

**Folder not found error**: Use the `mailbox` extension with `:create` to auto-create folders:

```sieve
require ["fileinto", "mailbox"];
fileinto :create "My/Subfolder";
```

**Script does not run**: Verify the active script symlink exists:

```bash
ls -la ~/.dovecot.sieve
# Should point to the active script file
```

**Compilation error**: Check script syntax:

```bash
sievec ~/.dovecot.sieve
# Prints any syntax errors
```

Sieve is one of those features that users often appreciate more than they expect. Once they discover they can sort their own mail server-side without relying on client rules, it becomes a commonly used feature. The combination of Dovecot's solid implementation and the ManageSieve protocol for remote management makes it practical to deploy for any Ubuntu mail server.
