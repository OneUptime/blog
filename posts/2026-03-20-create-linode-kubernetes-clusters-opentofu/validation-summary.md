# Validation Summary: How to Create Linode Kubernetes Engine Clusters with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform fork)
- Linode Kubernetes Engine (LKE)
- Linode Terraform provider (`linode_lke_cluster`)
- Kubernetes (`kubectl`)
- HCL configuration

## Sources Consulted
- Linode Terraform provider `linode_lke_cluster` resource docs (https://github.com/linode/terraform-provider-linode/blob/main/docs/resources/lke_cluster.md)
- Linode API `/v4/linode/types` endpoint for plan IDs (https://api.linode.com/v4/linode/types)
- Linode Kubernetes Engine product docs (https://www.linode.com/docs/products/compute/kubernetes/)

## Issues Found
1. **Incorrect high-memory plan ID** — The post used `g6-highmem-1`, but Linode high-memory instance types use the `g7-highmem` prefix (e.g., `g7-highmem-1` is the 24GB / 1 CPU plan). Updated the multi-pool example to use `g7-highmem-1`.
2. **Inconsistent base64 handling in the CI/CD example** — The `kubeconfig` output already calls `base64decode(...)`, so it emits plain YAML. The CI/CD shell snippet then piped that output through `base64 -d`, which would corrupt the kubeconfig. Removed the redundant `| base64 -d` and updated the comment to reflect that the output is already decoded, matching the local-use example earlier in the post.

## Review Notes
- The `linode_lke_cluster` resource schema (required: `label`, `region`, `k8s_version`, at least one `pool` block; optional: `tags`, `control_plane`) matches the provider documentation.
- `pool.autoscaler` block with `min`/`max` is correct.
- `control_plane.high_availability = true` is correct; note this is irreversible in the provider — once enabled it cannot be disabled in-place. Worth keeping in mind for readers, though not a technical error.
- `kubeconfig` is documented as base64-encoded and `api_endpoints` is a list of strings — both used correctly.
- Kubernetes versions `1.32` and `1.33` are plausible LKE-supported versions for the post's 2026-03 date; LKE typically tracks recent upstream minor releases.
- The `region = "us-east"` value is a valid Linode region (Newark).
