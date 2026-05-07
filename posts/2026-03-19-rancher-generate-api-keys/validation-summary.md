# Validation Summary: How to Generate API Keys in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Rancher Kubernetes API
- Rancher CLI
- `kubectl`
- `curl`
- `jq`

## Sources Consulted
- Rancher API Keys documentation: https://ranchermanager.docs.rancher.com/reference-guides/user-settings/api-keys
- Rancher Tokens workflow documentation: https://ranchermanager.docs.rancher.com/api/workflows/tokens
- Rancher RK-API Quick Start Guide: https://ranchermanager.docs.rancher.com/api/quickstart
- Rancher CLI documentation: https://ranchermanager.docs.rancher.com/reference-guides/cli-with-rancher/rancher-cli
- Rancher Users workflow documentation: https://ranchermanager.docs.rancher.com/v2.14/api/workflows/users
- Rancher token type definitions in the official source tree: https://raw.githubusercontent.com/rancher/rancher/main/pkg/apis/ext.cattle.io/v1/types.go

## Issues Found
- The post described Rancher API key types incorrectly. It said scoped keys could be limited to a cluster or project; current Rancher documentation describes no-scope keys and cluster-scoped keys, with scope limited to the Kubernetes API of a specific cluster. I corrected the type descriptions.
- The UI section listed inaccurate form behavior, including leaving expiration blank for a non-expiring key and an `Auto-delete expired key` option that is not documented in the current API key workflow. I updated the section to match the current documented UI options and TTL limit behavior.
- The API section used the legacy `/v3/tokens` creation flow as if it were the current supported method. Rancher v2.14.0 documents legacy v3 tokens as being phased out and points users to `tokens.ext.cattle.io`. I replaced the deprecated creation examples with current `ext.cattle.io/v1` token examples.
- The response parsing example was technically wrong. It mapped `.token` to access key, secret key, and bearer token, but the current token resource returns the access key in `.status.value` and the ready-to-use bearer token in `.status.bearerToken`. I corrected the parsing example and explanatory text.
- The CLI section claimed Rancher CLI could create API keys with `rancher tokens create`. Current Rancher CLI documentation does not support that command for API key creation. I changed the section to show the supported `rancher login ... --token ...` flow and clarified that `rancher token` is for kubeconfig tokens, not Rancher API keys.
- The key-management examples used outdated `/v3/tokens` list and delete calls and mixed field names such as `clusterId` and `.clusterName`. I replaced them with `kubectl` examples against `tokens.ext.cattle.io` and current token fields.
- The key-validity example used the old `/v3/users?me=true` pattern without clarifying scope behavior. I updated it to a current management API check for no-scope bearer tokens and clarified that `401` indicates authentication failure.
- The best-practices snippets for short-lived tokens, scoped tokens, rotation, and auditing were all based on deprecated or incorrect v3 token payloads. I updated each example to use the current token resource and field names.

## Review Notes
- Rancher still documents the previous v3 API separately, but starting with Rancher v2.14.0 the token guidance explicitly directs users toward `tokens.ext.cattle.io` for new automation.
- In the current `tokens.ext.cattle.io` implementation, the API response exposes the access key as `.status.value` and the ready-to-use bearer token as `.status.bearerToken`; it does not expose the secret key as a separate field in the response example.
- Live command execution against a Rancher server was not possible in this workspace because the local environment did not have Rancher CLI installed and was not connected to a Rancher cluster. Verification was done against Rancher's official documentation, published OpenAPI material, and the official Rancher source tree.
