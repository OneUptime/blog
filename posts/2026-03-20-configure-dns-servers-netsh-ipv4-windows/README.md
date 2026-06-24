# How to Configure DNS Servers with netsh interface ipv4 on Windows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Window, Networking, Netsh, DNS, IPv4, Network Configuration

Description: Set, change, and remove DNS server addresses on a Windows network adapter using netsh interface ipv4 commands from an elevated command prompt.

## Introduction

DNS configuration on Windows can be done entirely from the command line using `netsh`. This is faster than the GUI and essential for automation, unattended provisioning, and remote configuration via scripts.

## View Current DNS Configuration

```cmd
:: Show DNS settings for a specific adapter
netsh interface ipv4 show dnsservers name="Ethernet"

:: Or show all adapter TCP/IP config (including DNS)
netsh interface ipv4 show config
```

## Set a Primary DNS Server

```cmd
:: Replace any existing DNS with a single primary server
netsh interface ipv4 set dnsservers name="Ethernet" source=static address=8.8.8.8
```

The `source=static` parameter prevents this from being overridden by DHCP.

## Add a Secondary DNS Server

```cmd
:: Add secondary DNS (index 2 = second server in the list)
netsh interface ipv4 add dnsservers name="Ethernet" address=1.1.1.1 index=2

:: Add a third server
netsh interface ipv4 add dnsservers name="Ethernet" address=9.9.9.9 index=3
```

## Set Multiple DNS Servers at Once (PowerShell)

```powershell
# Set primary and secondary DNS simultaneously with PowerShell

Set-DnsClientServerAddress -InterfaceAlias "Ethernet" -ServerAddresses @("8.8.8.8", "1.1.1.1")
```

## Delete All DNS Servers

```cmd
:: Remove all manually-configured DNS servers
netsh interface ipv4 set dnsservers name="Ethernet" source=static address=none
```

## Reset DNS to DHCP-Provided

```cmd
:: Allow DHCP server to provide DNS settings
netsh interface ipv4 set dnsservers name="Ethernet" source=dhcp
```

## Verify DNS Settings

```cmd
ipconfig /all | findstr /i "DNS"
```

Expected output with static DNS:

```text
   DNS Servers . . . . . . . . . . . : 8.8.8.8
                                       1.1.1.1
```

## Set Internal DNS for Domain-Joined Machines

```cmd
:: Point to corporate DNS (needed for Active Directory resolution)
netsh interface ipv4 set dnsservers name="Ethernet" source=static address=192.168.1.10
netsh interface ipv4 add dnsservers name="Ethernet" address=192.168.1.11 index=2
```

## DNS Configuration Script

```cmd
@echo off
set ADAPTER=Ethernet
set DNS1=8.8.8.8
set DNS2=1.1.1.1

echo Configuring DNS on %ADAPTER%...
netsh interface ipv4 set dnsservers name="%ADAPTER%" source=static address=%DNS1%
netsh interface ipv4 add dnsservers name="%ADAPTER%" address=%DNS2% index=2

echo Done. Current DNS configuration:
netsh interface ipv4 show dnsservers name="%ADAPTER%"
```

## Testing DNS After Configuration

```cmd
:: Flush the DNS resolver cache first
ipconfig /flushdns

:: Test resolution
nslookup google.com
nslookup google.com 8.8.8.8
```

## Conclusion

Use `netsh interface ipv4 set dnsservers` for the primary server and `add dnsservers` with an index for additional servers. Always test with `nslookup` after configuring and flush the resolver cache with `ipconfig /flushdns` to ensure fresh lookups use the new servers.
