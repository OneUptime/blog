# Validation Summary: How to Use Registry Modules Across Organizations in HCP

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform modules
- HCP Terraform private registry
- Terraform Enterprise registry sharing
- HCP Terraform API
- Git module sources
- SSH keys for HCP Terraform workspaces
- S3/GCS module package sources

## Sources Consulted
- Terraform module source syntax: https://developer.hashicorp.com/terraform/language/block/module
- HCP Terraform private registry overview: https://developer.hashicorp.com/terraform/cloud-docs/registry
- Publishing private modules to the HCP Terraform private registry: https://developer.hashicorp.com/terraform/cloud-docs/registry/publish-modules
- HCP Terraform registry modules API: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/private-registry/modules
- HCP Terraform SSH keys for cloning modules: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/settings/ssh-keys
- HCP Terraform SSH keys API: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/ssh-keys
- HCP Terraform workspaces API for SSH key assignment: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/workspaces
- HCP Terraform OAuth clients API: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/oauth-clients
- Terraform Enterprise registry sharing administration: https://developer.hashicorp.com/terraform/enterprise/application-administration/registry-sharing
- Terraform Enterprise registry partnerships API: https://developer.hashicorp.com/terraform/enterprise/api-docs/admin/registry-sharing

## Issues Found
- The private Git authentication example used a workspace environment variable with `GIT_SSH_COMMAND` while describing HTTPS access. HCP Terraform remote operations authenticate to private Git module sources with workspace SSH keys, so the example was changed to create an organization SSH key and assign it to the workspace.
- The direct Git examples in the recommended architecture used HTTPS URLs for company module repositories. For private Git modules in HCP Terraform, SSH-based sources are the documented approach, so those examples were changed to `git::ssh://` URLs.
- The multi-registry publishing example posted VCS-backed module data to `/registry-modules`. The current documented endpoint for creating a module from a VCS repository is `/registry-modules/vcs`, so the endpoint was corrected.
- The Terraform Enterprise sharing example used a per-module `/consumers` endpoint that is not documented for registry sharing. Terraform Enterprise registry sharing is configured by admins at the organization registry level, so the example was replaced with the documented `/admin/organizations/:name/registry-partnerships` API.
- The S3/GCS option described the source as "just an HTTPS download." Terraform's `s3::` source uses the object storage getter, so the wording was adjusted to say Terraform downloads the module archive from object storage.
- The VCS connection section claimed each organization needs a VCS provider connection to access module repositories. That is only true when publishing modules into each organization's private registry, not for direct private Git module cloning, so the wording was narrowed.

## Review Notes
The remaining examples use illustrative module input variables and placeholder IDs, so they are syntactically valid patterns but would need values matching each real module and HCP Terraform organization. The public module example pins `terraform-aws-modules/vpc/aws` to version `5.0.0`; newer versions exist, but the pinned example remains valid as a versioning demonstration.
