# How to Troubleshoot 'Request Timed Out' Ping Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ping, Request Timed Out, Troubleshooting, ICMP, Window

Description: Learn how to diagnose and fix 'Request Timed Out' ping errors on Windows and Linux, which indicate that ICMP packets are being sent but no reply is received within the timeout window.

## Request Timed Out vs Destination Host Unreachable

- **Request Timed Out**: Packet was sent but no reply arrived. The host may exist but ICMP is blocked by a firewall, or the route back is broken.
- **Destination Host Unreachable**: A router along the path explicitly returned an ICMP error - the route doesn't exist.

## Step 1: Check Your Own Connectivity First

```cmd
REM Test loopback - verifies TCP/IP stack is working
ping 127.0.0.1

REM Test gateway - verifies LAN connectivity
ping 192.168.1.1

REM Test internet IP (no DNS involved)
ping 8.8.8.8

REM Test DNS name
ping google.com
```

Timeouts only at the internet step suggest firewall or routing issues. Timeouts at gateway suggest LAN problems.

## Step 2: Determine If ICMP Is Blocked

```bash
# Try TCP instead of ICMP to bypass ICMP blocks

# Using curl (HTTP)
curl -v --connect-timeout 5 http://192.168.1.50

# Using nmap - scans TCP ports even when ICMP is blocked
nmap -sS -p 22,80,443 192.168.1.50

# If TCP connects but ping times out, the target has ICMP blocked
```

## Step 3: Trace the Path to Find Where Packets Are Dropped

```cmd
REM Windows traceroute
tracert 8.8.8.8

REM Shows each hop - asterisks (*) indicate where packets are dropped
REM First hop = router, last responding hop = where the problem is

REM Linux
traceroute -I 8.8.8.8    # ICMP mode
traceroute -T 8.8.8.8    # TCP mode (bypasses ICMP filters)
mtr 8.8.8.8              # Real-time hop-by-hop analysis
```

## Step 4: Check Windows Firewall

```cmd
REM Check if Windows Firewall is blocking ICMP
netsh advfirewall firewall show rule name="File and Printer Sharing (Echo Request - ICMPv4-In)"

REM Enable inbound ICMP (allow ping TO this machine)
netsh advfirewall firewall add rule name="Allow ICMPv4" ^
    protocol=icmpv4:8,any dir=in action=allow

REM Check current firewall profile
netsh advfirewall show currentprofile
```

```powershell
# Allow ICMPv4 via PowerShell
New-NetFirewallRule -Name "Allow-ICMPv4-In" -DisplayName "Allow ICMPv4 In" `
    -Protocol ICMPv4 -IcmpType 8 -Direction Inbound -Action Allow
```

## Step 5: Check Linux Firewall

```bash
# iptables - check for ICMP DROP rules
sudo iptables -L INPUT -n --line-numbers | grep -i icmp

# Allow ICMP
sudo iptables -I INPUT -p icmp --icmp-type echo-request -j ACCEPT
sudo iptables -I OUTPUT -p icmp --icmp-type echo-reply -j ACCEPT

# firewalld - list current ICMP blocks
sudo firewall-cmd --list-icmp-blocks

# Remove echo-request block to allow ping
sudo firewall-cmd --permanent --remove-icmp-block=echo-request
sudo firewall-cmd --reload

# nftables
sudo nft list ruleset | grep icmp
```

## Step 6: Check Routing

```cmd
REM Print routing table - verify default gateway is set
route print -4

REM Check ARP cache - target IP should resolve to a MAC
arp -a 192.168.1.50

REM If no ARP entry, the host may be off or in a different VLAN
```

```bash
# Linux routing check
ip route show
ip neigh show 192.168.1.50    # ARP cache

# Test path from specific source IP
ping -I eth0 192.168.1.50
```

## Step 7: Analyze with Packet Capture

```bash
# Capture ICMP traffic to confirm packets are being sent
sudo tcpdump -i eth0 icmp

# Expected output when working:
# 12:00:01 IP 192.168.1.10 > 192.168.1.50: ICMP echo request
# 12:00:01 IP 192.168.1.50 > 192.168.1.10: ICMP echo reply

# If only requests and no replies: target has ICMP blocked
# If no packets at all: routing or local firewall issue
```

## Conclusion

"Request Timed Out" means packets leave your machine but replies don't return. Diagnose by checking if ICMP is specifically blocked (use nmap or curl to test TCP), tracing the path with `tracert`/`mtr`, enabling ICMP in Windows Firewall with `netsh advfirewall`, and capturing packets with `tcpdump` to confirm traffic flow. In most enterprise environments, ICMP is intentionally blocked - use TCP-based tools to test connectivity instead.
