# Validation Summary: How to Benchmark Kubernetes API Server Capacity with Realistic LIST, WATCH, and Mutation Workloads

## Status
validated

## Post Type
Technical guide with a ClusterLoader2 command and Kubernetes capacity-testing implementation guidance.

## Technologies Covered
- Kubernetes API server and client-go
- ClusterLoader2 and Go
- LIST pagination, metadata representations, Protobuf, and WATCH recovery
- API Priority and Fairness (APF)
- Admission webhooks, CRDs, server-side apply, and encryption at rest
- etcd 3.6, Raft, and storage performance
- Prometheus and control-plane observability

## Sources Consulted
- ClusterLoader2 repository and framework documentation: https://github.com/kubernetes/perf-tests/tree/master/clusterloader2
- ClusterLoader2 command-line options: https://github.com/kubernetes/perf-tests/blob/master/clusterloader2/README.md
- ClusterLoader2 Getting Started: https://github.com/kubernetes/perf-tests/blob/master/clusterloader2/docs/GETTING_STARTED.md
- ClusterLoader2 command implementation and flag declarations: https://raw.githubusercontent.com/kubernetes/perf-tests/master/clusterloader2/cmd/clusterloader.go
- Upstream load configuration: https://github.com/kubernetes/perf-tests/blob/master/clusterloader2/testing/load/config.yaml
- Upstream measurement module: https://raw.githubusercontent.com/kubernetes/perf-tests/master/clusterloader2/testing/load/modules/measurements.yaml
- Kubernetes API Concepts: https://kubernetes.io/docs/reference/using-api/api-concepts/
- Kubernetes Metrics Reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- API Priority and Fairness: https://kubernetes.io/docs/concepts/cluster-administration/flow-control/
- API health endpoints: https://kubernetes.io/docs/reference/using-api/health-checks/
- Admission controllers: https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/
- Server-Side Apply: https://kubernetes.io/docs/reference/using-api/server-side-apply/
- Kubernetes streaming LIST response encoding: https://v1-34.docs.kubernetes.io/blog/2025/05/09/kubernetes-v1-33-streaming-list-responses/
- etcd 3.6 metrics: https://etcd.io/docs/v3.6/metrics/
- etcd 3.6 performance: https://etcd.io/docs/v3.6/op-guide/performance/

## Issues Found
1. **Incorrect etcd proposal metric types.** The post described pending, failed, and applied proposal metrics collectively as counters. The etcd 3.6 reference identifies `etcd_server_proposals_pending` and `etcd_server_proposals_applied_total` as gauges, and `etcd_server_proposals_failed_total` as a counter. Updated the monitoring sentence to distinguish these types. This avoids treating the pending queue depth as a cumulative event count.

## Review Notes
- Verified the Go entry point and the `--testconfig`, `--provider=kind`, `--kubeconfig`, `--report-dir`, and verbosity usage against upstream documentation and source. The shell example passes a syntax check. Execution requires the external configuration, object templates, kubeconfig, suitable Go toolchain, and an isolated cluster; these are not supplied by the post. No cluster benchmark or failure injection was executed.
- Confirmed that the upstream load test uses object creation, scaling, and deletion phases and includes API responsiveness measurements through its measurement module. Prometheus must be configured for those measurements; merely having an unrelated Prometheus installation is insufficient.
- Reviewed collection pagination, snapshot consistency, expired continuation tokens, metadata-only negotiation, encoding support, watch resource versions, bookmarks, and recovery. Restarting an expired paginated collection is appropriate when preserving a consistent snapshot. Streaming initial events and streaming response encoding are separate mechanisms, and the post correctly asks readers to record their availability.
- Reviewed APF queueing, seats, flow identities, and write-related watch fan-out accounting. The advice to preserve realistic identities, request mixes, client throttling, admission paths, and retry accounting is technically sound.
- Verified the etcd disk histogram names and the relationship between consensus latency, network round trips, and durable storage synchronization. Capacity and headroom values must be measured for the actual deployment; the article does not claim a universal throughput result.
- Metrics and feature availability depend on the pinned Kubernetes release. Some cache and APF metrics are alpha, and the rolling metrics reference can include deprecations for newer versions. Use the tested release's metrics documentation and actual endpoints when implementing dashboards. Container working-set memory and restart counts require container/platform telemetry in addition to API-server process metrics.
- Measuring committed-mutation-to-observer latency requires an explicit timing method; a client submission timestamp is only an approximation of commit time. The post states a measurement objective without supplying such an implementation.
- Checked all eight technical documentation links in the post and confirmed they lead to the intended upstream resources. The author profile is attribution rather than technical evidence. No other technical corrections were required; the post's structure and command were preserved.
