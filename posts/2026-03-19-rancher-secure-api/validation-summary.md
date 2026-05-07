# Validation Summary: How to Secure Rancher API Access

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- Rancher Kubernetes API (`ext.cattle.io`, `management.cattle.io`)
- Kubernetes
- RKE2
- Ingress-NGINX
- Kubernetes NetworkPolicy
- LDAP / SAML / OIDC authentication
- AWS EC2 security groups

## Sources Consulted
- Rancher API Keys: https://ranchermanager.docs.rancher.com/reference-guides/user-settings/api-keys
- Rancher API Tokens: https://ranchermanager.docs.rancher.com/api/api-tokens
- Rancher Token workflow: https://ranchermanager.docs.rancher.com/api/workflows/tokens
- Rancher User workflow: https://ranchermanager.docs.rancher.com/api/workflows/users
- Rancher Project workflow: https://ranchermanager.docs.rancher.com/api/workflows/projects
- Rancher Local Authentication: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/authentication-config/create-local-users
- Rancher Authentication Configuration: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/authentication-config
- Rancher Helm Chart Options: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-references/helm-chart-options
- Official Rancher chart ingress template: https://raw.githubusercontent.com/rancher/rancher/master/chart/templates/ingress.yaml
- Official Rancher chart service template: https://raw.githubusercontent.com/rancher/rancher/master/chart/templates/service.yaml
- Official Rancher chart deployment template: https://raw.githubusercontent.com/rancher/rancher/master/chart/templates/deployment.yaml
- Official Rancher chart values: https://raw.githubusercontent.com/rancher/rancher/master/chart/values.yaml
- Kubernetes NetworkPolicy docs: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes authentication docs: https://kubernetes.io/docs/reference/access-authn-authz/authentication/
- Kubernetes Ingress docs: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Ingress-NGINX annotations: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- RKE2 server configuration reference: https://documentation.suse.com/cloudnative/rke2/latest/en/reference/server_config.html
- AWS CLI `authorize-security-group-ingress` reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-ingress.html

## Issues Found
- The original token guidance relied on legacy `/v3/tokens` behavior. I replaced it with the current Rancher token workflow using `tokens.ext.cattle.io` and updated the prerequisite from Rancher `v2.5+` to `v2.13+`, which matches the current public token API.
- The API key UI instructions were partially inaccurate. I corrected the menu label to `Account & API Keys`, aligned the expiration example to 30 days, and clarified that UI scope is cluster-specific Kubernetes API scope rather than a generic cluster-or-project scope.
- The token TTL section used an unsupported `CATTLE_TOKEN_MAX_TTL_MINUTES` Helm env var example. I replaced it with the supported `auth-token-max-ttl-minutes` setting workflow.
- The Rancher ingress and rate-limiting examples pointed traffic to service port `443`. The official Rancher chart routes ingress traffic to service port `80`, so those examples were corrected. The NetworkPolicy example was also updated to port `80`.
- The NetworkPolicy example overclaimed IP filtering behavior. I added a caveat that it only works as intended when the ingress or load balancer preserves the original client source IP, which matches the Kubernetes NetworkPolicy documentation.
- The rate-limiting example targeted legacy `/v3/tokens`. I updated it to the current `/apis/ext.cattle.io/v1/tokens` path and adjusted the explanation accordingly.
- The external authentication section recommended disabling local authentication. Rancher’s documentation recommends keeping a few local users for emergency access even when external auth is enabled, so I replaced that guidance.
- The “service account” section was technically incorrect for current Rancher workflows. I replaced it with the documented Rancher `User` plus password `Secret` creation flow and updated project access assignment to use `ProjectRoleTemplateBinding`.
- The `project-member` example was described as “deploy-only” access, which overstates how narrow that role is. I corrected the wording to match the actual role being granted.
- The audit log section referred to `auditLog.enabled`, but the current chart exposes `auditLog.level` for enabling output. I corrected the setting and expanded the filter example to include current Rancher Kubernetes API paths.
- The token rotation script used legacy v3 token fields and endpoints. I replaced it with a script that lists and deletes `tokens.ext.cattle.io` resources by age.
- The final admin-hardening command patched `auth-user-info-max-age-seconds`, which is unrelated to restricting the default admin account. I removed that command and replaced it with accurate operational guidance.

## Review Notes
- The corrected post now assumes Rancher `v2.13+` because it uses the current public token API. Older Rancher releases still expose legacy v3 tokens, but Rancher documents those as being phased out.
- The IP allowlist NetworkPolicy remains environment-dependent because Kubernetes does not guarantee whether source IP rewriting happens before or after NetworkPolicy processing when ingress or load balancers are involved.
- If stricter-than-`project-member` automation permissions are required, a custom Rancher role would be more appropriate than the built-in example role.
