# Validation Summary: How to Perform CPU and Memory Stress Testing with stress-ng on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- stress-ng
- DNF
- sysstat tools: sar and mpstat
- procps-ng tools: vmstat

## Sources Consulted
- Red Hat Enterprise Linux 9 package manifest: https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/pdf/package_manifest/red_hat_enterprise_linux-9-package_manifest-en-us.pdf
- Red Hat Enterprise Linux 9 DNF documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/assembly_installing-rhel-9-content_managing-software-with-the-dnf-tool
- Red Hat Enterprise Linux for Real Time 9 stress-ng documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_real_time/9/html/optimizing_rhel_9_for_real_time_for_low_latency_operation/assembly_stress-testing-real-time-systems-with-stress-ng_optimizing-rhel9-for-real-time-for-low-latency-operation
- Upstream stress-ng manual page: https://raw.githubusercontent.com/ColinIanKing/stress-ng/master/stress-ng.1

## Issues Found
- The memory stress test comment said the command allocated and stressed 4 GB of memory. The upstream stress-ng manual describes `--vm-bytes` as memory shared by the VM stressors, so `--vm 2 --vm-bytes 2G` targets 2 GB total, not 4 GB. Updated the comment to say 2 GB.

## Review Notes
stress-ng metrics are useful for relative observation and capacity baselining, but upstream documentation cautions that bogo operations are not a precise benchmark metric. The post's examples otherwise use valid stress-ng, DNF, sar, vmstat, and mpstat command syntax for RHEL 9.
