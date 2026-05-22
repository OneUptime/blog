# Validation Summary: How to Use No-Code Provisioning in HCP Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- HCP Terraform no-code provisioning
- Terraform Enterprise
- HCP Terraform private registry
- Terraform modules and HCL
- HCP Terraform API
- AWS provider resources for EC2 and RDS
- Random provider password generation
- Sentinel policy checks

## Sources Consulted
- HashiCorp Developer: Design no-code ready modules for HCP Terraform - https://developer.hashicorp.com/terraform/cloud-docs/workspaces/no-code-provisioning/module-design
- HashiCorp Developer: Provision no-code infrastructure - https://developer.hashicorp.com/terraform/enterprise/workspaces/no-code-provisioning/provisioning
- HashiCorp Developer: No-code provisioning API reference - https://developer.hashicorp.com/terraform/enterprise/api-docs/no-code-provisioning
- HashiCorp Developer: Registry modules API reference - https://developer.hashicorp.com/terraform/enterprise/api-docs/private-registry/modules
- HashiCorp Developer: Workspaces API reference - https://developer.hashicorp.com/terraform/cloud-docs/api-docs/workspaces
- Terraform Registry: AWS provider aws_db_instance resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform Registry: Random provider random_password resource - https://registry.terraform.io/providers/hashicorp/random/latest/docs/resources/password
- AWS Documentation: Quotas and constraints for Amazon RDS - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Limits.html

## Issues Found
- The prerequisites named the HCP Terraform Plus tier. HashiCorp's current no-code provisioning documentation lists HCP Terraform Standard and Premium editions, so the prerequisite was updated.
- The prerequisites said users need at least workspace-level permissions. HashiCorp documents project/workspace management or custom project permissions that can create workspaces, write variables, and apply runs, so the wording was corrected.
- The sample `app_name` validation allowed values that can produce invalid Amazon RDS identifiers, such as names starting with a number, ending with a hyphen, or containing consecutive hyphens. The validation was tightened to match RDS naming constraints used by the sample.
- The RDS sample could fail on destroy for production because `skip_final_snapshot` could be `false` without a `final_snapshot_identifier`. A final snapshot identifier was added.
- The generated RDS password could include characters disallowed by RDS master passwords. The `random_password` resource now uses `override_special` to restrict special characters.
- The VCS private registry API example used the deprecated `/registry-modules` endpoint for VCS publishing. It was changed to `/registry-modules/vcs`.
- The no-code module relationship type in the enable API example used `registry-modules`; the documented request body requires `registry-module`, so the example was corrected.
- The variable-options API example placed `variable-options` under `attributes`. HashiCorp documents it under `relationships.variable-options.data`, so the JSON payload was corrected.
- The end-user UI flow referenced **New** > **No-code workspace**. HashiCorp documents launching no-code provisioning from the Registry module details page with **Provision workspace**, so the workflow was corrected.

## Review Notes
Terraform CLI is not installed in this workspace, so the HCL snippets were not validated with `terraform validate`. The examples were reviewed statically against current official Terraform, HCP Terraform, AWS provider, Random provider, and AWS RDS documentation.
