# How to Reset Winsock Catalog on Windows with netsh winsock reset

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Window, Networking, Winsock, Netsh, Troubleshooting, Network Reset

Description: Reset the Windows Winsock catalog to its default state using netsh winsock reset to fix application-level network failures caused by corrupted LSP (Layered Service Provider) entries.

## Introduction

The Winsock catalog is a Windows registry database that lists Winsock providers, including Layered Service Providers (LSPs) - software that intercepts network API calls. Malware, antivirus software, and some VPN clients can corrupt or leave broken LSP entries after uninstallation, causing application-level network failures even when the TCP/IP stack appears healthy.

## Symptoms of Winsock Corruption

- Web browsers cannot connect but `ping` works
- Applications fail with "A socket error occurred" or "WinSock error"
- Internet access works for some applications but not others
- After removing antivirus or VPN software, internet access breaks

## Resetting the Winsock Catalog

From an **elevated** (Administrator) command prompt:

```cmd
netsh winsock reset
```

Expected output:

```text
Successfully reset the Winsock Catalog.
You must restart the computer in order to complete the reset.
```

## Saving the Current Catalog Before Resetting

```cmd
netsh winsock show catalog > C:\winsock-catalog-before-reset.txt
netsh winsock reset
type C:\winsock-catalog-before-reset.txt
```

## Viewing the Current Winsock Catalog

Before resetting, you can inspect the current Winsock catalog:

```cmd
:: List all Winsock providers currently registered
netsh winsock show catalog
```

Look for entries that are not from Microsoft or known trusted vendors - these may be corrupt or leftover from uninstalled software.

## Full Network Reset Sequence

Combine Winsock and TCP/IP reset for a comprehensive repair:

```cmd
@echo off
echo Resetting Winsock catalog...
netsh winsock reset

echo Resetting TCP/IP stack...
netsh int ip reset

echo Flushing DNS cache...
ipconfig /flushdns

echo Releasing DHCP lease...
ipconfig /release

echo Clearing ARP cache...
netsh interface ipv4 delete arpcache

echo All resets complete. Rebooting in 10 seconds...
shutdown /r /t 10
```

## After Reboot

```cmd
:: Verify the Winsock catalog
netsh winsock show catalog

:: Test basic connectivity
ping 127.0.0.1
ping 8.8.8.8
nslookup google.com
```

If the browser still cannot connect but ping works, check proxy settings:

```cmd
netsh winhttp show proxy
```

## Removing Stuck LSPs Without Full Reset

If only specific LSPs are causing issues:

```cmd
:: List Winsock providers with their catalog IDs
netsh winsock show catalog

:: Remove a specific LSP by catalog ID shown in the catalog output
:: (Full reset is safer; use targeted removal only if you know the exact LSP)
set /p CATALOG_ID=Enter catalog ID to remove:
netsh winsock remove provider %CATALOG_ID%
```

## Conclusion

`netsh winsock reset` is the go-to fix when applications lose network access while ping still works, pointing to an LSP-level corruption rather than a TCP/IP stack issue. Combine it with `netsh int ip reset` for a thorough network stack repair. Always reboot after both commands.
