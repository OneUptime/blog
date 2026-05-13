# Validation Summary: Optimize Calico etcd RBAC

## Status
validated

## Post Type
Tutorial / Optimization guide

## Technologies Covered
- Calico (Felix, calicoctl, Typha)
- Kubernetes (FelixConfiguration CRD, calico-node DaemonSet)
- etcd v3 (RBAC, metrics, gRPC interface)
- Prometheus (alerting, etcd metrics, go-grpc-prometheus)

## Sources Consulted
- etcd RBAC documentation (v3.5): https://etcd.io/docs/v3.5/op-guide/authentication/rbac/
- etcd configuration flags: https://etcd.io/docs/v3.5/op-guide/configuration/
- etcd metrics reference (v3.5): https://etcd.io/docs/v3.5/metrics/etcd-metrics-latest/
- Calico FelixConfiguration reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico datastore migration guide: https://docs.tigera.io/calico/latest/operations/datastore-migration
- Calico node configuration: https://docs.tigera.io/calico/latest/reference/configure-calico-node
- calicoctl etcd configuration: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/etcd
- go-grpc-prometheus: https://github.com/grpc-ecosystem/go-grpc-prometheus
- kube-prometheus etcdGRPCRequestsSlow runbook: https://runbooks.prometheus-operator.dev/runbooks/etcd/etcdgrpcrequestsslow/

## Issues Found

1. **Optimization 3 - Fabricated FelixConfiguration field `etcdDriverPollInterval`.**
   - The original section advised tuning a non-existent FelixConfiguration field via `kubectl patch felixconfiguration default --patch '{"spec":{"etcdDriverPollInterval":"10s"}}'`. No such field exists in Calico's FelixConfiguration CRD — Felix uses event-driven watches and exposes no etcd poll/watch tunable.
   - Replaced with a recommendation to use Typha (the documented Calico mechanism for consolidating Felix watches and reducing datastore load) plus accurate `kubectl get` commands to verify the deployment.

2. **Optimization 4 - Fabricated metric name `etcd_grpc_unary_requests_duration_seconds_bucket`.**
   - This Prometheus metric does not exist in etcd. The correct etcd histogram for gRPC unary request latency is `grpc_server_handling_seconds_bucket` (from go-grpc-prometheus) with labels `grpc_service`, `grpc_method`, `grpc_type`, `grpc_code`, and `le`.
   - Replaced the alert expression to use `grpc_server_handling_seconds_bucket` with a proper `sum by (le) (rate(...))` wrap (which `histogram_quantile` requires) and accurate label filters (`grpc_method="Range"`, `grpc_type="unary"`).

3. **Optimization 4 - Fabricated metric prefix `etcd_auth_*`.**
   - etcd does not expose metrics under an `etcd_auth_` prefix. Replaced the `grep` with a filter on the real generic gRPC metrics restricted to the `etcdserverpb.Auth` service.
   - Also added a one-line qualifier that port 2381 is the kubeadm convention (set via `--listen-metrics-urls`), since upstream etcd serves `/metrics` on the client port 2379 by default.

4. **Optimization 5 - Missing datastore migration lock/unlock steps and incorrect env var name in the DaemonSet.**
   - The documented migration procedure requires `calicoctl datastore migrate lock` before export and `calicoctl datastore migrate unlock` after import. Added both.
   - The original comment referenced `CALICO_DATASTORE_TYPE=kubernetes in DaemonSet`. The DaemonSet's calico-node container uses `DATASTORE_TYPE` (the `CALICO_` prefix is only an accepted alias for the calicoctl CLI). Updated the comment accordingly.

## Review Notes

- Verified `etcd_server_slow_read_indexes_total` is a real etcd metric and left it as-is.
- Verified `etcdctl role grant-permission <role> --prefix=true <read|write|readwrite> <key>` is the correct syntax.
- The RBAC consolidation and prefix-permission optimizations (Optimizations 1 and 2) are technically sound; etcd's authorization layer evaluates permissions per request and prefix permissions are matched more efficiently than long lists of exact keys.
- The Typha replacement in Optimization 3 changes the mechanism but preserves the section's intent (reducing datastore watch/auth load). This is the actual Calico-recommended approach for large clusters.
- Calico's etcdv3 backend is still supported, but newer Calico documentation increasingly recommends the Kubernetes API datastore mode — the post's conclusion about migrating to KDD remains current advice.
