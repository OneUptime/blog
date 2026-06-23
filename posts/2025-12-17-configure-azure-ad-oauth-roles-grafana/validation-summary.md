# Validation Summary: How to Configure Azure AD OAuth Roles in Grafana

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Grafana
- Microsoft Entra ID / Azure AD OAuth
- Microsoft Graph permissions and group claims
- Azure CLI
- Kubernetes
- Grafana Helm chart
- systemd and journalctl

## Sources Consulted
- Grafana documentation: Configure Microsoft Entra ID OAuth authentication: https://grafana.com/docs/grafana/latest/setup-grafana/configure-access/configure-authentication/entraid/
- Grafana documentation: Configure Generic OAuth authentication and role mapping behavior: https://grafana.com/docs/grafana/latest/setup-grafana/configure-access/configure-authentication/generic-oauth/
- Grafana documentation: Configure Grafana, environment variable overrides, and variable expansion: https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/
- Grafana documentation: Deploy Grafana using Helm Charts: https://grafana.com/docs/grafana/latest/setup-grafana/installation/helm/
- Grafana Helm chart values: https://raw.githubusercontent.com/grafana/helm-charts/main/charts/grafana/values.yaml
- Microsoft Learn: Configure optional claims in Microsoft identity platform tokens: https://learn.microsoft.com/en-us/entra/identity-platform/optional-claims
- Microsoft Learn: Azure CLI `az ad group` reference: https://learn.microsoft.com/en-us/cli/azure/ad/group
- Kubernetes documentation: `kubectl create secret generic`, `kubectl rollout restart`, and `kubectl logs` command references: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
- The post used `role_attribute_path` under `[auth.azuread]` to map Entra group IDs to Grafana roles. Current Grafana Entra ID documentation maps organization roles from Entra application roles; `role_attribute_path` is documented for Generic OAuth. I replaced the role-mapping snippets with Entra application roles and `org_mapping` for organization-specific group mappings.
- The app registration section only listed `/login/azuread` as a redirect URI. Grafana's Entra ID documentation also requires the Grafana root URL, so I added `https://grafana.example.com/`.
- The API permission description implied `GroupMember.Read.All` was required directly for group-based role mapping. Grafana uses it for group overage handling and Microsoft Graph group lookup, so I corrected the description.
- The token claims section included access-token group claims. Grafana evaluates Entra group claims from the ID token or Microsoft Graph for the documented Entra ID flow, so I narrowed the example to ID token group claims.
- The Helm and `grafana.ini` examples included unsupported role mapping and were missing `allowed_organizations` and `use_pkce`. I updated them to the current Entra ID provider settings and preserved the Helm chart's supported `grafana.ini` and `envFromSecret` pattern.
- The troubleshooting section suggested `use_pkce = true` as a solution for too many groups. Grafana documents `force_use_graph_api = true` for forcing Microsoft Graph group lookup, so I changed the recommendation.
- The security best practices section included `token_expiry = 8h`, which is not a documented `[auth.azuread]` setting in the Grafana configuration reference. I removed it.

## Review Notes
The guide remains accurate as a current Grafana Entra ID setup tutorial. For future improvement, the title and terminology could be updated from "Azure AD" to "Microsoft Entra ID" throughout, but "Azure AD" remains commonly understood and the technical configuration is now aligned with current Grafana documentation.
