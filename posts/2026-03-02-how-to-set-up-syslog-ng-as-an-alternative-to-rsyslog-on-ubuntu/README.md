# How to Set Up Syslog-NG as an Alternative to rsyslog on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Logging, Syslog-ng, System Administration, Syslog

Description: Install and configure syslog-ng on Ubuntu as a powerful alternative to rsyslog, with flexible log routing, filtering, parsing, and remote forwarding capabilities.

---

While rsyslog is Ubuntu's default logging daemon, syslog-ng offers a different approach with a more expressive configuration language and some architectural advantages. syslog-ng uses a source-filter-destination pipeline model that makes complex log routing easier to reason about. If you find rsyslog's configuration syntax difficult to manage or need advanced parsing capabilities, syslog-ng is worth considering.

## syslog-ng vs rsyslog

Before switching, understand the trade-offs:

| Feature | rsyslog | syslog-ng |
|---------|---------|----------|
| Default on Ubuntu | Yes | No |
| Configuration style | Multiple syntaxes | Pipeline-based, consistent |
| Performance | Excellent | Very good |
| Pattern matching | Good | Excellent (PatternDB) |
| JSON output | Supported | Native support |
| Community | Large | Large |
| Premium features | No (open source) | Open source + enterprise version |

syslog-ng's pipeline model (source -> filter -> destination) is generally easier to understand for complex routing scenarios.

## Installing syslog-ng

Ubuntu includes syslog-ng in its standard repositories:

```bash
# Stop and disable rsyslog first
sudo systemctl stop rsyslog
sudo systemctl disable rsyslog

# Install syslog-ng
sudo apt update
sudo apt install syslog-ng syslog-ng-core

# Verify installation
syslog-ng --version

# Start and enable syslog-ng
sudo systemctl enable syslog-ng
sudo systemctl start syslog-ng
sudo systemctl status syslog-ng
```

Note: You can run syslog-ng alongside rsyslog if you configure them to listen on different sockets, but typically you'd replace one with the other.

## Understanding the Configuration Structure

syslog-ng's configuration in `/etc/syslog-ng/syslog-ng.conf` uses four main block types:

- **source** - where logs come from (sockets, files, network)
- **filter** - conditions to match log messages
- **destination** - where logs go (files, network, databases)
- **log** - connects sources to destinations, optionally via filters

```bash
# View the default configuration
cat /etc/syslog-ng/syslog-ng.conf

# Include drop-in directory
ls /etc/syslog-ng/conf.d/
```

## Basic Configuration

The default configuration handles local syslog. Here's the structure:

```bash
sudo nano /etc/syslog-ng/syslog-ng.conf
```

```bash
# /etc/syslog-ng/syslog-ng.conf

@version: 4.0
@include "scl.conf"   # Syslog-ng configuration library

# Global options
options {
    # How long to wait before creating a new log file
    time_reopen(10);

    # Log source statistics interval
    stats_freq(0);

    # Use DNS for resolving addresses
    use_dns(no);

    # Default log level
    log_msg_size(65536);

    # Flush log messages to disk immediately
    flush_lines(0);
};

# ===== SOURCES =====

# Collect from the kernel
source s_kernel {
    unix-dgram("/dev/kmsg");
};

# Collect from systemd journal
source s_systemd {
    systemd-journal(prefix(".journald."));
};

# Collect from local syslog socket (for non-systemd apps)
source s_local {
    system();
    internal();
};

# ===== DESTINATIONS =====

# Write to syslog file
destination d_syslog {
    file("/var/log/syslog");
};

# Write to auth log
destination d_auth {
    file("/var/log/auth.log");
};

# Write to kernel log
destination d_kern {
    file("/var/log/kern.log");
};

# ===== FILTERS =====

# Authentication messages
filter f_auth {
    facility(auth, authpriv);
};

# Kernel messages
filter f_kern {
    facility(kern);
};

# Not debug
filter f_not_debug {
    not level(debug);
};

# ===== LOG PATHS =====

# Authentication logs
log {
    source(s_local);
    filter(f_auth);
    destination(d_auth);
};

# Kernel logs
log {
    source(s_kernel);
    filter(f_kern);
    destination(d_kern);
};

# Everything else to syslog
log {
    source(s_local);
    source(s_systemd);
    destination(d_syslog);
};
```

## Collecting from systemd Journal

For Ubuntu systems where most logs go through systemd-journald:

```bash
sudo nano /etc/syslog-ng/conf.d/journald.conf
```

```bash
# Collect from systemd journal
source s_journald {
    systemd-journal(prefix(".journald."));
};

# Write journal messages to file
destination d_journal_messages {
    file("/var/log/journal-messages.log"
         template("${.journald.SYSLOG_TIMESTAMP} ${.journald._HOSTNAME} ${.journald.SYSLOG_IDENTIFIER}: ${.journald.MESSAGE}\n")
    );
};

log {
    source(s_journald);
    destination(d_journal_messages);
};
```

## Remote Log Forwarding

Configure syslog-ng to forward logs to a remote server:

```bash
sudo nano /etc/syslog-ng/conf.d/remote-forward.conf
```

