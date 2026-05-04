# Validation Summary: How to Configure TCP Auto-Tuning on Windows Server

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Windows Server (TCP/IP stack)
- TCP receive window auto-tuning (RFC 7323 / RFC 1323)
- PowerShell `NetTCPIP` module (`Get-NetTCPSetting`, `Set-NetTCPSetting`)
- `netsh interface tcp` legacy CLI
- Congestion control algorithms (CUBIC, CTCP, DCTCP, NewReno, LEDBAT, BBR2)
- Receive Side Scaling (RSS), TCP Chimney Offload, NetDMA
- ECN (Explicit Congestion Notification)
- Group Policy / Group Policy Preferences (Registry)
- iperf3 for throughput verification

## Sources Consulted
- [Set-NetTCPSetting (NetTCPIP) — Microsoft Learn](https://learn.microsoft.com/en-us/powershell/module/nettcpip/set-nettcpsetting)
- [Get-NetTCPSetting (NetTCPIP) — Microsoft Learn](https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-nettcpsetting)
- [Network Adapter Performance Tuning in Windows Server — Microsoft Learn](https://learn.microsoft.com/en-us/windows-server/networking/technologies/network-subsystem/net-sub-performance-tuning-nics)
- [Why Are We Deprecating Network Performance Features (KB4014193) — Microsoft Tech Community](https://techcommunity.microsoft.com/blog/coreinfrastructureandsecurityblog/why-are-we-deprecating-network-performance-features-kb4014193/259053)
- [Information about TCP Chimney Offload, RSS, and NetDMA — Microsoft Learn](https://learn.microsoft.com/en-us/troubleshoot/windows-server/networking/information-about-tcp-chimney-offload-rss-netdma-feature)
- [TCP Templates for Windows Server 2019 — Microsoft Tech Community](https://techcommunity.microsoft.com/blog/networkingblog/tcp-templates-for-windows-server-2019-8211-how-to-tune-your-windows-server-trans/339795)
- [RFC 7323 — TCP Extensions for High Performance (obsoletes RFC 1323)](https://datatracker.ietf.org/doc/html/rfc7323)
- [Explore the Cubic congestion control provider for Windows — TechTarget](https://www.techtarget.com/searchwindowsserver/tip/Explore-the-Cubic-congestion-control-provider-for-Windows)

## Issues Found

1. **RFC reference outdated.** Post cited RFC 1323 only; RFC 1323 was obsoleted by RFC 7323 in 2014. Updated wording to "RFC 7323, originally RFC 1323".
2. **Wrong PowerShell parameter name.** Post used `-InitialCongestionWindow`; the correct cmdlet parameter on `Set-NetTCPSetting` is `-InitialCongestionWindowMss` (UInt32, even values 2–64). Replaced the parameter name and corrected the inline comment which had described it as "Set initial RTO" — it sets the initial congestion window in MSS units, not the retransmission timeout.
3. **Misleading section title.** "Step 3: Enable BBR-Equivalent on Windows (CUBIC)" was incorrect — CUBIC is a loss-based congestion control algorithm and is not equivalent to BBR (which is bandwidth-delay-product based). Renamed to "Step 3: Configure Congestion Control (CUBIC)" and rewrote the intro to list the actual valid `CongestionProvider` values (CUBIC, CTCP, DCTCP, NewReno, LEDBAT, BBR2).
4. **Deprecated/removed features presented as current.** TCP Chimney Offload was deprecated in Windows Server 2016 and is disabled by default; NetDMA was removed entirely in Windows 8 / Server 2012, so `netsh interface tcp set global netdma=enabled` is no longer effective. Added a clarifying note in Step 4 and labeled the chimney/netdma commands as legacy reference rather than recommendations.
5. **Fictional Group Policy path.** The post listed `Administrative Templates → Network → TCP/IP Settings → Parameters → EnableTCPChimney = 1` etc. There is no such built-in ADMX template — these values are registry settings under `HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters` and are typically deployed via Group Policy Preferences (Registry). Rewrote Step 5 to reflect this and to use real registry value names (`Tcp1323Opts`, `TcpMaxDataRetransmissions`, `DefaultTTL`); kept the QoS Packet Scheduler reference as that path does exist.

## Review Notes
- The auto-tuning level max-window values in the table (~256 KB / ~1 MB / ~16 MB / ~1 GB) are approximate; Microsoft does not publish precise hard caps for every level, but the orders of magnitude are widely cited and acceptable as a guide.
- DCTCP (Data Center TCP) is generally a better default than CUBIC for east-west datacenter workloads with ECN-capable switches; CUBIC is fine for general/Internet-facing traffic. The post's CUBIC recommendation is a reasonable starting point but datacenter operators may want to evaluate DCTCP.
- The iperf3 sample numbers (962 Mbits/sec → 1.02 Gbits/sec) imply a saturated 1 GbE link, which is a weak demonstration of auto-tuning benefits. Auto-tuning's real impact is most visible on high-BDP WAN paths (≥10 Gbps with ≥50 ms RTT). Left unchanged because they are illustrative example output, but a future revision could pick a more compelling scenario.
- Setting `InitialCongestionWindowMss 10` is effectively a no-op on modern Windows because IW10 is the default; included as is for completeness.
