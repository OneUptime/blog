# Validation Summary: How to Create OCI Object Storage with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform
- Oracle Cloud Infrastructure (OCI)
- OCI Object Storage
- OCI Terraform Provider (oracle/oci)
- HCL (HashiCorp Configuration Language)

## Sources Consulted
- Official OCI Terraform provider docs on GitHub: https://github.com/oracle/terraform-provider-oci/tree/master/website/docs
  - `d/objectstorage_namespace.html.markdown`
  - `r/objectstorage_bucket.html.markdown`
  - `r/objectstorage_object_lifecycle_policy.html.markdown`
  - `r/objectstorage_preauthrequest.html.markdown`
- Terraform Registry: https://registry.terraform.io/providers/oracle/oci/latest/docs

## Issues Found

1. **Invalid `access_type` value for pre-authenticated request.** The post used `access_type = "AnyObjectWrite"`, which is not a valid value for `oci_objectstorage_preauthrequest`. The documented allowed values are `ObjectRead`, `ObjectWrite`, `ObjectReadWrite`, `AnyObjectRead`, and `AnyObjectReadWrite`. Since the PAR has no `object_name` (so it is a bucket-level PAR) and the intent is to allow uploading, I changed it to `AnyObjectReadWrite`, which is the supported value for bucket-level write PARs.

2. **Wrong attribute used for the PAR URL output.** The post output `oci_objectstorage_preauthrequest.upload.full_path` as `par_url`. According to the OCI provider documentation, `full_path` is the object path representation; the attribute intended to be embedded in the regional Object Storage endpoint to actually use the PAR is `access_uri`. I changed the output to concatenate the regional host with `access_uri`: `"https://objectstorage.${var.region}.oraclecloud.com${oci_objectstorage_preauthrequest.upload.access_uri}"`, which produces the usable PAR URL.

## Review Notes
- `compartment_id` on the `oci_objectstorage_namespace` data source is optional, not required. The post passes it, which is fine but unnecessary in most tenancies.
- `versioning` allows `Enabled` and `Disabled` on create, and `Enabled` / `Suspended` on update. The post's use of `Enabled` is correct.
- The post lists only `ARCHIVE` and `DELETE` lifecycle actions; the provider also supports `INFREQUENT_ACCESS` and `ABORT` (the latter only with `target = "multipart-uploads"`). This is not incorrect — the post is illustrative, not exhaustive — but worth noting for future expansion.
- `inclusion_prefixes` is still supported but Oracle now also offers `inclusion_patterns` / `exclusion_patterns` for more flexible matching.
- The Object Storage URL format used in the bucket_url output is correct.
