# How to Configure Rspamd for Mail Filtering on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Email, Spam Filtering, Rspamd, Postfix

Description: Install and configure Rspamd on Ubuntu as a high-performance spam filtering and email security system integrated with Postfix for scoring, DKIM signing, and greylisting.

---

Rspamd is a modern, high-performance spam filtering system written in C. It is significantly faster than SpamAssassin and includes built-in support for DKIM signing, greylisting, neural network spam detection, and integration with external reputation systems. This guide covers installing Rspamd on Ubuntu and integrating it with Postfix.

## How Rspamd Works with Postfix

Rspamd runs as a daemon that Postfix communicates with via the milter protocol. When Postfix receives a message, it passes it to Rspamd for analysis. Rspamd scores the message based on hundreds of rules and external lookups, then returns an action to Postfix:

- **accept**: Deliver the message normally
- **soft reject**: Temporarily reject (greylisting for unknown senders)
- **add header**: Add spam score headers but deliver
- **rewrite subject**: Modify the subject to indicate spam
- **reject**: Hard reject (definite spam or policy violation)
- **discard**: Accept but silently drop (optional)

## Installing Rspamd

Rspamd provides its own apt repository with more recent versions than Ubuntu's default packages:

```bash
# Add the Rspamd signing key
curl https://rspamd.com/apt-stable/gpg.key | \
  sudo gpg --dearmor -o /usr/share/keyrings/rspamd.gpg

# Add the repository
echo "deb [signed-by=/usr/share/keyrings/rspamd.gpg] \
  https://rspamd.com/apt-stable/ $(lsb_release -sc) main" | \
  sudo tee /etc/apt/sources.list.d/rspamd.list

# Install Rspamd
sudo apt update
sudo apt install -y rspamd

# Start and enable the service
sudo systemctl start rspamd
sudo systemctl enable rspamd
sudo systemctl status rspamd
```

## Rspamd Configuration Structure

Rspamd uses a hierarchical configuration system:

```bash
# Main configuration directory
ls /etc/rspamd/

# Local overrides directory (put your customizations here)
ls /etc/rspamd/local.d/
ls /etc/rspamd/override.d/
```

The convention is to put local customizations in `/etc/rspamd/local.d/` which **merges** with defaults, or `/etc/rspamd/override.d/` which **replaces** defaults. Never edit files in `/etc/rspamd/` directly since they may be overwritten on upgrade.

## Integrating with Postfix

### Configuring Postfix to Use Rspamd

Edit the Postfix main configuration:

```bash
sudo nano /etc/postfix/main.cf
```

Add or modify these lines:

```
# Rspamd milter configuration
smtpd_milters = inet:localhost:11332
non_smtpd_milters = inet:localhost:11332
milter_protocol = 6
milter_mail_macros = i {mail_addr} {client_addr} {client_name} {auth_authen}
milter_default_action = accept
```

The `milter_default_action = accept` ensures mail is delivered even if Rspamd is temporarily unavailable.

Restart Postfix to apply:

```bash
sudo systemctl restart postfix
```

### Verifying the Milter Connection

```bash
# Test that Rspamd is listening on the milter port
nc -z localhost 11332 && echo "Rspamd milter is listening"

# Check Rspamd is running
sudo rspamadm configtest
```

## Configuring DKIM Signing

Rspamd can sign outbound email with DKIM, replacing the need for OpenDKIM.

### Generating DKIM Keys

```bash
# Create directory for DKIM keys
sudo mkdir -p /var/lib/rspamd/dkim/

# Generate a DKIM key pair for your domain
sudo rspamadm dkim_keygen \
  --selector=mail2026 \
  --domain=example.com \
  --bits=2048 \
  --privkey=/var/lib/rspamd/dkim/example.com.mail2026.key

# Set correct ownership
sudo chown -R _rspamd:_rspamd /var/lib/rspamd/dkim/
sudo chmod 600 /var/lib/rspamd/dkim/*.key

# Display the public key DNS record to publish
sudo rspamadm dkim_keygen \
  --selector=mail2026 \
  --domain=example.com \
  --bits=2048 2>/dev/null | tail -n +2
```

### Configuring Rspamd DKIM Signing

```bash
sudo nano /etc/rspamd/local.d/dkim_signing.conf
```

```
# Enable DKIM signing
enabled = true;

# Sign all outbound mail
allow_envfrom_empty = true;

# Use header "From" for domain detection
use_domain = "header";

# Key configuration
path = "/var/lib/rspamd/dkim/$domain.$selector.key";
selector = "mail2026";

# Sign subdomains with the parent domain key
allow_hdrfrom_mismatch = false;
```

### Publishing the DNS Record

After generating the key, add the DNS TXT record to your domain:

```
mail2026._domainkey.example.com  IN  TXT  "v=DKIM1; k=rsa; p=MIIBIjANBg..."
```

The full public key is printed by the `rspamadm dkim_keygen` command.

## Setting Up Greylisting

