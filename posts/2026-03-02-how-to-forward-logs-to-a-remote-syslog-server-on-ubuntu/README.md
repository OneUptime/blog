# How to Forward Logs to a Remote Syslog Server on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Logging, Rsyslog, Syslog, System Administration

Description: Configure Ubuntu to forward system logs to a remote syslog server using rsyslog, enabling centralized log management and security monitoring across multiple servers.

---

Centralizing logs from multiple servers to a single log server is one of the fundamentals of production infrastructure management. When something goes wrong, you want to search logs from one place rather than SSH-ing into individual servers. This guide covers configuring rsyslog on Ubuntu to forward logs to a remote syslog server.

## Architecture Overview

There are two roles in a centralized logging setup:

- **Log client** - sends logs to the central server (your Ubuntu servers)
- **Log server** - receives and stores logs from clients (can also be Ubuntu)

This guide covers both roles. rsyslog on Ubuntu supports multiple protocols for forwarding:
- **UDP** - fast, low overhead, but logs can be lost if the server is unavailable
- **TCP** - reliable delivery, connection-oriented, preferred for production
- **TCP with TLS** - encrypted transmission, required for sensitive environments

## Setting Up the Remote Syslog Server

First, configure the machine that will receive logs:

```bash
# Install rsyslog on the receiving server (usually already installed)
sudo apt install rsyslog

# Check rsyslog version
rsyslogd -v
```

Create a configuration file to enable remote log reception:

```bash
# Create server configuration
sudo nano /etc/rsyslog.d/10-remote-logs.conf
```

```bash
# /etc/rsyslog.d/10-remote-logs.conf
# Enable receiving logs on UDP port 514
module(load="imudp")
input(type="imudp" port="514")

# Enable receiving logs on TCP port 514
module(load="imtcp")
input(type="imtcp" port="514")

# Store received logs in separate files organized by hostname
$template RemoteLogs,"/var/log/remote/%HOSTNAME%/%PROGRAMNAME%.log"

# Apply template to all messages from remote hosts
# Use :fromhost-ip, !=, "127.0.0.1" to exclude local logs
if $fromhost-ip != "127.0.0.1" then ?RemoteLogs
& stop
```

Create the log directory and set permissions:

```bash
# Create directory for remote logs
sudo mkdir -p /var/log/remote
sudo chown syslog:adm /var/log/remote

# Restart rsyslog
sudo systemctl restart rsyslog
sudo systemctl status rsyslog
```

Open the firewall on the log server:

```bash
# Allow syslog traffic
sudo ufw allow 514/tcp
sudo ufw allow 514/udp

# Or use iptables
sudo iptables -A INPUT -p tcp --dport 514 -j ACCEPT
sudo iptables -A INPUT -p udp --dport 514 -j ACCEPT
```

## Configuring the Log Client (Your Ubuntu Servers)

On each Ubuntu server that should forward logs:

```bash
# rsyslog is installed by default
sudo apt install rsyslog
```

Create a forwarding configuration:

```bash
sudo nano /etc/rsyslog.d/50-forward-logs.conf
```

### Forwarding via UDP

```bash
# /etc/rsyslog.d/50-forward-logs.conf
# Forward all logs to remote server via UDP
# @ = UDP, @@ = TCP
*.* @192.168.1.100:514
```

### Forwarding via TCP (Recommended)

```bash
# /etc/rsyslog.d/50-forward-logs.conf
# Forward all logs via TCP (more reliable than UDP)
# @@ prefix = TCP
*.* @@192.168.1.100:514

# Forward only specific facilities
# auth,authpriv.* @@192.168.1.100:514
# kern.* @@192.168.1.100:514
```

### Using the Modern omfwd Module Syntax

For more control, use the module-based syntax:

```bash
# /etc/rsyslog.d/50-forward-logs.conf

# Forward all messages to remote syslog server
action(
    type="omfwd"
    target="192.168.1.100"
    port="514"
    protocol="tcp"
    # Queue settings for reliability
    queue.type="LinkedList"
    queue.filename="fwdRule1"
    queue.maxDiskSpace="1g"
    queue.saveOnShutdown="on"
    action.resumeRetryCount="-1"
)
```

```bash
# Restart rsyslog after configuration changes
sudo systemctl restart rsyslog
sudo systemctl status rsyslog
```

## Selective Log Forwarding

Often you don't want to forward everything. Use filters to control what gets forwarded:

```bash
# /etc/rsyslog.d/50-forward-logs.conf

# Forward only authentication logs
auth,authpriv.* @@log-server.example.com:514

# Forward errors and above
*.err @@log-server.example.com:514

# Forward everything except debug
*.!debug @@log-server.example.com:514

# Forward specific programs
if $programname == 'nginx' or $programname == 'apache2' then @@log-server.example.com:514

# Forward by severity level
if $syslogseverity <= 4 then @@log-server.example.com:514  # Warning and above
```

## Handling Connectivity Loss with Disk Queuing

If the log server is unavailable, logs should be queued locally:

