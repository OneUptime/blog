# Validation Summary: How to Configure Okta Provider in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Okta Terraform Provider
- Okta API token authentication
- Okta OAuth 2.0 service app authentication
- Okta groups, users, applications, authorization servers, policies, and trusted origins
- SAML and OIDC application configuration

## Sources Consulted
- Okta Terraform Provider documentation: https://registry.terraform.io/providers/okta/okta/latest/docs
- Okta Terraform Provider source docs: https://github.com/okta/terraform-provider-okta/tree/master/docs
- Okta guide, Enable Terraform access for your Okta org: https://developer.okta.com/docs/guides/terraform-enable-org-access/main/
- Okta guide, Organize your Terraform configuration: https://developer.okta.com/docs/guides/terraform-organize-configuration/main/
- Okta guide, Manage groups with Terraform: https://developer.okta.com/docs/guides/terraform-manage-groups/main/
- Okta guide, Create a custom authorization server: https://developer.okta.com/docs/guides/terraform-create-custom-auth-server/main/
- Okta guide, Manage user access with Terraform: https://developer.okta.com/docs/guides/terraform-manage-user-access/main/

## Issues Found
- Updated the Okta provider version constraint from `~> 4.8` to `~> 6.10.0`, matching the current official provider documentation reviewed on 2026-05-25.
- Changed the user-to-many-groups example from `okta_group_memberships` to `okta_user_group_memberships`. The official provider docs define `okta_group_memberships` as managing many users for one group, while `okta_user_group_memberships` manages many groups for one user.
- Removed `lifecycle { ignore_changes = [groups] }` from the `okta_app_oauth` example because current provider docs no longer expose a `groups` attribute on `okta_app_oauth`; group assignment should be handled with app group assignment resources.
- Clarified that `custom_profile_attributes` requires the custom attributes to already exist in the Okta user profile schema.
- Corrected the MFA policy comment from `720 # 30 days` to `720 # 12 hours`, because `mfa_lifetime` is expressed in minutes.

## Review Notes
The post is now technically valid as a broad Okta Terraform provider tutorial. Some policy examples are simplified and may need additional scopes, admin roles, or Okta Identity Engine versus Classic Engine adjustments in real production environments.
