# Validation Summary: How to Create GCP Vertex AI Notebooks with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Google Cloud
- Vertex AI Workbench
- Google provider for OpenTofu/Terraform
- IAM service accounts
- VPC networking

## Sources Consulted
- Google provider `google_workbench_instance` resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/workbench_instance.html.markdown
- Google provider `google_notebooks_instance` resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/notebooks_instance.html.markdown
- Create a Vertex AI Workbench instance: https://cloud.google.com/vertex-ai/docs/workbench/instances/create
- Create a specific version of a Vertex AI Workbench instance: https://cloud.google.com/vertex-ai/docs/workbench/instances/create-specific-version
- Manage access to a Vertex AI Workbench instance's JupyterLab interface: https://cloud.google.com/vertex-ai/docs/workbench/instances/manage-access-jupyterlab
- Manage features through metadata: https://cloud.google.com/vertex-ai/docs/workbench/instances/manage-metadata
- Create a Vertex AI Workbench instance using a custom container: https://cloud.google.com/vertex-ai/docs/workbench/instances/create-custom-container
- Troubleshooting Vertex AI Workbench: https://cloud.google.com/vertex-ai/docs/general/troubleshooting-workbench
- Vertex AI Workbench REST resource reference: https://cloud.google.com/vertex-ai/docs/workbench/reference/rest/v2/projects.locations.instances

## Issues Found
- The post described managed notebooks and user-managed notebooks as current creation targets. I updated the introduction and examples because Google deprecated both offerings and removed the ability to create new instances on April 14, 2025; new deployments should use Vertex AI Workbench instances.
- Both code examples used the deprecated `google_notebooks_instance` resource. I replaced them with `google_workbench_instance`, which is the current provider resource.
- The original managed example used legacy field names and structure such as `machine_type`, `service_account`, `network`, `subnet`, `no_public_ip`, `no_proxy_access`, and top-level `metadata`. I moved these to the current `gce_setup`, `service_accounts`, and `network_interfaces` blocks and used the current `disable_public_ip` and `disable_proxy_access` fields.
- The original example set `framework = "tensorflow"` in metadata. I removed it because `framework` is a reserved metadata key in Vertex AI Workbench and should not be user-managed.
- The original legacy example used `post_startup_script`, which is not the current `google_workbench_instance` field. I changed it to the supported `post-startup-script` metadata key.
- The original examples did not guarantee that the Notebooks API would be enabled before instance creation in the same OpenTofu apply. I added explicit `depends_on` entries to the instance resources.
- The output referenced `google_notebooks_instance.managed_nb.proxy_uri`. I updated it to `google_workbench_instance.workbench.proxy_uri`.
- The service account section omitted the access requirement for users opening JupyterLab through service account access mode. I added a note that users need `roles/iam.serviceAccountUser` on the instance service account.

## Review Notes
- `notebooks.googleapis.com` is the required API for creating Vertex AI Workbench instances. `aiplatform.googleapis.com` is commonly enabled when notebooks will call Vertex AI APIs, but it is not required just to create the instance.
- For private-only instances (`disable_public_ip = true`), the selected subnet must support the required Google API access and DNS or internet egress requirements described in the Vertex AI Workbench networking documentation.
- The Google provider documentation was used as the authoritative schema source for OpenTofu because OpenTofu uses the same provider configuration and resource syntax.
