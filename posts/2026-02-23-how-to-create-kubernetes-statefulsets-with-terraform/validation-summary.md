# Validation Summary: How to Create Kubernetes StatefulSets with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (>= 1.0)
- HashiCorp Kubernetes provider (~> 2.25)
- Kubernetes StatefulSets, Services (headless), PersistentVolumeClaims
- PostgreSQL 16 (alpine image)
- Redis 7 (alpine image)

## Sources Consulted
- Terraform Registry — `kubernetes_stateful_set_v1`: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/stateful_set_v1
- Terraform Registry — `kubernetes_service`: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/service
- Kubernetes docs — StatefulSets: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes docs — Headless Services: https://kubernetes.io/docs/concepts/services-networking/service/#headless-services
- PostgreSQL 16 docs — `pg_isready`: https://www.postgresql.org/docs/16/app-pg-isready.html

## Issues Found
1. **Misleading PGDATA comment** — The original comment on the `PGDATA` env var said "Use the pod name as PGDATA to ensure each pod has its own data dir," but the value does not include the pod name. Rewrote the comment to reflect the real reason (a subdirectory avoids `initdb` failing on the PVC's `lost+found` directory).
2. **Inconsistent partition comment** — In the rolling-update example, the inline comment said "Only update pods with ordinal >= 3 (useful for canary updates)" while the actual value was `partition = 0`. Rewrote the comment to accurately describe that `partition = 0` updates all pods and that higher values enable canary-style rollouts.

## Review Notes
- The Terraform Kubernetes provider's bare `kubernetes_stateful_set` resource (used in the post) is deprecated in favor of `kubernetes_stateful_set_v1` and is removed in provider v3. For provider versions in the `~> 2.25` range used in the post, both still work and produce identical results, but readers upgrading to provider v3+ will need to switch to the `_v1` suffixed resource.
- `target_port` on the headless Service is technically ignored when `cluster_ip = "None"`; the example still works because the StatefulSet pods expose the port directly via DNS, but the field is essentially decorative here.
- The Redis init-container example uses `ORDINAL=$(echo $HOSTNAME | rev | cut -d'-' -f1 | rev)` to extract the pod ordinal — this works but `${HOSTNAME##*-}` would be a simpler shell-native alternative. Not a correctness issue.
- The post does not show creating the referenced `postgres-credentials` Secret or `redis-config` ConfigMap; readers will need to create those separately. This is a reasonable scoping decision for a focused tutorial.
