# Validation Summary: How to Use Crossplane Observe-Only Mode for Import

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Crossplane managed resources
- Crossplane managementPolicies and observe-only import
- Crossplane Compositions and function-patch-and-transform
- Upbound AWS providers for RDS, S3, ELBv2, EC2, and ElastiCache
- Kubernetes manifests and kubectl
- AWS CLI
- Prometheus metrics
- Terraform state inspection
- jq and Bash scripting

## Sources Consulted
- Crossplane Import Existing Resources documentation: https://docs.crossplane.io/latest/guides/import-existing-resources/
- Crossplane Managed Resources documentation: https://docs.crossplane.io/latest/managed-resources/managed-resources/
- Crossplane Compositions documentation: https://docs.crossplane.io/latest/composition/compositions/
- Crossplane Metrics documentation: https://docs.crossplane.io/latest/guides/metrics/
- Crossplane Upgrade to v2 documentation: https://docs.crossplane.io/latest/guides/upgrade-to-crossplane-v2/
- Upbound provider-aws-rds Instance resource documentation: https://marketplace.upbound.io/providers/upbound/provider-aws-rds/v2.1.1/resources/rds.aws.m.upbound.io/Instance/v1beta1
- Crossplane provider-kubernetes Object documentation: https://marketplace.upbound.io/providers/crossplane-contrib/provider-kubernetes/v0.17.1/resources/kubernetes.crossplane.io/Object/v1alpha2
- Terraform state show command documentation: https://developer.hashicorp.com/terraform/cli/commands/state/show
- Terraform JSON output format documentation: https://developer.hashicorp.com/terraform/internals/json-format
- AWS CLI rds describe-db-instances documentation: https://docs.aws.amazon.com/cli/latest/reference/rds/describe-db-instances.html
- AWS CLI resourcegroupstaggingapi get-resources documentation: https://docs.aws.amazon.com/cli/latest/reference/resourcegroupstaggingapi/get-resources.html

## Issues Found
- The post described Crossplane as supporting three policies named `FullControl`, `ObserveOnly`, and `OrphanOnDelete`. Crossplane documents `*`, `Create`, `Delete`, `LateInitialize`, `Observe`, and `Update`, with orphaning controlled by omitting `Delete` or by `deletionPolicy: Orphan`. Updated the explanation and migration comment.
- AWS managed-resource API groups used the older cluster-scoped `*.aws.upbound.io` form. Updated examples to the current Crossplane v2 namespaced `*.aws.m.upbound.io` groups.
- Composition examples used native resource-mode `spec.resources`, which Crossplane v2 removed after deprecating it in v1.17. Converted the examples to `mode: Pipeline` with `function-patch-and-transform` input.
- The Deployment manifest in the composition example was incomplete. Added `selector`, `template`, container, image, and environment variable fields so the patched path exists and the Kubernetes Deployment is valid.
- The Prometheus example used non-existent `crossplane_managed_resource_condition` and `crossplane_managed_resource_info` metrics and a non-existent `management_policy` metric label. Replaced them with documented provider metrics: `crossplane_managed_resource_synced` and `crossplane_managed_resource_exists`.
- The kubectl examples filtered on a non-existent `crossplane.io/management-policy=Observe` label. Replaced them with JSON output filtered by `.spec.managementPolicies`.
- The Terraform example used `terraform state show -json`, but Terraform documents `terraform state show` as human-readable only and recommends `terraform show -json` for programmatic state extraction. Updated the example accordingly.

## Review Notes
The corrected examples assume current Crossplane v2 behavior and provider versions that expose namespaced `*.m.upbound.io` managed resources. Shell examples were reviewed manually; `shellcheck` was not installed in the local environment.
