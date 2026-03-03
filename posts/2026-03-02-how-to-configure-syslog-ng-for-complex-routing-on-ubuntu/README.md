# How to Configure syslog-ng for Complex Routing on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Logging, syslog-ng, Linux, System Administration

Description: Learn how to configure syslog-ng on Ubuntu for advanced log routing, filtering, and forwarding with support for multiple sources, filters, and destinations including files, TCP/UDP, and databases.

---

syslog-ng is an enhanced syslog daemon that replaces rsyslog in environments where you need more sophisticated log routing. Its configuration language gives you fine-grained control over how messages are collected, processed, and forwarded. You can route the same message to multiple destinations, apply complex filters, reformat messages, and handle structured logging.

It's particularly useful when you're building centralized log infrastructure and need routing logic that goes beyond what rsyslog's basic configuration supports.

## Installing syslog-ng

```bash
# Install syslog-ng from Ubuntu repositories
sudo apt update
sudo apt install syslog-ng syslog-ng-core

# Check the installed version
syslog-ng --version

# The main configuration file
ls /etc/syslog-ng/syslog-ng.conf

# Additional configuration snippets go in
ls /etc/syslog-ng/conf.d/
```

Before making changes, stop rsyslog if it's running (they conflict):

```bash
# Check if rsyslog is running
systemctl status rsyslog

# If it is, stop and disable it
sudo systemctl stop rsyslog
sudo systemctl disable rsyslog
sudo systemctl mask rsyslog

# Start syslog-ng
sudo systemctl enable --now syslog-ng
```

## Understanding syslog-ng Configuration Structure

The configuration has four main building blocks:

1. **source** - where logs come from
2. **filter** - conditions to match log messages
3. **destination** - where to send logs
4. **log** - ties sources, filters, and destinations together

A basic log statement: `log { source(s_local); filter(f_error); destination(d_errorfile); };`

## Basic Configuration Overview

```bash
sudo nano /etc/syslog-ng/syslog-ng.conf
```

The default configuration looks like:

```text
@version: 3.38
@include "scl.conf"

# Global options
options {
    # Chain hostnames when forwarding
    chain_hostnames(off);
    # Flush log file regularly even without new messages
    flush_lines(0);
    # Use DNS for hostname resolution
    use_dns(no);
    # Preserve original timestamp format
    use_fqdn(no);
    # Stats frequency (seconds)
    stats_freq(0);
    # Warning on missing MARK messages
    mark_freq(0);
};
```

## Configuring Sources

Sources define where syslog-ng reads log messages from:

```text
# Collect from the local system journal via /dev/log socket
source s_local {
    system();     # Platform-specific local source (handles journal, /dev/log, etc.)
    internal();   # syslog-ng's own internal messages
};

# Read from systemd journal directly
source s_journal {
    systemd-journal(
        prefix(".journald.")
    );
};

# Accept syslog messages over UDP (from other servers)
source s_udp_syslog {
    network(
        transport("udp")
        port(514)
    );
};

# Accept syslog messages over TCP (more reliable than UDP)
source s_tcp_syslog {
    network(
        transport("tcp")
        port(514)
        max-connections(100)
    );
};

# Read from a specific log file
source s_nginx_access {
    file(
        "/var/log/nginx/access.log"
        flags(no-parse)  # Don't try to parse as syslog format
        follow-freq(1)   # Check for new data every second
    );
};

# Accept logs in GELF format over TCP (from Graylog-compatible senders)
source s_gelf {
    network(
        transport("tcp")
        port(12201)
    );
};
```

## Configuring Filters

Filters select which log messages to process:

```text
# Match messages by severity (level)
filter f_error    { level(err .. emerg); };
filter f_warning  { level(warning); };
filter f_notice   { level(notice); };
filter f_info     { level(info); };
filter f_debug    { level(debug); };

# Match by facility
filter f_kern     { facility(kern); };
filter f_auth     { facility(auth, authpriv); };
filter f_daemon   { facility(daemon); };
filter f_syslog   { facility(syslog); };
filter f_cron     { facility(cron); };
filter f_mail     { facility(mail); };

# Match by program name
filter f_nginx    { program("nginx"); };
filter f_sshd     { program("sshd"); };
filter f_sudo     { program("sudo"); };

# Pattern match on message content
filter f_ssh_fail {
    message("Failed password") or
    message("Invalid user");
};

# Match messages from specific hosts
filter f_webservers {
    host("web1.example.com") or
    host("web2.example.com") or
    netmask("10.0.1.0/24");  # Match entire subnet
};

# Combine multiple filters with AND/OR logic
filter f_critical_auth {
    facility(auth) and level(err .. emerg);
};

# Negate a filter
filter f_not_debug {
    not level(debug);
};
```

## Configuring Destinations

Destinations define where syslog-ng sends log messages:

