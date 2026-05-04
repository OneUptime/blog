# How to Configure TCP Auto-Tuning on Windows Server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TCP, Windows Server, Auto-Tuning, Performance, Netsh, PowerShell

Description: Learn how to configure and verify TCP receive window auto-tuning on Windows Server to maximize throughput for high-latency and high-bandwidth network connections.

## What Is TCP Auto-Tuning on Windows?

Windows implements TCP receive window auto-tuning (RFC 7323, originally RFC 1323) which dynamically adjusts the TCP receive window size based on network conditions. This feature was introduced in Vista/Server 2008 and is enabled by default.

The receive window scaling level controls how aggressively Windows expands the TCP window:

| Level | Description | Max Window |
|---|---|---|
| disabled | 64 KB fixed window | 64 KB |
| highlyrestricted | Very conservative scaling | ~256 KB |
| restricted | Conservative scaling | ~1 MB |
| normal | Standard auto-tuning (default) | ~16 MB |
| experimental | Maximum scaling | ~1 GB |

## Step 1: Check Current Auto-Tuning Level

```cmd
REM Check from Command Prompt (run as Administrator)
netsh interface tcp show global

REM Or from PowerShell
Get-NetTCPSetting | Select-Object SettingName, AutoTuningLevelLocal, CongestionProvider
```

## Step 2: Enable or Adjust Auto-Tuning

```powershell
# PowerShell (run as Administrator)

# Check current level

Get-NetTCPSetting -SettingName InternetCustom

# Set to Normal (recommended for most scenarios)
Set-NetTCPSetting -SettingName InternetCustom -AutoTuningLevelLocal Normal

# Set to Experimental for high-bandwidth, high-latency links
Set-NetTCPSetting -SettingName InternetCustom -AutoTuningLevelLocal Experimental

# Or with netsh (legacy method)
netsh interface tcp set global autotuninglevel=normal
```

## Step 3: Configure Congestion Control (CUBIC)

Windows supports several congestion control algorithms including CUBIC, CTCP (Compound TCP), DCTCP (Data Center TCP), NewReno, LEDBAT, and BBR2 (on newer builds). CUBIC is the default on Windows 10 1809 / Server 2019 and later. Optimize it:

```powershell
# View available congestion providers
Get-NetTCPSetting | Select-Object SettingName, CongestionProvider

# Set CUBIC (default on Windows 10 1809 / Server 2019 and later)
Set-NetTCPSetting -SettingName InternetCustom -CongestionProvider CUBIC

# Enable ECN (Explicit Congestion Notification)
Set-NetTCPSetting -SettingName InternetCustom -EcnCapability Enabled

# Set initial congestion window (in MSS units; even values 2-64)
Set-NetTCPSetting -SettingName InternetCustom -InitialCongestionWindowMss 10
```

## Step 4: Configure RSS (and Legacy Offloads)

Receive Side Scaling (RSS) distributes incoming traffic across multiple CPU cores and is the most important offload to verify on modern Windows Server.

> Note: TCP Chimney Offload was deprecated starting with Windows Server 2016 and is disabled by default. NetDMA was removed in Windows 8 / Server 2012; the `netdma` netsh option is no longer effective on supported Windows Server versions. Both commands below are included only for legacy reference.

```powershell
# Enable Receive Side Scaling (RSS)
netsh interface tcp set global rss=enabled

# Check RSS state
netsh interface tcp show global | findstr "RSS"

# Legacy: TCP Chimney Offload (deprecated in Server 2016+)
netsh interface tcp set global chimney=enabled

# Legacy: NetDMA (removed in Windows 8 / Server 2012)
netsh interface tcp set global netdma=enabled
```

## Step 5: Tune with Group Policy (Enterprise)

There is no built-in Administrative Template for the TCP stack tuning values, so for domain-joined Windows servers these are typically deployed via Group Policy Preferences (Registry) under `HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters`:

```text
Computer Configuration
  → Preferences
    → Windows Settings
      → Registry
        → HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters
          → Tcp1323Opts (DWORD) = 3      # enable window scaling + timestamps
          → TcpMaxDataRetransmissions    # tune retransmission count
          → DefaultTTL                   # default IP TTL
```

QoS-related settings are configured separately under `Computer Configuration → Administrative Templates → Network → QoS Packet Scheduler`.

## Step 6: Test and Verify Throughput

```powershell
# Install iperf3 on Windows
# Download from: https://iperf.fr/iperf-download.php

# Test throughput
.\iperf3.exe -c server-ip -t 30 -P 4

# Before experimental:
# [SUM] 0.00-30.00 sec  3.36 GBytes   962 Mbits/sec   sender

# After experimental auto-tuning:
# [SUM] 0.00-30.00 sec  3.58 GBytes  1.02 Gbits/sec   sender
```

## Step 7: Troubleshoot When Auto-Tuning Causes Issues

Some applications or firewalls break with large receive windows. Restrict auto-tuning:

```cmd
REM Restrict if Windows Update or browsing is slow
netsh interface tcp set global autotuninglevel=restricted

REM Or disable completely (not recommended)
netsh interface tcp set global autotuninglevel=disabled

REM Re-enable when issue is resolved
netsh interface tcp set global autotuninglevel=normal
```

## Conclusion

Windows TCP auto-tuning should remain at `normal` or `experimental` for high-performance servers. Use `Get-NetTCPSetting` to inspect and `Set-NetTCPSetting` to configure. Enable RSS for multi-queue NIC support. For high-latency WAN connections (datacenter-to-datacenter), `experimental` mode allows the largest receive windows and typically improves throughput by 20-50% versus the default `normal` setting.
