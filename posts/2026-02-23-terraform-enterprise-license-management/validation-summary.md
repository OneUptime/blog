# Validation Summary: How to Handle Terraform Enterprise License Management

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform Enterprise
- HCP Terraform
- HashiCorp licensing
- Docker Compose
- Kubernetes
- Terraform Enterprise Admin API
- Terraform Enterprise admin CLI (`tfectl`)
- Legacy Replicated Terraform Enterprise deployments
- Prometheus alerting

## Sources Consulted
- HashiCorp Terraform Enterprise license configuration documentation: https://developer.hashicorp.com/terraform/enterprise/deploy/configuration/license
- HashiCorp Terraform Enterprise configuration reference: https://developer.hashicorp.com/terraform/enterprise/deploy/reference/configuration
- HashiCorp Terraform Enterprise admin CLI reference: https://developer.hashicorp.com/terraform/enterprise/deploy/reference/cli
- HashiCorp Terraform Enterprise Admin Settings API documentation: https://developer.hashicorp.com/terraform/enterprise/api-docs/admin/settings
- HashiCorp Terraform Enterprise Admin Users API documentation: https://developer.hashicorp.com/terraform/enterprise/api-docs/admin/users
- HashiCorp Terraform Enterprise legacy Replicated license documentation: https://developer.hashicorp.com/terraform/enterprise/deploy/replicated/administration/license
- HashiCorp Terraform Enterprise license update documentation for Replicated deployments: https://developer.hashicorp.com/terraform/enterprise/deploy/replicated/administration/license/update-tfe-license
- HashiCorp Terraform Enterprise overview and HCP Terraform naming note: https://developer.hashicorp.com/terraform/enterprise

## Issues Found
- The post said Terraform Enterprise stops processing new runs when a license expires. Current HashiCorp documentation says production licenses provisioned for Terraform Enterprise do not terminate on the expiry date; the documented operational impact is loss of authentication to the HashiCorp image registry, which can block reinstall, scale, or upgrade operations. Updated the introduction, expired-license section, and summary.
- The post referred to Terraform Cloud as the SaaS product name. Current HashiCorp documentation uses HCP Terraform and notes Terraform Cloud was renamed. Updated the terminology while preserving the original meaning.
- The post said legacy installs use `.rli` files and current installs use a license string. Current non-Replicated documentation describes `TFE_LICENSE` and `TFE_LICENSE_PATH` as using the raw HashiCorp license body. Updated the wording to avoid incorrectly limiting file-based license use to legacy installs.
- The Docker Compose example used the `latest` image tag. HashiCorp examples use explicit version tags such as `<vYYYYMM-#>`. Updated the example tag.
- The post used `/api/v2/admin/general-settings` fields such as `license-expiration-date`, `license-entitled-users`, and `user-count`. HashiCorp's Admin Settings API documentation does not expose those attributes. Replaced license-status checks with `tfectl app license` and replaced user-count API examples with `/api/v2/admin/users` pagination metadata.
- The Admin UI section described a license section at `/app/admin`. Current HashiCorp documentation documents admin access generally but does not document license expiration there for current non-Replicated runtimes. Replaced this with documented `tfectl` and legacy Replicated license inspection paths.
- The inactive-user command filtered on `last-active-at`, which is not documented in the Admin Users API sample attributes. Replaced it with a documented user-count query and reworded the guidance to review users for suspension or removal.

## Review Notes
- `tfectl app license` is the documented command for checking license status on current non-Replicated Terraform Enterprise runtimes, but HashiCorp's public CLI reference does not document a machine-readable output format for that command. Any production monitoring script should verify the exact command output on the target TFE version before parsing it.
