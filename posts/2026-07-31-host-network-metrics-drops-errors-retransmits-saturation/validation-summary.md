# Validation Summary: Which Network Metrics Catch Host Problems? Drops, Errors, and Saturation

## Status
validated

## Post Type
Technical guide / operational monitoring reference

## Technologies Covered
- Linux network interface statistics
- TCP SNMP counters
- Prometheus and PromQL
- Prometheus alerting rules
- Prometheus Node Exporter `netclass`, `netdev`, `netstat`, `ethtool`, and `qdisc` collectors
- Network drop, error, retransmission, packet-rate, and utilization monitoring

## Sources Consulted
- Linux kernel interface statistics and counter definitions: https://docs.kernel.org/networking/statistics.html
- Linux kernel TCP and SNMP counter documentation: https://docs.kernel.org/networking/snmp_counter.html
- Prometheus Node Exporter 1.12.1 release: https://github.com/prometheus/node_exporter/releases/tag/v1.12.1
- Node Exporter 1.12.1 netclass collector source: https://github.com/prometheus/node_exporter/blob/v1.12.1/collector/netclass_linux.go
- Node Exporter 1.12.1 netdev common metric mapping: https://github.com/prometheus/node_exporter/blob/v1.12.1/collector/netdev_common.go
- Node Exporter 1.12.1 Linux netdev collector source: https://github.com/prometheus/node_exporter/blob/v1.12.1/collector/netdev_linux.go
- Node Exporter 1.12.1 netstat collector source and default field filter: https://github.com/prometheus/node_exporter/blob/v1.12.1/collector/netstat_linux.go
- Node Exporter 1.12.1 ethtool collector source: https://github.com/prometheus/node_exporter/blob/v1.12.1/collector/ethtool_linux.go
- Node Exporter 1.12.1 qdisc collector source: https://github.com/prometheus/node_exporter/blob/v1.12.1/collector/qdisc_linux.go
- Node Exporter collector guidance: https://github.com/prometheus/node_exporter#collectors
- Prometheus `rate()` documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/#rate
- Prometheus binary operators and vector matching: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus alerting-rule configuration: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus rule-file syntax and `promtool` validation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/#syntax-checking-rules

## Issues Found
- The post said an absolute counter condition would remain true forever after one drop. Corrected this to explain that it remains true until the interface counter resets, such as after interface recreation or a host reboot.
- The receive-drop formula was described as an observed share even though Linux does not guarantee that `rx_packets` and drop accounting are mutually exclusive. Reframed it as a diagnostic ratio and documented that hardware `rx_packets` can include packets dropped later by the host, while Node Exporter's default legacy drop metric folds `rx_missed_errors` into `node_network_receive_drop_total`.
- The directional byte-rate ratios were presented as link utilization without distinguishing byte counters from exact on-wire occupancy. Clarified that they are utilization estimates because IEEE 802.3 byte counters exclude the frame check sequence and do not represent all wire overhead.

## Review Notes
All metric names and default/optional collector claims were checked against Node Exporter 1.12.1, the current release on the validation date. The complete YAML alert example and its PromQL expression passed `promtool` 3.13.2 validation with one rule found. The default `TcpOutSegs` denominator includes control segments; Linux documents `TcpExtTCPOrigDataSent` as a more workload-focused retransmission denominator, but Node Exporter's default netstat field filter does not export it. The post correctly labels its `TcpOutSegs`-based ratio as a diagnostic indicator rather than a packet-loss percentage.
