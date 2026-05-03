# Validation Summary: How to Create OCI Compute Instances with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform
- Oracle Cloud Infrastructure (OCI)
- OCI Compute (oci_core_instance)
- OCI Identity (oci_identity_availability_domains)
- OCI Core Images (oci_core_images)
- Oracle Linux 9
- cloud-init / user-data
- OCI flexible shapes (E4.Flex, A1.Flex, Standard3.Flex)

## Sources Consulted
- Oracle/Terraform OCI provider docs — oci_core_instance: https://github.com/oracle/terraform-provider-oci/blob/master/website/docs/r/core_instance.html.markdown
- Oracle/Terraform OCI provider docs — oci_core_images: https://github.com/oracle/terraform-provider-oci/blob/master/website/docs/d/core_images.html.markdown
- OCI Compute Shapes reference: https://docs.oracle.com/en-us/iaas/Content/Compute/References/computeshapes.htm
- OCI Always Free Resources documentation: https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm

## Issues Found
- **Deprecated shape `VM.DenseIO2.8`**: The shapes table referenced `VM.DenseIO2.8`, which is a previous-generation X7-based dense I/O shape with an end-of-orderability date of April 28, 2022. Replaced it with `VM.DenseIO.E4.Flex` (current AMD-based dense I/O shape with NVMe local SSD), per the official OCI shapes reference.

## Review Notes
- All other code is technically correct and matches the current OCI Terraform provider:
  - `oci_identity_availability_domains` data source returns `availability_domains[].name` — correct.
  - `oci_core_images` arguments `compartment_id`, `operating_system`, `operating_system_version` ("9" is valid for Oracle Linux), `sort_by` ("TIMECREATED"), and `sort_order` ("DESC") are all correct.
  - `oci_core_instance` has `public_ip` as a top-level computed attribute — confirmed in provider docs ("The public IP address of instance VNIC (if enabled).").
  - `metadata` block correctly accepts `ssh_authorized_keys` and base64-encoded `user_data`.
  - `source_details.boot_volume_size_in_gbs` is supported when `source_type = "image"` (minimum 50 GB), so 100 GB in the example is valid.
  - Always Free tier limits (4 OCPUs and 24 GB across all VM.Standard.A1.Flex instances) match the current OCI Free Tier documentation.
  - `VM.Standard.E4.Flex` (AMD EPYC), `VM.Standard.A1.Flex` (Ampere Arm), and `VM.Standard3.Flex` (Intel Ice Lake) are all current shapes.
- Possible future improvement (not a current error): the post could mention that `oci_core_instance.public_ip` is provider-surfaced from the primary VNIC, and that for secondary VNICs the user must look up `oci_core_vnic` separately.
