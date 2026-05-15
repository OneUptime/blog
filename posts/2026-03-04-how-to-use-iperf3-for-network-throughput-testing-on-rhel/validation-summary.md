# Validation Summary: How to Use iperf3 for Network Throughput Testing on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- iperf3
- firewalld
- DNF
- TCP, UDP, and SCTP throughput testing
- JSON output with jq

## Sources Consulted
- ESnet iperf3 documentation: Invoking iperf3: https://software.es.net/iperf/invoking.html
- ESnet iperf3 documentation: Obtaining iperf3: https://software.es.net/iperf/obtaining.html
- Red Hat Enterprise Linux 9 documentation: Tuning the network performance, including TCP and UDP throughput tests with iperf3: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/tuning-the-network-performance_monitoring-and-managing-system-status-and-performance
- Red Hat Enterprise Linux 9 documentation: Managing software with the DNF tool: https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/pdf/managing_software_with_the_dnf_tool/red_hat_enterprise_linux-9-managing_software_with_the_dnf_tool-en-us.pdf

## Issues Found
No technical issues found.

## Review Notes
The post is technically accurate for current RHEL usage. Red Hat's documentation notes that UDP tests still use a TCP control connection first, so opening both TCP and UDP on port 5201 for UDP testing is correct. The `--bidir` example requires an iperf3 version that supports bidirectional mode; current upstream iperf3 and RHEL 9-era iperf3 packages support this option.
