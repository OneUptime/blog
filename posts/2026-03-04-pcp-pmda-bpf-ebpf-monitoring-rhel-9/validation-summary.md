# Validation Summary: How to Use the pcp-pmda-bpf Agent for eBPF-Based Monitoring on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Performance Co-Pilot (PCP)
- pcp-pmda-bpf / pmdabpf
- eBPF, BPF CO-RE, libbpf, BTF
- pmlogger, pmval, pmrep, pminfo
- Grafana PCP integration

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "New PCP PMDA - pmdabpf": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/considerations_in_adopting_rhel_9/assembly_performance_considerations-in-adopting-rhel-9
- Red Hat Enterprise Linux 9 documentation, "Logging performance data with pmlogger": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/logging-performance-data-with-pmlogger_monitoring-and-managing-system-status-and-performance
- pmdabpf(1) man page: https://www.man7.org/linux/man-pages/man1/pmdabpf.1.html
- Performance Co-Pilot upstream pmdabpf configuration file: https://github.com/performancecopilot/pcp/blob/main/src/pmdas/bpf/bpf.conf
- Performance Co-Pilot upstream BPF module sources: https://github.com/performancecopilot/pcp/tree/main/src/pmdas/bpf/modules
- Grafana Labs Performance Co-Pilot plugin page: https://grafana.com/grafana/plugins/performancecopilot-pcp-app/

## Issues Found
- The package installation command included `bcc`, but `pmdabpf` uses BPF CO-RE with libbpf and BTF rather than the BCC runtime. Removed `bcc` from the install command.
- The run queue metric was listed as `bpf.runqlat.usecs`, but the current pmdabpf runqlat module exports `bpf.runq.latency` with nanosecond units. Updated the metric name and description.
- The block I/O metric was listed as `bpf.biolatency.usecs`, but the current biolatency module exports `bpf.disk.all.latency`. Updated the metric name.
- The post referenced `bpf.tcplife.*` metrics and a `tcplife` module, but the current pmdabpf modules include `tcpconnect` and `tcpconnlat`, not `tcplife`. Updated the examples to `bpf.tcpconnect.pid` and `bpf.tcpconnect.comm`.
- The BPF PMDA configuration example used a non-existent `[bpf] enabled_modules = ...` format. Replaced it with per-module INI sections such as `[runqlat.so] enabled = true`, matching the upstream configuration file and pmdabpf man page.
- The pmlogger example used non-existent subtree names and invalid interval syntax. Updated it to use `log mandatory on every 10 seconds` with the corrected metric names.
- The pmlogger configuration path and append style were misleading for RHEL's primary logger configuration. Updated the instructions to edit `/var/lib/pcp/config/pmlogger/config.default` and add the block before the `[access]` section.
- The troubleshooting section recommended installing kernel headers, which is BCC-oriented and not the key requirement for pmdabpf. Replaced it with a check for `/sys/kernel/btf/vmlinux`.

## Review Notes
- The archive replay example assumes the archive basename uses the current date and `.0` volume. That is common for PCP primary logger archives, but archive naming can vary by local pmlogger configuration and rotation/compression settings.
