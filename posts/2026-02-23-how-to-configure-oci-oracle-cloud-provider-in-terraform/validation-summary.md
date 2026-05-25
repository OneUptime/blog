# Validation Summary: How to Configure OCI (Oracle Cloud) Provider in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Oracle Cloud Infrastructure (OCI)
- OCI Terraform provider
- OCI Networking
- OCI Compute
- OCI Autonomous Database
- Oracle Kubernetes Engine (OKE)
- OCI Object Storage
- OpenSSL

## Sources Consulted
- Oracle OCI Terraform provider configuration documentation: https://docs.oracle.com/en-us/iaas/Content/dev/terraform/configuring.htm
- Oracle OCI Terraform provider `oci_core_vcn` resource documentation: https://docs.oracle.com/en-us/iaas/tools/terraform-provider-oci/latest/docs/r/core_vcn.html
- Oracle OCI Terraform provider `oci_core_route_table` resource documentation: https://docs.oracle.com/en-us/iaas/tools/terraform-provider-oci/latest/docs/r/core_route_table.html
- Oracle OCI Terraform provider `oci_core_instance` resource documentation: https://docs.oracle.com/en-us/iaas/tools/terraform-provider-oci/latest/docs/r/core_instance.html
- Oracle OCI Terraform provider `oci_database_autonomous_database` resource documentation: https://docs.oracle.com/en-us/iaas/tools/terraform-provider-oci/latest/docs/r/database_autonomous_database.html
- Oracle OCI Terraform provider `oci_containerengine_cluster` resource documentation: https://docs.oracle.com/en-us/iaas/tools/terraform-provider-oci/latest/docs/r/containerengine_cluster.html
- Oracle OCI Terraform provider `oci_containerengine_node_pool` resource documentation: https://docs.oracle.com/en-us/iaas/tools/terraform-provider-oci/latest/docs/r/containerengine_node_pool.html
- Oracle OKE supported Kubernetes versions documentation: https://docs.oracle.com/en-us/iaas/Content/ContEng/Concepts/contengaboutk8sversions.htm
- Oracle OCI Terraform provider `oci_objectstorage_bucket` resource documentation: https://registry.terraform.io/providers/oracle/oci/latest/docs/resources/objectstorage_bucket

## Issues Found
- The provider version constraint used `~> 5.30`, which pins readers to an old OCI provider major version. Updated it to `~> 8.0` to align the guide with the current provider line.
- The route table examples set `destination = "0.0.0.0/0"` without `destination_type`. Oracle documents `destination_type` as required when `destination` is provided, so both route rules now include `destination_type = "CIDR_BLOCK"`.
- The OKE examples hard-coded Kubernetes `v1.28.2`, which is no longer a current supported OKE version for new clusters. Replaced it with `var.kubernetes_version` and added a variable definition so readers can set a region-supported OKE version.

## Review Notes
- The Autonomous Database example uses `cpu_core_count`, which remains supported, but Oracle's current documentation recommends the newer `compute_count` plus `compute_model` approach for new configurations.
- The examples are tutorial snippets rather than a complete Terraform module. Additional variables such as `ssh_public_key` and `db_admin_password` still need to be supplied by readers.
