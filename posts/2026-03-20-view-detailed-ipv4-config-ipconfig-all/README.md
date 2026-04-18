# How to View Detailed IPv4 Configuration with ipconfig /all

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Window, Networking, Ipconfig, IPv4, Network Diagnostics, DHCP

Description: Use ipconfig /all to view the complete IPv4 network configuration on Windows, including MAC addresses, DHCP lease details, DNS servers, and adapter-specific settings.

## Introduction

`ipconfig /all` provides the most comprehensive view of network configuration available from the Windows command line. It shows every adapter's physical and logical settings in a single output, making it the first tool to run when diagnosing network issues.

## Running ipconfig /all

```cmd
ipconfig /all
```

## Understanding the Output Sections

**Host-level information (top of output):**

```text
Windows IP Configuration
   Host Name . . . . . . . . . . . . : MY-PC
   Primary Dns Suffix  . . . . . . . : corp.example.com
   Node Type . . . . . . . . . . . . : Hybrid
   IP Routing Enabled. . . . . . . . : No
   WINS Proxy Enabled. . . . . . . . : No
```

**Per-adapter information:**

```text
Ethernet adapter Ethernet:
   Connection-specific DNS Suffix  . : dhcp.example.com
   Description . . . . . . . . . . . : Intel(R) Ethernet Connection
   Physical Address. . . . . . . . . : 00-1A-2B-3C-4D-5E
   DHCP Enabled. . . . . . . . . . . : Yes
   Autoconfiguration Enabled . . . . : Yes
   IPv4 Address. . . . . . . . . . . : 192.168.1.100(Preferred)
   Subnet Mask . . . . . . . . . . . : 255.255.255.0
   Lease Obtained. . . . . . . . . . : Monday, March 20, 2026 8:00:00 AM
   Lease Expires . . . . . . . . . . : Tuesday, March 21, 2026 8:00:00 AM
   Default Gateway . . . . . . . . . : 192.168.1.1
   DHCP Server . . . . . . . . . . . : 192.168.1.1
   DNS Servers . . . . . . . . . . . : 8.8.8.8
                                       1.1.1.1
   NetBIOS over Tcpip. . . . . . . . : Enabled
```

## Key Fields Explained

| Field | What to Check |
|---|---|
| Physical Address | MAC - confirm it matches expected NIC |
| DHCP Enabled | Yes = dynamic IP; No = static |
| IPv4 Address with `(Preferred)` | Currently active address |
| Lease Obtained / Expires | DHCP lease validity period |
| DHCP Server | Which server issued the lease |
| DNS Servers | Nameservers in use |
| Autoconfiguration IPv4 Address | `169.254.x.x` = DHCP failed (APIPA) |

## Filtering Specific Fields

```cmd
:: Show only IPv4 addresses
ipconfig /all | findstr /i "IPv4"

:: Show DHCP-related info
ipconfig /all | findstr /i "DHCP"

:: Show DNS servers
ipconfig /all | findstr /i "DNS Servers"

:: Show adapter descriptions and MACs
ipconfig /all | findstr /i "Description Physical"
```

## Diagnosing Common Issues from the Output

- **APIPA address (169.254.x.x)**: DHCP server unreachable → check DHCP service or network connectivity
- **DHCP Enabled: No with unexpected IP**: wrong static IP configured → check with IT or netsh
- **Empty DNS Servers or unreachable DNS**: verify DNS is correctly configured or reachable from this host
- **Lease expires soon**: renew with `ipconfig /renew`

## Exporting Configuration

```cmd
:: Save to a file for documentation or support tickets
ipconfig /all > %USERPROFILE%\Desktop\network-config.txt
```

## Conclusion

`ipconfig /all` is the single most useful command for a complete Windows network snapshot. Inspect it systematically: confirm the IP and mask are correct, check if DHCP is enabled or static, verify the gateway and DNS servers, and look for APIPA addresses that indicate DHCP failure.
