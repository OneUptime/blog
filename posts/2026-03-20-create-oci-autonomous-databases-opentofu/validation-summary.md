# Validation Summary: How to Create OCI Autonomous Databases with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform-compatible IaC)
- Oracle Cloud Infrastructure (OCI)
- OCI Autonomous Database (ATP, ADW, AJD, APEX workloads)
- OCI Terraform/OpenTofu Provider (`oci_database_autonomous_database`)
- OCI CLI (`oci db autonomous-database generate-wallet`)

## Sources Consulted
- OCI Terraform/OpenTofu Provider documentation: https://registry.terraform.io/providers/oracle/oci/latest/docs/resources/database_autonomous_database
- Oracle Cloud Infrastructure Autonomous Database documentation: https://docs.oracle.com/en-us/iaas/Content/Database/home.htm
- OCI CLI reference for `db autonomous-database generate-wallet`: https://docs.oracle.com/en-us/iaas/tools/oci-cli/latest/oci_cli_docs/cmdref/db/autonomous-database/generate-wallet.html
- OCI Always Free Resources documentation (1 OCPU, 20 GB storage limits)

## Issues Found
No technical issues found.

All resource attributes used are valid arguments for the `oci_database_autonomous_database` resource:
- `compartment_id`, `db_name`, `admin_password`, `cpu_core_count`, `data_storage_size_in_tbs`, `data_storage_size_in_gbs`
- `db_workload` with valid values OLTP, DW, AJD, APEX
- `license_model` with valid values LICENSE_INCLUDED, BRING_YOUR_OWN_LICENSE
- `is_free_tier`, `is_auto_scaling_enabled`, `is_auto_scaling_for_storage_enabled`
- `is_mtls_connection_required`, `subnet_id`, `private_endpoint_label`
- `freeform_tags`, `display_name`, and the computed `connection_strings` output

Other technical claims verified:
- `db_name` max 14 alphanumeric characters on shared infrastructure — correct.
- Always Free tier limit: 1 OCPU and 20 GB storage — correct.
- CPU auto-scaling scales up to 3x base OCPU count — correct.
- OCI CLI `oci db autonomous-database generate-wallet` with `--autonomous-database-id`, `--password`, `--file` flags — correct.

## Review Notes
- The Auto-Scaling example uses `# ...` to indicate elision of required fields (compartment_id, db_name, admin_password). Readers must merge those required fields with the auto-scaling fields shown for a working configuration. This is reasonable as a snippet but should be noted.
- In the Always Free example, `data_storage_size_in_tbs = null` is explicitly set alongside `data_storage_size_in_gbs = 20`. This is valid HCL and avoids ambiguity, though omitting `data_storage_size_in_tbs` entirely also works.
- The post does not show how to declare the `var.compartment_id` and `var.db_admin_password` variables, nor the `oci_core_subnet.private` referenced in the network access example. This is acceptable for a focused tutorial but readers will need supporting variable/resource definitions.
- The post focuses on OCPU-based shapes (`cpu_core_count`). OCI also supports ECPU-based shapes via the `compute_count` attribute and `compute_model = "ECPU"`, which is the newer/recommended billing model for many regions, but this is out of scope for the post.
- No deprecation warnings — all attributes shown are current as of the OCI provider at the time of review.
