# Validation Summary: How to Configure Google OAuth with Rancher

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rancher
- Google OAuth 2.0
- Google Workspace
- Google Admin SDK Directory API
- Google Cloud service accounts
- Kubernetes

## Sources Consulted
- Rancher documentation: https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/authentication-config/configure-google-oauth
- Rancher documentation: https://ranchermanager.docs.rancher.com/v2.9/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/authentication-config
- Rancher dashboard source for the Google OAuth UI fields: https://github.com/rancher/dashboard/blob/master/shell/edit/auth/googleoauth.vue
- Rancher dashboard translations for the Google OAuth setup instructions and field labels: https://github.com/rancher/dashboard/blob/master/shell/assets/translations/en-us.yaml
- Rancher server source for the Google OAuth config schema: https://github.com/rancher/rancher/blob/main/pkg/apis/management.cattle.io/v3/authn_types.go
- Rancher server source for Google OAuth provider behavior: https://github.com/rancher/rancher/blob/main/pkg/auth/providers/googleoauth/goauth_provider.go
- Rancher server source for Google userinfo and Admin SDK usage: https://github.com/rancher/rancher/blob/main/pkg/auth/providers/googleoauth/goauth_client.go
- Google Workspace Developers: Configure OAuth consent screen: https://developers.google.com/workspace/guides/configure-oauth-consent
- Google Workspace Developers: Create access credentials: https://developers.google.com/workspace/guides/create-credentials
- Google Workspace Admin Help: Control API access with domain-wide delegation: https://support.google.com/a/answer/162106
- Google Admin SDK Directory API reference: https://developers.google.com/workspace/admin/directory/reference/rest
- Google OpenID Connect documentation: https://developers.google.com/identity/openid-connect/openid-connect

## Issues Found
- The post said both Admin SDK API and People API were required. Rancher’s current Google OAuth implementation uses the Admin SDK Directory API and Google’s OpenID userinfo endpoint, not the People API, so I removed People API from the setup and troubleshooting steps.
- The Rancher configuration example listed `Client ID`, `Client Secret`, and an `Admin SDK API` hostname field. Current Rancher UI and server schema expect `OAuth Credentials` JSON, `Service Account Credentials` JSON, `Admin Email`, and `Domain`, so I updated the configuration block to match the actual product.
- Step 3 told readers to note the client ID and client secret, but Rancher expects the downloaded OAuth credentials JSON. I updated the step to tell readers to download that JSON.
- The service account was described as if it were only needed for optional group-based access. Rancher’s current Google OAuth flow requires service account credentials for user and group lookups, so I corrected the wording and removed the implication that group results are optional when the service account is omitted.
- The Google Workspace Admin navigation path for domain-wide delegation was outdated. I updated it to the current `Security > Access and data control > API controls > Manage Domain Wide Delegation` path from Google’s admin documentation.
- The test step referred to a `Test` button. Rancher’s official Google OAuth guidance uses `Authenticate with Google`, so I updated the step wording to match the documented flow.
- The troubleshooting table still referenced People API and treated missing groups too narrowly as only a missing service account. I updated those rows to reflect the current required API and the broader service-account/domain-wide-delegation failure mode.

## Review Notes
- Google Cloud console labels continue to shift toward `Google Auth platform`, while Rancher’s own docs and UI still reference `APIs & Services`. The remaining Google Cloud navigation in the post is still broadly consistent with Rancher’s published instructions, but exact menu names may vary slightly by tenant and rollout.
- Rancher v2.14.0 had a Google OAuth regression that could break logins after upgrade; Rancher v2.14.1 includes a fix. The post’s `v2.6 or later` prerequisite is still broadly valid, but operators on Rancher v2.14.0 should upgrade before using this guide.
