# How to Fix 'DHCP Is Not Enabled for WiFi' Error

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DHCP, WiFi, Window, Troubleshooting, Network

Description: Learn how to fix the 'DHCP is not enabled for WiFi' error message that appears when running the Windows network troubleshooter, by re-enabling automatic IP addressing.

## What Causes This Error?

This error usually appears when the WiFi adapter is configured to use a manual IP address instead of obtaining one automatically with DHCP. The Windows troubleshooter reports it when the adapter is not set to automatic IP assignment.

## Step 1: Re-enable DHCP via Settings

1. Settings → Network & Internet → WiFi
2. Click **Manage known networks** → select the WiFi network
3. Next to **IP assignment**, click **Edit**
4. Change to **Automatic (DHCP)**
5. Click Save

## Step 2: Re-enable DHCP via PowerShell

```powershell
# Run as Administrator

# Re-enable DHCP for Wi-Fi adapter

Set-NetIPInterface -InterfaceAlias "Wi-Fi" -AddressFamily IPv4 -Dhcp Enabled

# Clear any static DNS settings
Set-DnsClientServerAddress -InterfaceAlias "Wi-Fi" -ResetServerAddresses

# Release and renew
ipconfig /release "Wi-Fi"
ipconfig /renew "Wi-Fi"

# Verify DHCP is now used
Get-NetIPInterface -InterfaceAlias "Wi-Fi" -AddressFamily IPv4 | Select-Object Dhcp
# Should show: Enabled
```

## Step 3: Use netsh Command

```cmd
REM Re-enable DHCP for Wi-Fi
netsh interface ipv4 set address name="Wi-Fi" source=dhcp
netsh interface ipv4 set dnsservers name="Wi-Fi" source=dhcp

REM Verify
netsh interface ipv4 show config name="Wi-Fi"
REM Should show: "DHCP Enabled: Yes"
```

## Step 4: Check Group Policy (Corporate Networks)

On domain-joined machines, review applied policies if the setting keeps changing back after you re-enable DHCP:

```cmd
REM Save an HTML report of applied Group Policy
gpresult /h gp-report.html
```

Open `gp-report.html` and contact your IT administrator if a policy or logon/startup script is reapplying the adapter settings.

## Step 5: Reset Adapter and Renew

```powershell
# Disable adapter
Disable-NetAdapter -Name "Wi-Fi" -Confirm:$false
Start-Sleep -Seconds 3

# Re-enable (ensures fresh start)
Enable-NetAdapter -Name "Wi-Fi"
Start-Sleep -Seconds 5

# Renew DHCP
ipconfig /renew "Wi-Fi"
ipconfig /all
```

## Conclusion

"DHCP is not enabled" usually means the WiFi adapter is not set to obtain an IP address automatically. Fix via Settings → Network & Internet → WiFi → Manage known networks → IP assignment → Automatic (DHCP), or via PowerShell with `Set-NetIPInterface -AddressFamily IPv4 -Dhcp Enabled`. On corporate/domain machines, verify a policy or script isn't reapplying the settings. After enabling DHCP, run `ipconfig /renew` to obtain a new address from the DHCP server.
