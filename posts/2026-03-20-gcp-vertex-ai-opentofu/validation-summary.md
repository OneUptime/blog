# Validation Summary: How to Deploy GCP Vertex AI Infrastructure with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL / Terraform Google provider resources
- Google Cloud
- Vertex AI
- Vertex AI Workbench
- Cloud Storage
- Artifact Registry
- IAM

## Sources Consulted
- Google Cloud provider docs for `google_notebooks_instance`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/notebooks_instance.html.markdown
- Google Cloud provider docs for `google_workbench_instance`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/workbench_instance.html.markdown
- Vertex AI deprecations: https://docs.cloud.google.com/vertex-ai/docs/deprecations
- Create a Vertex AI Workbench instance: https://docs.cloud.google.com/vertex-ai/docs/workbench/instances/create
- Manage access to an instance's JupyterLab interface: https://docs.cloud.google.com/vertex-ai/docs/workbench/instances/manage-access-jupyterlab
- Idle shutdown for Vertex AI Workbench: https://cloud.google.com/vertex-ai/docs/workbench/instances/idle-shutdown
- Notebooks API usage overview: https://docs.cloud.google.com/vertex-ai/docs/workbench/reference
- Google Cloud provider docs for `google_vertex_ai_endpoint`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/vertex_ai_endpoint.html.markdown
- Vertex AI endpoint create method: https://cloud.google.com/vertex-ai/docs/reference/rest/v1/projects.locations.endpoints/create
- Google Cloud provider docs for `google_artifact_registry_repository`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/artifact_registry_repository.html.markdown
- Google Cloud provider docs for Artifact Registry repository IAM: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/artifact_registry_repository_iam.html.markdown
- Google Cloud provider docs for `google_storage_bucket`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/storage_bucket.html.markdown
- Google Cloud provider docs for `google_project_service`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_project_service.html

## Issues Found
- The Workbench example used `google_notebooks_instance`, which the current Google provider marks as deprecated, and it described Vertex AI Workbench using older notebook resource semantics. I replaced it with `google_workbench_instance` and updated the nested configuration to the current `gce_setup` schema.
- The Workbench example used an outdated Deep Learning VM image reference (`deeplearning-platform-release` with `tf-latest-gpu`). I updated it to the current Workbench image family under `cloud-notebooks-managed` with `family = "workbench-instances"`.
- The Workbench example claimed one-hour auto-shutdown but did not configure idle shutdown. I added `metadata = { idle-timeout-seconds = "3600" }`, which is the documented current mechanism for Workbench idle shutdown.
- The Workbench example used old field names such as `accelerator_config`, `service_account`, `network`, `subnet`, `no_public_ip`, and `no_proxy_access`. I converted them to the supported Workbench equivalents, including `accelerator_configs`, `service_accounts`, `network_interfaces`, `disable_public_ip`, and `disable_proxy_access`.
- The Workbench example used `instance_owners = var.notebook_owners`, but current Workbench instances support only one owner in this mode. I corrected the snippet to a single-owner form with `instance_owners = [var.notebook_owner]`.
- The endpoint example depended on undeclared private-networking resources (`data.google_project.main` and a peered VPC network) that were not shown anywhere in the post. I simplified the example to a valid standalone endpoint resource and used `var.prefix` for the endpoint ID.
- The API enablement section omitted `compute.googleapis.com` even though the post references Compute Engine-backed Workbench and VPC network resources. I added the Compute Engine API to the required services list.
- The best-practices section recommended Vertex AI managed notebooks and IAP-based guidance that is no longer accurate for current Workbench documentation. I updated the recommendations to current Workbench instances, `disable_public_ip`, and the requirement that the subnet still provide Google API access.
- The description claimed the post covered training jobs and feature stores, but the post did not include those resources. I corrected the description to match the infrastructure actually covered.

## Review Notes
- `google_workbench_instance` uses the Notebooks API v2 for current Vertex AI Workbench instances, while the older notebook resources are deprecated as of April 14, 2025.
- The example still assumes the selected zone supports `NVIDIA_TESLA_T4` and the chosen machine type; GPU availability remains zone-specific on Google Cloud.
- The example also assumes user-provided values such as `var.prefix` and `var.model_name` satisfy Google Cloud naming and label constraints.
