# Validation Summary: How to Analyze Network Performance with ss, netstat, and nload on RHEL 9

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux networking
- ss / iproute2
- netstat / net-tools
- nload
- DNF and EPEL package installation

## Sources Consulted
- Local ss(8) man page and `ss --help` output from iproute2.
- Local netstat(8) man page and `netstat --help` output from net-tools.
- Red Hat Enterprise Linux 7 Performance Tuning Guide, "Monitoring and Diagnosing Performance Problems": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/performance_tuning_guide/sect-red_hat_enterprise_linux-performance_tuning_guide-networking-monitoring_and_diagnosing_performance_problems
- Red Hat blog, "How to install EPEL on RHEL and CentOS Stream": https://www.redhat.com/en/blog/install-epel-linux
- Fedora EPEL getting started documentation for RHEL 9: https://docs.fedoraproject.org/en-US/epel/getting-started/
- nload 0.7.4 man page: https://www.mankier.com/1/nload

## Issues Found
- The `ss -t` and `ss -tnp` examples were described as showing all TCP connections. According to ss(8), without `-a`, ss shows open non-listening sockets by default, so the comments now say "Active TCP connections."
- The listening socket comments were too broad. `ss -tlnp` shows listening TCP sockets and `ss -ulnp` shows listening UDP sockets, so the comments were narrowed.
- The connection-count examples used `wc -l` on output with a header line. Added `-H` to suppress headers for accurate counts.
- The RHEL 9 EPEL installation command used `dnf install epel-release`, which is not the documented RHEL 9 path. Updated it to enable CodeReady Builder and install the Fedora EPEL release RPM for RHEL 9.
- The `netstat -s` example was described as showing connections with statistics. The netstat man page defines it as protocol summary statistics, so the comment now says "Protocol statistics."
- The `nload -a 300` comment incorrectly said it set graph height. The nload man page defines `-a` as the average calculation window in seconds, so the comment was corrected.
- The nload graph option was missing. Added a corrected `nload -i 10240` example for incoming graph scale in kBit/s.
- The `ss -tnpi | sort -k5 -n -r | head -10` example was labeled as finding top connections by data transfer, but that sort does not reliably sort by transfer metrics in ss output. Replaced the description and command with a direct `ss -tnpi` example for TCP connection details.
- The SYN-RECV count example also counted the header line. Added `-H` there as well.

## Review Notes
The netstat examples are technically valid, but netstat is obsolete on Linux and retained here only because the post explicitly covers legacy compatibility. The `nload -u M` example is valid for displaying traffic rates in megabytes per second; `-U M` would be used for total traffic amounts.
