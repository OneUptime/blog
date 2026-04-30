# Validation Summary: How to Create GCP Identity Platform Tenants with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- HashiCorp Google provider for Terraform/OpenTofu
- Google Cloud Identity Platform
- Firebase Authentication
- OpenID Connect (OIDC)
- SAML 2.0

## Sources Consulted
- HashiCorp Google provider docs: `google_identity_platform_tenant` - https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/identity_platform_tenant.html.markdown
- HashiCorp Google provider docs: `google_identity_platform_config` - https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/identity_platform_config.html.markdown
- HashiCorp Google provider docs: `google_identity_platform_tenant_oauth_idp_config` - https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/identity_platform_tenant_oauth_idp_config.html.markdown
- HashiCorp Google provider docs: `google_identity_platform_tenant_inbound_saml_config` - https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/identity_platform_tenant_inbound_saml_config.html.markdown
- Google Cloud Identity Platform multi-tenancy quickstart - https://cloud.google.com/identity-platform/docs/multi-tenancy-quickstart
- Google Cloud Identity Platform REST resource: `projects.tenants` - https://cloud.google.com/identity-platform/docs/reference/rest/v2/projects.tenants
- OpenTofu CLI docs: `init` - https://opentofu.org/docs/cli/init/
- OpenTofu CLI docs: `plan` - https://opentofu.org/docs/cli/commands/plan/
- OpenTofu CLI docs: `apply` - https://opentofu.org/docs/v1.11/cli/commands/apply/

## Issues Found
- The introduction conflated Identity Platform with Firebase Authentication. I clarified that Identity Platform is the Google Cloud customer identity service built on Firebase Authentication, because multi-tenancy is an Identity Platform feature.
- The enablement section implied that enabling the `identitytoolkit.googleapis.com` API was sufficient. I corrected it to note that Google Identity Platform must also be enabled for the project.
- The tenant example used an `mfa_config` block, but the current `google_identity_platform_tenant` resource does not expose that argument in the documented provider schema. I removed the unsupported block.
- The tenant example comment described email link sign-in as a legacy sign-in method. I changed the comment to describe the actual setting being configured.
- The OIDC example was labeled as an OAuth provider example and omitted the required `display_name` field. I renamed the section to OIDC and added `display_name`.
- The SAML example used the wrong resource type name (`google_identity_platform_tenant_saml_idp_config`) and omitted the required `display_name` field. I changed it to `google_identity_platform_tenant_inbound_saml_config` and added `display_name`.
- The project config section was labeled as a tenant default config example even though `google_identity_platform_config` is project-scoped. I renamed the section and clarified the multi-tenancy prerequisite.
- The `default_tenant_location` example used an invalid value format (`projects/${var.project_id}`). The provider docs require an organization or folder resource name, so I removed that incorrect line.
- Two variable declarations were not valid HCL because they placed multiple attributes on a single line. I rewrote those variable blocks in valid multi-line form.
- I added explicit `depends_on` references from the Identity Platform resources to the API enablement resource so the examples apply in a safer order when used together.

## Review Notes
- Google’s provider documentation states that multi-tenancy must be enabled before creating tenants. The post now reflects that prerequisite, but readers may still need to perform the initial enablement step outside OpenTofu depending on their project state.
- The Google Identity Platform REST API includes tenant-level MFA fields, but the current documented Terraform/OpenTofu provider resource for tenants does not expose a matching `mfa_config` block.
