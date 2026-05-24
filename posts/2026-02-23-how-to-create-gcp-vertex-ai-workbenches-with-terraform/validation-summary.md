# Validation Summary: How to Create GCP Vertex AI Workbenches with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HashiCorp)
- Google Cloud Platform (GCP)
- Vertex AI Workbench (`google_workbench_instance` resource)
- Google Compute Engine (machine types, GPUs, disks, networks)
- Google Cloud IAM (service accounts, roles)
- Google Cloud Storage (post-startup script hosting)
- Jupyter notebooks

## Sources Consulted
- [google_workbench_instance Terraform Registry docs](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/workbench_instance)
- [terraform-provider-google source – workbench_instance.html.markdown](https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/workbench_instance.html.markdown)
- [Official terraform-docs-samples for Vertex AI Workbench](https://github.com/terraform-google-modules/terraform-docs-samples/blob/main/vertex_ai/workbench/main.tf)
- [Vertex AI Workbench – Manage image versions](https://cloud.google.com/vertex-ai/docs/workbench/instances/manage-image-versions)
- [Vertex AI Workbench – Manage features through metadata](https://cloud.google.com/vertex-ai/docs/workbench/instances/manage-metadata)
- [Create a Vertex AI Workbench instance](https://cloud.google.com/vertex-ai/docs/workbench/instances/create)

## Issues Found

1. **Wrong `vm_image` project and family for `google_workbench_instance`.** The post used `project = "deeplearning-platform-release"` together with `family = "tf-latest-gpu"` or `family = "common-cpu"`. Those image families belong to the legacy `google_notebooks_instance` (user-managed notebooks) resource, not the newer `google_workbench_instance`. According to the official Terraform docs sample and Google Cloud docs, Vertex AI Workbench instances use images from `project = "cloud-notebooks-managed"` with `family = "workbench-instances"` (or version-dated families such as `workbench-instances-YYMM`). Fixed in all five Terraform examples in the post.
2. **Incorrect metadata key `idle-timeout`.** The post used `idle-timeout = "3600"` / `idle-timeout = "1800"`, but the documented Vertex AI Workbench metadata key is `idle-timeout-seconds` (see "Manage features through metadata"). Replaced in both code blocks and the surrounding explanatory paragraph in the "Scheduling Auto-Stop" section.
3. **Conditional image family in the `for_each` example.** Since the new resource uses a single image family regardless of GPU/CPU (the GPU is added via `accelerator_configs`), the `each.value.gpu ? "tf-latest-gpu" : "common-cpu"` expression was removed and replaced with a single `family = "workbench-instances"` line.

## Review Notes
- The `data_disks` block in `google_workbench_instance` currently supports only a single data disk; the examples already use one block, so this is fine.
- `nic_type = "GVNIC"` is a valid value (alongside `VIRTIO_NET`) per the provider schema.
- `subnet` (not `subnetwork`) is the correct field name inside `network_interfaces` for this resource — the post already uses it correctly.
- For production use, pinning to a version-dated image family (e.g. `workbench-instances-2603`) is more reproducible than the rolling `workbench-instances` family, but the rolling family is valid and matches the simple/illustrative tone of the post.
- The comment "Auto-shutdown idle instances to save money" sits above the `labels` block, which doesn't itself perform auto-shutdown — auto-shutdown is configured via the `idle-timeout-seconds` metadata key earlier in the same resource. The comment is mildly misplaced but not technically incorrect, so it was left as-is.
- The `roles/bigquery.dataViewer` role grants table-listing/metadata access; users may also need `roles/bigquery.jobUser` to actually run queries. This is a reasonable default for the post's "data exploration" framing and not corrected.
