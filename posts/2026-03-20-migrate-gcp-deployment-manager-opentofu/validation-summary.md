# Validation Summary: How to Migrate GCP Infrastructure from Deployment Manager to OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Cloud Deployment Manager
- OpenTofu
- Google Cloud CLI (`gcloud`)
- Google Cloud provider for Terraform/OpenTofu
- HCL
- Deployment Manager YAML
- Deployment Manager Python templates

## Sources Consulted
- Google Cloud Deployment Manager deprecation: https://docs.cloud.google.com/deployment-manager/docs/deprecations
- Google Cloud Deployment Manager manifest guide: https://docs.cloud.google.com/deployment-manager/docs/deployments/viewing-manifest
- Google Cloud Deployment Manager delete deployment guide: https://docs.cloud.google.com/deployment-manager/docs/deployments/deleting-deployments
- Google Cloud Terraform import guide: https://docs.cloud.google.com/docs/terraform/resource-management/import
- OpenTofu import blocks documentation: https://opentofu.org/docs/language/import/
- Google Cloud DM Convert migration guide: https://cloud.google.com/deployment-manager/docs/dm-convert

## Issues Found
- The post described `gcloud deployment-manager deployments describe ... --format yaml` as exporting the deployment manifest. I changed this to `gcloud deployment-manager manifests describe ... --format yaml` because manifests, not deployment descriptions, contain the full expanded manifest.
- The Cloud Storage bucket import ID was incorrect. I changed it from `my-project/US/my-app-bucket` to `my-project/my-app-bucket` because Google’s Terraform import guidance documents the bucket ID format as `project/name`.
- The import workflow omitted a required prerequisite: matching `resource` blocks must exist before using OpenTofu `import` blocks. I added that requirement and adjusted the surrounding wording so the workflow matches OpenTofu’s documented behavior.
- The VPC network import ID used a shortened form. I changed it to the documented full identifier `projects/my-project/global/networks/my-app-network` for correctness and consistency with Google’s import examples.
- The `tofu plan` comment in the import phase implied a clean no-change plan before import. I changed it to reflect that the first plan should preview import actions and any drift.
- The post said resources would exist "only in OpenTofu state" after abandoning the Deployment Manager deployment. I corrected this to say the resources remain in GCP and are managed through OpenTofu state.
- The introduction implied migration was inherently downtime-free. I tightened that claim so it reflects the actual guarantee: importing resources into state does not recreate them, but a clean cutover depends on the translated configuration matching the live infrastructure.
- The post did not acknowledge that Deployment Manager reached end of support on March 31, 2026. I added that date so the timing and current status of the service are technically accurate as of the validation date.

## Review Notes
- OpenTofu’s configuration-driven `import` blocks are currently marked Experimental in the official docs. The workflow is valid, but this is worth monitoring for future doc updates.
- Google’s current Deployment Manager migration docs also point readers to DM Convert and Infrastructure Manager. The post’s manual OpenTofu translation/import workflow is still technically valid, but DM Convert is the official Google migration tooling to be aware of.
