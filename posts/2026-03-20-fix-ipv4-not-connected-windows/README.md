# How to Fix 'IPv4 Not Connected' Error on Windows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Window, Not Connected, Troubleshooting, Network

Description: Learn how to fix the 'IPv4 not connected' status in Windows Network and Sharing Center, covering TCP/IP stack resets, driver fixes, and DHCP troubleshooting.

## Step 1: Run the Network Troubleshooter

On current Windows releases, open the **Get Help** app, search for `connect to network and internet`, and select **Run network diagnostics**. The older `msdt.exe /id NetworkDiagnosticsNetworkAdapter` command is deprecated.

## Step 2: Reset the Network Stack

```cmd
REM Run as Administrator
netsh winsock reset
netsh int ip reset resetlog.txt
netsh int ipv6 reset
ipconfig /flushdns
REM If the adapter uses DHCP, renew the lease
ipconfig /release
ipconfig /renew
shutdown /r /t 0
```

## Step 3: Verify Protocol Bindings

```powershell
# Check if IPv4 is enabled on the adapter
Get-NetAdapterBinding -Name "Ethernet" -ComponentID ms_tcpip

# Enable IPv4 if disabled
Enable-NetAdapterBinding -Name "Ethernet" -ComponentID ms_tcpip
```

## Step 4: Update or Roll Back Network Driver

1. Open Device Manager (`devmgmt.msc`)
2. Expand **Network Adapters**
3. Right-click adapter → **Update driver**
4. Or **Roll back driver** if issue started after a recent update

## Step 5: Set Static IP as Test

```powershell
# Replace these example values with an unused IPv4 address, prefix, and gateway from your local subnet
New-NetIPAddress -InterfaceAlias "Ethernet" -IPAddress 192.168.1.50 -PrefixLength 24 -DefaultGateway 192.168.1.1
Set-DnsClientServerAddress -InterfaceAlias "Ethernet" -ServerAddresses 8.8.8.8

# If this works, the problem is likely DHCP-related rather than a basic adapter issue
# Revert to DHCP when done
Remove-NetIPAddress -InterfaceAlias "Ethernet" -IPAddress 192.168.1.50 -Confirm:$false
Set-NetIPInterface -InterfaceAlias "Ethernet" -AddressFamily IPv4 -Dhcp Enabled
Set-DnsClientServerAddress -InterfaceAlias "Ethernet" -ResetServerAddresses
```

## Step 6: Renew DHCP Lease

```cmd
REM Request a fresh DHCP lease
ipconfig /release
REM Brief pause
ping 127.0.0.1 -n 3 > nul
ipconfig /renew

REM Check if IP assigned
ipconfig /all
```

## Conclusion

"IPv4 not connected" is often resolved by first trying `ipconfig /release` followed by `ipconfig /renew` on DHCP-enabled adapters, then `netsh winsock reset` and `netsh int ip reset resetlog.txt` followed by reboot, enabling the IPv4 protocol binding via PowerShell, updating the NIC driver, and testing with a temporary static IP to isolate DHCP-related issues. Work through these steps in order until connectivity is restored.
