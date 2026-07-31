# Validation Summary: Agent-Based vs Agentless Infrastructure Metrics: Why the Numbers Do Not Match

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Prometheus and PromQL
- Prometheus node exporter
- Prometheus SNMP exporter and SNMP interface counters
- Linux `/proc` and `/sys` metrics
- AWS CloudWatch and the CloudWatch agent
- Azure Monitor for virtual machines
- Google Cloud Monitoring and the Ops Agent
- Hypervisor, storage, filesystem, disk I/O, and network metrics

## Sources Consulted
- [Prometheus node exporter documentation](https://github.com/prometheus/node_exporter)
- [Prometheus node exporter CPU collector source](https://github.com/prometheus/node_exporter/blob/master/collector/cpu_linux.go)
- [Prometheus node exporter filesystem collector source](https://github.com/prometheus/node_exporter/blob/master/collector/filesystem_common.go)
- [Prometheus query functions](https://prometheus.io/docs/prometheus/latest/querying/functions/)
- [Prometheus querying basics](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Prometheus 3.0 migration guide](https://prometheus.io/docs/prometheus/3.5/migration/)
- [Prometheus SNMP exporter documentation](https://github.com/prometheus/snmp_exporter)
- [Linux kernel `/proc` documentation](https://docs.kernel.org/filesystems/proc.html)
- [Linux kernel I/O statistics documentation](https://docs.kernel.org/admin-guide/iostats.html)
- [Linux kernel network-interface statistics documentation](https://docs.kernel.org/networking/statistics.html)
- [RFC 2863: The Interfaces Group MIB](https://datatracker.ietf.org/doc/html/rfc2863)
- [RFC 2578: Structure of Management Information Version 2](https://datatracker.ietf.org/doc/html/rfc2578)
- [AWS EC2 basic and detailed monitoring](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/manage-detailed-monitoring.html)
- [AWS CloudWatch agent metric definitions](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/metrics-collected-by-CloudWatch-agent.html)
- [AWS CloudWatch statistics definitions](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Statistics-definitions.html)
- [Azure virtual machine monitoring](https://learn.microsoft.com/en-us/azure/virtual-machines/monitor-vm)
- [Google Cloud Ops Agent metrics](https://cloud.google.com/monitoring/api/metrics_opsagent)
- [Google Cloud Compute Engine metrics](https://cloud.google.com/monitoring/api/metrics_gcp_c)

## Issues Found
- The post originally said an agentless source is collected outside the guest or managed host. This was too broad because an external collector can use a remote shell or management protocol to read measurements from inside the guest. The wording now distinguishes the collector's location from the measurement boundary.
- The post originally described left-open, right-closed Prometheus range selectors without a version qualifier. That behavior began in Prometheus 3.0; Prometheus 2.x range selectors included both boundaries. The text now states both version-specific behaviors.

## Review Notes
- All five PromQL examples are syntactically valid and use appropriate functions for their metric types.
- `instance:node_cpu_utilization:ratio1m` is an illustrative recording-rule name and must already exist before the `avg_over_time()` example returns data.
- The external documentation links were reachable and pointed to the intended official resources at review time.
