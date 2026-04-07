# Validation Summary: How to Set Resources for Rook-Ceph Log Collector

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Kubernetes storage orchestrator)
- Ceph (distributed storage system)
- Kubernetes (container orchestration)
- Fluent Bit (log forwarding)
- Elasticsearch (log storage)

## Sources Consulted
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook log collector PR #6679: https://github.com/rook/rook/pull/6679
- Rook v1.9 CephCluster CRD: https://rook.io/docs/rook/v1.9/ceph-cluster-crd.html

## Issues Found

1. **Incorrect log collector description**: The overview stated the log collector "runs as a sidecar or DaemonSet component depending on Rook configuration." The log collector runs as a sidecar container within each Ceph daemon pod, not as a standalone DaemonSet. Fixed the description to reflect the sidecar implementation.

2. **Incorrect pod naming and commands**: All commands referenced standalone pods named `rook-ceph-logcollector-<node>-<hash>`, which do not exist. The log collector is a sidecar container named `log-collector` within daemon pods. Updated all `kubectl logs` and `kubectl exec` commands to use the correct `-c log-collector` container flag with daemon pod names.

3. **Incomplete periodicity options**: The comment listed valid values as "hourly, daily, weekly" but omitted "monthly" which is also a valid option. Added "monthly" to the list.

4. **Invalid logrotate command**: The post included a command to manually run `logrotate -f /etc/logrotate.d/ceph` inside the log collector container. The sidecar handles log rotation automatically based on the `periodicity` and `maxLogSize` settings in the CephCluster spec. Replaced the manual logrotate command with a note explaining automatic rotation.

5. **Incorrect pod verification command**: `kubectl get pods | grep log` would not find the log collector since it runs as a sidecar, not a standalone pod. Replaced with a command to list daemon pods directly.

## Review Notes
- The `spec.resources.logcollector` and `spec.logCollector` configuration sections are accurate and match the CephCluster CRD specification.
- The Fluent Bit ConfigMap example is a reasonable illustration of external log forwarding, though it is not Rook-specific and would need a full DaemonSet definition to function.
- The sizing guidelines table provides reasonable estimates but these are general recommendations, not values from official documentation. Actual resource needs will vary by workload.
- The `periodicity` field also accepts Go duration strings (e.g., "24h", "1h") in addition to the named values, which is not mentioned in the post but is a minor omission.
