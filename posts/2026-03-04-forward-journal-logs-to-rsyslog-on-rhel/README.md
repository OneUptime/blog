# How to Forward Journal Logs to rsyslog on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, journald, rsyslog, Logging, systemd, Log Forwarding

Description: Configure journald to forward its logs to rsyslog on RHEL, allowing you to use rsyslog's filtering, forwarding, and file-writing capabilities alongside the systemd journal.

---

On RHEL, systemd-journald and rsyslog both handle logging. By default, journald forwards messages to rsyslog through the `/dev/log` socket or the `imjournal` module. However, this behavior can be misconfigured or disabled. Here is how to make sure journal logs are properly forwarded to rsyslog.

## Check Current Forwarding Status

```bash
# Check if rsyslog is using the journal input module
grep -r "imjournal\|imuxsock" /etc/rsyslog.conf /etc/rsyslog.d/

# Check journald's forwarding setting
grep ForwardToSyslog /etc/systemd/journald.conf
```

## Method 1: Use the imjournal Module (Recommended)

rsyslog's `imjournal` module reads directly from the systemd journal. This is the default on RHEL 9.

```bash
# Verify imjournal is loaded in /etc/rsyslog.conf
# You should see this near the top of the file:
module(load="imjournal"
    StateFile="imjournal.state"
    ratelimit.interval="600"
    ratelimit.burst="20000")
```

If this line is missing, add it:

```bash
# Edit /etc/rsyslog.conf and add the imjournal module
sudo tee /etc/rsyslog.d/imjournal.conf << 'EOF'
# Read from the systemd journal
module(load="imjournal"
    StateFile="imjournal.state")
EOF

sudo systemctl restart rsyslog
```

## Method 2: Use ForwardToSyslog in journald

```bash
# Edit journald configuration
sudo mkdir -p /etc/systemd/journald.conf.d/
sudo tee /etc/systemd/journald.conf.d/forward.conf << 'EOF'
[Journal]
# Forward all journal messages to the syslog socket
ForwardToSyslog=yes
EOF

# Restart journald
sudo systemctl restart systemd-journald
```

When `ForwardToSyslog=yes` is set, journald sends messages to `/run/systemd/journal/syslog`, which rsyslog reads via the `imuxsock` module.

## Apply rsyslog Filters to Journal Data

Once journal logs reach rsyslog, you can apply filters and routing rules:

```bash
# Create /etc/rsyslog.d/journal-filters.conf
sudo tee /etc/rsyslog.d/journal-filters.conf << 'EOF'
# Write SSH logs to a separate file
if $programname == "sshd" then {
    action(type="omfile" file="/var/log/ssh.log")
    stop
}

# Write kernel messages to a separate file
if $syslogfacility-text == "kern" then {
    action(type="omfile" file="/var/log/kernel.log")
    stop
}
EOF

sudo systemctl restart rsyslog
```

## Verify the Pipeline

```bash
# Generate a test message
logger -t testapp "Journal to rsyslog test"

# Check it appears in the journal
journalctl -t testapp --since "1 minute ago"

# Check it also appears in rsyslog output
grep "testapp" /var/log/messages
```

## Adjust Rate Limiting

If you are losing messages due to rate limiting:

```bash
# In /etc/rsyslog.d/imjournal.conf
module(load="imjournal"
    StateFile="imjournal.state"
    ratelimit.interval="600"
    ratelimit.burst="50000")

# In journald configuration
sudo tee /etc/systemd/journald.conf.d/ratelimit.conf << 'EOF'
[Journal]
RateLimitIntervalSec=30s
RateLimitBurst=10000
EOF

sudo systemctl restart systemd-journald
sudo systemctl restart rsyslog
```

This setup gives you the best of both worlds: structured journal data for local queries and rsyslog's powerful forwarding and filtering for centralized logging.
