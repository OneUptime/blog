# Validation Summary: How to Configure AWS Cognito App Clients with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS Cognito User Pools
- AWS Cognito Resource Servers
- OAuth 2.0
- OIDC
- HCL

## Sources Consulted
- Amazon Cognito app client settings: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-client-apps.html
- Amazon Cognito CreateUserPoolClient API: https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_CreateUserPoolClient.html
- Amazon Cognito authentication flows: https://docs.aws.amazon.com/cognito/latest/developerguide/authentication.html
- Amazon Cognito PKCE: https://docs.aws.amazon.com/cognito/latest/developerguide/using-pkce-in-authorization-code.html
- Amazon Cognito resource servers and M2M scopes: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-define-resource-servers.html
- Amazon Cognito token endpoint: https://docs.aws.amazon.com/cognito/latest/developerguide/token-endpoint.html
- OpenTofu `plan` command: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command: https://opentofu.org/docs/v1.11/cli/commands/apply/
- AWS provider `aws_cognito_user_pool_client` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cognito_user_pool_client.html.markdown
- AWS provider `aws_cognito_resource_server` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cognito_resource_server.html.markdown

## Issues Found
- The introduction implied the app client configuration alone was sufficient for OAuth 2.0 usage. I added that Cognito OAuth 2.0 endpoints also require a user pool domain, because AWS documents domains as a prerequisite for authorization-server flows.
- The web client comment said the configuration prevented username/password authentication directly, but `ALLOW_USER_SRP_AUTH` is still a username-and-password flow, just SRP-based. I corrected the comment to say it allows SRP while excluding `USER_PASSWORD_AUTH`.
- The backend example used `explicit_auth_flows = ["ALLOW_REFRESH_TOKEN_AUTH"]`, which is unrelated to the OAuth 2.0 client-credentials grant and misleading in an M2M example. I removed it.
- The backend example referenced `var.resource_server_id` even though the post’s resource-server example already defines the scopes. I changed `allowed_oauth_scopes` to `aws_cognito_resource_server.api.scope_identifiers` so the example is internally consistent and uses the provider’s exported scope identifiers.
- The mobile client comment said PKCE is enforced automatically by using code flow without a client secret. AWS documents PKCE as supported and recommended for public clients, but not automatically enforced by that app-client setting alone. I corrected the comment accordingly.

## Review Notes
- The OpenTofu commands in the post are correct according to the official CLI docs. The local review environment did not have a `tofu` binary installed, so command verification was done against OpenTofu documentation rather than local `--help` output.
- The examples intentionally focus on app-client and resource-server configuration. They do not include separate resources such as `aws_cognito_user_pool_domain`, which is still required to actually use Cognito OAuth 2.0 endpoints.