```text
# Write to a file
destination d_all {
    file("/var/log/syslog-ng/all.log"
        perm(0640)
        create-dirs(yes)
    );
};

# Write with custom template formatting
destination d_messages {
    file(
        "/var/log/syslog-ng/messages.log"
        template("${ISODATE} ${HOST} ${PROGRAM}[${PID}]: ${MESSAGE}\n")
        perm(0640)
    );
};

# Write to date-based rotating files
destination d_daily {
    file(
        "/var/log/syslog-ng/${YEAR}/${MONTH}/${DAY}/messages.log"
        create-dirs(yes)
        perm(0640)
    );
};

# Forward to a remote syslog server over UDP
destination d_remote_udp {
    network(
        "logserver.example.com"
        transport("udp")
        port(514)
    );
};

# Forward to a remote syslog server over TCP (with TLS)
destination d_remote_tls {
    network(
        "logserver.example.com"
        transport("tls")
        port(6514)
        tls(
            ca-file("/etc/ssl/certs/ca.pem")
            cert-file("/etc/syslog-ng/tls/client.crt")
            key-file("/etc/syslog-ng/tls/client.key")
        )
    );
};

# Write to syslog pipe (for rsyslog integration)
destination d_syslog_pipe {
    pipe("/dev/log");
};
```

## Creating Log Statements

Log statements tie sources, filters, and destinations together:

```text
# Basic: all local logs to a file
log {
    source(s_local);
    destination(d_messages);
};

# Filtered: only errors from auth to security log
log {
    source(s_local);
    filter(f_auth);
    filter(f_error);
    destination(d_security);
    # flags(final) would stop processing here and not pass to other log statements
};

# Fan-out: send the same logs to multiple destinations
log {
    source(s_tcp_syslog);
    destination(d_all);
    destination(d_daily);
    destination(d_remote_udp);
    # Without flags(final), matching is non-exclusive
};

# Conditional routing: web server logs go to a specific file
log {
    source(s_tcp_syslog);
    filter(f_webservers);
    destination(d_webserver_logs);
    flags(final);  # Stop here if from a web server
};

# Default route for everything else
log {
    source(s_tcp_syslog);
    destination(d_all_other);
};
```

## A Complete Configuration Example

Here's a production-oriented configuration for a central log server:

```bash
sudo tee /etc/syslog-ng/conf.d/central-logging.conf << 'EOF'
@version: 3.38

options {
    chain_hostnames(off);
    flush_lines(0);
    use_dns(yes);
    dns-cache(yes);
    time-reopen(10);
    log-msg-size(65536);
};

# --- Sources ---
source s_local { system(); internal(); };

source s_remote_udp {
    network(
        transport("udp")
        port(514)
        max-connections(300)
    );
};

source s_remote_tcp {
    network(
        transport("tcp")
        port(514)
        max-connections(300)
    );
};

# --- Filters ---
filter f_auth     { facility(auth, authpriv); };
filter f_kern     { facility(kern); };
filter f_error    { level(err .. emerg); };
filter f_warning  { level(warning .. emerg); };
filter f_notice   { level(notice .. emerg); };
filter f_ssh_fail { message("Failed password") or message("Invalid user"); };
filter f_sudo     { program("sudo"); };

# --- Destinations ---
# One file per host
destination d_per_host {
    file(
        "/var/log/hosts/${HOST}/messages.log"
        create-dirs(yes)
        perm(0640)
        dir-perm(0750)
    );
};

# All errors to one place
destination d_all_errors {
    file("/var/log/syslog-ng/all-errors.log"
        template("${ISODATE} ${HOST} ${PROGRAM}[${PID}]: ${MESSAGE}\n")
    );
};

# Security events
destination d_security {
    file("/var/log/syslog-ng/security.log"
        template("${ISODATE} ${HOST} ${PROGRAM}[${PID}]: ${MESSAGE}\n")
    );
};

# --- Log statements ---
# Store per-host logs
log {
    source(s_remote_udp);
    source(s_remote_tcp);
    destination(d_per_host);
};

# Capture all errors
log {
    source(s_local);
    source(s_remote_udp);
    source(s_remote_tcp);
    filter(f_error);
    destination(d_all_errors);
};

# Security log
log {
    source(s_local);
    source(s_remote_udp);
    source(s_remote_tcp);
    filter(f_auth);
    destination(d_security);
};

# SSH failures to security log
log {
    source(s_local);
    source(s_remote_udp);
    source(s_remote_tcp);
    filter(f_ssh_fail);
    destination(d_security);
};
EOF
```

## Testing the Configuration

```bash
# Validate the configuration file
sudo syslog-ng --syntax-only -f /etc/syslog-ng/syslog-ng.conf

# If there are include files
sudo syslog-ng --syntax-only

# Reload after changes (graceful - no messages lost)
sudo systemctl reload syslog-ng

# Or restart
sudo systemctl restart syslog-ng

# Send a test message
logger -p auth.warning "Test authentication warning message"

# Check if it appeared in the expected destination
tail /var/log/syslog-ng/security.log

# Debug mode - shows what syslog-ng is doing
sudo syslog-ng -d -f /etc/syslog-ng/syslog-ng.conf --foreground
```

## Forwarding Clients

On Ubuntu servers that should forward to your central syslog-ng:

```bash
# Simple rsyslog forwarding to syslog-ng central server
echo "*.* @logserver.example.com:514" | sudo tee /etc/rsyslog.d/10-forward.conf
sudo systemctl restart rsyslog

# Or configure syslog-ng on the client
sudo tee /etc/syslog-ng/conf.d/forward.conf << 'EOF'
destination d_central {
    network(
        "logserver.example.com"
        transport("tcp")
        port(514)
    );
};

log {
    source(s_local);
    destination(d_central);
};
EOF
sudo systemctl reload syslog-ng
```

syslog-ng's configuration model, while more verbose than rsyslog's, makes complex routing logic explicit and maintainable. When you need to build a log routing infrastructure that does more than basic file writing and remote forwarding, syslog-ng gives you the primitives to do it correctly.
