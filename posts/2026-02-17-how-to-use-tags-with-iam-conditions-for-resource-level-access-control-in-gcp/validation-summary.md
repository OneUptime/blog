# Validation Summary: How to Use Tags with IAM Conditions for Resource-Level Access Control in GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud IAM
- IAM Conditions
- Resource Manager tags
- Cloud SQL tag bindings
- gcloud CLI
- Terraform Google provider

## Sources Consulted
- Google Cloud Resource Manager: Create and manage tags: https://docs.cloud.google.com/resource-manager/docs/tags/tags-creating-and-managing
- Google Cloud IAM: Tags and conditional access: https://docs.cloud.google.com/iam/docs/tags-access-control
- Google Cloud IAM: Conditions overview: https://cloud.google.com/iam/docs/conditions-overview
- Google Cloud IAM: Attribute reference for IAM Conditions: https://docs.cloud.google.com/iam/docs/conditions-attribute-reference
- Google Cloud Resource Manager: Services that support tags: https://docs.cloud.google.com/resource-manager/docs/tags/tags-supported-services
- Cloud SQL: Access control with Google Cloud tags: https://cloud.google.com/sql/docs/mysql/tags
- Cloud SQL: Attach and manage tags on Cloud SQL instances: https://cloud.google.com/sql/docs/mysql/manage-tags
- Google Cloud SDK reference: gcloud resource-manager tags bindings create: https://cloud.google.com/sdk/gcloud/reference/resource-manager/tags/bindings/create
- Terraform Registry: google_project_iam binding with conditions: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_project_iam
- Terraform Registry: google_tags_tag_key / google_tags_tag_value / google_tags_tag_binding resources: https://registry.terraform.io/providers/hashicorp/google/latest/docs

## Issues Found
- The opening sentence said standard IAM in GCP works at the project level. IAM can be granted at multiple hierarchy levels and on some service resources, so I changed this to say IAM is often granted at the project level.
- The post stated that tags are defined only at the organization level and that tags require an organization node. Resource Manager supports tag keys under organizations or projects, so I updated the wording and prerequisites while keeping the examples organization-scoped.
- The prerequisites only mentioned `roles/resourcemanager.tagUser` for binding tags. Google Cloud also requires that role on the tag value and target resource, and some target services require resource-specific tag binding permissions, so I clarified that requirement.
- The gcloud tag value examples used `organizations/ORG_ID/tagKeys/TAG_KEY_ID` as the parent. The documented parent is the tag key resource name or namespaced name, such as `tagKeys/TAG_KEY_ID`, so I corrected the examples.
- The gcloud tag binding examples used `organizations/ORG_ID/tagKeys/TAG_KEY_ID/tagValues/VALUE_ID` as the tag value. The documented value is `tagValues/VALUE_ID` or a namespaced name such as `ORG_ID/environment/production`, so I corrected the examples to use `tagValues/...`.
- The project-level tag binding example used a project ID placeholder in the Resource Manager full resource name. Google documentation examples use project numbers for project full resource names in tag bindings, so I changed it to `PROD_PROJECT_NUMBER`.
- The Terraform example created a staging tag value and an IAM condition for staging but only bound the production tag. I added a staging project tag binding so the example matches the described behavior.

## Review Notes
- I could not validate the commands against a local `gcloud --help` installation because `gcloud` is not installed in this environment; command syntax was checked against official Google Cloud SDK and product documentation instead.
- Google Cloud notes that some Cloud Console areas do not recognize tag-based conditional role bindings correctly. The post's CLI-based examples remain valid.
