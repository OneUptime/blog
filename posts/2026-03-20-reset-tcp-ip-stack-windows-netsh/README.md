# How to Reset TCP/IP Stack on Windows Using netsh int ip reset

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Window, Networking, Netsh, TCP/IP, Reset, Troubleshooting

Description: Reset the Windows TCP/IP stack to its default state using netsh int ip reset to resolve persistent network connectivity issues caused by corrupted TCP/IP settings.

## Introduction

When Windows TCP/IP connectivity is broken in ways that IP reconfiguration cannot fix - such as after malware infection, bad driver installation, or registry corruption - resetting the TCP/IP stack overwrites the TCP/IP and DHCP registry keys used by TCP/IP to their default state.

## When to Use This Command

Use `netsh int ip reset` when:
- All network connections fail despite correct IP/DNS/gateway settings
- `ping` to the loopback (`127.0.0.1`) fails
- TCP connections hang or fail with unusual error codes
- Network stack is suspected to be corrupted

## Running the Reset

Open an **elevated** (Administrator) command prompt:

```cmd
:: Reset TCP/IP stack and save the log
netsh int ip reset C:\tcpip-reset.log

:: Or save the log in the current directory
netsh int ip reset tcpip-reset.log
```

Typical result:

```text
Output varies by Windows version and configuration, but a successful reset tells you to restart the computer.
```

If the command reports access denied from an elevated prompt, review the reset log and local permissions. Reboot after running.

## Complete Network Stack Reset (Multiple Commands)

For broader network troubleshooting, you can combine multiple reset commands:

```cmd
:: Reset TCP/IP stack
netsh int ip reset tcpip-reset.log

:: Reset Winsock catalog
netsh winsock reset

:: Clear ARP cache
netsh interface ipv4 delete arpcache

:: Flush DNS cache
ipconfig /flushdns

:: Release and renew DHCP leases on DHCP-configured adapters
ipconfig /release
ipconfig /renew

echo Reboot required for full effect.
```

## Save Reset Log for Analysis

```cmd
netsh int ip reset C:\tcpip-reset.log
type C:\tcpip-reset.log
```

The log records the `netsh` actions that were taken. If nothing needed to be reset, it may contain few or no entries.

## Rebooting After Reset

The reset takes effect only after a reboot:

```cmd
:: Reboot immediately
shutdown /r /t 5 /c "TCP/IP stack reset - rebooting"
```

## Checking Network Connectivity After Reboot

```cmd
:: Verify loopback first
ping 127.0.0.1

:: Ping gateway
ipconfig
ping 192.168.1.1

:: Test DNS
nslookup google.com
```

## PowerShell Alternative

```powershell
# There is no direct NetTCPIP cmdlet equivalent for a full TCP/IP stack reset.
# Run the same reset commands from a PowerShell session instead.

netsh int ip reset C:\tcpip-reset.log
netsh winsock reset
```

## Conclusion

`netsh int ip reset` is the nuclear option for Windows TCP/IP stack corruption - it overwrites the TCP/IP and DHCP registry keys used by TCP/IP. If you are also troubleshooting Winsock or DNS resolver issues, `netsh winsock reset` and `ipconfig /flushdns` can help, then reboot. Verify connectivity systematically from loopback outward after the restart.
