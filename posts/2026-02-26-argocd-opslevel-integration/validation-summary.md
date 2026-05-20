# Validation Summary: How to Integrate ArgoCD with OpsLevel

## Status
validated

## Post Type
Tutorial / Integration guide

## Technologies Covered
- Argo CD
- Argo CD Notifications
- Kubernetes
- Helm
- OpsLevel Agent
- OpsLevel Kubernetes integration
- OpsLevel GraphQL API
- OpsLevel deploy webhooks
- Bash
- Python

## Sources Consulted
- OpsLevel Kubernetes Integration: https://docs.opslevel.com/docs/kubernetes-integration
- OpsLevel Agent: https://docs.opslevel.com/docs/opslevel-agent
- OpsLevel CLI: https://docs.opslevel.com/docs/cli
- OpsLevel GraphQL API: https://docs.opslevel.com/docs/graphql
- OpsLevel Custom Deploys: https://docs.opslevel.com/docs/deploys
- OpsLevel ArgoCD Integration: https://docs.opslevel.com/docs/argocd
- Argo CD Notifications Webhook service: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/webhook/
- Argo CD Notifications Templates: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/templates/
- Argo CD Resource Hooks: https://argo-cd.readthedocs.io/en/stable/user-guide/resource_hooks/
- Argo CD `argocd app list` command reference: https://argo-cd.readthedocs.io/en/release-2.6/user-guide/commands/argocd_app_list/
- OneUptime ArgoCD Backstage article link: https://oneuptime.com/blog/post/2026-02-26-argocd-backstage-service-catalog/view
- OneUptime ArgoCD Cortex article link: https://oneuptime.com/blog/post/2026-02-26-argocd-cortex-developer-portal/view

## Issues Found
- The Helm install command used the wrong chart name and values. Updated it from `opslevel/opslevel-k8s-deploy-agent` with `opslevel.*` values to the documented `opslevel/opslevel-agent` chart with `secret.data.OPSLEVEL_API_TOKEN` and optional `agent.integration`.
- The post showed an unsupported `opslevel create integration kubernetes` CLI flow. Replaced it with the documented `kubectl-opslevel` plugin workflow for generating, previewing, and importing Kubernetes mappings.
- The Kubernetes mapping example used a non-documented ConfigMap schema with Go-template expressions. Replaced it with the documented `opslevel-k8s.yaml` structure using jq expressions under `service.import`.
- The tag examples used unsupported `opslevel create tag` commands. Replaced them with the documented GraphQL `tagAssign` mutation, which upserts tags by service alias.
- The tag sync script used the unsupported tag CLI commands and unquoted JSON handling. Replaced those calls with a JSON-safe `jq -n` GraphQL payload and quoted shell variables.
- The maturity check examples used unsupported `opslevel create check tag-defined` flags. Replaced them with UI-based Tag Defined check instructions matching OpsLevel's documented check workflow.
- The deploy webhook payload omitted OpsLevel's required `deployed_at` field and used a shell-style variable in a ConfigMap URL that Kubernetes will not expand. Added `deployed_at`, `status`, and replaced the URL with the documented deploy webhook placeholder format.
- The OpsLevel GraphQL query used an unsupported top-level `services(filter: ...)` shape. Updated it to the documented `account { services(tag: ...) { ... } }` query.
- The CronJob used `curlimages/curl` while invoking `jq`, which is not guaranteed to be present. Switched to `alpine:3.20` and installed `curl` and `jq` in the container command.

## Review Notes
The `kubectl-opslevel` repository is marked deprecated in favor of the OpsLevel Agent, but OpsLevel's current Kubernetes integration documentation still describes it for direct service imports and detailed field mapping. The post now distinguishes the agent-based integration from the direct import mapping workflow. Local syntax checks passed for the edited Bash, Python, and YAML snippets.
