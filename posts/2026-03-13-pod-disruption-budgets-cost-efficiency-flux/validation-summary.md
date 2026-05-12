# Validation Summary: How to Configure Pod Disruption Budgets for Cost Efficiency with Flux

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Kubernetes PodDisruptionBudget (policy/v1)
- Flux CD (kustomize.toolkit.fluxcd.io/v1)
- Cluster Autoscaler
- kubectl (drain, get, describe)
- Kubernetes CronJob (batch/v1)
- jq (PDB JSON parsing)
- bitnami/kubectl container image

## Sources Consulted
- Kubernetes PodDisruptionBudget docs: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes PDB tasks: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes policy/v1 API reference: https://kubernetes.io/docs/reference/kubernetes-api/policy-resources/pod-disruption-budget-v1/
- Flux Kustomization API: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux health checks: https://fluxcd.io/flux/components/kustomize/kustomizations/#health-checks
- kubectl drain reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#drain
- Cluster Autoscaler FAQ on PDBs: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/FAQ.md
- kstatus library for generic resource health checks: https://github.com/kubernetes-sigs/cli-utils/tree/master/pkg/kstatus

## Issues Found
- **`kubectl drain` dry-run flag**: The post used a bare `--dry-run` flag. Since kubectl 1.18, `--dry-run` is a string flag requiring an argument (`none`, `client`, or `server`); passing it without a value errors with "flag needs an argument: --dry-run". Updated to `--dry-run=client` to match current kubectl behavior.

## Review Notes
- The `policy/v1` PDB API is correct (GA since Kubernetes 1.21).
- Percentage rounding for `minAvailable`: Kubernetes rounds the resulting absolute count *up*, so `minAvailable: "75%"` with 4 replicas yields 3 (1 disruption allowed) — matches the comment in the post.
- The claim that a 2-replica deployment with `minAvailable: 2` blocks all drains is accurate (zero disruptions allowed).
- Including a `PodDisruptionBudget` in Flux `healthChecks` is valid — Flux uses the kstatus library, which falls back to generic Conditions-based health computation for resource kinds without dedicated rules. The PDB will be reported as Current once `status.currentHealthy >= status.desiredHealthy`.
- `--delete-emptydir-data` is the current flag name (renamed from `--delete-local-data` in Kubernetes 1.20).
- The CronJob schedule expression and `batch/v1` API are correct.
- The `bitnami/kubectl:1.29` image tag is valid; consumers may want to bump to a newer minor as their cluster upgrades.
- The jq audit filter for `minAvailable == "100%"` only catches the string form; a numeric `minAvailable` equal to the replica count produces the same effect but won't be flagged. This is an opportunity for a future enhancement but not a technical error.
