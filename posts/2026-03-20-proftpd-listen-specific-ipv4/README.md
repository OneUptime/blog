# How to Configure ProFTPD to Listen on a Specific IPv4 Address

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ProFTPD, FTP, IPv4, Listen, Configuration, Server

Description: Configure ProFTPD to listen on a specific IPv4 address using the ServerAddress and Port directives, bind to a single interface, and verify the configuration.

## Introduction

In standalone mode, ProFTPD listens on all addresses by default unless `SocketBindTight on` is used. In multi-homed servers, restricting ProFTPD to a specific IPv4 address isolates FTP traffic to a designated network interface, improves security, and prevents FTP from being accessible on management or internal interfaces.

## Basic Configuration

```bash
# /etc/proftpd/proftpd.conf

# Server identity

ServerName    "FTP Server"
ServerType    standalone
DefaultServer on

# Bind the main server to a specific IPv4 address only
DefaultAddress 203.0.113.10
SocketBindTight on
Port             21

# Prevent IPv6 listening
UseIPv6       off

# User/group for the daemon
User          ftp
Group         nogroup

# Default root (chroot all users)
DefaultRoot   ~

# Logging
SystemLog     /var/log/proftpd/proftpd.log
TransferLog   /var/log/proftpd/xferlog
```

## Multiple Virtual Hosts (Different IPs)

```bash
# /etc/proftpd/proftpd.conf

ServerName    "Default Server"
ServerType    standalone
UseIPv6       off
SocketBindTight on

# Disable the main server so only the virtual hosts listen
Port          0

# First virtual host on IP 1
<VirtualHost 203.0.113.10>
  ServerName  "Public FTP"
  Port        21
  DefaultRoot /srv/ftp/public
  <Anonymous /srv/ftp/public>
    User      ftp
    UserAlias anonymous ftp
    <Limit LOGIN>
      AllowAll
    </Limit>
  </Anonymous>
</VirtualHost>

# Second virtual host on IP 2
<VirtualHost 10.0.0.5>
  ServerName  "Internal FTP"
  Port        21
  DefaultRoot /srv/ftp/internal
  # Only allow specific users
  <Limit LOGIN>
    AllowUser ftpuser
    DenyAll
  </Limit>
</VirtualHost>
```

## Restricting Access by IP

```bash
# /etc/proftpd/proftpd.conf

<Global>
  # Only allow connections from these source IPs
  <Limit LOGIN>
    Allow from 10.0.0.0/8
    Allow from 192.168.1.0/24
    Allow from 203.0.113.20
    Deny from all
  </Limit>
</Global>
```

## Passive Mode for NAT

```bash
# /etc/proftpd/proftpd.conf

# Public IP for passive mode
MasqueradeAddress     203.0.113.10

# Passive port range
PassivePorts          30000 31000
```

## Testing the Configuration

```bash
# Check configuration syntax
sudo proftpd --configtest -c /etc/proftpd/proftpd.conf
# Expected: Syntax check complete.

# Start/restart ProFTPD
sudo systemctl restart proftpd

# Verify listening address
sudo ss -tlnp | grep proftpd
# Expected: LISTEN 0 ... 203.0.113.10:21

# Test connection
ftp 203.0.113.10

# Check ProFTPD log
sudo tail -f /var/log/proftpd/proftpd.log
```

## Conclusion

Use `DefaultAddress` for the main server address in `proftpd.conf`, and set `SocketBindTight on` so ProFTPD listens only on the configured IPv4 address. Set `UseIPv6 off` to prevent IPv6 binding. For multi-homed servers with different FTP services per IP, use `<VirtualHost>` blocks; if only the virtual hosts should listen, disable the main server with `Port 0`. Always test configuration syntax with `proftpd --configtest` before restarting the service.
