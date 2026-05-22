# Validation Summary: How to Manage Admin Settings in Terraform Enterprise

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform Enterprise
- Terraform Enterprise Admin API
- Terraform Enterprise Organizations API
- Terraform Enterprise deployment configuration
- curl
- jq

## Sources Consulted
- HashiCorp Terraform Enterprise Admin API documentation: https://developer.hashicorp.com/terraform/enterprise/api-docs/admin
- HashiCorp Terraform Enterprise Settings API documentation: https://developer.hashicorp.com/terraform/enterprise/api-docs/admin/settings
- HashiCorp Terraform Enterprise Admin Terraform Versions API documentation: https://developer.hashicorp.com/terraform/enterprise/api-docs/admin/terraform-versions
- HashiCorp Terraform Enterprise Admin Organizations API documentation: https://developer.hashicorp.com/terraform/enterprise/api-docs/admin/organizations
- HashiCorp Terraform Enterprise Admin Users API documentation: https://developer.hashicorp.com/terraform/enterprise/api-docs/admin/users
- HashiCorp Terraform Enterprise Organizations API documentation: https://developer.hashicorp.com/terraform/enterprise/api-docs/organizations
- HashiCorp Terraform Enterprise Account API documentation: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/account
- HashiCorp Terraform Enterprise configuration reference: https://developer.hashicorp.com/terraform/enterprise/deploy/reference/configuration
- HashiCorp Terraform Enterprise service and audit logs documentation: https://developer.hashicorp.com/terraform/enterprise/deploy/manage/monitor/logs
- HashiCorp HCP Terraform Audit Trails API documentation: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/audit-trails

## Issues Found
- The general settings examples used unsupported attributes: `require-two-factor-for-admin`, `default-execution-mode`, `capacity-concurrency`, `cost-estimation-enabled`, and `session-timeout`. I replaced the general settings examples with documented attributes such as `limit-user-organization-creation`, `api-rate-limiting-enabled`, `api-rate-limit`, and `send-passing-statuses-for-untriggered-speculative-plans`.
- The key general settings table described settings that are not documented as Admin General Settings API fields. I updated the table to describe the documented API rate limiting settings.
- The custom Terraform version example used top-level `url` and `sha` fields. HashiCorp recommends using `archs[n].url` and `archs[n].sha`, so I updated the example to use an `archs` array.
- The admin organizations list example read `.attributes.email` and `.attributes["created-at"]`, which are not present in the documented Admin Organizations response. I changed the example to use `notification-email` and `workspace-limit`.
- The organization creation example used `POST /api/v2/admin/organizations`, but organization creation is documented under `POST /api/v2/organizations`. I updated the endpoint.
- The organization limits example included an unsupported `run-limit` attribute. I replaced it with documented organization admin attributes: `workspace-limit`, `plan-timeout`, and `apply-timeout`.
- The admin users example used `.attributes["is-site-admin"]` and the action path `grant-admin`. The documented admin user response uses `is-admin`, and the documented action is `grant_admin`. I updated both.
- The run capacity examples treated `capacity-concurrency` and `capacity-memory` as Admin General Settings API attributes. HashiCorp documents capacity as deployment configuration through `TFE_CAPACITY_CONCURRENCY` and `TFE_CAPACITY_MEMORY`, so I replaced the API calls with deployment configuration guidance.
- The organization 2FA example used `two-factor-conformant`, which is not the update attribute for enforcing organization 2FA. I changed it to `collaborator-auth-policy: "two_factor_mandatory"`.
- The session management example used the Admin General Settings API, but `session-timeout` and `session-remember` are documented organization attributes. I changed the endpoint to `PATCH /api/v2/organizations/my-org` and the JSON API type to `organizations`.
- The cost estimation example used the Admin General Settings API and `cost-estimation-enabled`. I updated it to use `PATCH /api/v2/admin/cost-estimation-settings` with the documented `enabled` attribute.
- The monitoring example used the HCP Terraform Audit Trails API endpoint, which HashiCorp documents as unavailable for Terraform Enterprise. I replaced it with a Terraform Enterprise audit log filtering example based on service logs.

## Review Notes
Some settings vary by Terraform Enterprise deployment method. Capacity settings are documented as runtime configuration values rather than Admin API fields, so operators should apply them through the deployment mechanism they use for Docker, Kubernetes, or Nomad.