Greylisting temporarily rejects mail from unknown senders. Legitimate mail servers retry and are then accepted; most spam servers do not retry.

```bash
sudo nano /etc/rspamd/local.d/greylist.conf
```

```
# Greylist settings
expire = 1d;     # Time before greylisted entry expires
timeout = 5m;    # Delay before a new sender is whitelisted

# Maximum greylist time
max_expire = 1d;

# Only greylist messages above this score
greylist_min_score = 4.0;
```

## Configuring Spam Actions and Thresholds

Define what happens at different spam scores:

```bash
sudo nano /etc/rspamd/local.d/actions.conf
```

```
# Score thresholds for actions
reject = 15.0;      # Hard reject spam above this score
add_header = 5.0;   # Add spam headers above this score
greylist = 4.0;     # Greylist unknown senders above this score
```

## Setting Up Redis for Rspamd

Rspamd uses Redis for storing learned spam data, greylisting state, and rate limiting. Without Redis, these features do not persist across restarts.

```bash
# Install Redis
sudo apt install -y redis-server

# Configure Redis for Rspamd
sudo nano /etc/rspamd/local.d/redis.conf
```

```
# Redis server configuration
servers = "127.0.0.1:6379";

# Optional: Redis password if configured
#password = "your_redis_password";

# Database number (0-15)
db = 0;
```

```bash
# Restart Rspamd to connect to Redis
sudo systemctl restart rspamd
```

## Configuring the Rspamd Web UI

Rspamd includes a web interface for monitoring and managing the filter:

```bash
# Generate a password hash for the web UI
sudo rspamadm pw
# Enter a password when prompted
# Copy the hash from the output
```

```bash
sudo nano /etc/rspamd/local.d/worker-controller.inc
```

```
# Web UI password
password = "$2$your_hash_from_above";

# Bind to localhost (use a reverse proxy for external access)
bind_socket = "127.0.0.1:11334";
```

```bash
sudo systemctl restart rspamd
```

Access the web UI at `http://localhost:11334` (or via an SSH tunnel from your workstation).

### Setting Up nginx as a Reverse Proxy for the UI

```bash
sudo apt install -y nginx

sudo nano /etc/nginx/sites-available/rspamd
```

```nginx
server {
    listen 8080;
    server_name your-server-ip;

    location / {
        proxy_pass http://127.0.0.1:11334;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
sudo ln -sf /etc/nginx/sites-available/rspamd /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## Training the Spam Filter

Rspamd uses Bayesian learning. Train it with known spam and ham (legitimate) messages:

```bash
# Train with spam messages (directory of .eml files or a Maildir)
sudo rspamc learn_spam /path/to/spam/maildir/cur/

# Train with ham (legitimate) messages
sudo rspamc learn_ham /path/to/ham/maildir/cur/

# Check training statistics
sudo rspamc stat

# Automate training from Dovecot IMAP (common setup)
# Users move messages to Spam/Ham folders, and a script retrains Rspamd
```

## Checking Mail Headers

After setting up Rspamd, verify it is scoring messages correctly by checking the headers of received mail:

```
X-Spam-Status: No, score=1.4 required=15.0 tests=DKIM_SIGNED,DKIM_VALID,RCVD_IN_DNSWL_NONE autolearn=no
X-Rspamd-Score: 1.40 / 15.00
X-Rspamd-Action: no action
```

## Viewing Rspamd Logs

```bash
# Rspamd logs to syslog by default
sudo journalctl -u rspamd -f

# Or check the log file directly
sudo tail -f /var/log/rspamd/rspamd.log

# View recent spam decisions
sudo grep "reject" /var/log/rspamd/rspamd.log | tail -20
```

## Adding Custom Rules

Custom Rspamd rules are written in Lua:

```bash
sudo nano /etc/rspamd/local.d/custom_rules.lua
```

```lua
-- Custom rule: block messages from a specific domain
rspamd_config:register_symbol({
  name = 'BLOCKED_DOMAIN',
  score = 15.0,
  description = 'Message from blocked domain',
  callback = function(task)
    local from = task:get_from('smtp')
    if from and from[1] then
      local domain = from[1]['domain']
      local blocked = {'spammer.com', 'badactor.net'}
      for _, d in ipairs(blocked) do
        if domain == d then
          return true, 'Message from blocked domain ' .. domain
        end
      end
    end
    return false
  end
})
```

```bash
# Test configuration after changes
sudo rspamadm configtest

sudo systemctl restart rspamd
```

## Checking Overall Status

```bash
# View Rspamd status and statistics
sudo rspamc stat

# Check which modules are loaded
sudo rspamc modules

# Test spam scanning on a specific message
rspamc -h localhost check /path/to/test.eml
```

Rspamd is a substantial improvement over older spam filtering solutions in both performance and accuracy. Its integrated DKIM signing, greylisting, and neural network detection make it well worth deploying on any Ubuntu-based mail server handling real email volume.
