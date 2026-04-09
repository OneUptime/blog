# Validation Summary: How to Manage Ceph RGW Users with Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph RGW (RADOS Gateway)
- Terraform (HCL, kubernetes provider, terraform_data resource)
- Kubernetes (CRDs, Secrets)
- radosgw-admin CLI

## Sources Consulted
- Rook CephObjectStoreUser CRD documentation (https://rook.io/docs/rook/latest/CRDs/Object-Storage/ceph-object-store-user-crd/)
- Ceph radosgw-admin CLI reference (https://docs.ceph.com/en/latest/man/8/radosgw-admin/)
- Terraform kubernetes_manifest resource documentation (https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/manifest)
- Terraform terraform_data resource documentation (https://developer.hashicorp.com/terraform/language/resources/terraform-data)
- HCL language specification (https://developer.hashicorp.com/terraform/language/syntax/configuration)

## Issues Found

1. **Invalid `objects` capability in CephObjectStoreUser spec** (Option 1 code block): The `capabilities` block included `objects = "read,write"`, but `objects` is not a valid RGW admin capability field. Valid capability fields include `user`, `bucket`, `usage`, `metadata`, `zone`, `info`, `roles`, `amz-cache`, `bilog`, `datalog`, `mdlog`, `oidc-provider`, and `ratelimit`. Removed the invalid `objects` line, leaving the valid `user` and `bucket` capabilities.

2. **Invalid HCL syntax with semicolons in variable blocks** (User Module section): Four variable declarations used semicolons to separate `type` and `default` on a single line (e.g., `variable "max_buckets" { type = number; default = 100 }`). HCL does not support semicolons as argument separators — Terraform would produce an "Invalid character" error. Converted all four variable blocks to standard multi-line format.

## Review Notes
- The `quotas` block in the CephObjectStoreUser CRD also supports a `maxBuckets` field, which is not mentioned in the post. This is not an error but could be a useful addition in a future update.
- The Rook-generated secret also contains an `Endpoint` key alongside `AccessKey` and `SecretKey`. The post omits this, which is fine for the scope of the tutorial.
- The `kubernetes_manifest` resource requires the Kubernetes cluster to be reachable during `terraform plan`, which can be a pitfall not mentioned in the post. This is a usability note, not a technical error.
- The `--max-size` flag in `radosgw-admin quota set` correctly accepts human-readable suffixes like `GiB`.