```bash
# /etc/rsyslog.d/50-forward-logs.conf

# Enable disk-assisted queuing for reliability
action(
    type="omfwd"
    target="192.168.1.100"
    port="514"
    protocol="tcp"
    # Queue configuration
    queue.type="LinkedList"
    queue.filename="remote_fwd"         # Filename prefix for queue files
    queue.maxDiskSpace="500m"           # Max 500MB of queued logs
    queue.saveOnShutdown="on"           # Persist queue across rsyslog restarts
    queue.size="10000"                   # Max messages in memory queue
    queue.discardMark="9500"            # Start discarding when queue is 95% full
    queue.discardSeverity="8"           # Discard debug messages first when full
    # Retry behavior
    action.resumeRetryCount="-1"        # Retry indefinitely
    action.resumeInterval="30"          # Retry every 30 seconds
)
```

Queue files will be stored in rsyslog's working directory (`/var/spool/rsyslog/` or as configured):

```bash
# Set the working directory (where queue files go)
sudo nano /etc/rsyslog.conf
# Add or verify: $WorkDirectory /var/spool/rsyslog

sudo mkdir -p /var/spool/rsyslog
sudo chown syslog:syslog /var/spool/rsyslog
```

## Encrypting Log Transmission with TLS

For sensitive environments, encrypt log forwarding with TLS:

### On the Log Server

```bash
# Install TLS support
sudo apt install rsyslog-gnutls

# Generate or obtain certificates
# For testing, create self-signed certs:
sudo mkdir -p /etc/rsyslog-certs
cd /etc/rsyslog-certs

# Generate CA key and certificate
sudo openssl req -x509 -newkey rsa:4096 -keyout ca-key.pem -out ca-cert.pem \
    -days 3650 -nodes -subj "/CN=Syslog CA"

# Generate server key and CSR
sudo openssl req -newkey rsa:4096 -keyout server-key.pem -out server-csr.pem \
    -nodes -subj "/CN=log-server.example.com"

# Sign with CA
sudo openssl x509 -req -in server-csr.pem -CA ca-cert.pem -CAkey ca-key.pem \
    -CAcreateserial -out server-cert.pem -days 3650

sudo chmod 640 *.pem
sudo chown root:syslog *.pem
```

Server TLS configuration:

```bash
sudo nano /etc/rsyslog.d/10-tls-server.conf
```

```bash
# TLS-encrypted syslog reception
module(load="imtcp"
    StreamDriver.Name="gtls"
    StreamDriver.Mode="1"
    StreamDriver.Authmode="anon"
)

global(
    DefaultNetstreamDriver="gtls"
    DefaultNetstreamDriverCAFile="/etc/rsyslog-certs/ca-cert.pem"
    DefaultNetstreamDriverCertFile="/etc/rsyslog-certs/server-cert.pem"
    DefaultNetstreamDriverKeyFile="/etc/rsyslog-certs/server-key.pem"
)

input(type="imtcp" port="6514")
```

### On the Log Client

```bash
# Install TLS support
sudo apt install rsyslog-gnutls

# Copy CA certificate from server
# (In production, use your PKI's CA certificate)
sudo scp logserver:/etc/rsyslog-certs/ca-cert.pem /etc/rsyslog-certs/
```

Client TLS forwarding:

```bash
sudo nano /etc/rsyslog.d/50-tls-forward.conf
```

```bash
# TLS-encrypted forwarding
global(
    DefaultNetstreamDriver="gtls"
    DefaultNetstreamDriverCAFile="/etc/rsyslog-certs/ca-cert.pem"
)

action(
    type="omfwd"
    target="192.168.1.100"
    port="6514"
    protocol="tcp"
    StreamDriver="gtls"
    StreamDriverMode="1"
    StreamDriverAuthMode="anon"
    queue.type="LinkedList"
    queue.saveOnShutdown="on"
)
```

## Testing the Configuration

```bash
# Test rsyslog configuration syntax
rsyslogd -N1 -f /etc/rsyslog.conf 2>&1

# Send a test message and verify it reaches the server
logger -t test "This is a test message from $(hostname)"

# On the log server, check if the message arrived
tail -f /var/log/remote/your-client-hostname/test.log

# Or search all remote logs
grep "test message" /var/log/remote/*/test.log
```

## Monitoring Log Delivery

```bash
# Check rsyslog statistics
# Enable statistics module
sudo nano /etc/rsyslog.d/99-stats.conf
```

```bash
# Log rsyslog statistics every 5 minutes
module(load="impstats"
    interval="300"
    severity="7"
    log.syslog="on"
    format="cee"
)
```

```bash
# Monitor rsyslog process
systemctl status rsyslog

# Check rsyslog logs
journalctl -u rsyslog -f

# Check for forwarding errors
journalctl -u rsyslog | grep -i "error\|failed\|refused"
```

## Logrotate for Remote Logs

Configure rotation for the accumulated remote logs on the server:

```bash
sudo nano /etc/logrotate.d/remote-syslog
```

```bash
/var/log/remote/*/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    sharedscripts
    postrotate
        /usr/lib/rsyslog/rsyslog-rotate
    endscript
}
```

With centralized logging properly configured, your entire infrastructure's logs flow to one searchable location, making incident response and compliance auditing significantly more manageable.
