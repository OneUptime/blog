# Validation Summary: How to Deploy CockroachDB with ArgoCD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- CockroachDB
- CockroachDB Kubernetes Operator
- Argo CD
- GitOps
- Kubernetes
- Kustomize
- Prometheus Operator ServiceMonitor

## Sources Consulted
- CockroachDB Operator GitHub repository and manifests: https://github.com/cockroachdb/cockroach-operator
- CockroachDB Operator v2.18.3 install manifest: https://raw.githubusercontent.com/cockroachdb/cockroach-operator/v2.18.3/install/operator.yaml
- CockroachDB Operator v2.18.3 CRD schema and example manifest: https://raw.githubusercontent.com/cockroachdb/cockroach-operator/v2.18.3/install/crds.yaml
- CockroachDB Operator documentation: https://www.cockroachlabs.com/docs/stable/deploy-cockroachdb-with-cockroachdb-operator
- CockroachDB Operator resource management documentation: https://www.cockroachlabs.com/docs/stable/configure-cockroachdb-operator
- CockroachDB Kubernetes monitoring documentation: https://www.cockroachlabs.com/docs/stable/monitor-cockroachdb-kubernetes
- CockroachDB Prometheus endpoint documentation: https://www.cockroachlabs.com/docs/stable/prometheus-endpoint
- Argo CD resource hooks documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/resource_hooks/
- Argo CD custom health checks documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/

## Issues Found
- The operator manifest was pinned to `v2.14.0`, which did not include the CockroachDB `v24.2.4` and `v24.3.0` images used later in the post. Updated the manifest URL to `v2.18.3`, which includes those versions.
- The `affinity` and `topologySpreadConstraints` CRD fields were used without enabling the operator's alpha feature gates. Added a Kustomize patch to pass `--feature-gates=AffinityRules=true,TopologySpreadRules=true` to the operator.
- The post showed a separate Argo CD `PostSync` Job for `cockroach init`. The CockroachDB Operator already performs initialization and records the `Initialized` condition. Replaced the Job with status-based initialization verification and removed the init Job from the architecture diagram and conclusion.
- The custom Argo CD health check used `clusterStatus` values such as `Initialized`, `Creating`, and `Initializing`, but the operator reports action statuses such as `Starting`, `Finished`, `Failed`, and `Unknown`, with initialization represented as a condition. Updated the Lua health check to use the `Initialized` condition and mark `Failed` as degraded.
- The ServiceMonitor example scraped a TLS-enabled CockroachDB cluster without TLS configuration. Added the CA secret reference and `serverName` used by CockroachDB's Kubernetes monitoring example.
- The decommissioning section described Argo CD retry backoff as a sync timeout. Reworded it as retry backoff.
- The upgrade section said the operator finalizes upgrades. The operator performs the rolling update; finalization should be monitored in CockroachDB. Reworded the claim.

## Review Notes
- The examples remain illustrative and still require users to adapt repository URLs, storage class names, Prometheus selectors, and namespace conventions for their own clusters.
