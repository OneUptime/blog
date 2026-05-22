# Validation Summary: How to Use Terraform Enterprise with Private VCS Servers

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform Enterprise
- HCP Terraform VCS integrations
- GitHub Enterprise Server
- GitLab Enterprise Edition and Community Edition
- Bitbucket Data Center
- Azure DevOps Server
- OAuth, personal access tokens, SSH keys, webhooks, and TLS CA bundles

## Sources Consulted
- HashiCorp Terraform Enterprise OAuth Clients API: https://developer.hashicorp.com/terraform/enterprise/api-docs/oauth-clients
- HashiCorp Terraform Enterprise VCS providers overview: https://developer.hashicorp.com/terraform/enterprise/vcs
- HashiCorp GitHub Enterprise VCS provider setup: https://developer.hashicorp.com/terraform/cloud-docs/vcs/github-enterprise
- HashiCorp GitLab EE and CE VCS provider setup: https://developer.hashicorp.com/terraform/enterprise/vcs/gitlab-eece
- HashiCorp Bitbucket Data Center VCS provider setup: https://developer.hashicorp.com/terraform/enterprise/vcs/bitbucket-data-center
- HashiCorp Azure DevOps Server VCS provider setup: https://developer.hashicorp.com/terraform/enterprise/vcs/azure-devops-server
- HashiCorp Workspaces API reference: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/workspaces
- HashiCorp Terraform Enterprise diagnostics and readiness checks: https://developer.hashicorp.com/terraform/enterprise/deploy/troubleshoot/perform-diagnostics
- HashiCorp Terraform Enterprise configuration reference for `TFE_TLS_CA_BUNDLE_FILE`: https://developer.hashicorp.com/terraform/enterprise/deploy/reference/configuration
- GitLab Applications API: https://docs.gitlab.com/api/applications/
- HashiCorp `tfe_oauth_client` provider resource: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/oauth_client

## Issues Found
- The post used fixed OAuth callback paths such as `/auth/github_enterprise/callback` and `/auth/gitlab_self_managed/callback`. HashiCorp docs show that TFE generates provider-specific callback or redirect URLs during provider setup, so I changed the examples to instruct readers to copy the generated URL from TFE.
- The GitHub Enterprise API payload included an empty `oauth-token-string` while also using an OAuth app key and secret. I removed the empty token field from that OAuth app flow.
- The GitLab section used the invalid TFE service provider value `gitlab_self_managed`. I changed it to `gitlab_enterprise_edition` and added a note to use `gitlab_community_edition` for GitLab CE.
- The GitLab OAuth application instructions used Admin Area applications, extra scopes, and a `trusted` API flag. HashiCorp's setup flow uses a service user's GitLab application and the `api` scope, so I corrected the UI path and scope and removed the misleading admin API example.
- The Bitbucket section used the deprecated Server terminology and `bitbucket_server` provider value for a Data Center guide. I changed the section to Bitbucket Data Center and updated the API example to `bitbucket_data_center`.
- The Azure DevOps Server section listed incorrect PAT scopes and omitted the required SSH private key. I changed the scopes to Code Read and Code Status, added the Project Collection Administrator requirement, and included the required SSH key pair/private key setup.
- The webhook URL examples used the generic `/webhooks/vcs` endpoint. TFE workspace webhook URLs include a specific webhook identifier, so I updated the examples to `/webhooks/vcs/<webhook-id>`.
- The connectivity check used the deprecated `/_health_check` endpoint. I replaced it with `/api/v1/health/readiness`.

## Review Notes
- The examples still use placeholder hostnames and credentials, which is appropriate for a guide. Readers should retrieve the exact callback URL, OAuth token ID, and webhook URL from their own TFE instance.
- For GitLab self-managed deployments, the correct service provider value depends on whether the instance is GitLab Enterprise Edition or Community Edition.
