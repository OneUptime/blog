# Validation Summary: How to Use Hash-Based Sharding for ArgoCD Controllers

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD application controller
- Kubernetes StatefulSet and Secret resources
- Argo CD sharding algorithms
- Python
- Prometheus/PromQL
- kubectl and argocd CLI commands

## Sources Consulted
- Argo CD High Availability documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD Dynamic Cluster Distribution documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/dynamic-cluster-distribution/
- Argo CD v2.12.0 sharding source code: https://github.com/argoproj/argo-cd/blob/v2.12.0/controller/sharding/sharding.go
- Argo CD v2 sharding package documentation: https://pkg.go.dev/github.com/argoproj/argo-cd/v2/controller/sharding
- Argo CD command parameters/source constants for sharding-related environment variables: https://github.com/argoproj/argo-cd/blob/v2.12.0/common/common.go

## Issues Found
- The post claimed the legacy hash-based algorithm hashes the cluster server URL. Argo CD v2.12 hashes the cluster ID (`c.ID`) with FNV-1a, so the formula, explanation, diagram, pseudocode, and prediction script were updated to use cluster IDs.
- The configuration section said dynamic cluster distribution must be enabled for hash-based sharding. Standard controller sharding with a StatefulSet uses matching `replicas` and `ARGOCD_CONTROLLER_REPLICAS`; dynamic cluster distribution is a separate alpha feature documented as Deployment-based. The configuration was corrected to focus on StatefulSet sharding and an optional sharding algorithm parameter.
- The post listed only `legacy` and `round-robin` algorithms. Argo CD v2.12 also supports `consistent-hashing`, so that option was added.
- The round-robin description said clusters are assigned by creation order. Argo CD's implementation ranks clusters from a list sorted by UID, so the wording was corrected.
- The Python prediction script ignored the command-line replica argument used by the later shell loop. It now reads `sys.argv[1]` when provided.
- The static override example used an annotation (`argocd.argoproj.io/shard`). Argo CD documents manual assignment via the cluster secret's `shard` field, so the example now uses `stringData.shard`.
- The scaling example changed the StatefulSet replica count without updating `ARGOCD_CONTROLLER_REPLICAS`. The command sequence now updates the environment variable before scaling.
- The scaling section gave a precise estimate that roughly 25% of clusters move when scaling from 3 to 4 replicas and a fixed 30-60 second Unknown window. Those claims were softened because modulo reassignment for legacy hashing and controller recovery timing are workload-dependent.

## Review Notes
The post is now technically consistent with Argo CD v2.12 and current Argo CD documentation. Future improvements could mention that dynamic cluster distribution remains an alpha feature and has different deployment mechanics from static StatefulSet sharding.
