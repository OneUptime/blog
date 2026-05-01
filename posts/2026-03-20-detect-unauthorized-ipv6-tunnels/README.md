# How to Detect Unauthorized IPv6 Tunnels on Your Network

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Tunneling, Security, Network Monitoring, Detection

Description: Learn how to detect unauthorized IPv6 tunnels on your network using traffic analysis, firewall logging, NetFlow, and host-based auditing tools.

## Overview

Unauthorized IPv6 tunnels allow attackers to bypass IPv4 security controls or exfiltrate data via hidden IPv6 channels. Detection requires monitoring at multiple layers: network perimeter (capturing proto 41, GRE, UDP 3544), host-level (auditing tunnel interfaces), and DNS (watching for ISATAP router queries).

## Network-Level Detection: tcpdump / Wireshark

```bash
# Detect any IP protocol 41 (6in4, 6to4, ISATAP, SIT)

tcpdump -i eth0 "proto 41" -n -v

# Sample output indicating unauthorized tunnel:
# 14:22:31.123456 IP 10.0.5.22 > 203.0.113.1: IP6 2001:db8::1 > 2001:db8::2: ICMP6

# Detect Teredo (UDP 3544)
tcpdump -i eth0 "udp port 3544" -n

# Detect GRE
tcpdump -i eth0 "proto gre" -n

# Capture and analyze legacy 6to4 relay anycast traffic (192.88.99.0/24; commonly 192.88.99.1)
tcpdump -i eth0 "dst net 192.88.99.0/24" -n

# Save for analysis
tcpdump -i eth0 "(proto 41 or proto 47 or (udp port 3544))" -w /tmp/tunnels.pcap
```

## NetFlow / IPFIX Analysis

```bash
# Using nfdump - find proto 41 flows
nfdump -r /var/cache/nfdump/nfcapd.current \
    -o "fmt:%ts %sa %da %pr %byt" \
    "proto 41"

# Find UDP 3544 (Teredo) flows
nfdump -r /var/cache/nfdump/nfcapd.current \
    "proto udp and dst port 3544"

# Find GRE (proto 47) flows
nfdump -r /var/cache/nfdump/nfcapd.current \
    "proto 47"

# Summary: which hosts are sending tunnel traffic?
nfdump -r /var/cache/nfdump/nfcapd.current \
    -s srcip/bytes "proto 41 or proto 47 or (proto udp and dst port 3544)"
```

## Snort / Suricata Rules

```text
# Suricata rules for tunnel detection

# Detect 6in4 / protocol 41
alert ip $HOME_NET any -> any any (msg:"IPv6 Tunnel proto 41 outbound"; ip_proto:41; sid:9000001; rev:1;)

# Detect Teredo
alert udp $HOME_NET any -> any 3544 (msg:"Teredo tunnel outbound UDP 3544"; sid:9000002; rev:1;)

# Detect 6to4 relay
alert ip $HOME_NET any -> 192.88.99.0/24 any (msg:"6to4 relay anycast traffic"; sid:9000003; rev:1;)

# Detect GRE from internal
alert ip $HOME_NET any -> $EXTERNAL_NET any (msg:"GRE tunnel outbound"; ip_proto:47; sid:9000004; rev:1;)
```

## Host-Based Detection: Linux

```bash
# List configured tunnel interfaces with an IPv4 outer header
ip tunnel show

# List configured tunnel interfaces with an IPv6 outer header
ip -6 tunnel show

# Example - unauthorized tunnel found:
# sit1: ipv6/ip  remote 203.0.113.1  local 10.0.5.22  ttl 64

# Check for sit (SIT), gre, ip6tnl, etc.
ip link show type sit
ip link show type gre
ip link show type ip6tnl
ip link show type gretap

# Check loaded tunnel modules
lsmod | grep -E "^(sit|ip_gre|ip6_gre|ip6_tunnel)"

# Correlate tunnel changes with recent admin activity
# (last shows logins; ausearch shows audited iproute2 commands)
last -n 20
ausearch -c "ip" --start today  # If auditd is running

# Cron job to alert on tunnel changes
cat > /etc/cron.d/check-tunnels << 'EOF'
*/5 * * * * root ( ip tunnel show; ip -6 tunnel show ) > /tmp/tunnels-now.txt && [ -f /tmp/tunnels-baseline.txt ] && ! cmp -s /tmp/tunnels-baseline.txt /tmp/tunnels-now.txt && diff -u /tmp/tunnels-baseline.txt /tmp/tunnels-now.txt | mail -s "ALERT: Tunnel change detected" security@example.com
EOF
```

