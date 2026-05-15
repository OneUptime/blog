# How to Set Up Remote Logging with rsyslog and TLS Encryption on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Rsyslog, TLS, Logging, Linux

Description: Set up remote logging with rsyslog and TLS encryption on RHEL 9 for secure log transmission.

---

## Overview

Set up remote logging with rsyslog and TLS encryption on RHEL 9 for secure log transmission. This guide covers the essential steps and configuration needed for a production RHEL 9 environment.

## Prerequisites

- A RHEL 9 system with a valid subscription or configured repositories
- Root or sudo access
- Basic familiarity with the command line

## Step 1 - Verify the Required Packages

Ensure the relevant packages are installed:

```bash
sudo dnf install -y rsyslog rsyslog-openssl gnutls-utils
```

rsyslog and systemd-journald ship by default on RHEL 9. The `rsyslog-openssl` package provides the OpenSSL network stream driver used for TLS-encrypted forwarding, and `gnutls-utils` provides certificate tools such as `certtool`.

## Step 2 - Understand the Logging Architecture

RHEL 9 uses two logging systems:

- **systemd-journald** - captures structured binary logs from all services, the kernel, and early boot
- **rsyslog** - processes, filters, and forwards text-based syslog messages

The two work together: journald collects everything, and rsyslog can read from the journal or receive messages directly via the syslog socket.

## Step 3 - Apply the Configuration

To set up remote logging with rsyslog and TLS encryption, you need to edit the appropriate configuration files. The main files are:

- `/etc/rsyslog.conf` and `/etc/rsyslog.d/*.conf` for rsyslog
- `/etc/systemd/journald.conf` for journald

On the logging server, place the CA certificate, server certificate, and server private key in a protected location such as `/etc/pki/ca-trust/source/anchors/`, run `sudo update-ca-trust`, and create a server configuration such as `/etc/rsyslog.d/securelogser.conf`:

```conf
global(
  DefaultNetstreamDriverCAFile="/etc/pki/ca-trust/source/anchors/ca-cert.pem"
  DefaultNetstreamDriverCertFile="/etc/pki/ca-trust/source/anchors/server-cert.pem"
  DefaultNetstreamDriverKeyFile="/etc/pki/ca-trust/source/anchors/server-key.pem"
)

module(
  load="imtcp"
  PermittedPeer=["client1.example.com"]
  StreamDriver.AuthMode="x509/name"
  StreamDriver.Mode="1"
  StreamDriver.Name="ossl"
)

input(
  type="imtcp"
  port="514"
)
```

On each client, place the CA certificate, client certificate, and client private key in the same trusted location, run `sudo update-ca-trust`, and create a client configuration such as `/etc/rsyslog.d/securelogcli.conf`:

```conf
global(
  DefaultNetstreamDriverCAFile="/etc/pki/ca-trust/source/anchors/ca-cert.pem"
  DefaultNetstreamDriverCertFile="/etc/pki/ca-trust/source/anchors/client-cert.pem"
  DefaultNetstreamDriverKeyFile="/etc/pki/ca-trust/source/anchors/client-key.pem"
)

*.* action(
  type="omfwd"
  StreamDriver="ossl"
  StreamDriverMode="1"
  StreamDriverPermittedPeers="server.example.com"
  StreamDriverAuthMode="x509/name"
  target="server.example.com" port="514" protocol="tcp"
)
```

Check the rsyslog configuration syntax, then restart rsyslog:

```bash
sudo rsyslogd -N 1
sudo systemctl restart rsyslog
```

## Step 4 - Verify the Setup

Check the service status:

```bash
systemctl status rsyslog
systemctl status systemd-journald
```

Send a test message from the client and review recent logs on the logging server to confirm your changes are working:

```bash
logger test
journalctl --since "5 minutes ago"
tail -20 /var/log/messages
```

## Step 5 - Open Firewall Ports (If Applicable)

If your setup involves remote logging, open the necessary ports:

```bash
sudo firewall-cmd --permanent --add-port=514/tcp
sudo firewall-cmd --reload
```

## Troubleshooting

- Check for syntax errors in rsyslog configuration: `rsyslogd -N 1`
- Verify SELinux is not blocking log operations: `ausearch -m AVC -ts recent`
- Ensure the target directory exists and has correct permissions

## Summary

You have learned how to set up remote logging with rsyslog and TLS encryption on RHEL 9. Regular log management is essential for security, compliance, and troubleshooting in any production environment.
