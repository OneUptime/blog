# How to Restrict SSH Tunneling by IPv4 Address in sshd_config

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SSH, Security, IPv4, Sshd_config, Tunneling, Access Control, AllowTcpForwarding

Description: Learn how to restrict SSH tunneling and port forwarding to specific IPv4 addresses in sshd_config to prevent unauthorized tunnel abuse.

---

SSH tunneling (port forwarding) is a powerful feature that can be abused to bypass firewalls or exfiltrate data. Restricting tunnel access to specific IPv4 source addresses reduces the attack surface while allowing legitimate use.

## Key sshd_config Directives

| Directive | Description |
|-----------|-------------|
| `AllowTcpForwarding` | Enable/disable all TCP forwarding |
| `GatewayPorts` | Allow remote port forwards to bind to non-loopback IPs |
| `PermitOpen` | Restrict local forwarding destinations by host:port |
| `Match Address` | Apply settings only to specific source IPs |

## Disable Tunneling Globally, Enable for Trusted IPs

```bash
# /etc/ssh/sshd_config

# --- Global: disable all TCP forwarding by default ---

AllowTcpForwarding no
GatewayPorts no

# --- Exception: allow tunneling from specific IPv4 addresses ---
Match Address 192.168.1.0/24,10.0.0.0/8
    AllowTcpForwarding yes
    GatewayPorts no        # Remote forwards bind to loopback only

# --- Exception: admin jump server gets full tunneling ---
Match Address 203.0.113.5
    AllowTcpForwarding yes
    GatewayPorts yes       # Can bind remote forwards to public IP
```

## Restrict Port Forwarding to Specific Destinations

```bash
# /etc/ssh/sshd_config

# Allow TCP forwarding for authenticated clients
AllowTcpForwarding yes

# But restrict local forwarding to only specific host:port combinations
# Useful for bastion hosts that should only proxy to known servers
PermitOpen 10.0.0.10:22 10.0.0.11:22 10.0.0.12:5432
# All other local forwarding destinations are denied
```

## Restricting Tunneling Per User

```bash
# /etc/ssh/sshd_config

# Global: no tunneling
AllowTcpForwarding no

# Deny tunneling for a specific user regardless of later IP/group matches
Match User deployment_bot
    AllowTcpForwarding no
    X11Forwarding no

# Allow tunneling for members of the 'developers' group from the office IP
Match Group developers Address 203.0.113.0/24
    AllowTcpForwarding yes
```

## Restricting via authorized_keys

For key-based authentication, you can restrict tunneling on a per-key basis in `~/.ssh/authorized_keys`:

```text
# Allow this key only from 192.168.1.10; disable port forwarding for this key
from="192.168.1.10",no-port-forwarding,no-x11-forwarding,no-agent-forwarding ssh-ed25519 AAAA... comment
```

## Applying and Verifying

```bash
# Test the sshd configuration
sshd -t

# Reload SSHD
systemctl reload sshd

# Test that tunneling is blocked from an unauthorized IP
ssh -L 8080:localhost:80 user@server  # Traffic through localhost:8080 should fail if AllowTcpForwarding is no

# Test that tunneling works from an authorized IP
ssh -4 -L 8080:10.0.0.10:80 user@server  # Traffic through localhost:8080 should succeed
```

## Key Takeaways

- Default `AllowTcpForwarding no` globally, then re-enable with `Match Address` for trusted IPv4 ranges.
- `PermitOpen` limits local forwarding destinations, even when forwarding is enabled.
- `GatewayPorts no` ensures remote forwards only bind to loopback (not public IPs).
- Use `from="ip"` in `authorized_keys` to tie key usage to a specific source IPv4 address.
