# How Teredo Tunneling Provides IPv6 Connectivity Through NAT

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Teredo, IPv6, NAT, Tunneling, IPv4, Transition

Description: Understand how Teredo tunneling encapsulates IPv6 packets in IPv4 UDP to traverse NAT devices, configure Teredo on Linux with miredo, and understand its use cases and limitations.

## Introduction

Teredo (RFC 4380) is a last-resort IPv6 tunneling mechanism for hosts behind many NAT devices, but it does not work through every NAT type. It encapsulates IPv6 packets in IPv4 UDP; Teredo servers listen on UDP port 3544 while clients normally use an OS-selected UDP port. Teredo addresses use the 2001::/32 prefix. While it can traverse many NATs, it is deprecated on Windows, no longer recommended for general IPv6 connectivity, and slow compared to native IPv6 or 6in4.

## Teredo Address Format

```text
Teredo address:
2001:0000:server_ipv4_hi:server_ipv4_lo:flags:obscured_mapped_port:obscured_mapped_ipv4_hi:obscured_mapped_ipv4_lo

Example:
2001:0:4137:9e74:8c1:8ff:fe80:ffa2
         ↑ Teredo server IPv4
                   ↑ Flags
                          ↑ Obscured mapped UDP port (XOR with 0xffff)
                                 ↑ Obscured mapped client IPv4 (XOR with 0xffffffff)
```

## Installing Miredo (Linux Teredo Client)

```bash
# Debian/Ubuntu

sudo apt install miredo

# RHEL/CentOS (only if your enabled repositories provide Miredo)
sudo dnf install miredo

# Start miredo
sudo systemctl enable --now miredo

# Verify Teredo interface
ip address show teredo
# Shows: 2001:... address
```

## Miredo Configuration

```bash
# /etc/miredo/miredo.conf

# Teredo server (required; replace this placeholder with one you operate or are allowed to use)
ServerAddress teredo.example.net
# Optional secondary server address, if the server operator provides one:
# ServerAddress2 teredo2.example.net

# Local client UDP port (default: OS-selected; set only for firewall/NAT constraints)
# BindPort 3545

# Bind to specific IPv4 (optional)
# BindAddress 10.0.0.5

# Interface name
InterfaceName teredo
```

## Testing Teredo Connectivity

```bash
# Check Teredo interface after starting miredo
ip address show teredo
ip -6 route show | grep teredo

# Test IPv6 connectivity via Teredo (requires a working Teredo server and relay)
ping -6 2001:4860:4860::8888
curl -6 https://ipv6.google.com

# Check Miredo configuration syntax
miredo-checkconf /etc/miredo/miredo.conf
```

## Teredo vs Other Tunneling Methods

| Feature | Teredo | 6in4 (HE) | 6to4 |
|---|---|---|---|
| Works through NAT | Many NATs (not symmetric NAT) | No | No |
| Protocol | UDP; server port 3544 | IP proto 41 | IP proto 41 |
| Address space | 2001::/32 | Provider-assigned | 2002::/16 |
| Reliability | Low | High | Medium |
| Performance | Slowest | Best | Medium |
| Registration required | No | Yes (free) | No |
| Status | Deprecated on Windows / last-resort | Active | Anycast deprecated / not recommended |

## Windows Teredo

```powershell
# Check Teredo status on Windows
netsh interface teredo show state

# Enable Teredo
netsh interface teredo set state type=client

# Set Teredo server to the Windows default
netsh interface teredo set state servername=default

# Disable Teredo (if native IPv6 is available)
netsh interface teredo set state disabled
```

## Security Considerations

```bash
# Teredo can bypass IPv6 firewalls if only IPv4 is filtered
# Check if Teredo is creating unexpected IPv6 tunnels:
ip -6 address show | grep "2001:0:"

# Block Teredo on corporate networks if not needed:
# Block normal Teredo initialization on a host:
sudo iptables -A OUTPUT -p udp --dport 3544 -j DROP
sudo iptables -A INPUT  -p udp --sport 3544 -j DROP
```

## Conclusion

Teredo is a last-resort tunneling mechanism for IPv6 through NAT. Miredo can provide Teredo support on Linux only if you have access to a functioning Teredo server; its former public default server was terminated. For reliable IPv6 connectivity, prefer Hurricane Electric's 6in4 tunnels (tunnelbroker.net) which require a public IPv4 but offer far better performance and stability. Teredo is a legacy technology and should only be used when no better option is available. On corporate networks, block UDP 3544 to prevent unauthorized Teredo tunnels.
