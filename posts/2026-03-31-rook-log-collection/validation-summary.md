# Validation Summary: How to Configure Log Collection Settings in Rook-Ceph

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph (distributed storage system, Squid v19.2.0)
- Kubernetes (CephCluster CRD, pods, DaemonSets, ConfigMaps)
- Fluent Bit (log forwarding agent)
- Loki (log aggregation backend)

## Sources Consulted
- [Rook CephCluster CRD source code (types.go)](https://raw.githubusercontent.com/rook/rook/master/pkg/apis/ceph.rook.io/v1/types.go) — Verified `LogCollectorSpec` struct fields (`enabled`, `periodicity`, `maxLogSize`) and the kubebuilder validation pattern for periodicity: `^$|^(hourly|daily|weekly|monthly|1h|24h|1d)$`
- [Rook example cluster.yaml](https://raw.githubusercontent.com/rook/rook/master/deploy/examples/cluster.yaml) — Confirmed `logCollector` YAML structure, periodicity values (`hourly`, `daily`, `weekly`, `monthly`), and `maxLogSize` format (`500M`, suffix `M` or `G`)
- [Rook CephCluster CRD documentation](https://raw.githubusercontent.com/rook/rook/master/Documentation/CRDs/Cluster/ceph-cluster-crd.md) — Confirmed log collector runs as a sidecar next to each Ceph daemon and handles log rotation
- [Ceph Logging and Debugging documentation](https://docs.ceph.com/en/latest/rados/troubleshooting/log-and-debug/) — Verified debug level format (`log-level/memory-level`), confirmed default `debug_osd` is `1/5`

## Issues Found

### 1. Mermaid diagram incorrectly showed sidecar shipping logs to external aggregator
- **What was wrong:** The diagram labeled the logcollector sidecar as "rotates + ships logs" and drew an arrow directly from the sidecar to an external log aggregator (Fluentd/Loki). The Rook log collector sidecar only rotates log files — it does not ship logs to external systems.
- **What was changed:** Updated the diagram to label the sidecar as "rotates logs" and added a separate Fluent Bit DaemonSet node that reads rotated logs from the hostPath and forwards them to the external aggregator. This matches the architecture described later in the post's "Shipping Logs to an External Aggregator" section.
- **Why:** The original diagram was misleading about the sidecar's capabilities and contradicted the post's own later explanation of needing Fluent Bit for external log shipping.

### 2. Incorrect default value for `debug_osd` reset
- **What was wrong:** The command to reset `debug_osd` after debugging used value `0/5`, with a comment saying "Reset to default after debugging." The actual default for `debug_osd` in Ceph is `1/5` (log level 1, memory level 5).
- **What was changed:** Changed `0/5` to `1/5` in the reset command.
- **Why:** Using `0/5` would suppress all OSD log output (log level 0), which is more restrictive than the default and could hide important operational messages.

## Review Notes
- The post correctly uses named periodicity values (`hourly`, `daily`, `weekly`, `monthly`). The Rook CRD also accepts duration-based values (`1h`, `24h`, `1d`) as alternatives, but both formats are valid per the kubebuilder validation pattern.
- Ceph v19.2.0 (Squid) is a valid release. Newer patch versions (e.g., v19.2.2) exist but the version used is not outdated enough to warrant a change.
- The Fluent Bit configuration example is reasonable and functional, though in production users would likely need additional configuration (parsers, filters, buffer tuning) beyond what is shown.
