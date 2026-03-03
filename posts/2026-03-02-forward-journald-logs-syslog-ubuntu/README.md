# How to Forward journald Logs to syslog on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Logging, journald, Syslog, System Administration

Description: Forward journald logs to syslog on Ubuntu to integrate with centralized log management systems like rsyslog, syslog-ng, or remote log aggregators.

---

Modern Ubuntu systems use systemd-journald as the primary log collector, but many environments still rely on syslog-based infrastructure for log aggregation, monitoring, and compliance. Whether you are shipping logs to a SIEM, a remote syslog server, or a tool like Graylog or Splunk through a syslog input, you need journald and syslog to work together.

## The Relationship Between journald and syslog

journald is the first stop for log messages on systemd-based systems. It collects from all sources: the kernel, systemd units, applications using the journal API, and applications writing to `/dev/log` (the traditional syslog socket). By default on Ubuntu, rsyslog is also installed and reads from the journal socket at `/run/systemd/journal/syslog`.

The forwarding can happen in two directions:
- journald forwards to syslog (journald is primary, syslog receives a copy)
- rsyslog reads directly from the journal socket (both run in parallel)

On Ubuntu, the second approach is the default. rsyslog uses the `imjournal` or `imuxsock` module to read from journald's socket. The explicit `ForwardToSyslog` setting in journald.conf controls whether journald also writes to the syslog socket.

## Check Current Setup

```bash
# Check if rsyslog is running
systemctl status rsyslog

# Check what syslog daemon is installed
dpkg -l | grep -E 'rsyslog|syslog-ng'

# Verify journald forwarding status
grep -i forward /etc/systemd/journald.conf 2>/dev/null || echo "Using defaults"

# Check if the syslog socket exists
ls -la /run/systemd/journal/syslog 2>/dev/null || echo "Socket not present"
```

## Enable journald to Forward to syslog

Open the journald configuration file:

```bash
sudo nano /etc/systemd/journald.conf
```

Enable syslog forwarding:

```ini
[Journal]
# Forward a copy of all log messages to the syslog socket
ForwardToSyslog=yes

# Also forward to the kernel log buffer (useful for dmesg)
ForwardToKMsg=no

# Forward to the wall broadcast (shows messages to logged-in users)
ForwardToWall=yes

# Forward to the console (useful on servers without a GUI)
ForwardToConsole=no
```

Apply the change:

```bash
sudo systemctl restart systemd-journald
```

## Configure rsyslog to Receive from journald

With `ForwardToSyslog=yes`, journald writes to `/run/systemd/journal/syslog`. rsyslog needs to listen on this socket.

```bash
sudo nano /etc/rsyslog.conf
```

Ensure the following module is loaded near the top of the file:

```text
# Load the Unix socket input module
module(load="imuxsock"
       SysSock.Use="off")  # Disable the default /dev/log socket

# Load the journal module for direct journal reading
module(load="imjournal"
       StateFile="imjournal.state"
       IgnorePreviousMessages="off"
       Ratelimit.Burst="20000"
       Ratelimit.Interval="600"
       UsePid="system")
```

The `imjournal` module reads directly from the journal API, which is more reliable than the syslog socket forwarding method. It handles structured data and supports reading journal metadata fields.

Restart rsyslog after making changes:

```bash
sudo systemctl restart rsyslog
```

## Forward to a Remote Syslog Server

The most common use case is shipping logs to a central log server. rsyslog handles this with the `omfwd` output module.

```bash
sudo nano /etc/rsyslog.d/50-remote-forwarding.conf
```

```text
# Forward all logs to a remote syslog server using UDP
*.* @192.168.1.100:514

# For TCP forwarding (more reliable, use @@ for TCP)
*.* @@192.168.1.100:514

# Forward with TLS to a remote server (requires gtls driver)
*.* action(type="omfwd"
           target="logs.example.com"
           port="6514"
           protocol="tcp"
           StreamDriver="gtls"
           StreamDriverMode="1"
           StreamDriverAuthMode="anon")
```

Use `@@` (double at sign) for TCP, which is more reliable than UDP since it handles delivery failures and retransmission.

```bash
sudo systemctl restart rsyslog

# Verify rsyslog is not reporting errors
sudo journalctl -u rsyslog -f
```

## Test the Forwarding Chain

Generate a test log message and verify it flows through the chain:

```bash
# Generate a test message using logger
logger -t test-forwarding "This is a test message from $(hostname)"

# Check journald received it
sudo journalctl -t test-forwarding -n 5

# Check syslog received it
grep "test-forwarding" /var/log/syslog | tail -5

# If forwarding to a remote server, check there as well
```

## Use syslog-ng Instead of rsyslog

If your environment uses syslog-ng, the configuration is different but the principle is the same. syslog-ng reads from the journald socket:

```bash
# Install syslog-ng with the journald module
sudo apt install syslog-ng syslog-ng-mod-journal

sudo nano /etc/syslog-ng/syslog-ng.conf
```

```text
# Source from systemd journal
source s_journal {
    systemd-journal(prefix(".SDATA.journald."));
};

# Destination: remote TCP syslog server
destination d_remote {
    network("192.168.1.100"
            port(514)
            transport("tcp"));
};

# Log rule connecting source to destination
log {
    source(s_journal);
    destination(d_remote);
};
```

```bash
sudo systemctl restart syslog-ng
```

## Filter Logs Before Forwarding

Forwarding every log message to a remote server can generate significant network traffic. Filter by severity or source:

```bash
sudo nano /etc/rsyslog.d/51-filtered-forwarding.conf
```

```text
# Forward only warnings and above to the remote server
*.warn @@192.168.1.100:514

# Forward specific facilities
auth,authpriv.* @@192.168.1.100:514

# Exclude noisy sources
:programname, isequal, "systemd-resolved" stop

# Forward everything except debug
*.!debug @@192.168.1.100:514
```

## Handle Queue Failures Gracefully

When the remote server is unreachable, rsyslog needs to queue messages locally rather than dropping them:

```bash
sudo nano /etc/rsyslog.d/50-remote-forwarding.conf
```

```text
# Configure a disk-assisted queue for reliable forwarding
action(type="omfwd"
       target="192.168.1.100"
       port="514"
       protocol="tcp"
       queue.type="linkedList"
       queue.size="10000"
       queue.filename="remote_queue"
       queue.saveOnShutdown="on"
       action.resumeRetryCount="-1"
       action.resumeInterval="30")
```

With `queue.saveOnShutdown="on"`, rsyslog writes undelivered messages to disk when the service stops, and re-reads them on startup. `action.resumeRetryCount="-1"` means retry indefinitely.

## Troubleshoot Forwarding Issues

```bash
# Check rsyslog for errors
sudo journalctl -u rsyslog --since "1 hour ago"

# Test rsyslog configuration syntax
sudo rsyslogd -N1

# Check if the syslog socket is writable
ls -la /run/systemd/journal/syslog

# Verify journald is actually forwarding
sudo systemctl show systemd-journald | grep Forward

# Test remote connectivity
nc -zv 192.168.1.100 514
```

Setting up journald-to-syslog forwarding takes about 15 minutes and opens up your existing syslog infrastructure to receive all systemd-generated log data. Once in place, centralized log aggregation, alerting, and compliance reporting all work against a single stream of events from every journald source on your servers.
