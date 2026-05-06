# Validation Summary: How to Create Bigtable Instances with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- HCL
- Google Cloud Bigtable
- Google Cloud IAM
- Google Terraform provider (`hashicorp/google`)

## Sources Consulted
- Google Terraform provider docs: `google_bigtable_instance` — https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/bigtable_instance.html.markdown
- Google Terraform provider docs: `google_bigtable_table` — https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/bigtable_table.html.markdown
- Google Terraform provider docs: `google_bigtable_gc_policy` — https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/bigtable_gc_policy.html.markdown
- Google Terraform provider docs: `google_bigtable_instance_iam_*` — https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/bigtable_instance_iam.html.markdown
- Bigtable documentation: Instances, clusters, and nodes — https://cloud.google.com/bigtable/docs/instances-clusters-nodes
- Bigtable documentation: Bigtable locations — https://cloud.google.com/bigtable/docs/locations
- Bigtable documentation: Garbage collection overview — https://cloud.google.com/bigtable/docs/garbage-collection
- Bigtable IAM roles and permissions — https://cloud.google.com/iam/docs/roles-permissions/bigtable

## Issues Found
- The Step 3 example used an inline `gc_policy` block inside `google_bigtable_table.column_family`. The current Google provider schema does not support that. I replaced the invalid inline GC configuration with separate `google_bigtable_gc_policy` resources, which is the current documented approach.
- The Step 1 comment said production instances require a minimum of 3 nodes. Current Bigtable and provider documentation no longer support that statement cleanly as written, so I changed the comment to describe the value as an example fixed-size cluster size instead of a hard minimum.
- The Step 1 comment described HDD storage as being for "archival". Bigtable documentation describes HDD as appropriate for some larger, less latency-sensitive workloads, so I corrected the wording to avoid implying Bigtable HDD is an archival tier.
- The Step 1 comment presented `instance_type = "DEVELOPMENT"` as a normal option. Current provider documentation marks `instance_type` as deprecated and recommends leaving it unspecified, so I updated the comment accordingly.
- The summary stated that multi-cluster replication enables geographic distribution and HA. Because the example uses two zones in the same region, I changed this to "can provide" geographic distribution and HA to keep the claim accurate.

## Review Notes
- The IAM resource names and roles shown in Step 4 are current and valid: `google_bigtable_instance_iam_member`, `roles/bigtable.reader`, and `roles/bigtable.user`.
- The zones used in the examples (`us-central1-a` and `us-central1-b`) are valid Bigtable locations as of May 6, 2026.
- The post does not mention autoscaling, which Bigtable documentation recommends for many workloads, but the fixed-node examples are still technically valid.
