# How to Set a Static IPv4 Address Using netsh on Windows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Window, Networking, Netsh, IPv4, Static IP, Network Configuration

Description: Set a static IPv4 address, subnet mask, and default gateway on a Windows network adapter using the netsh command-line tool from an elevated command prompt.

## Introduction

`netsh` (Network Shell) is Windows' built-in command-line utility for network configuration. Assigning a static IPv4 address with `netsh` is faster than navigating the Control Panel and can be used in scripts and remote administration sessions.

## Prerequisites

- Elevated (Administrator) command prompt or PowerShell
- The exact name of the network adapter

## Finding the Adapter Name

```cmd
netsh interface show interface
```

Or:

```cmd
netsh interface ipv4 show interfaces
```

Common names: `Ethernet`, `Ethernet0`, `Local Area Connection`, `Wi-Fi`.

## Setting a Static IPv4 Address

```cmd
:: Set static IP, subnet mask, and gateway on "Ethernet" adapter
netsh interface ipv4 set address name="Ethernet" ^
    source=static ^
    address=192.168.1.100 ^
    mask=255.255.255.0 ^
    gateway=192.168.1.1
```

The `^` character continues the command on the next line in CMD. In PowerShell, use backtick `` ` `` or write on one line.

## Setting DNS Servers

After assigning the static IP, set DNS separately:

```cmd
:: Set primary DNS server
netsh interface ipv4 set dnsservers name="Ethernet" source=static address=8.8.8.8

:: Add secondary DNS server
netsh interface ipv4 add dnsservers name="Ethernet" address=1.1.1.1 index=2
```

## Verifying the Configuration

```cmd
:: Show the current IP configuration for the adapter
netsh interface ipv4 show config name="Ethernet"
```

Or use the familiar:

```cmd
ipconfig /all
```

## Setting a Static IP on a Remote Machine

Via PsExec or WinRM:

```powershell
# Using PowerShell remoting

Invoke-Command -ComputerName REMOTE-HOST -ScriptBlock {
    netsh interface ipv4 set address name="Ethernet" `
        source=static `
        address=192.168.1.101 `
        mask=255.255.255.0 `
        gateway=192.168.1.1
}
```

## Complete Script Example

```cmd
@echo off
set ADAPTER=Ethernet
set IP=192.168.1.100
set MASK=255.255.255.0
set GATEWAY=192.168.1.1
set DNS1=8.8.8.8
set DNS2=1.1.1.1

netsh interface ipv4 set address name="%ADAPTER%" source=static address=%IP% mask=%MASK% gateway=%GATEWAY%
netsh interface ipv4 set dnsservers name="%ADAPTER%" source=static address=%DNS1%
netsh interface ipv4 add dnsservers name="%ADAPTER%" address=%DNS2% index=2

echo Static IP configuration applied.
ipconfig /all | findstr /i "IPv4 Gateway DNS"
```

## Conclusion

`netsh interface ipv4 set address` is the documented `netsh` command-line method for static IP assignment on Windows. It works in CMD and PowerShell, is scriptable, and takes effect immediately without a reboot.
