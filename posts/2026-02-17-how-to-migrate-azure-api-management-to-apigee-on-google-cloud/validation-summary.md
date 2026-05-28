# Validation Summary: How to Migrate Azure API Management to Apigee on Google Cloud

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- Azure API Management
- Azure CLI
- Google Cloud Apigee
- Apigee REST API
- Apigee policies: SpikeArrest, Quota, VerifyJWT, AssignMessage
- OpenAPI
- JWT, JWKS, API keys
- DNS and Apigee environment groups

## Sources Consulted
- Microsoft Learn: Azure CLI `az apim api export` documentation - https://learn.microsoft.com/en-us/cli/azure/apim/api?view=azure-cli-latest
- Microsoft Learn: Azure API Management `rate-limit` policy - https://learn.microsoft.com/en-us/azure/api-management/rate-limit-policy
- Microsoft Learn: Azure API Management `validate-jwt` policy - https://learn.microsoft.com/en-us/azure/api-management/validate-jwt-policy
- Microsoft Learn: Azure API Management `set-header` policy - https://learn.microsoft.com/en-us/azure/api-management/set-header-policy
- Microsoft Learn: Microsoft identity platform access token validation and JWKS metadata - https://learn.microsoft.com/en-us/entra/identity-platform/access-tokens
- Google Cloud SDK: `gcloud alpha apigee organizations provision` - https://docs.cloud.google.com/sdk/gcloud/reference/alpha/apigee/organizations/provision
- Google Cloud Apigee REST API: create/import API proxies - https://docs.cloud.google.com/apigee/docs/reference/apis/apigee/rest/v1/organizations.apis/create
- Google Cloud Apigee REST API: deploy API proxy revisions - https://docs.cloud.google.com/apigee/docs/reference/apis/apigee/rest/v1/organizations.environments.apis.revisions.deployments/deploy
- Google Cloud Apigee policy reference: SpikeArrest - https://docs.cloud.google.com/apigee/docs/api-platform/reference/policies/spike-arrest-policy
- Google Cloud Apigee policy reference: Quota - https://docs.cloud.google.com/apigee/docs/api-platform/reference/policies/quota-policy
- Google Cloud Apigee policy reference: VerifyJWT - https://docs.cloud.google.com/apigee/docs/api-platform/reference/policies/verify-jwt-policy
- Google Cloud Apigee policy reference: AssignMessage - https://docs.cloud.google.com/apigee/docs/api-platform/reference/policies/assign-message-policy
- Google Cloud Apigee REST API: API products - https://docs.cloud.google.com/apigee/docs/reference/apis/apigee/rest/v1/organizations.apiproducts
- Google Cloud Apigee REST API: developers and developer apps - https://docs.cloud.google.com/apigee/docs/reference/apis/apigee/rest/v1/organizations.developers
- Google Cloud Apigee REST API: environment groups and attachments - https://docs.cloud.google.com/apigee/docs/reference/apis/apigee/rest/v1/organizations.envgroups

## Issues Found
- The Azure API export command used `--export-format OpenApiJson` with shell redirection. Current Azure CLI accepted values for file export use `OpenApiJsonFile` with `--file-path`, so the command was updated.
- The Apigee provisioning command used `gcloud apigee organizations provision`, but the documented command is currently `gcloud alpha apigee organizations provision` for evaluation organizations. The command and runtime location example were updated to match the official CLI documentation.
- The production Apigee X networking statement was overly specific about managed instance groups. It was adjusted to refer more generally to networking and runtime routing with a VPC and HTTPS load balancer or another supported ingress pattern.
- The Apigee proxy import text said the REST API creates a proxy directly from an OpenAPI spec, but the cited REST API imports a zipped API proxy bundle. The wording and comment now describe importing a generated proxy bundle.
- Several Apigee XML snippets placed a comment before the XML declaration, which is not valid XML if copied as a complete policy file. The XML declarations were moved before the comments.
- The Apigee VerifyJWT example used an OpenID configuration URL as a JWKS URI and pointed at Google accounts while the Azure APIM example used Microsoft Entra ID. The JWKS URI was changed to the Microsoft identity platform signing keys endpoint format.
- The VerifyJWT example explicitly set `<Source>request.header.Authorization</Source>`, which prevents Apigee from stripping a `Bearer` prefix. The source element was removed so Apigee uses its documented default behavior for Authorization bearer tokens.
- The test URL used an Apigee Edge-style `apigee.net` host. It was changed to the custom hostname configured later in the post.
- The environment group example created a group but did not attach the `prod` environment. An attachment call was added so the hostname can route to the environment.

## Review Notes
The guide is technically relevant and salvageable. It remains a high-level migration guide rather than a complete production runbook; future improvements could add explicit VerifyAPIKey policy configuration, certificate/load balancer setup details for Apigee X, and a fuller policy-by-policy migration matrix.