```bash
# Forward to remote syslog server via TCP
destination d_remote_tcp {
    syslog("192.168.1.100"
        port(514)
        transport("tcp")
    );
};

# With disk queue for reliability
destination d_remote_reliable {
    syslog("192.168.1.100"
        port(514)
        transport("tcp")
        disk-buffer(
            mem-buf-length(10000)
            disk-buf-size(1073741824)  # 1GB disk queue
            reliable(yes)
            dir("/var/spool/syslog-ng-queue")
        )
    );
};

# Forward all local logs
log {
    source(s_local);
    destination(d_remote_reliable);
};
```

## Setting Up syslog-ng as a Log Server

To receive logs from other machines:

```bash
sudo nano /etc/syslog-ng/conf.d/server-receive.conf
```

```bash
# Receive logs via TCP on port 514
source s_remote_tcp {
    syslog(
        ip("0.0.0.0")
        port(514)
        transport("tcp")
        max-connections(300)
    );
};

# Receive logs via UDP on port 514
source s_remote_udp {
    syslog(
        ip("0.0.0.0")
        port(514)
        transport("udp")
    );
};

# Store received logs organized by hostname
destination d_remote_files {
    file(
        "/var/log/remote/${HOST}/${PROGRAM}.log"
        create-dirs(yes)
        owner("syslog")
        group("adm")
        perm(0640)
        dir-perm(0750)
    );
};

# Log path for received messages
log {
    source(s_remote_tcp);
    source(s_remote_udp);
    destination(d_remote_files);
};
```

## Advanced Filtering with Pattern Matching

syslog-ng's filtering is more expressive than rsyslog's:

```bash
sudo nano /etc/syslog-ng/conf.d/filters.conf
```

```bash
# Filter by message content using regex
filter f_ssh_failures {
    program("sshd") and message("Failed password");
};

# Filter by facility and severity
filter f_errors {
    level(err..emerg);
};

# Filter using AND/OR/NOT logic
filter f_critical_non_kernel {
    level(crit..emerg) and not facility(kern);
};

# Match multiple programs
filter f_web_servers {
    program("nginx") or program("apache2") or program("lighttpd");
};

# Numeric host matching
filter f_app_servers {
    netmask("10.0.1.0/24");
};

# Destination for SSH failures
destination d_ssh_failures {
    file("/var/log/ssh-failures.log");
};

# Log SSH failures to separate file
log {
    source(s_local);
    filter(f_ssh_failures);
    destination(d_ssh_failures);
    flags(final);    # Stop processing after this log path matches
};
```

## Parsing Structured Logs

syslog-ng can parse and restructure log messages:

```bash
sudo nano /etc/syslog-ng/conf.d/parsing.conf
```

```bash
# Parse JSON logs (e.g., from modern applications)
parser p_json {
    json-parser(prefix(".json."));
};

# Destination that uses parsed JSON fields
destination d_parsed_logs {
    file(
        "/var/log/parsed/${.json.service}.log"
        template("$(format-json --scope everything)\n")
        create-dirs(yes)
    );
};

# Parse nginx access logs
parser p_nginx_access {
    csv-parser(
        columns("NGINX_REMOTE_ADDR", "NGINX_REMOTE_USER",
                "NGINX_TIME_LOCAL", "NGINX_REQUEST",
                "NGINX_STATUS", "NGINX_BYTES_SENT",
                "NGINX_HTTP_REFERER", "NGINX_HTTP_USER_AGENT")
        delimiters(" ")
        quote-pairs('""[]')
    );
};

# Apply JSON parsing to logs from applications that produce JSON
filter f_json_logs {
    message("^\{");  # Messages that start with {
};

log {
    source(s_local);
    filter(f_json_logs);
    parser(p_json);
    destination(d_parsed_logs);
    flags(final);
};
```

## TLS-Encrypted Log Forwarding

```bash
sudo nano /etc/syslog-ng/conf.d/tls-forward.conf
```

```bash
# TLS-encrypted forwarding
destination d_tls_remote {
    syslog("log-server.example.com"
        port(6514)
        transport("tls")
        tls(
            ca-file("/etc/syslog-ng/certs/ca-cert.pem")
            key-file("/etc/syslog-ng/certs/client-key.pem")
            cert-file("/etc/syslog-ng/certs/client-cert.pem")
        )
    );
};

log {
    source(s_local);
    destination(d_tls_remote);
};
```

## Testing Configuration

```bash
# Validate configuration syntax without restarting
sudo syslog-ng --syntax-only

# Test with verbose output
sudo syslog-ng -Fv 2>&1 | head -50

# Restart syslog-ng after configuration changes
sudo systemctl restart syslog-ng

# Send a test message
logger -t test-app "Test message from syslog-ng"

# Verify it was captured
tail -f /var/log/syslog
```

## Reintegrating with systemd

If you switch to syslog-ng and want systemd to remain aware:

```bash
# Ensure syslog-ng takes over the /dev/log socket
# Check what's providing /dev/log
ls -la /dev/log

# syslog-ng with system() source handles this automatically
# The system() source includes:
# - /dev/log (local syslog socket)
# - /proc/kmsg (kernel messages)
# - Internal syslog-ng messages

sudo systemctl restart syslog-ng

# Verify
ls -la /dev/log
journalctl -u syslog-ng | tail -20
```

syslog-ng's pipeline model makes complex log routing scenarios significantly more readable than the equivalent rsyslog configuration. Once you understand the source-filter-destination pattern, you can build sophisticated logging architectures that are easy to maintain and extend.
