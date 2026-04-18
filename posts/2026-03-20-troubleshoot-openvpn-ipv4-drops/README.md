# How to Troubleshoot OpenVPN IPv4 Connection Drops and Timeouts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenVPN, VPN, IPv4, Troubleshooting, Networking, Linux

Description: Diagnose and resolve OpenVPN IPv4 connection drops, TLS timeouts, and routing failures using logs, network tools, and configuration adjustments.

OpenVPN connection drops can stem from MTU mismatches, keepalive timeouts, TLS renegotiation failures, or network path changes. Here is a systematic approach to diagnosing and resolving them.

## Step 1: Increase Log Verbosity

```conf
# In server.conf or client.conf, increase verbosity to see detailed events

# verb 3 is default; use 4 or 5 for more detail
verb 5
```

Watch logs in real time:

```bash
sudo journalctl -u openvpn-server@server -f
# Look for: TLS Error, PING timeout, Inactivity timeout
```

## Step 2: Check Keepalive Settings

Keepalive prevents connections from dropping during idle periods:

```conf
# server.conf and client.conf
# Send a ping every 10 seconds; restart if no response for 120 seconds
keepalive 10 120
```

Setting `keepalive` on the server is typically enough — it pushes equivalent `ping` and `ping-restart` directives to the client. If both sides set it, the server's pushed values override the client's local ones.

## Step 3: Investigate MTU Issues

MTU mismatches cause intermittent packet loss, especially for large packets:

```bash
# Test MTU from client to server
ping -M do -s 1400 <VPN_SERVER_IP>
# Decrease size until pings succeed; that's your effective MTU

# In OpenVPN config, set explicit fragment and MSS clamping
fragment 1300
mssfix 1300
```

In server config:

```conf
# Adjust these values based on your MTU test results
fragment 1300
mssfix 1300
```

## Step 4: Check for TLS Renegotiation Failures

```conf
# Extend TLS renegotiation interval to reduce renegotiation frequency
# Default is 3600 seconds (1 hour)
reneg-sec 86400
```

## Step 5: Handle NAT Traversal Issues

Connections through NAT can drop when the NAT table entry expires:

```conf
# Client config: send keepalive packets more frequently through NAT
ping 10
ping-restart 60
```

## Step 6: Diagnose with tcpdump

```bash
# On the server, capture OpenVPN UDP traffic
sudo tcpdump -i eth0 -n udp port 1194 -w openvpn_capture.pcap

# After a drop, analyze the capture
wireshark openvpn_capture.pcap
# Look for: retransmits, gaps in packet flow, TLS alerts
```

## Step 7: Check for Firewall State Table Expiry

Some firewalls expire UDP state entries after a period of inactivity:

```bash
# On pfSense/iptables, check UDP state timeout
sudo conntrack -L | grep "1194"

# Reduce OpenVPN ping interval to keep state alive
# In client.conf:
# ping 20
```

## Common Drop Scenarios and Fixes

| Log Message | Cause | Fix |
|---|---|---|
| `TLS Error: TLS key negotiation failed` | Firewall blocking, key mismatch | Check firewall, re-exchange keys |
| `Inactivity timeout` | Keepalive too long | Reduce `keepalive` interval |
| `Connection reset` | Server restarted | Enable `--persist-tun` on client |
| Packets drop for large files | MTU mismatch | Set `fragment` and `mssfix` |
| Reconnects every hour | TLS reneg failure | Increase `reneg-sec` |

## Enabling Reconnect on Drop

```conf
# client.conf: automatically reconnect on failure
resolv-retry infinite
connect-retry 5
connect-retry-max infinite
```

Systematic log analysis combined with MTU and keepalive tuning resolves most OpenVPN connection drop issues.