## Host-Based Detection: Windows

```powershell
# List tunnel adapters
Get-NetAdapter -IncludeHidden | Where-Object { $_.InterfaceDescription -like "*tunnel*" }

# Check specific tunnel states
Get-NetTeredoConfiguration | Select-Object Type
Get-Net6to4Configuration  | Select-Object State
Get-NetIsatapConfiguration | Select-Object State

# Find IPv6 addresses in 2002:: range (6to4)
Get-NetIPAddress | Where-Object { $_.IPAddress -like "2002:*" }

# Find Teredo addresses (2001:0:)
Get-NetIPAddress | Where-Object { $_.IPAddress -match "^2001:0:" }

# PowerShell script to audit all domain machines
$computers = Get-ADComputer -Filter * | Select-Object -ExpandProperty Name
$report = foreach ($computer in $computers) {
    try {
        $result = Invoke-Command -ComputerName $computer -ScriptBlock {
            $teredo = (Get-NetTeredoConfiguration).Type
            $6to4   = (Get-Net6to4Configuration).State
            $isatap = (Get-NetIsatapConfiguration).State
            $6to4addr = (Get-NetIPAddress | Where-Object { $_.IPAddress -like "2002:*" }).IPAddress
            [pscustomobject]@{
                Computer = $env:COMPUTERNAME
                Teredo   = $teredo
                '6to4'   = $6to4
                ISATAP   = $isatap
                '6to4Addr' = $6to4addr -join ","
            }
        } -ErrorAction Stop
        $result
    } catch {
        [pscustomobject]@{ Computer = $computer; Error = $_.Exception.Message }
    }
}
$report | Where-Object { $_.Teredo -ne "Disabled" -or $_.'6to4' -ne "Disabled" } |
    Export-Csv "$env:TEMP\tunnel-audit.csv" -NoTypeInformation
```

## DNS Monitoring for ISATAP

ISATAP deployments commonly use `isatap.<domain>` to publish the Potential Router List, but RFC 5214 treats this as a convention rather than a requirement:

```bash
# Capture DNS queries for "isatap"
tcpdump -i eth0 "port 53" -A | grep -i "isatap"

# On BIND - check query logs for isatap (adjust the path for your named configuration)
grep -i "isatap" /var/log/named/query.log

# Suricata DNS rule
alert dns $HOME_NET any -> any 53 (msg:"ISATAP router discovery query"; dns.query; content:"isatap"; nocase; sid:9000005; rev:1;)
```

## SIEM Detection Query (Splunk)

```text
# Splunk SPL - find protocol 41 flows from NetFlow
# (field names may vary by NetFlow add-on or sourcetype)
index=netflow proto=41
| stats count, sum(bytes) as total_bytes by src_ip, dest_ip
| sort - total_bytes
| where total_bytes > 1000

# Find Teredo (UDP 3544)
index=netflow proto=17 dest_port=3544
| stats count by src_ip
| sort - count
```

## Summary

Detect unauthorized IPv6 tunnels through multiple layers: network capture (`tcpdump "proto 41"`, `udp port 3544`, `proto gre`), NetFlow queries for protocol 41/47 flows, Snort/Suricata rules for tunnel protocols, host auditing (`ip tunnel show` / `ip -6 tunnel show` on Linux, `Get-NetTeredoConfiguration` on Windows), and SIEM correlation. Set up automated baselines and alert on changes. Focus detection on protocol 41 (6in4/SIT/6to4), UDP 3544 (Teredo), and GRE (protocol 47). Any internal host originating these protocols without explicit authorization should trigger investigation.
