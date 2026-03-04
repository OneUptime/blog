# How to Configure rsyslog for Centralized Log Management on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, rsyslog, Logging, Centralized Logs, Syslog, System Administration

Description: Set up rsyslog on RHEL to collect logs from multiple servers into a central log server, making it easier to search, monitor, and audit system events across your infrastructure.

---

When you manage multiple RHEL servers, checking logs on each one individually is impractical. A centralized log server collects logs from all machines in one place. rsyslog, which is installed by default on RHEL, handles this well.

## Configure the Central Log Server

On the server that will receive logs:

```bash
# Edit the rsyslog configuration
sudo vi /etc/rsyslog.conf

# Uncomment these lines to enable UDP and TCP reception:
# For UDP (port 514)
module(load="imudp")
input(type="imudp" port="514")

# For TCP (port 514)
module(load="imtcp")
input(type="imtcp" port="514")
```

Create a template to organize logs by hostname:

```bash
# Create /etc/rsyslog.d/remote.conf
sudo tee /etc/rsyslog.d/remote.conf << 'EOF'
# Template to sort logs into per-host directories
template(name="RemoteLogs" type="string"
    string="/var/log/remote/%HOSTNAME%/%PROGRAMNAME%.log")

# Store all remote logs using the template
if $fromhost-ip != "127.0.0.1" then {
    action(type="omfile" dynaFile="RemoteLogs")
    stop
}
EOF

# Create the log directory
sudo mkdir -p /var/log/remote

# Restart rsyslog
sudo systemctl restart rsyslog
```

## Open Firewall Ports

```bash
# Allow syslog traffic on the log server
sudo firewall-cmd --permanent --add-port=514/tcp
sudo firewall-cmd --permanent --add-port=514/udp
sudo firewall-cmd --reload
```

## Configure Client Servers

On each server that should forward logs:

```bash
# Create /etc/rsyslog.d/forward.conf
sudo tee /etc/rsyslog.d/forward.conf << 'EOF'
# Forward all logs to the central server via TCP
# Use @@ for TCP, @ for UDP
*.* @@logserver.example.com:514
EOF

# Restart rsyslog on the client
sudo systemctl restart rsyslog
```

## Enable Disk-Assisted Queue for Reliability

If the central server is unreachable, logs can be queued to disk:

```bash
# On the client, update /etc/rsyslog.d/forward.conf
sudo tee /etc/rsyslog.d/forward.conf << 'EOF'
# Forward with disk-assisted queue
action(
    type="omfwd"
    target="logserver.example.com"
    port="514"
    protocol="tcp"
    queue.type="LinkedList"
    queue.filename="fwdRule1"
    queue.maxdiskspace="1g"
    queue.saveonshutdown="on"
    action.resumeRetryCount="-1"
)
EOF

sudo systemctl restart rsyslog
```

## Verify Log Collection

```bash
# On a client, generate a test log
logger "Test message from $(hostname)"

# On the log server, check for the message
ls /var/log/remote/
cat /var/log/remote/clienthostname/*.log | tail -5
```

This setup gives you a single place to search logs, set up alerts, and maintain audit trails across your entire RHEL infrastructure.
