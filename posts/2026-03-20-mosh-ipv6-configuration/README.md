# How to Configure Mosh for IPv6 Connections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Mosh, IPv6, SSH, Remote Access, Networking, Linux

Description: Configure Mosh to connect to remote servers over IPv6, including firewall rules and connection syntax for both link-local and global addresses.

## Introduction

Mosh (Mobile Shell) is a remote terminal application that improves on SSH by handling intermittent connectivity, roaming, and high-latency connections. Mosh uses SSH for authentication but switches to UDP for the session, making IPv6 configuration slightly different from standard SSH.

## Prerequisites

- Mosh installed on both client and server
- IPv6 connectivity between client and server
- Firewall access to UDP ports 60000–61000

## Installing Mosh

On Ubuntu/Debian:

```bash
# Install Mosh on server and client

sudo apt update && sudo apt install -y mosh
```

On RHEL/CentOS:

```bash
sudo yum install -y mosh
```

## Configuring the Firewall for Mosh over IPv6

Mosh uses UDP ports in the range 60000–61000. Open these on the server for IPv6 traffic:

```bash
# Using ip6tables directly
sudo ip6tables -A INPUT -p udp --dport 60000:61000 -j ACCEPT

# Or using ufw
sudo ufw allow 60000:61000/udp comment "Mosh UDP"

# Verify the rule was applied
sudo ip6tables -L INPUT -n | grep 60000
```

## Connecting to an IPv6 Global Address

To connect using a full global unicast IPv6 address, wrap it in square brackets:

```bash
# Connect to a server with a global IPv6 address
mosh user@[2001:db8::1]

# Mosh automatically resolves AAAA records if you use a hostname
mosh user@ipv6.example.com
```

## Connecting to a Link-Local Address

Link-local addresses require a scope ID (interface name). Use the `-6` flag and specify the interface with `%`:

```bash
# Connect to a link-local address on interface eth0
mosh --ssh="ssh -6" user@[fe80::1%eth0]

# Alternatively, use the --server flag if the server binary is in a non-standard path
mosh --ssh="ssh -6" --server=/usr/bin/mosh-server user@[fe80::1%eth0]
```

## Forcing IPv6 with Mosh

Mosh does not have a native `-6` flag, so you pass it through the SSH layer:

```bash
# Force IPv6 resolution via SSH options
mosh --ssh="ssh -6" user@ipv6-server.example.com

# Specify a custom SSH port and force IPv6
mosh --ssh="ssh -p 2222 -6" user@ipv6-server.example.com
```

## Server-Side Configuration

Ensure the Mosh server is listening and the SSH daemon accepts IPv6:

```bash
# Check sshd is listening on IPv6
sudo ss -tlnp | grep :22

# Expected output should show :::22 or *:22 with AddressFamily any
# In /etc/ssh/sshd_config, verify:
grep -E "^AddressFamily|^ListenAddress" /etc/ssh/sshd_config
```

If `AddressFamily` is set to `inet`, change it to `any` or `inet6`:

```bash
sudo sed -i 's/^AddressFamily inet$/AddressFamily any/' /etc/ssh/sshd_config
sudo systemctl restart sshd
```

## Verifying the UDP Session

Once connected, verify Mosh is using IPv6 for its UDP transport:

```bash
# On the server, check the Mosh server process and its UDP socket
ss -unp | grep mosh-server

# Example output:
# UNCONN 0 0 [2001:db8::1]:60001 [2001:db8::2]:54321 users:(("mosh-server",pid=12345,fd=3))
```

## Troubleshooting

**Connection drops immediately**: Verify UDP 60000–61000 is open on both directions in your firewall.

**SSH works but Mosh fails**: The server may be dropping UDP. Check cloud security groups or host firewalls.

**Name not resolving**: Use `dig AAAA hostname` to verify the AAAA record exists before attempting connection.

## Conclusion

Mosh over IPv6 provides resilient remote sessions on modern dual-stack or IPv6-only infrastructure. The key steps are opening UDP ports in the firewall and passing IPv6-specific flags through the SSH transport layer.
