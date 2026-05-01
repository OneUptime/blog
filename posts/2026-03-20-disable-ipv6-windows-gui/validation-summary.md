# Validation Summary: How to Disable IPv6 on Windows via GUI

## Status
validated

## Post Type
Guide

## Technologies Covered
- Windows 10/11 networking
- IPv6
- Network adapter bindings
- `ncpa.cpl`
- `ipconfig`
- `ping`

## Sources Consulted
- Microsoft Learn: Guidance for configuring IPv6 in Windows for advanced users
  https://learn.microsoft.com/en-us/troubleshoot/windows-server/networking/configure-ipv6-in-windows
- Microsoft Support: Essential network settings and tasks in Windows
  https://support.microsoft.com/en-gb/windows/essential-network-settings-and-tasks-in-windows-f21a9bbc-c582-55cd-35e0-73431160a1b9
- Microsoft Support: Setting up a wireless network in Windows
  https://support.microsoft.com/en-us/windows/setting-up-a-wireless-network-in-windows-97914e31-3aa4-406d-cef6-f1629e2c3721
- Microsoft Learn: `ipconfig`
  https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ipconfig
- Microsoft Learn: `ping`
  https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ping
- Microsoft Support: HomeGroup removed from Windows 10 (Version 1803)
  https://support.microsoft.com/en-us/windows/homegroup-from-start-to-finish-9f802c8c-900f-60fb-826f-6fe06add8fe9
- Microsoft Learn: How to disconnect an incoming VPN connection
  https://learn.microsoft.com/en-us/troubleshoot/windows-client/networking/disconnect-incoming-vpn-connection

## Issues Found
- The tag list used `Window` instead of `Windows`. I corrected it to match the actual platform name.
- The Network and Sharing Center navigation was too generic for current Windows releases. I updated it to match Microsoft-documented Windows 10 and Windows 11 paths.
- The Windows Settings section implied there may be a direct GUI toggle for disabling IPv6. I corrected it to state that Settings supports manual IPv6 addressing/DNS configuration, but disabling the IPv6 binding still requires the classic Network Connections / Control Panel path.
- The verification section claimed `ping -6 google.com` should fail with a specific error message. That is not reliable: other interfaces can still provide IPv6 connectivity, and Windows error text varies. I corrected the guidance accordingly.
- The registry comparison overstated `DisabledComponents=0xFF` as a complete system-wide IPv6 disable. Microsoft documents that IPv6 cannot be completely disabled and that loopback/internal use remains available. I corrected the table and summary.
- The Microsoft notes used `HomeGroup` as a current example even though HomeGroup was removed from Windows 10 version 1803. I replaced that wording with current Microsoft guidance.

## Review Notes
- Microsoft recommends preferring IPv4 over IPv6 in prefix policies instead of disabling IPv6 entirely.
- Microsoft also notes that unbinding IPv6 from an Ethernet or Wi-Fi adapter can result in an unsupported Windows configuration.
