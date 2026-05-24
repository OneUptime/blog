# Validation Summary: How to Create Kubernetes Deployments with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (>= 1.0)
- HashiCorp Kubernetes provider (~> 2.25)
- Kubernetes Deployments, ConfigMaps, Secrets
- Pod health probes (liveness, readiness, startup)
- Rolling update strategy, topology spread constraints
- Volumes (PVC, ConfigMap, emptyDir)
- Terraform `lifecycle.ignore_changes`

## Sources Consulted
- HashiCorp Kubernetes provider — `kubernetes_deployment_v1`: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/deployment_v1
- HashiCorp Kubernetes provider — `kubernetes_secret_v1`: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/secret_v1
- HashiCorp Kubernetes provider source: https://github.com/hashicorp/terraform-provider-kubernetes
- Terraform `lifecycle` meta-argument: https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle
- Kubernetes Deployment docs: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Pod topology spread constraints: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/

## Issues Found
1. **Double base64 encoding in `kubernetes_secret`** — The original post wrapped secret values in `base64encode("...")`. The hashicorp/kubernetes provider's `data` field already base64-encodes plain string values automatically; using `base64encode()` results in double encoding (values would be unusable in the cluster). Fixed by passing plain strings and adding a short note that `binary_data` is the correct field for already-encoded values.
2. **Misleading inline comment on `min_ready_seconds`** — The comment said "Wait 60 seconds after a pod is ready before continuing the rollout" but the value was `10`. Updated the comment to "Wait 10 seconds…" so it matches the actual setting.

## Review Notes
- All `kubernetes_deployment` blocks/fields used (`startup_probe`, `topology_spread_constraint`, `min_ready_seconds`, `revision_history_limit`, `env_from { config_map_ref { name = ... } }`, `lifecycle.ignore_changes = [spec[0].replicas]`) are valid in the 2.x line of the provider.
- The `max_surge`/`max_unavailable` values are quoted strings ("1"); the provider accepts both numeric and percentage-string forms, so this works, though either `1` or `"25%"` would be more idiomatic depending on intent.
- `nginx:1.25-alpine` is a real tag; if/when nginx 1.27+ becomes the long-term default, the example may want to be bumped, but it is not currently incorrect.
- Provider version `~> 2.25` is current at time of review.
