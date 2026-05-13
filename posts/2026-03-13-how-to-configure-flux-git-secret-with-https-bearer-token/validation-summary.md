# Validation Summary: How to Configure Flux Git Secret with HTTPS Bearer Token

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Flux Source Controller
- Kubernetes Secrets
- Kubernetes CronJobs
- Azure Repos authentication
- GitHub fine-grained personal access tokens
- OAuth2/OIDC bearer tokens

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Source API v1 reference: https://fluxcd.io/flux/components/source/api/v1/
- Flux CLI reference for `flux reconcile source git`: https://fluxcd.io/flux/cmd/flux_reconcile_source_git/
- Kubernetes `kubectl create secret generic` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Azure Repos authentication documentation: https://learn.microsoft.com/en-us/azure/devops/repos/git/auth-overview
- GitHub personal access token documentation: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens

## Issues Found
- The post described Azure DevOps PATs as bearer tokens. Azure Repos documents PAT usage for Git as HTTP basic authentication and Microsoft Entra OAuth tokens as bearer tokens. Changed the Azure DevOps example to obtain a Microsoft Entra OAuth access token with `az account get-access-token`.
- The post implied GitHub fine-grained personal access tokens are appropriate for Flux `bearerToken` authentication. Flux documentation says popular Git servers such as GitHub should use basic access authentication with the token as the password. Updated the GitHub section to state that GitHub PATs should be stored as `username` and `password`, not `bearerToken`.
- The token-rotation section said the Secret was being patched, but the command creates and applies an updated Secret manifest. Changed the wording to "applying an updated Secret."
- The CronJob example passed `$TOKEN` unquoted to `kubectl --from-literal`, which can break if a token contains shell-significant characters. Updated it to `--from-literal=bearerToken="$TOKEN"`.
- The troubleshooting section said behavior may be unpredictable if basic auth keys and `bearerToken` are mixed. Reworded it to recommend using only one authentication method so the intended behavior is unambiguous.

## Review Notes
The local environment did not have `flux` or `kubectl` installed, so CLI command validation was performed against the official Flux and Kubernetes command references. The CronJob example still requires appropriate RBAC for the `token-rotator` service account and a container image that includes `curl`, `jq`, and `kubectl`.
