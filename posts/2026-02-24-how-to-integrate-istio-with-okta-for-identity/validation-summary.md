# Validation Summary: How to Integrate Istio with Okta for Identity

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- Istio RequestAuthentication
- Istio AuthorizationPolicy
- Istio external authorization
- Istio ServiceEntry
- Okta OAuth 2.0 and OpenID Connect
- Okta custom authorization servers
- Okta client credentials flow
- Okta authorization code flow
- Kubernetes Secrets

## Sources Consulted
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio AuthorizationPolicy conditions reference: https://istio.io/latest/docs/reference/config/security/conditions/
- Istio external authorization task: https://istio.io/latest/docs/tasks/security/authorization/authz-custom/
- Istio mesh configuration reference for extensionProviders: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Okta authorization servers documentation: https://developer.okta.com/docs/concepts/auth-servers/
- Okta client credentials grant guide: https://developer.okta.com/docs/guides/implement-grant-type/clientcreds/main/
- Okta client authentication methods: https://developer.okta.com/docs/api/openapi/okta-oauth/guides/client-auth/
- Okta OpenID Connect and OAuth 2.0 overview: https://developer.okta.com/docs/api/openapi/okta-oauth/guides/overview/
- Okta groups claim guide: https://developer.okta.com/docs/guides/customize-tokens-groups-claim/main/

## Issues Found
- The post described Okta's "default authorization server" with org authorization server URLs. I changed the example to Okta's default custom authorization server, `https://mycompany.okta.com/oauth2/default`, and added a note that org authorization server tokens are not the right fit for mesh APIs with custom scopes and access policies.
- The scope-based AuthorizationPolicy used `action: ALLOW`. Because Istio denies unmatched requests when any ALLOW policy exists for a workload, that example could unintentionally deny non-write requests. I changed it to a `DENY` policy that blocks write methods when the `mesh.write` scope is absent.
- The Okta token requests sent `client_id` and `client_secret` in the request body. Okta's default client authentication method is `client_secret_basic`, so I changed the client credentials and authorization code examples to use HTTP Basic authentication via curl's `-u` option.
- The JWT issuer troubleshooting command used plain `base64 -d` on a JWT segment, which can fail for base64url data without padding. I updated it to translate URL-safe characters and add padding before decoding.

## Review Notes
The Istio YAML fields used in the post match the current Istio security and mesh configuration references. Local `kubectl` validation was not run because `kubectl` is not installed in this workspace.
