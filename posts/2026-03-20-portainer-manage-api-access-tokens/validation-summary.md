# Validation Summary: How to Manage Your API Access Tokens in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer REST API
- Portainer API access tokens / API keys
- GitHub Actions
- cURL
- Docker stack management

## Sources Consulted
- Portainer Documentation, "Accessing the Portainer API" https://docs.portainer.io/api/access
- Portainer Documentation, "Account settings" https://docs.portainer.io/user/account-settings
- Portainer Documentation, "Webhooks" https://docs.portainer.io/user/docker/stacks/webhooks
- Portainer API Documentation, Community Edition 2.39.1 OpenAPI spec https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Portainer Terraform Provider (official GitHub repository) https://github.com/portainer/terraform-provider-portainer

## Issues Found
- The token creation steps omitted the required password re-entry step. I added it because current Portainer documentation requires password confirmation when generating an access token.
- The stack update example used `PUT /api/stacks/1` without the required `endpointId` query parameter and described the call as a deployment action. I corrected it to an existing file-based stack update example with `?endpointId=1`.
- The GitHub Actions example was labeled as a webhook call but actually targeted the authenticated API, used `POST` instead of the documented `PUT` method for `/api/stacks/{id}/git/redeploy`, omitted `endpointId`, and used lowercase JSON keys. I corrected the method, path, query string, and payload casing.
- The "Managing Multiple Tokens" and security guidance implied tokens have their own scopes. I corrected this to reflect Portainer's documented permission model: API keys inherit the permissions of the Portainer user that created them, so separate users are needed for different access levels.

## Review Notes
- Current Portainer documentation describes HTTPS on port `9443` as the default UI/API endpoint, with port `9000` retained for legacy HTTP configurations.
- Stack webhooks are a separate feature from authenticated API calls, and Portainer documents stack webhooks as a Business Edition feature.
